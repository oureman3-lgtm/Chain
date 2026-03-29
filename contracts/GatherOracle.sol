// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./CharacterNFT.sol";
import "./ItemNFT.sol";

/**
 * @title GatherOracle
 * @notice Resolves gathering outcomes using on-chain pseudorandom + character luck.
 *         Also provides localExplore() for probabilistic tile exploration.
 *
 * Standard resource types (passed as `resourceType`):
 *   0 = Tree     → Wood (itemType 1)
 *   1 = Rock     → Flint (itemType 2)
 *   2 = Grass    → Grass (itemType 3)
 *   3 = BerryBush → Berry (itemType 4)
 *   4 = IronDeposit → IronOre (itemType 13) [region ≥ 1]
 *   5 = Mushrooms   → Mushroom (itemType 15) [region ≥ 1]
 *   6 = FishingSpot → Fish (itemType 16)
 *   7 = Beehive     → Honey (itemType 17)
 *   8 = HardwoodTree → Hardwood (itemType 18) [region ≥ 1]
 *
 * Local exploration outcomes (localExplore):
 *   60% – common resource (1 item)
 *   15% – rare resource (1 higher-tier item)
 *   20% – nothing found
 *    4% – event hint (no item, emits LocalEventFound)
 *    1% – hidden stash (2-3 items)
 */
