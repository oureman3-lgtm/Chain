// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title EventOracle
 * @notice Stateless, deterministic daily events per tile.
 *         No storage – pure computation only.
 *         Any player can query any tile/day combination.
 *
 * Event probability per day per tile (28% event days):
 *   5%  MERCHANT_VISIT   – trader appears, accepts resource NFTs for rare items
 *   5%  METEOR_SHOWER    – rare ores drop; also attracts monsters
 *   5%  HAUNTED_NIGHT    – all night-time monsters +50% stats tonight
 *   5%  RESOURCE_BLOOM   – gather yields ×2 today (applied to TileResource regen)
 *   2%  ANCIENT_PORTAL   – dungeon entrance opens (requires player activation)
 *   3%  CURSED_RAIN      – sanity drain ×2 today
 *   3%  ABANDONED_CAMP   – explore to find survivor's loot cache
 *  72%  NONE
 */
contract EventOracle {
    enum EventType {
        NONE,            // 0
        MERCHANT_VISIT,  // 1
        METEOR_SHOWER,   // 2
        HAUNTED_NIGHT,   // 3
        RESOURCE_BLOOM,  // 4
        ANCIENT_PORTAL,  // 5
        CURSED_RAIN,     // 6
        ABANDONED_CAMP   // 7
    }

    struct EventInfo {
        EventType eventType;
        uint256   intensity;      // 1–100; affects magnitude of event effects
        bool      requiresAction; // if true, player must call activateEvent to trigger
    }

    // ── Core query ────────────────────────────────────────────────────────────

    /**
     * @notice Get the event for a given tile on a given game-day.
     * @param tileId    Encoded tile identifier (regionId*1e6 + y*1e3 + x).
     * @param gameDay   Logical day counter (same as daysSurvived in GameRegistry).
     */
    function getTileEvent(uint256 tileId, uint256 gameDay)
        public pure returns (EventInfo memory info)
    {
        uint256 seed = uint256(keccak256(abi.encodePacked(tileId, gameDay, "ev1")));
        uint256 roll = seed % 100;
        info.intensity = 30 + (seed >> 8) % 71; // 30–100

        if      (roll < 5)  { info.eventType = EventType.MERCHANT_VISIT;  info.requiresAction = true;  }
        else if (roll < 10) { info.eventType = EventType.METEOR_SHOWER;   info.requiresAction = false; }
        else if (roll < 15) { info.eventType = EventType.HAUNTED_NIGHT;   info.requiresAction = false; }
        else if (roll < 20) { info.eventType = EventType.RESOURCE_BLOOM;  info.requiresAction = false; }
        else if (roll < 22) { info.eventType = EventType.ANCIENT_PORTAL;  info.requiresAction = true;  }
        else if (roll < 25) { info.eventType = EventType.CURSED_RAIN;     info.requiresAction = false; }
        else if (roll < 28) { info.eventType = EventType.ABANDONED_CAMP;  info.requiresAction = true;  }
        // else NONE
    }

    // ── Multiplier helpers (scaled ×100; 100 = 1.0×) ─────────────────────────

    /**
     * @notice Gather yield multiplier for a tile/day.
     *         RESOURCE_BLOOM → 200 (×2), METEOR_SHOWER adds 50% bonus.
     */
    function getGatherMultiplier(uint256 tileId, uint256 gameDay)
        external pure returns (uint256)
    {
        EventType et = getTileEvent(tileId, gameDay).eventType;
        if (et == EventType.RESOURCE_BLOOM) return 200;
        if (et == EventType.METEOR_SHOWER)  return 150;
        return 100;
    }

    /**
     * @notice Combat difficulty multiplier (only meaningful at night).
     *         HAUNTED_NIGHT → all monsters +50% stats.
     */
    function getCombatMultiplier(uint256 tileId, uint256 gameDay, bool isNight)
        external pure returns (uint256)
    {
        if (!isNight) return 100;
        if (getTileEvent(tileId, gameDay).eventType == EventType.HAUNTED_NIGHT) return 150;
        return 100;
    }

    /**
     * @notice Sanity decay multiplier for a tile/day.
     *         CURSED_RAIN → 2× faster sanity drain.
     */
    function getSanityDecayMultiplier(uint256 tileId, uint256 gameDay)
        external pure returns (uint256)
    {
        if (getTileEvent(tileId, gameDay).eventType == EventType.CURSED_RAIN) return 200;
        return 100;
    }

    /**
     * @notice Returns true when an ABANDONED_CAMP is present and can yield loot.
     */
    function hasAbandonedCamp(uint256 tileId, uint256 gameDay)
        external pure returns (bool)
    {
        return getTileEvent(tileId, gameDay).eventType == EventType.ABANDONED_CAMP;
    }

    /**
     * @notice Deterministic loot type from meteor shower for a tile/day (for METEOR_SHOWER).
     *         Returns item type ID of the ore that falls.
     */
    function getMeteorLootType(uint256 tileId, uint256 gameDay)
        external pure returns (uint256 itemType)
    {
        uint256 seed = uint256(keccak256(abi.encodePacked(tileId, gameDay, "meteor")));
        // Possible rare ores: IronOre(13), AncientFragment(19), ShadowCrystal(20), LavaRock(21)
        uint256[4] memory ores = [uint256(13), 19, 20, 21];
        return ores[seed % 4];
    }

    /**
     * @notice Generate random quest seed for a character on a given day.
     *         Used by QuestSystem to deterministically pick a daily quest.
     */
    function getDailyQuestSeed(uint256 characterId, uint256 gameDay)
        external pure returns (uint256)
    {
        return uint256(keccak256(abi.encodePacked(characterId, gameDay, "quest")));
    }
}
