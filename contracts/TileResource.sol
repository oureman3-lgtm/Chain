// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TileResource
 * @notice Shared per-tile resource pools with dynamic regeneration.
 *
 * Resource types per tile (seeded at tile initialisation):
 *   0 – Wood       (trees)
 *   1 – Flint      (rocks)
 *   2 – Grass
 *   3 – Berry
 *   4 – IronOre    (available in region ≥ 1)
 *   5 – Mushroom   (forest/ruins)
 *   6 – Fish       (special tiles)
 *   7 – Honey
 *   8 – Hardwood   (region ≥ 1)
 *   9 – AncientFragment (region ≥ 2)
 *  10 – ShadowCrystal  (region ≥ 3)
 *  11 – LavaRock        (region 4)
 *
 * Regeneration formula (per game-day, applied lazily on first access of a new day):
 *   activePlayers = WorldMap.tilePlayerCount(tileId)   (snapshotted by caller)
 *   activityCount = WorldMap.tileActivityCount(tileId, gameDay)
 *   activityMultiplier = clamp(200 + activityCount * 160, 200, 2000)   // ÷1000 ⇒ 0.2× … 2.0×
 *   regenAmount = baseRegen[resourceType] * activityMultiplier / 1000
 *   stock = min(stock + regenAmount, maxStock[resourceType])
 *
 * Consume:
 *   stock is decremented by the requested amount; reverts if insufficient.
 */
