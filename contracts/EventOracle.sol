// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title EventOracle
 * @notice Stateless, deterministic daily tile events for Axiom Wilds.
 *         No storage – pure computation only.
 *         Any caller can query any tile/day combination.
 *
 * ── Event probability distribution (38% event days total) ────────────────────
 *   4%  MERCHANT_VISIT    – wandering trader; accepts resources for rare items
 *   4%  METEOR_SHOWER     – rare ores fall from sky; attracts monsters
 *   4%  HAUNTED_NIGHT     – monsters +50% stats tonight
 *   4%  RESOURCE_BLOOM    – gather yields ×2 today
 *   2%  ANCIENT_PORTAL    – dungeon entrance opens (player must activate)
 *   3%  CURSED_RAIN       – sanity drain ×2 today
 *   3%  ABANDONED_CAMP    – explore to find survivor loot cache
 *   4%  BLOOD_MOON        – all monsters +100% HP & double loot; rare transformation items
 *   3%  CRYSTAL_STORM     – crystal/flint/ice resources ×3; reduced visibility
 *   2%  VOID_RIFT         – void essence drops; random tile shift on move
 *   3%  SACRED_SPRING     – passive HP/sanity restore per action
 *   2%  BEAST_MIGRATION   – monster encounters ×3; XP bonus
 *   2%  PLAGUE_WIND       – sanity decay ×3; items degrade faster
 *   2%  TRADER_CARAVAN    – premium merchant; rare & legendary items available
 *  62%  NONE
 */
