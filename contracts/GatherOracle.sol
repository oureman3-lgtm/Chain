// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./CharacterNFT.sol";
import "./ItemNFT.sol";

/**
 * @title GatherOracle
 * @notice Resolves gathering outcomes using on-chain pseudorandom + character luck.
 *         Resource types: 0=Tree(Wood), 1=Rock(Flint), 2=Grass, 3=BerryBush
 */
contract GatherOracle is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    CharacterNFT public characterNFT;
    ItemNFT      public itemNFT;

    // nonce per character to prevent seed reuse
    mapping(uint256 => uint256) public gatherNonce;

    // resource type => (itemType, baseAmount, luckDivisor)
    struct ResourceDef {
        uint256 itemType;
        uint256 baseAmount;
        uint256 luckDivisor; // extra = luck / luckDivisor  (integer)
    }
    mapping(uint256 => ResourceDef) public resources;

    event GatherResolved(
        address indexed player,
        uint256 indexed characterId,
        uint256 resourceType,
        uint256 itemType,
        uint256 amount
    );

    constructor(address admin, address _characterNFT, address _itemNFT) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);
        characterNFT = CharacterNFT(_characterNFT);
        itemNFT      = ItemNFT(_itemNFT);

        // Tree → Wood: base 1, max +luck/10 extra
        resources[0] = ResourceDef(1, 1, 10);
        // Rock → Flint: base 1, max +luck/15 extra
        resources[1] = ResourceDef(2, 1, 15);
        // Grass: base 1, max +luck/8 extra
        resources[2] = ResourceDef(3, 1, 8);
        // BerryBush → Berry: base 1, max +luck/10 extra
        resources[3] = ResourceDef(4, 1, 10);
    }

    /**
     * @notice Called by the player when they gather a resource node.
     *         Uses blockhash-based pseudorandom seeded by characterId + nonce.
     *         Returns the minted item token IDs.
     */
    function resolveGather(uint256 characterId, uint256 resourceType)
        external
        returns (uint256[] memory tokenIds)
    {
        require(
            characterNFT.ownerOf(characterId) == msg.sender,
            "GatherOracle: not character owner"
        );
        ResourceDef storage res = resources[resourceType];
        require(res.itemType != 0, "GatherOracle: unknown resource type");

        CharacterNFT.CharacterStats memory stats = characterNFT.getStats(characterId);

        // Pseudorandom seed
        uint256 nonce = gatherNonce[characterId]++;
        uint256 seed  = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            characterId,
            nonce,
            msg.sender
        )));

        // amount = baseAmount + random bonus scaled by luck
        uint256 luckBonus = stats.luck / res.luckDivisor;
        uint256 extra = luckBonus > 0 ? (seed % (luckBonus + 1)) : 0;
        uint256 amount = res.baseAmount + extra;
        // cap at 5 to prevent outliers
        if (amount > 5) amount = 5;

        tokenIds = new uint256[](amount);
        for (uint256 i = 0; i < amount; i++) {
            tokenIds[i] = itemNFT.mintItem(msg.sender, res.itemType);
        }

        emit GatherResolved(msg.sender, characterId, resourceType, res.itemType, amount);
    }
}
