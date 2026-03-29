// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title WorldMap
 * @notice Manages 5 progressive regions, their tile grids, and character movement.
 *
 * Tile ID encoding:
 *   tileId = regionId * 1_000_000 + tileY * 1_000 + tileX
 *   Example: Region 1, (2, 3) → 1_003_002
 *
 * Regions:
 *   0 – Grasslands (always available,  5×5 tiles)
 *   1 – Dark Forest  (day  7+,  4×4 tiles)
 *   2 – Ruins        (day 14+,  3×3 tiles)
 *   3 – Shadow Realm (day 21+,  2×2 tiles)
 *   4 – Volcano      (day 30+,  2×2 tiles)
 *
 * Starting tile: region 0, centre (2,2) → tileId 2_002
 *
 * Movement rules:
 *   • Same region: target must be adjacent (Manhattan distance == 1) and in-bounds.
 *   • Cross-region: daysSurvived must meet new region's threshold; enter at any
 *     border cell (x==0 or y==0).
 *   • Each move costs AP (tracked by caller, e.g. GameRegistry).
 *
 * Activity tracking (for TileResource regen):
 *   • Keyed by (tileId, gameDay).  Counter resets automatically each day.
 *   • TileResource reads dailyActivityCount to compute regen multiplier.
 */
contract WorldMap is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    // ── Constants ─────────────────────────────────────────────────────────────

    uint256 public constant TILE_STRIDE   = 1_000;
    uint256 public constant REGION_STRIDE = 1_000_000;
    uint256 public constant START_TILE_ID = 2_002;  // region 0, (x=2, y=2)

    uint8 public constant NUM_REGIONS = 5;

    // ── Region definitions ────────────────────────────────────────────────────

    struct RegionDef {
        string  name;
        uint256 minDaysRequired; // days survived to enter
        uint256 gridW;           // number of tiles wide
        uint256 gridH;           // number of tiles tall
        uint8   biome;           // 0=grass, 1=forest, 2=ruins, 3=shadow, 4=volcano
    }

    RegionDef[5] public regions;

    // ── Character location state ──────────────────────────────────────────────

    /// characterId → current tileId
    mapping(uint256 => uint256) public characterTile;
    /// tileId → number of players currently on this tile
    mapping(uint256 => uint256) public tilePlayerCount;

    // ── Activity tracking ─────────────────────────────────────────────────────

    /// tileId → gameDay → number of distinct action-records this day
    mapping(uint256 => mapping(uint256 => uint256)) public tileActivityCount;

    // ── Events ────────────────────────────────────────────────────────────────

    event CharacterPlaced(uint256 indexed characterId, uint256 tileId);
    event CharacterMoved(uint256 indexed characterId, uint256 fromTile, uint256 toTile);
    event RegionEntered(uint256 indexed characterId, uint256 regionId);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);

        regions[0] = RegionDef(unicode"草原",     0,  5, 5, 0);
        regions[1] = RegionDef(unicode"黑森林",   7,  4, 4, 1);
        regions[2] = RegionDef(unicode"废墟",     14, 3, 3, 2);
        regions[3] = RegionDef(unicode"暗影领域", 21, 2, 2, 3);
        regions[4] = RegionDef(unicode"熔岩地带", 30, 2, 2, 4);
    }

    // ── Tile ID helpers ───────────────────────────────────────────────────────

    function encodeTileId(uint256 regionId, uint256 x, uint256 y)
        public pure returns (uint256)
    {
        return regionId * REGION_STRIDE + y * TILE_STRIDE + x;
    }

    function decodeTileId(uint256 tileId)
        public pure returns (uint256 regionId, uint256 x, uint256 y)
    {
        regionId = tileId / REGION_STRIDE;
        uint256 rem = tileId % REGION_STRIDE;
        y = rem / TILE_STRIDE;
        x = rem % TILE_STRIDE;
    }

    function getRegionOfTile(uint256 tileId) public pure returns (uint256) {
        return tileId / REGION_STRIDE;
    }

    // ── Initialisation (called once at registration) ──────────────────────────

    function initCharacter(uint256 characterId) external onlyRole(GAME_ROLE) {
        require(characterTile[characterId] == 0, "WorldMap: already placed");
        characterTile[characterId] = START_TILE_ID;
        tilePlayerCount[START_TILE_ID]++;
        emit CharacterPlaced(characterId, START_TILE_ID);
    }

    // ── Movement ──────────────────────────────────────────────────────────────

    /**
     * @notice Move a character to a new tile (on-chain verification).
     * @param characterId   NFT token ID of the character.
     * @param newTileId     Target tile (encoded).
     * @param daysSurvived  Character's current daysSurvived (for region gating).
     */
    function moveToTile(
        uint256 characterId,
        uint256 newTileId,
        uint256 daysSurvived
    ) external onlyRole(GAME_ROLE) {
        uint256 curTileId = characterTile[characterId];
        require(curTileId != newTileId, "WorldMap: already there");

        (uint256 curRegion, uint256 curX, uint256 curY) = decodeTileId(curTileId);
        (uint256 newRegion, uint256 newX, uint256 newY) = decodeTileId(newTileId);

        // Region bounds check
        require(newRegion < NUM_REGIONS, "WorldMap: invalid region");
        RegionDef storage reg = regions[newRegion];
        require(newX < reg.gridW && newY < reg.gridH, "WorldMap: tile out of bounds");

        if (newRegion != curRegion) {
            // Cross-region movement: check unlock requirement
            require(
                daysSurvived >= reg.minDaysRequired,
                "WorldMap: region not unlocked yet"
            );
        } else {
            // Same-region: must be adjacent (Manhattan == 1)
            uint256 dx = curX > newX ? curX - newX : newX - curX;
            uint256 dy = curY > newY ? curY - newY : newY - curY;
            require(dx + dy == 1, "WorldMap: must move to adjacent tile");
        }

        // Update player counts
        if (tilePlayerCount[curTileId] > 0) tilePlayerCount[curTileId]--;
        tilePlayerCount[newTileId]++;

        characterTile[characterId] = newTileId;
        emit CharacterMoved(characterId, curTileId, newTileId);
        if (newRegion != curRegion) emit RegionEntered(characterId, newRegion);
    }

    // ── Activity recording ────────────────────────────────────────────────────

    /**
     * @notice Record an action by a character on their current tile for regen scaling.
     *         Called by GatherOracle, CombatSystem, IdleSystem, etc.
     */
    function recordActivity(uint256 characterId, uint256 gameDay)
        external onlyRole(GAME_ROLE)
    {
        uint256 tileId = characterTile[characterId];
        tileActivityCount[tileId][gameDay]++;
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    function getCharacterTile(uint256 characterId) external view returns (uint256) {
        return characterTile[characterId];
    }

    function getCharacterRegion(uint256 characterId) external view returns (uint256) {
        return getRegionOfTile(characterTile[characterId]);
    }

    function getTileActivity(uint256 tileId, uint256 gameDay)
        external view returns (uint256)
    {
        return tileActivityCount[tileId][gameDay];
    }

    function getTilePlayerCount(uint256 tileId) external view returns (uint256) {
        return tilePlayerCount[tileId];
    }

    function canEnterRegion(uint256 regionId, uint256 daysSurvived)
        external view returns (bool)
    {
        if (regionId >= NUM_REGIONS) return false;
        return daysSurvived >= regions[regionId].minDaysRequired;
    }

    function getRegion(uint256 regionId) external view returns (RegionDef memory) {
        require(regionId < NUM_REGIONS, "WorldMap: invalid region");
        return regions[regionId];
    }

    /**
     * @notice Return up to 4 adjacent tile IDs (within the same region).
     *         Out-of-bound neighbours are omitted.
     */
    function getAdjacentTiles(uint256 tileId)
        external view returns (uint256[] memory adjacent)
    {
        (uint256 regionId, uint256 x, uint256 y) = decodeTileId(tileId);
        RegionDef storage reg = regions[regionId];

        uint256 count = 0;
        uint256[4] memory buf;
        if (x > 0)            buf[count++] = encodeTileId(regionId, x - 1, y);
        if (x + 1 < reg.gridW) buf[count++] = encodeTileId(regionId, x + 1, y);
        if (y > 0)            buf[count++] = encodeTileId(regionId, x, y - 1);
        if (y + 1 < reg.gridH) buf[count++] = encodeTileId(regionId, x, y + 1);

        adjacent = new uint256[](count);
        for (uint256 i = 0; i < count; i++) adjacent[i] = buf[i];
    }
}
