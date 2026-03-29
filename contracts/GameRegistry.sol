// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./CharacterNFT.sol";
import "./ItemNFT.sol";

/**
 * @title GameRegistry
 * @notice Central registry for player registration and daily progress commits.
 *
 * Anti-tamper: commitDay validates that declared action counts do not exceed
 * the daily AP budget (MAX_DAILY_AP = 100 + any rest bonus).
 *
 * AP costs:
 *   gather       =  5 AP
 *   craft        = 10 AP
 *   combat       = variable per monster (reported as combatAP)
 *   eat          =  2 AP
 *   move (tile)  =  5 AP
 *   localExplore =  5 AP
 *   rest         = 20 AP  (also grants AP_BONUS_REST = 10 bonus AP)
 *   idle         = 50 AP
 *
 * Integration:
 *   - WorldMap  : initCharacter on registration; moveToTile on move; recordActivity on actions
 *   - TileResource: initTile on first visit (lazy)
 *   - QuestSystem : ensureDailyQuest each commitDay; notifyTileMove on moves; notifyCraftMain on craft
 *   - EventOracle : getDailyQuestSeed for daily quest assignment
 */
contract GameRegistry is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    CharacterNFT public characterNFT;
    ItemNFT      public itemNFT;

    // Optional integrations (set after deploy)
    address public worldMap;
    address public tileResource;
    address public questSystem;
    address public eventOracle;

    // ── AP budget ─────────────────────────────────────────────────────────────

    uint256 public constant MAX_DAILY_AP        = 100;
    uint256 public constant AP_PER_GATHER       = 5;
    uint256 public constant AP_PER_CRAFT        = 10;
    uint256 public constant AP_PER_EAT          = 2;
    uint256 public constant AP_PER_MOVE         = 5;
    uint256 public constant AP_PER_EXPLORE      = 5;
    uint256 public constant AP_PER_REST         = 20;
    uint256 public constant AP_PER_IDLE         = 50;
    uint256 public constant AP_BONUS_REST       = 10; // AP bonus granted on rest

    // ── Player state ──────────────────────────────────────────────────────────

    struct PlayerState {
        uint256 characterId;
        bool    registered;
        uint256 lastCommitDay; // logical day counter
    }

    mapping(address => PlayerState) public players;

    // ── Events ────────────────────────────────────────────────────────────────

    event PlayerRegistered(address indexed player, uint256 characterId, string characterClass);
    event DayCommitted(
        address indexed player,
        uint256 indexed characterId,
        uint256 day,
        bool    died
    );
    event TileMoved(
        address indexed player,
        uint256 indexed characterId,
        uint256 newTileId
    );

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address admin, address _characterNFT, address _itemNFT) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);
        characterNFT = CharacterNFT(_characterNFT);
        itemNFT      = ItemNFT(_itemNFT);
    }

    // ── Admin: set integration addresses ─────────────────────────────────────

    function setWorldMap(address _worldMap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        worldMap = _worldMap;
    }

    function setTileResource(address _tileResource) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tileResource = _tileResource;
    }

    function setQuestSystem(address _questSystem) external onlyRole(DEFAULT_ADMIN_ROLE) {
        questSystem = _questSystem;
    }

    function setEventOracle(address _eventOracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        eventOracle = _eventOracle;
    }

    // ── Player registration ───────────────────────────────────────────────────

    function registerPlayer(string calldata characterClass) external {
        require(!players[msg.sender].registered, "GameRegistry: already registered");

        uint256 characterId = characterNFT.mintCharacter(msg.sender, characterClass);
        players[msg.sender] = PlayerState({
            characterId:   characterId,
            registered:    true,
            lastCommitDay: 0
        });

        // Place character on the world map
        if (worldMap != address(0)) {
            worldMap.call(
                abi.encodeWithSignature("initCharacter(uint256)", characterId)
            );
        }

        emit PlayerRegistered(msg.sender, characterId, characterClass);
    }

    // ── Tile movement (on-chain verification) ─────────────────────────────────

    /**
     * @notice Move player's character to an adjacent tile or a new region.
     *         Costs AP_PER_MOVE = 5 AP (tracked locally, committed at day end).
     *         Also initialises TileResource for the destination if not yet done.
     * @param newTileId     Target tile.
     * @param daysSurvived  Character's current daysSurvived (for region gate).
     * @param gameDay       Current game day (for TileResource init).
     * @param newRegionId   Destination region (for TileResource lazy init).
     */
    function moveToTile(
        uint256 newTileId,
        uint256 daysSurvived,
        uint256 gameDay,
        uint8   newRegionId
    ) external {
        PlayerState storage state = players[msg.sender];
        require(state.registered, "GameRegistry: not registered");

        // Delegate movement validation to WorldMap
        if (worldMap != address(0)) {
            (bool ok,) = worldMap.call(
                abi.encodeWithSignature(
                    "moveToTile(uint256,uint256,uint256)",
                    state.characterId, newTileId, daysSurvived
                )
            );
            require(ok, "GameRegistry: move failed");
        }

        // Lazy init destination tile resources (idempotent; TileResource reverts if already inited)
        if (tileResource != address(0)) {
            tileResource.call(
                abi.encodeWithSignature("initTile(uint256,uint8)", newTileId, newRegionId)
            );
        }

        // Record activity on new tile
        if (worldMap != address(0)) {
            worldMap.call(
                abi.encodeWithSignature(
                    "recordActivity(uint256,uint256)",
                    state.characterId, gameDay
                )
            );
        }

        // Notify quest system
        if (questSystem != address(0)) {
            questSystem.call(
                abi.encodeWithSignature("notifyTileMove(uint256)", state.characterId)
            );
            // Check if entering a new region — WorldMap emits RegionEntered; we replicate the
            // notification here since we can't listen to events within a call.
            // Caller passes newRegionId explicitly.
            questSystem.call(
                abi.encodeWithSignature(
                    "notifyRegionEntered(uint256,uint256)",
                    state.characterId, uint256(newRegionId)
                )
            );
        }

        emit TileMoved(msg.sender, state.characterId, newTileId);
    }

    // ── Daily commit (anti-tamper core) ──────────────────────────────────────

    /**
     * @notice Commit end-of-day progress.
     *
     * AP accounting:
     *   total = gatherCount*5 + craftCount*10 + eatCount*2 + combatAP
     *         + moveCount*5 + exploreCount*5 + restCount*20 + idleCount*50
     *   net   = total – restCount * AP_BONUS_REST   (rest gives back 10 AP)
     *   net ≤ MAX_DAILY_AP
     *
     * @param gatherCount    Number of gather actions
     * @param craftCount     Number of craft actions
     * @param eatCount       Number of eat actions
     * @param combatAP       Total AP consumed in combat
     * @param moveCount      Number of tile-move actions
     * @param exploreCount   Number of local-explore actions
     * @param restCount      Number of rest actions
     * @param idleCount      Number of idle (sleep/explore) actions
     * @param daysSurvived   Total lifetime days survived (monotonically increasing)
     * @param newLevel       New character level (can only increase)
     * @param died           Whether the player died this day
     * @param itemIdsToDestroy Item NFT IDs consumed this day
     * @param craftedItemTypes Item types crafted (for main quest notifications)
     */
    function commitDay(
        uint256   gatherCount,
        uint256   craftCount,
        uint256   eatCount,
        uint256   combatAP,
        uint256   moveCount,
        uint256   exploreCount,
        uint256   restCount,
        uint256   idleCount,
        uint256   daysSurvived,
        uint256   newLevel,
        bool      died,
        uint256[] calldata itemIdsToDestroy,
        uint256[] calldata craftedItemTypes
    ) external {
        PlayerState storage state = players[msg.sender];
        require(state.registered, "GameRegistry: not registered");

        // ── AP budget validation ──────────────────────────────────────────────
        uint256 apUsed = gatherCount  * AP_PER_GATHER
                       + craftCount   * AP_PER_CRAFT
                       + eatCount     * AP_PER_EAT
                       + combatAP
                       + moveCount    * AP_PER_MOVE
                       + exploreCount * AP_PER_EXPLORE
                       + restCount    * AP_PER_REST
                       + idleCount    * AP_PER_IDLE;
        // Rest gives back AP_BONUS_REST each time
        uint256 restBonus = restCount * AP_BONUS_REST;
        uint256 netAP = apUsed > restBonus ? apUsed - restBonus : 0;
        require(netAP <= MAX_DAILY_AP, "GameRegistry: AP budget exceeded");

        // ── Stat validation ───────────────────────────────────────────────────
        CharacterNFT.CharacterStats memory stats = characterNFT.getStats(state.characterId);
        require(daysSurvived >= stats.daysSurvived, "GameRegistry: invalid daysSurvived");
        require(newLevel >= stats.level,            "GameRegistry: level cannot decrease");

        // ── Burn consumed items ───────────────────────────────────────────────
        for (uint256 i = 0; i < itemIdsToDestroy.length; i++) {
            require(
                itemNFT.ownerOf(itemIdsToDestroy[i]) == msg.sender,
                "GameRegistry: not item owner"
            );
            itemNFT.burnItem(itemIdsToDestroy[i]);
        }

        // ── Level-up stat bonuses ─────────────────────────────────────────────
        uint256 levelsGained = newLevel - stats.level;
        uint256 newMaxHealth = stats.maxHealth  + levelsGained * 5;
        uint256 newAttackPow = stats.attackPower + levelsGained * 2;
        uint256 newDefense   = stats.defense     + levelsGained;
        uint256 newLuck      = stats.luck        + levelsGained * 2;

        characterNFT.updateStats(
            state.characterId,
            daysSurvived,
            newLevel,
            newMaxHealth,
            newAttackPow,
            newDefense,
            newLuck
        );

        if (died) {
            characterNFT.recordDeath(state.characterId);
        }

        state.lastCommitDay = daysSurvived;

        // ── Quest system notifications ────────────────────────────────────────
        if (questSystem != address(0)) {
            // Assign daily quest for the new day if needed
            uint256 questSeed = _getDailyQuestSeed(state.characterId, daysSurvived);
            questSystem.call(
                abi.encodeWithSignature(
                    "ensureDailyQuest(uint256,uint256,uint256)",
                    state.characterId, daysSurvived, questSeed
                )
            );

            // Notify crafted items for main quest
            for (uint256 i = 0; i < craftedItemTypes.length; i++) {
                questSystem.call(
                    abi.encodeWithSignature(
                        "notifyCraftMain(uint256,uint256)",
                        state.characterId, craftedItemTypes[i]
                    )
                );
                questSystem.call(
                    abi.encodeWithSignature(
                        "notifyCraft(uint256,uint256)",
                        state.characterId, craftedItemTypes[i]
                    )
                );
            }
        }

        emit DayCommitted(msg.sender, state.characterId, daysSurvived, died);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    function isRegistered(address player) external view returns (bool) {
        return players[player].registered;
    }

    function getCharacterId(address player) external view returns (uint256) {
        require(players[player].registered, "GameRegistry: not registered");
        return players[player].characterId;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _getDailyQuestSeed(uint256 characterId, uint256 gameDay) internal view returns (uint256) {
        if (eventOracle == address(0)) {
            return uint256(keccak256(abi.encodePacked(characterId, gameDay, "quest")));
        }
        (bool ok, bytes memory data) = eventOracle.staticcall(
            abi.encodeWithSignature(
                "getDailyQuestSeed(uint256,uint256)",
                characterId, gameDay
            )
        );
        if (ok && data.length >= 32) return abi.decode(data, (uint256));
        return uint256(keccak256(abi.encodePacked(characterId, gameDay, "quest")));
    }
}