contract TileResource is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    uint8 public constant NUM_RESOURCE_TYPES = 12;

    // ── Per-resource-type configuration ──────────────────────────────────────

    struct ResourceConfig {
        uint256 maxStock;   // absolute cap
        uint256 baseRegen;  // added per game-day at 1.0× multiplier (activityCount=5)
        uint8   minRegion;  // only present in tiles at this region or higher
    }

    ResourceConfig[12] public resourceConfigs;

    // ── Per-tile state ────────────────────────────────────────────────────────

    struct TileStock {
        uint256[12] stock;
        uint256     lastRegenDay; // last game-day regen was applied
    }

    /// tileId → stock state
    mapping(uint256 => TileStock) private _tiles;
    /// tileId → whether the tile has been initialised
    mapping(uint256 => bool) public tileInitialised;

    // ── External deps (set at deploy) ────────────────────────────────────────

    address public worldMap; // IWorldMap for activity queries

    // ── Events ────────────────────────────────────────────────────────────────

    event TileInitialised(uint256 indexed tileId, uint8 regionId);
    event ResourceConsumed(uint256 indexed tileId, uint8 resourceType, uint256 amount, uint256 remaining);
    event ResourceRegenerated(uint256 indexed tileId, uint256 gameDay);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address admin, address _worldMap) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);
        worldMap = _worldMap;

        // type 0  Wood          maxStock=50  baseRegen=8  minRegion=0
        resourceConfigs[0]  = ResourceConfig(50,  8,  0);
        // type 1  Flint         maxStock=30  baseRegen=5  minRegion=0
        resourceConfigs[1]  = ResourceConfig(30,  5,  0);
        // type 2  Grass         maxStock=60  baseRegen=10 minRegion=0
        resourceConfigs[2]  = ResourceConfig(60,  10, 0);
        // type 3  Berry         maxStock=40  baseRegen=7  minRegion=0
        resourceConfigs[3]  = ResourceConfig(40,  7,  0);
        // type 4  IronOre       maxStock=20  baseRegen=3  minRegion=1
        resourceConfigs[4]  = ResourceConfig(20,  3,  1);
        // type 5  Mushroom      maxStock=25  baseRegen=4  minRegion=1
        resourceConfigs[5]  = ResourceConfig(25,  4,  1);
        // type 6  Fish          maxStock=20  baseRegen=3  minRegion=0
        resourceConfigs[6]  = ResourceConfig(20,  3,  0);
        // type 7  Honey         maxStock=15  baseRegen=2  minRegion=0
        resourceConfigs[7]  = ResourceConfig(15,  2,  0);
        // type 8  Hardwood      maxStock=20  baseRegen=3  minRegion=1
        resourceConfigs[8]  = ResourceConfig(20,  3,  1);
        // type 9  AncientFragment maxStock=10 baseRegen=1 minRegion=2
        resourceConfigs[9]  = ResourceConfig(10,  1,  2);
        // type 10 ShadowCrystal  maxStock=8  baseRegen=1 minRegion=3
        resourceConfigs[10] = ResourceConfig(8,   1,  3);
        // type 11 LavaRock       maxStock=8  baseRegen=1 minRegion=4
        resourceConfigs[11] = ResourceConfig(8,   1,  4);
    }

    // ── WorldMap reference update ─────────────────────────────────────────────

    function setWorldMap(address _worldMap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        worldMap = _worldMap;
    }

    // ── Tile initialisation ───────────────────────────────────────────────────

    /**
     * @notice Seed a tile's initial resource stocks based on its region.
     *         Called once per tile (lazy initialisation by GatherOracle/GameRegistry).
     * @param tileId   Encoded tile ID (see WorldMap for encoding).
     * @param regionId Region index [0-4].
     */
    function initTile(uint256 tileId, uint8 regionId) external onlyRole(GAME_ROLE) {
        require(!tileInitialised[tileId], "TileResource: already initialised");
        tileInitialised[tileId] = true;

        TileStock storage ts = _tiles[tileId];
        for (uint8 i = 0; i < NUM_RESOURCE_TYPES; i++) {
            if (resourceConfigs[i].minRegion <= regionId) {
                // Start at 60% of max stock
                ts.stock[i] = resourceConfigs[i].maxStock * 6 / 10;
            }
            // else stays at 0 (not available in this region)
        }
        ts.lastRegenDay = 0;
        emit TileInitialised(tileId, regionId);
    }

    // ── Regen (lazy, applied on first access per day) ─────────────────────────

    /**
     * @notice Apply pending regeneration up to `gameDay`.
     *         Anyone can call (no side-effects beyond state update).
     *         Called internally before any consume/query.
     */
    function applyRegen(uint256 tileId, uint256 gameDay) public {
        if (!tileInitialised[tileId]) return;
        TileStock storage ts = _tiles[tileId];
        if (ts.lastRegenDay >= gameDay) return;

        uint256 daysDelta = gameDay - ts.lastRegenDay;
        // Compute activity multiplier for the PREVIOUS day
        // (activity count is known only for completed days)
        uint256 activityCount = _getActivityCount(tileId, gameDay > 0 ? gameDay - 1 : 0);
        // activityMultiplier: 200..2000 (÷1000 → 0.2× … 2.0×)
        uint256 multiplier = 200 + activityCount * 160;
        if (multiplier > 2000) multiplier = 2000;

        for (uint8 i = 0; i < NUM_RESOURCE_TYPES; i++) {
            if (resourceConfigs[i].baseRegen == 0) continue;
            uint256 regen = resourceConfigs[i].baseRegen * multiplier * daysDelta / 1000;
            uint256 newStock = ts.stock[i] + regen;
            uint256 cap = resourceConfigs[i].maxStock;
            ts.stock[i] = newStock > cap ? cap : newStock;
        }
        ts.lastRegenDay = gameDay;
        emit ResourceRegenerated(tileId, gameDay);
    }

    // ── Consumption ───────────────────────────────────────────────────────────

    /**
     * @notice Consume `amount` units of `resourceType` from the shared tile pool.
     *         Applies pending regen first.
     * @param tileId        Encoded tile ID.
     * @param resourceType  Index [0-11].
     * @param amount        Units to consume (≥1).
     * @param gameDay       Current game day (for regen).
     */
    function consume(
        uint256 tileId,
        uint8   resourceType,
        uint256 amount,
        uint256 gameDay
    ) external onlyRole(GAME_ROLE) {
        require(resourceType < NUM_RESOURCE_TYPES, "TileResource: invalid type");
        require(amount > 0, "TileResource: zero amount");

        // Lazy init if needed (shouldn't happen in normal flow, but defensive)
        if (!tileInitialised[tileId]) revert("TileResource: tile not initialised");

        applyRegen(tileId, gameDay);

        TileStock storage ts = _tiles[tileId];
        require(ts.stock[resourceType] >= amount, "TileResource: insufficient stock");
        ts.stock[resourceType] -= amount;

        emit ResourceConsumed(tileId, resourceType, amount, ts.stock[resourceType]);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /**
     * @notice Get current stock of a resource type on a tile (after pending regen).
     *         Read-only: does NOT mutate state.
     */
    function getStock(uint256 tileId, uint8 resourceType, uint256 gameDay)
        external view returns (uint256)
    {
        require(resourceType < NUM_RESOURCE_TYPES, "TileResource: invalid type");
        if (!tileInitialised[tileId]) return 0;

        TileStock storage ts = _tiles[tileId];
        uint256 stock = ts.stock[resourceType];

        // Simulate pending regen (view, no state change)
        if (ts.lastRegenDay < gameDay) {
            uint256 daysDelta = gameDay - ts.lastRegenDay;
            uint256 activityCount = _getActivityCount(tileId, gameDay > 0 ? gameDay - 1 : 0);
            uint256 multiplier = 200 + activityCount * 160;
            if (multiplier > 2000) multiplier = 2000;

            uint256 regen = resourceConfigs[resourceType].baseRegen * multiplier * daysDelta / 1000;
            stock += regen;
            uint256 cap = resourceConfigs[resourceType].maxStock;
            if (stock > cap) stock = cap;
        }
        return stock;
    }

    /// Return all 12 stock values for a tile (after simulated regen).
    function getAllStock(uint256 tileId, uint256 gameDay)
        external view returns (uint256[12] memory stocks)
    {
        if (!tileInitialised[tileId]) return stocks; // all zeros

        TileStock storage ts = _tiles[tileId];
        uint256 daysDelta = ts.lastRegenDay < gameDay ? gameDay - ts.lastRegenDay : 0;
        uint256 multiplier;
        if (daysDelta > 0) {
            uint256 activityCount = _getActivityCount(tileId, gameDay > 0 ? gameDay - 1 : 0);
            multiplier = 200 + activityCount * 160;
            if (multiplier > 2000) multiplier = 2000;
        }

        for (uint8 i = 0; i < NUM_RESOURCE_TYPES; i++) {
            uint256 s = ts.stock[i];
            if (daysDelta > 0 && resourceConfigs[i].baseRegen > 0) {
                uint256 regen = resourceConfigs[i].baseRegen * multiplier * daysDelta / 1000;
                s += regen;
                uint256 cap = resourceConfigs[i].maxStock;
                if (s > cap) s = cap;
            }
            stocks[i] = s;
        }
    }

    function getResourceConfig(uint8 resourceType)
        external view returns (ResourceConfig memory)
    {
        require(resourceType < NUM_RESOURCE_TYPES, "TileResource: invalid type");
        return resourceConfigs[resourceType];
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _getActivityCount(uint256 tileId, uint256 gameDay)
        internal view returns (uint256)
    {
        if (worldMap == address(0)) return 5; // fallback: assume moderate activity
        // IWorldMap.getTileActivity(tileId, gameDay)
        (bool ok, bytes memory data) = worldMap.staticcall(
            abi.encodeWithSignature("getTileActivity(uint256,uint256)", tileId, gameDay)
        );
        if (!ok || data.length < 32) return 5;
        return abi.decode(data, (uint256));
    }
}
