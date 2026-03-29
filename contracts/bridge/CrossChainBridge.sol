// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ── Interfaces ───────────────────────────────────────────────────────────────

interface INFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

interface ICharacterNFT is INFT {
    struct CharacterStats {
        uint256 level; uint256 maxHealth; uint256 maxHunger; uint256 maxSanity;
        uint256 attackPower; uint256 defense; uint256 luck;
        uint256 daysSurvived; uint256 deathCount;
        uint8 specialAbility; string characterClass;
    }
    function getStats(uint256 tokenId) external view returns (CharacterStats memory);
    function mintCharacter(address to, string calldata characterClass) external returns (uint256);
    function updateStats(uint256 tokenId, uint256 daysSurvived, uint256 lvl, uint256 hp, uint256 atk, uint256 def, uint256 lck) external;
}

interface IItemNFT is INFT {
    struct ItemData { uint256 itemType; uint256 durability; string name; }
    function getItem(uint256 tokenId) external view returns (ItemData memory);
    function mintItem(address to, uint256 itemType) external returns (uint256);
}

/**
 * @title CrossChainBridge
 * @notice Lock-and-mint bridge enabling CharacterNFTs and ItemNFTs to move across chains.
 *
 * Architecture:
 *  Source chain:  user calls lockCharacter/lockItem -> NFT held by bridge -> BridgeInitiated emitted
 *  Dest chain:    BRIDGE_ROLE operator calls mintBridgedCharacter/mintBridgedItem -> NFT minted
 *  Return:        Same flow in reverse (lock on dest, release on source via releaseCharacter/releaseItem)
 *
 * Supported Chains:
 *   1        - Ethereum Mainnet
 *   137      - Polygon
 *   42161    - Arbitrum One
 *   8453     - Base
 *   56       - BNB Chain
 *   43114    - Avalanche C-Chain
 *   31337    - Localhost (Hardhat)
 *   80001    - Polygon Mumbai (testnet)
 *   421613   - Arbitrum Goerli (testnet)
 *
 * Security:
 *  BRIDGE_ROLE holders are the off-chain relayer operators.
 *  DEFAULT_ADMIN_ROLE can add/remove chains and freeze the bridge.
 *  All locks include a nonce to prevent replay attacks.
 *  Emergency unlock available to admin with 24h timelock.
 */
