// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./CharacterNFT.sol";
import "./ItemNFT.sol";

/**
 * @title GatherOracle
 * @notice Resolves gathering outcomes using on-chain pseudorandom + character luck.
 *         Integrates TileResource (shared pool), QuestSystem notifications,
 *         and CharacterNFT special abilities.
 *
 * Resource node types:
 *  0 = Tree           → Wood (1)
 *  1 = Rock           → Flint (2)
 *  2 = GrassPatch     → Grass (3)
 *  3 = BerryBush      → Berry (4)
 *  4 = IronDeposit    → IronOre (13)      [region ≥ 1]
 *  5 = MushroomPatch  → Mushroom (15)     [region ≥ 1]
 *  6 = FishingSpot    → Fish (16)
 *  7 = Beehive        → Honey (17)
 *  8 = HardwoodTree   → Hardwood (18)     [region ≥ 1]
 *  9 = ClayDeposit    → Clay (37)
 * 10 = CoalSeam       → Coal (38)         [region ≥ 1]
 * 11 = SulfurVent     → Sulfur (39)       [region ≥ 2]
 * 12 = CrystalCluster → CrystalShard (40) [region ≥ 1]
 * 13 = VinePatch      → Vine (41)
 * 14 = HerbalGarden   → HerbalRoot (42)
 * 15 = SpiderNest     → SpiderSilk (43)   [region ≥ 1]; chance for SpiderFang(62)
 * 16 = GlacierFissure → GlacierIce (44)   [region ≥ 3]
 *
 * Special ability bonuses (from CharacterNFT):
 *   SA=3 LUCKY_HARVEST (Lila)    : gather amount ×1.5 (rounded up)
 *   SA=1 FIRE_AFFINITY (Kira)    : +1 extra on SulfurVent / Meteor-region nodes
 *
 * localExplore outcomes:
 *   ≥ nothing_threshold% – nothing found
 *   4%  – event hint (LocalEventFound emitted)
 *   1%  – hidden stash (2-3 items)
 *   15% – rare item
 *   rest – common item
 */