contract GatherOracle is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    CharacterNFT public characterNFT;
    ItemNFT      public itemNFT;

    address public tileResource; // TileResource contract (optional integration)
    address public questSystem;  // QuestSystem contract (optional notifications)

    // nonce per character to prevent seed reuse
    mapping(uint256 => uint256) public gatherNonce;
    mapping(uint256 => uint256) public exploreNonce;

    // resource type => (itemType, baseAmount, luckDivisor)
    struct ResourceDef {
        uint256 itemType;
        uint256 baseAmount;
        uint256 luckDivisor; // extra = luck / luckDivisor  (integer)
        uint8   tileResourceType; // matching TileResource index (255 = not pool-backed)
    }
    mapping(uint256 => ResourceDef) public resources;

    // ── Events ────────────────────────────────────────────────────────────────

    event GatherResolved(
        address indexed player,
        uint256 indexed characterId,
        uint256 resourceType,
        uint256 itemType,
        uint256 amount
    );

    event LocalExploreResult(
        address indexed player,
        uint256 indexed characterId,
        uint256 tileId,
        uint8   outcome,   // 0=nothing, 1=common, 2=rare, 3=event, 4=stash
        uint256 itemType,
        uint256 amount
    );

    event LocalEventFound(
        uint256 indexed characterId,
        uint256 tileId,
        uint256 gameDay
    );

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address admin, address _characterNFT, address _itemNFT) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);
        characterNFT = CharacterNFT(_characterNFT);
        itemNFT      = ItemNFT(_itemNFT);

        // Tree → Wood: base 1, max +luck/10 extra, tileResourceType=0
        resources[0] = ResourceDef(1,  1, 10, 0);
        // Rock → Flint: base 1, max +luck/15 extra, tileResourceType=1
        resources[1] = ResourceDef(2,  1, 15, 1);
        // Grass: base 1, max +luck/8 extra, tileResourceType=2
        resources[2] = ResourceDef(3,  1,  8, 2);
        // BerryBush → Berry: base 1, max +luck/10 extra, tileResourceType=3
        resources[3] = ResourceDef(4,  1, 10, 3);
        // IronDeposit → IronOre: base 1, max +luck/12 extra, tileResourceType=4
        resources[4] = ResourceDef(13, 1, 12, 4);
        // Mushrooms → Mushroom: base 1, max +luck/8 extra, tileResourceType=5
        resources[5] = ResourceDef(15, 1,  8, 5);
        // FishingSpot → Fish: base 1, max +luck/10 extra, tileResourceType=6
        resources[6] = ResourceDef(16, 1, 10, 6);
        // Beehive → Honey: base 1, max +luck/15 extra, tileResourceType=7
        resources[7] = ResourceDef(17, 1, 15, 7);
        // HardwoodTree → Hardwood: base 1, max +luck/12 extra, tileResourceType=8
        resources[8] = ResourceDef(18, 1, 12, 8);
    }

    // ── Setters ───────────────────────────────────────────────────────────────

    function setTileResource(address _tileResource) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tileResource = _tileResource;
    }

    function setQuestSystem(address _questSystem) external onlyRole(DEFAULT_ADMIN_ROLE) {
        questSystem = _questSystem;
    }

    // ── Standard gather ───────────────────────────────────────────────────────

    /**
     * @notice Called by the player when they gather a resource node.
     *         Consumes from the shared tile pool if TileResource is set.
     *         Returns the minted item token IDs.
     * @param characterId   Character NFT token ID.
     * @param resourceType  Node type (0-8).
     * @param tileId        Current tile (used for pool consumption).
     * @param gameDay       Current game day (for regen).
     */
    function resolveGather(
        uint256 characterId,
        uint256 resourceType,
        uint256 tileId,
        uint256 gameDay
    )
        external
        onlyRole(GAME_ROLE)
        returns (uint256[] memory tokenIds)
    {
        ResourceDef storage res = resources[resourceType];
        require(res.itemType != 0, "GatherOracle: unknown resource type");

        CharacterNFT.CharacterStats memory stats = characterNFT.getStats(characterId);

        // Pseudorandom seed
        uint256 nonce = gatherNonce[characterId]++;
        uint256 seed  = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            characterId,
            nonce,
            tileId
        )));

        // amount = baseAmount + random bonus scaled by luck
        uint256 luckBonus = stats.luck / res.luckDivisor;
        uint256 extra = luckBonus > 0 ? (seed % (luckBonus + 1)) : 0;
        uint256 amount = res.baseAmount + extra;
        if (amount > 5) amount = 5;

        // ── Consume from shared tile pool (clamp if insufficient) ────────────
        if (tileResource != address(0) && res.tileResourceType != 255) {
            (bool ok, bytes memory data) = tileResource.staticcall(
                abi.encodeWithSignature(
                    "getStock(uint256,uint8,uint256)",
                    tileId, res.tileResourceType, gameDay
                )
            );
            if (ok && data.length >= 32) {
                uint256 available = abi.decode(data, (uint256));
                if (available < amount) amount = available;
                if (amount > 0) {
                    tileResource.call(
                        abi.encodeWithSignature(
                            "consume(uint256,uint8,uint256,uint256)",
                            tileId, res.tileResourceType, amount, gameDay
                        )
                    );
                }
            }
        }

        address owner = characterNFT.ownerOf(characterId);
        tokenIds = new uint256[](amount);
        for (uint256 i = 0; i < amount; i++) {
            tokenIds[i] = itemNFT.mintItem(owner, res.itemType);
        }

        emit GatherResolved(owner, characterId, resourceType, res.itemType, amount);

        // ── Notify QuestSystem ───────────────────────────────────────────────
        if (questSystem != address(0) && amount > 0) {
            questSystem.call(
                abi.encodeWithSignature(
                    "notifyGather(uint256,uint256,uint256)",
                    characterId, res.itemType, amount
                )
            );
        }
    }

    // ── Local exploration ─────────────────────────────────────────────────────

    /**
     * @notice Probabilistic tile exploration (costs 5 AP, ~instant).
     *         Outcome distribution (luck shifts rare/stash thresholds slightly):
     *           0-19  (20%) → nothing
     *           20-23  (4%) → event hint (emits LocalEventFound, no item)
     *           24     (1%) → hidden stash (2-3 random items)
     *           25-39  (15%) → rare item
     *           40-99  (60%) → common item
     *         Luck ≥ 20: nothingThreshold drops to 15%
     *         Luck ≥ 40: nothingThreshold drops to 10%
     *
     * @param characterId  Character NFT token ID.
     * @param tileId       Current tile.
     * @param regionId     Current region (determines available item pools).
     * @param gameDay      Current game day.
     */
    function localExplore(
        uint256 characterId,
        uint256 tileId,
        uint8   regionId,
        uint256 gameDay
    )
        external
        onlyRole(GAME_ROLE)
        returns (uint8 outcome, uint256 itemType, uint256 amount)
    {
        CharacterNFT.CharacterStats memory stats = characterNFT.getStats(characterId);

        uint256 nonce = exploreNonce[characterId]++;
        uint256 seed  = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1),
            characterId,
            tileId,
            nonce,
            "explore"
        )));

        uint256 roll = seed % 100;

        // Luck shifts nothing threshold
        uint256 nothingMax = stats.luck >= 40 ? 10 : stats.luck >= 20 ? 15 : 20;

        if (roll < nothingMax) {
            // Nothing found
            outcome  = 0;
            itemType = 0;
            amount   = 0;
        } else if (roll < nothingMax + 4) {
            // Event hint
            outcome  = 3;
            itemType = 0;
            amount   = 0;
            emit LocalEventFound(characterId, tileId, gameDay);
        } else if (roll < nothingMax + 5) {
            // Hidden stash: 2-3 items
            outcome  = 4;
            amount   = 2 + (seed >> 8) % 2; // 2 or 3
            itemType = _pickRareItem(seed >> 16, regionId);
        } else if (roll < nothingMax + 5 + 15) {
            // Rare item
            outcome  = 2;
            amount   = 1;
            itemType = _pickRareItem(seed >> 8, regionId);
        } else {
            // Common item
            outcome  = 1;
            amount   = 1;
            itemType = _pickCommonItem(seed >> 8, regionId);
        }

        address owner = characterNFT.ownerOf(characterId);
        if (amount > 0 && itemType != 0) {
            for (uint256 i = 0; i < amount; i++) {
                itemNFT.mintItem(owner, itemType);
            }
            // Notify quest system
            if (questSystem != address(0)) {
                questSystem.call(
                    abi.encodeWithSignature(
                        "notifyGather(uint256,uint256,uint256)",
                        characterId, itemType, amount
                    )
                );
            }
        }

        emit LocalExploreResult(owner, characterId, tileId, outcome, itemType, amount);
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _pickCommonItem(uint256 seed, uint8 regionId) internal pure returns (uint256) {
        if (regionId == 0) {
            uint256[4] memory pool = [uint256(1), 2, 3, 4]; // Wood, Flint, Grass, Berry
            return pool[seed % 4];
        } else if (regionId == 1) {
            uint256[5] memory pool = [uint256(1), 13, 15, 3, 4]; // Wood, IronOre, Mushroom, Grass, Berry
            return pool[seed % 5];
        } else if (regionId == 2) {
            uint256[4] memory pool = [uint256(13), 19, 15, 18]; // IronOre, AncientFragment, Mushroom, Hardwood
            return pool[seed % 4];
        } else if (regionId == 3) {
            uint256[3] memory pool = [uint256(20), 11, 19]; // ShadowCrystal, ShadowMaterial, AncientFragment
            return pool[seed % 3];
        } else {
            uint256[3] memory pool = [uint256(21), 13, 19]; // LavaRock, IronOre, AncientFragment
            return pool[seed % 3];
        }
    }

    function _pickRareItem(uint256 seed, uint8 regionId) internal pure returns (uint256) {
        if (regionId == 0) {
            uint256[2] memory pool = [uint256(9), 10]; // Leather, Bone
            return pool[seed % 2];
        } else if (regionId == 1) {
            uint256[3] memory pool = [uint256(18), 9, 15]; // Hardwood, Leather, Mushroom
            return pool[seed % 3];
        } else if (regionId == 2) {
            uint256[2] memory pool = [uint256(19), 18]; // AncientFragment, Hardwood
            return pool[seed % 2];
        } else if (regionId == 3) {
            uint256[2] memory pool = [uint256(20), 11]; // ShadowCrystal, ShadowMaterial
            return pool[seed % 2];
        } else {
            uint256[2] memory pool = [uint256(21), 20]; // LavaRock, ShadowCrystal
            return pool[seed % 2];
        }
    }
}