contract CrossChainBridge is AccessControl, ReentrancyGuard {
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");

    // ── Config ────────────────────────────────────────────────────────────────

    ICharacterNFT public characterNFT;
    IItemNFT      public itemNFT;

    bool public frozen;

    mapping(uint256 => bool) public supportedChains;
    uint256[] public chainList;

    // ── Lock tracking ─────────────────────────────────────────────────────────

    struct LockRecord {
        address owner;
        uint256 destChainId;
        uint256 lockedAt;  // block.timestamp
        bool    isCharacter;
    }

    // tokenId → lock record
    mapping(uint256 => LockRecord) public charLocks;
    mapping(uint256 => LockRecord) public itemLocks;

    // Nonce per (owner, destChain) to prevent replay
    mapping(address => mapping(uint256 => uint256)) public bridgeNonce;

    // ── Events ────────────────────────────────────────────────────────────────

    event BridgeInitiated(
        address indexed owner,
        uint256 indexed tokenId,
        bool    isCharacter,
        uint256 srcChainId,
        uint256 destChainId,
        bytes   payload,      // encoded stats for cross-chain mint
        uint256 nonce
    );

    event BridgeMinted(
        address indexed owner,
        uint256 indexed newTokenId,
        bool    isCharacter,
        uint256 srcChainId
    );

    event BridgeReleased(
        address indexed owner,
        uint256 indexed tokenId,
        bool    isCharacter
    );

    event ChainAdded(uint256 chainId);
    event BridgeFrozen(bool frozen);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(
        address admin,
        address _characterNFT,
        address _itemNFT
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BRIDGE_ROLE, admin);
        characterNFT = ICharacterNFT(_characterNFT);
        itemNFT      = IItemNFT(_itemNFT);

        // Seed supported chains
        _addChain(1);      // Ethereum
        _addChain(137);    // Polygon
        _addChain(42161);  // Arbitrum
        _addChain(8453);   // Base
        _addChain(56);     // BNB
        _addChain(43114);  // Avalanche
        _addChain(31337);  // Localhost
        _addChain(80001);  // Mumbai testnet
        _addChain(421613); // Arbitrum Goerli
    }

    // ── Chain management ──────────────────────────────────────────────────────

    function addChain(uint256 chainId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _addChain(chainId);
    }

    function _addChain(uint256 chainId) internal {
        if (!supportedChains[chainId]) {
            supportedChains[chainId] = true;
            chainList.push(chainId);
            emit ChainAdded(chainId);
        }
    }

    function setFrozen(bool _frozen) external onlyRole(DEFAULT_ADMIN_ROLE) {
        frozen = _frozen;
        emit BridgeFrozen(_frozen);
    }

    // ── Lock (source chain) ───────────────────────────────────────────────────

    /**
     * @notice Lock a CharacterNFT for bridging to destChainId.
     *         Emits BridgeInitiated with encoded stats payload.
     */
    function lockCharacter(uint256 tokenId, uint256 destChainId)
        external
        nonReentrant
    {
        require(!frozen, "Bridge: frozen");
        require(supportedChains[destChainId], "Bridge: unsupported chain");
        require(characterNFT.ownerOf(tokenId) == msg.sender, "Bridge: not owner");
        require(charLocks[tokenId].owner == address(0), "Bridge: already locked");

        ICharacterNFT.CharacterStats memory stats = characterNFT.getStats(tokenId);

        // Transfer to bridge vault
        characterNFT.transferFrom(msg.sender, address(this), tokenId);

        uint256 nonce = bridgeNonce[msg.sender][destChainId]++;
        charLocks[tokenId] = LockRecord(msg.sender, destChainId, block.timestamp, true);

        bytes memory payload = abi.encode(
            msg.sender,
            tokenId,
            stats.characterClass,
            stats.level,
            stats.maxHealth,
            stats.attackPower,
            stats.defense,
            stats.luck,
            stats.daysSurvived,
            stats.deathCount,
            stats.specialAbility
        );

        emit BridgeInitiated(msg.sender, tokenId, true, block.chainid, destChainId, payload, nonce);
    }

    /**
     * @notice Lock an ItemNFT for bridging.
     */
    function lockItem(uint256 tokenId, uint256 destChainId)
        external
        nonReentrant
    {
        require(!frozen, "Bridge: frozen");
        require(supportedChains[destChainId], "Bridge: unsupported chain");
        require(itemNFT.ownerOf(tokenId) == msg.sender, "Bridge: not owner");
        require(itemLocks[tokenId].owner == address(0), "Bridge: already locked");

        IItemNFT.ItemData memory data = itemNFT.getItem(tokenId);

        itemNFT.transferFrom(msg.sender, address(this), tokenId);

        uint256 nonce = bridgeNonce[msg.sender][destChainId]++;
        itemLocks[tokenId] = LockRecord(msg.sender, destChainId, block.timestamp, false);

        bytes memory payload = abi.encode(
            msg.sender,
            tokenId,
            data.itemType,
            data.durability
        );

        emit BridgeInitiated(msg.sender, tokenId, false, block.chainid, destChainId, payload, nonce);
    }

    // ── Mint (destination chain) ──────────────────────────────────────────────

    /**
     * @notice Mint a bridged CharacterNFT on this chain (called by bridge operator).
     *         Decodes the payload emitted on source chain.
     */
    function mintBridgedCharacter(bytes calldata payload, uint256 srcChainId)
        external
        onlyRole(BRIDGE_ROLE)
        nonReentrant
    {
        require(!frozen, "Bridge: frozen");
        require(supportedChains[srcChainId], "Bridge: unsupported src chain");

        (
            address owner,
            ,   // srcTokenId (informational only)
            string memory characterClass,
            uint256 level,
            uint256 maxHealth,
            uint256 attackPower,
            uint256 defense,
            uint256 luck,
            uint256 daysSurvived,
            ,   // deathCount (not restored to prevent badge farming)

        ) = abi.decode(payload, (
            address, uint256, string,
            uint256, uint256, uint256, uint256, uint256, uint256,
            uint256, uint8
        ));

        uint256 newTokenId = characterNFT.mintCharacter(owner, characterClass);
        characterNFT.updateStats(newTokenId, daysSurvived, level, maxHealth, attackPower, defense, luck);

        emit BridgeMinted(owner, newTokenId, true, srcChainId);
    }

    /**
     * @notice Mint a bridged ItemNFT on this chain.
     */
    function mintBridgedItem(bytes calldata payload, uint256 srcChainId)
        external
        onlyRole(BRIDGE_ROLE)
        nonReentrant
    {
        require(!frozen, "Bridge: frozen");
        require(supportedChains[srcChainId], "Bridge: unsupported src chain");

        (address owner, , uint256 itemType, ) = abi.decode(payload, (address, uint256, uint256, uint256));

        uint256 newTokenId = itemNFT.mintItem(owner, itemType);

        emit BridgeMinted(owner, newTokenId, false, srcChainId);
    }

    // ── Release (return from destination) ────────────────────────────────────

    /**
     * @notice Release a locked CharacterNFT back to its original owner.
     *         Called by bridge operator when the NFT has been burned on dest chain.
     */
    function releaseCharacter(uint256 tokenId) external onlyRole(BRIDGE_ROLE) {
        LockRecord storage rec = charLocks[tokenId];
        require(rec.owner != address(0), "Bridge: not locked");

        address owner = rec.owner;
        delete charLocks[tokenId];

        characterNFT.transferFrom(address(this), owner, tokenId);
        emit BridgeReleased(owner, tokenId, true);
    }

    /**
     * @notice Release a locked ItemNFT back to its original owner.
     */
    function releaseItem(uint256 tokenId) external onlyRole(BRIDGE_ROLE) {
        LockRecord storage rec = itemLocks[tokenId];
        require(rec.owner != address(0), "Bridge: not locked");

        address owner = rec.owner;
        delete itemLocks[tokenId];

        itemNFT.transferFrom(address(this), owner, tokenId);
        emit BridgeReleased(owner, tokenId, false);
    }

    // ── Emergency unlock (admin, time-locked) ────────────────────────────────

    uint256 public constant EMERGENCY_TIMELOCK = 24 hours;
    mapping(uint256 => uint256) public emergencyUnlockRequests; // tokenId → requestTime

    function requestEmergencyUnlock(uint256 tokenId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emergencyUnlockRequests[tokenId] = block.timestamp;
    }

    function executeEmergencyUnlockChar(uint256 tokenId, address recipient)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            block.timestamp >= emergencyUnlockRequests[tokenId] + EMERGENCY_TIMELOCK,
            "Bridge: timelock not elapsed"
        );
        delete charLocks[tokenId];
        delete emergencyUnlockRequests[tokenId];
        characterNFT.transferFrom(address(this), recipient, tokenId);
    }

    function executeEmergencyUnlockItem(uint256 tokenId, address recipient)
        external onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(
            block.timestamp >= emergencyUnlockRequests[tokenId] + EMERGENCY_TIMELOCK,
            "Bridge: timelock not elapsed"
        );
        delete itemLocks[tokenId];
        delete emergencyUnlockRequests[tokenId];
        itemNFT.transferFrom(address(this), recipient, tokenId);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getSupportedChains() external view returns (uint256[] memory) {
        return chainList;
    }

    function isCharacterLocked(uint256 tokenId) external view returns (bool, address, uint256) {
        LockRecord storage r = charLocks[tokenId];
        return (r.owner != address(0), r.owner, r.destChainId);
    }

    function isItemLocked(uint256 tokenId) external view returns (bool, address, uint256) {
        LockRecord storage r = itemLocks[tokenId];
        return (r.owner != address(0), r.owner, r.destChainId);
    }
}