contract GatherOracle is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    CharacterNFT public characterNFT;
    ItemNFT      public itemNFT;

    address public tileResource;
    address public questSystem;

    mapping(uint256 => uint256) public gatherNonce;
    mapping(uint256 => uint256) public exploreNonce;

    struct ResourceDef {
        uint256 itemType;
        uint256 baseAmount;
        uint256 luckDivisor;     // extra = luck / luckDivisor
        uint8   tileResourceType; // TileResource pool index (255 = not pool-backed)
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
        uint8   outcome,    // 0=nothing,1=common,2=rare,3=event,4=stash
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

        // itemType, baseAmt, luckDiv, tileRT
        resources[0]  = ResourceDef(1,  1, 10, 0);   // Tree → Wood
        resources[1]  = ResourceDef(2,  1, 15, 1);   // Rock → Flint
        resources[2]  = ResourceDef(3,  1,  8, 2);   // GrassPatch → Grass
        resources[3]  = ResourceDef(4,  1, 10, 3);   // BerryBush → Berry
        resources[4]  = ResourceDef(13, 1, 12, 4);   // IronDeposit → IronOre
        resources[5]  = ResourceDef(15, 1,  8, 5);   // MushroomPatch → Mushroom
        resources[6]  = ResourceDef(16, 1, 10, 6);   // FishingSpot → Fish
        resources[7]  = ResourceDef(17, 1, 15, 7);   // Beehive → Honey
        resources[8]  = ResourceDef(18, 1, 12, 8);   // HardwoodTree → Hardwood
        resources[9]  = ResourceDef(37, 1, 10, 12);  // ClayDeposit → Clay
        resources[10] = ResourceDef(38, 1, 12, 13);  // CoalSeam → Coal
        resources[11] = ResourceDef(39, 1, 15, 14);  // SulfurVent → Sulfur
        resources[12] = ResourceDef(40, 1, 12, 15);  // CrystalCluster → CrystalShard
        resources[13] = ResourceDef(41, 1,  8, 16);  // VinePatch → Vine
        resources[14] = ResourceDef(42, 1, 10, 17);  // HerbalGarden → HerbalRoot
        resources[15] = ResourceDef(43, 1, 12, 255); // SpiderNest → SpiderSilk (not pool)
        resources[16] = ResourceDef(44, 1, 18, 255); // GlacierFissure → GlacierIce (not pool)
    }

    // ── Setters ───────────────────────────────────────────────────────────────

    function setTileResource(address _t) external onlyRole(DEFAULT_ADMIN_ROLE) { tileResource = _t; }
    function setQuestSystem(address _q)  external onlyRole(DEFAULT_ADMIN_ROLE) { questSystem  = _q; }

    // ── Standard gather ───────────────────────────────────────────────────────

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

        uint256 nonce = gatherNonce[characterId]++;
        uint256 seed  = uint256(keccak256(abi.encodePacked(
            blockhash(block.number - 1), characterId, nonce, tileId
        )));

        // Base amount
        uint256 luckBonus = stats.luck / res.luckDivisor;
        uint256 extra     = luckBonus > 0 ? seed % (luckBonus + 1) : 0;
        uint256 amount    = res.baseAmount + extra;

        // SA=3 LUCKY_HARVEST: ×1.5 (rounded up)
        if (stats.specialAbility == 3) {
            amount = (amount * 3 + 1) / 2;
        }
        // SA=1 FIRE_AFFINITY: +1 on sulfur/lava nodes
        if (stats.specialAbility == 1 && resourceType == 11) {
            amount += 1;
        }

        if (amount > 6) amount = 6; // hard cap

        // Consume from shared tile pool
        if (tileResource != address(0) && res.tileResourceType != 255) {
            (bool ok, bytes memory data) = tileResource.staticcall(
                abi.encodeWithSignature(
                    "getStock(uint256,uint8,uint256)",
                    tileId, res.tileResourceType, gameDay
                )
            );
            if (ok && data.length >= 32) {
                uint256 avail = abi.decode(data, (uint256));
                if (avail < amount) amount = avail;
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

        // SpiderNest: small chance to also drop SpiderFang(62)
        if (resourceType == 15 && amount > 0) {
            if ((seed >> 16) % 4 == 0) { // 25% chance
                itemNFT.mintItem(owner, 62);
            }
        }

        emit GatherResolved(owner, characterId, resourceType, res.itemType, amount);

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
            blockhash(block.number - 1), characterId, tileId, nonce, "explore"
        )));

        uint256 roll = seed % 100;

        // Luck lowers nothing threshold; LUCKY_HARVEST halves it further
        uint256 nothingMax = stats.luck >= 40 ? 10 : stats.luck >= 20 ? 15 : 20;
        if (stats.specialAbility == 3) nothingMax = nothingMax / 2 + 1;

        if (roll < nothingMax) {
            outcome = 0; itemType = 0; amount = 0;
        } else if (roll < nothingMax + 4) {
            outcome = 3; itemType = 0; amount = 0;
            emit LocalEventFound(characterId, tileId, gameDay);
        } else if (roll < nothingMax + 5) {
            outcome = 4;
            amount   = 2 + (seed >> 8) % 2;
            itemType = _pickRareItem(seed >> 16, regionId);
        } else if (roll < nothingMax + 20) {
            outcome  = 2;
            amount   = 1;
            itemType = _pickRareItem(seed >> 8, regionId);
        } else {
            outcome  = 1;
            amount   = 1;
            itemType = _pickCommonItem(seed >> 8, regionId);
        }

        address owner = characterNFT.ownerOf(characterId);
        if (amount > 0 && itemType != 0) {
            for (uint256 i = 0; i < amount; i++) {
                itemNFT.mintItem(owner, itemType);
            }
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
            // Grasslands: wood, flint, grass, berry, clay, vine, herb
            uint256[7] memory pool = [uint256(1), 2, 3, 4, 37, 41, 42];
            return pool[seed % 7];
        } else if (regionId == 1) {
            // Dark Forest: iron, mushroom, hardwood, coal, crystal, spider silk
            uint256[6] memory pool = [uint256(13), 15, 18, 38, 40, 43];
            return pool[seed % 6];
        } else if (regionId == 2) {
            // Ruins: iron, ancient fragment, mushroom, hardwood, sulfur
            uint256[5] memory pool = [uint256(13), 19, 15, 18, 39];
            return pool[seed % 5];
        } else if (regionId == 3) {
            // Shadow Realm: shadow crystal, shadow material, void essence, coal
            uint256[4] memory pool = [uint256(20), 11, 45, 38];
            return pool[seed % 4];
        } else {
            // Volcano: lava rock, sulfur, iron, coal, void essence
            uint256[5] memory pool = [uint256(21), 39, 13, 38, 45];
            return pool[seed % 5];
        }
    }

    function _pickRareItem(uint256 seed, uint8 regionId) internal pure returns (uint256) {
        if (regionId == 0) {
            uint256[3] memory pool = [uint256(9), 10, 41]; // Leather, Bone, Vine
            return pool[seed % 3];
        } else if (regionId == 1) {
            uint256[4] memory pool = [uint256(18), 62, 40, 63]; // Hardwood, SpiderFang, Crystal, WolfPelt
            return pool[seed % 4];
        } else if (regionId == 2) {
            uint256[3] memory pool = [uint256(19), 46, 18]; // AncientFragment, AncientAlloy, Hardwood
            return pool[seed % 3];
        } else if (regionId == 3) {
            uint256[3] memory pool = [uint256(20), 65, 64]; // ShadowCrystal, VoidShard, VoidCore
            return pool[seed % 3];
        } else {
            uint256[3] memory pool = [uint256(21), 66, 65]; // LavaRock, GlacierCrystal, VoidShard
            return pool[seed % 3];
        }
    }
}