contract EventOracle {

    // ── Event type enum ────────────────────────────────────────────────────────

    enum EventType {
        NONE,             //  0 – 62%
        MERCHANT_VISIT,   //  1 –  4%
        METEOR_SHOWER,    //  2 –  4%
        HAUNTED_NIGHT,    //  3 –  4%
        RESOURCE_BLOOM,   //  4 –  4%
        ANCIENT_PORTAL,   //  5 –  2%
        CURSED_RAIN,      //  6 –  3%
        ABANDONED_CAMP,   //  7 –  3%
        BLOOD_MOON,       //  8 –  4%
        CRYSTAL_STORM,    //  9 –  3%
        VOID_RIFT,        // 10 –  2%
        SACRED_SPRING,    // 11 –  3%
        BEAST_MIGRATION,  // 12 –  2%
        PLAGUE_WIND,      // 13 –  2%
        TRADER_CARAVAN    // 14 –  2%
    }

    struct EventInfo {
        EventType eventType;
        uint256   intensity;       // 30–100; scales magnitude of event effects
        bool      requiresAction;  // if true, player must activate to trigger benefit
    }

    // ── Core query ────────────────────────────────────────────────────────────

    /**
     * @notice Get the deterministic event for a tile on a given game-day.
     * @param tileId   Encoded tile ID (regionId × 1e6 + y × 1e3 + x).
     * @param gameDay  Logical day counter (same as daysSurvived in GameRegistry).
     */
    function getTileEvent(uint256 tileId, uint256 gameDay)
        public pure returns (EventInfo memory info)
    {
        uint256 seed = uint256(keccak256(abi.encodePacked(tileId, gameDay, "ev2")));
        uint256 roll = seed % 100;
        info.intensity = 30 + (seed >> 8) % 71; // 30–100

        //  0– 3 (4%) MERCHANT_VISIT
        if      (roll <  4)  { info.eventType = EventType.MERCHANT_VISIT;  info.requiresAction = true;  }
        //  4– 7 (4%) METEOR_SHOWER
        else if (roll <  8)  { info.eventType = EventType.METEOR_SHOWER;   info.requiresAction = false; }
        //  8–11 (4%) HAUNTED_NIGHT
        else if (roll < 12)  { info.eventType = EventType.HAUNTED_NIGHT;   info.requiresAction = false; }
        // 12–15 (4%) RESOURCE_BLOOM
        else if (roll < 16)  { info.eventType = EventType.RESOURCE_BLOOM;  info.requiresAction = false; }
        // 16–17 (2%) ANCIENT_PORTAL
        else if (roll < 18)  { info.eventType = EventType.ANCIENT_PORTAL;  info.requiresAction = true;  }
        // 18–20 (3%) CURSED_RAIN
        else if (roll < 21)  { info.eventType = EventType.CURSED_RAIN;     info.requiresAction = false; }
        // 21–23 (3%) ABANDONED_CAMP
        else if (roll < 24)  { info.eventType = EventType.ABANDONED_CAMP;  info.requiresAction = true;  }
        // 24–27 (4%) BLOOD_MOON
        else if (roll < 28)  { info.eventType = EventType.BLOOD_MOON;      info.requiresAction = false; }
        // 28–30 (3%) CRYSTAL_STORM
        else if (roll < 31)  { info.eventType = EventType.CRYSTAL_STORM;   info.requiresAction = false; }
        // 31–32 (2%) VOID_RIFT
        else if (roll < 33)  { info.eventType = EventType.VOID_RIFT;       info.requiresAction = true;  }
        // 33–35 (3%) SACRED_SPRING
        else if (roll < 36)  { info.eventType = EventType.SACRED_SPRING;   info.requiresAction = false; }
        // 36–37 (2%) BEAST_MIGRATION
        else if (roll < 38)  { info.eventType = EventType.BEAST_MIGRATION; info.requiresAction = false; }
        // 38–39 (2%) PLAGUE_WIND
        else if (roll < 40)  { info.eventType = EventType.PLAGUE_WIND;     info.requiresAction = false; }
        // 40–41 (2%) TRADER_CARAVAN
        else if (roll < 42)  { info.eventType = EventType.TRADER_CARAVAN;  info.requiresAction = true;  }
        // else NONE (58% + rounding)
    }

    // ── Multiplier helpers (scaled ×100; 100 = 1.0×) ─────────────────────────

    /**
     * @notice Gather yield multiplier for a tile/day.
     *  RESOURCE_BLOOM → 200, METEOR_SHOWER → 150, CRYSTAL_STORM → 300 (crystal types only signalled externally)
     */
    function getGatherMultiplier(uint256 tileId, uint256 gameDay)
        external pure returns (uint256)
    {
        EventType et = getTileEvent(tileId, gameDay).eventType;
        if (et == EventType.RESOURCE_BLOOM) return 200;
        if (et == EventType.METEOR_SHOWER)  return 150;
        if (et == EventType.CRYSTAL_STORM)  return 300;
        return 100;
    }

    /**
     * @notice Combat multiplier. HAUNTED_NIGHT/BLOOD_MOON boost monster stats.
     *         SACRED_SPRING reduces incoming damage slightly.
     * @return monster stat multiplier (applied to HP, ATK, DEF)
     */
    function getCombatMultiplier(uint256 tileId, uint256 gameDay, bool isNight)
        external pure returns (uint256)
    {
        EventType et = getTileEvent(tileId, gameDay).eventType;
        if (et == EventType.BLOOD_MOON)                     return 200; // always
        if (et == EventType.HAUNTED_NIGHT && isNight)       return 150;
        if (et == EventType.BEAST_MIGRATION)                return 120;
        return 100;
    }

    /**
     * @notice Loot quantity multiplier (1–3 items normally, ×N on events).
     *         BLOOD_MOON doubles loot drops.
     */
    function getLootMultiplier(uint256 tileId, uint256 gameDay)
        external pure returns (uint256)
    {
        if (getTileEvent(tileId, gameDay).eventType == EventType.BLOOD_MOON) return 200;
        return 100;
    }

    /**
     * @notice Sanity decay multiplier. Higher = faster decay.
     *  CURSED_RAIN → ×2, PLAGUE_WIND → ×3, HAUNTED_NIGHT → ×1.5 (×150)
     */
    function getSanityDecayMultiplier(uint256 tileId, uint256 gameDay)
        external pure returns (uint256)
    {
        EventType et = getTileEvent(tileId, gameDay).eventType;
        if (et == EventType.PLAGUE_WIND)  return 300;
        if (et == EventType.CURSED_RAIN)  return 200;
        if (et == EventType.HAUNTED_NIGHT) return 150;
        return 100;
    }

    /**
     * @notice Passive healing multiplier from SACRED_SPRING.
     *         Returns basis points of max-HP restored per action while on the tile.
     *         0 = no healing; non-zero = spring active.
     */
    function getSacredSpringHeal(uint256 tileId, uint256 gameDay)
        external pure returns (uint256 basisPoints)
    {
        EventInfo memory info = getTileEvent(tileId, gameDay);
        if (info.eventType == EventType.SACRED_SPRING) {
            return 50 + info.intensity / 2; // 50–100 bp per action (~0.5-1% maxHP)
        }
        return 0;
    }

    /**
     * @notice Returns true when the ABANDONED_CAMP is present.
     */
    function hasAbandonedCamp(uint256 tileId, uint256 gameDay)
        external pure returns (bool)
    {
        return getTileEvent(tileId, gameDay).eventType == EventType.ABANDONED_CAMP;
    }

    /**
     * @notice Returns true when VOID_RIFT is present (enables void loot + tile shift).
     */
    function hasVoidRift(uint256 tileId, uint256 gameDay)
        external pure returns (bool)
    {
        return getTileEvent(tileId, gameDay).eventType == EventType.VOID_RIFT;
    }

    /**
     * @notice Deterministic meteor loot item type.
     *         Possible: IronOre(13), AncientFragment(19), ShadowCrystal(20),
     *                   LavaRock(21), CrystalShard(40), GlacierIce(44), VoidEssence(45)
     */
    function getMeteorLootType(uint256 tileId, uint256 gameDay)
        external pure returns (uint256 itemType)
    {
        uint256 seed = uint256(keccak256(abi.encodePacked(tileId, gameDay, "meteor2")));
        uint256[7] memory ores = [uint256(13), 19, 20, 21, 40, 44, 45];
        return ores[seed % 7];
    }

    /**
     * @notice Deterministic void rift loot item type (void-tier only).
     */
    function getVoidRiftLootType(uint256 tileId, uint256 gameDay)
        external pure returns (uint256 itemType)
    {
        uint256 seed = uint256(keccak256(abi.encodePacked(tileId, gameDay, "void")));
        uint256[3] memory voidItems = [uint256(45), 65, 64]; // VoidEssence, VoidShard, VoidCore
        return voidItems[seed % 3];
    }

    /**
     * @notice Generate a deterministic quest seed for a character on a given day.
     */
    function getDailyQuestSeed(uint256 characterId, uint256 gameDay)
        external pure returns (uint256)
    {
        return uint256(keccak256(abi.encodePacked(characterId, gameDay, "quest2")));
    }

    /**
     * @notice Monster spawn count multiplier for BEAST_MIGRATION.
     *         Returns 100 normally, 300 during migration.
     */
    function getSpawnMultiplier(uint256 tileId, uint256 gameDay)
        external pure returns (uint256)
    {
        if (getTileEvent(tileId, gameDay).eventType == EventType.BEAST_MIGRATION) return 300;
        return 100;
    }
}
