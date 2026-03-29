// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title QuestSystem
 * @notice Manages the 9-stage main quest line and per-character daily random quests.
 *
 * ── Main Quest Stages ────────────────────────────────────────────────────────
 *  0  FIRST_FIRE        Craft a Torch (itemType 6)
 *  1  ARMED             Craft a Sword (itemType 8)
 *  2  FIRST_KILL        Defeat any monster (monsterType any)
 *  3  EXPLORER          Enter Dark Forest (region 1)
 *  4  RUINS_DELVER      Reach Ruins (region 2)
 *  5  SHADOW_TOUCHED    Reach Shadow Realm (region 3) AND defeat a Shadow monster
 *  6  VOLCANO_VANGUARD  Reach Volcano (region 4)
 *  7  GOBLIN_SLAYER     Defeat 10 Goblins total
 *  8  CHAMPION          Defeat TreeGuard (monsterType 2)
 *
 * ── Daily Quests ─────────────────────────────────────────────────────────────
 *  Seeded from EventOracle.getDailyQuestSeed(characterId, gameDay).
 *  8 daily quest templates; one randomly assigned per character per day.
 *  Progress is reset each day.
 *
 * ── Push Notification Model ──────────────────────────────────────────────────
 *  Other contracts (GatherOracle, CombatSystem, GameRegistry) call:
 *    QuestSystem.notifyGather(characterId, itemType, amount)
 *    QuestSystem.notifyCraft(characterId, itemType)
 *    QuestSystem.notifyCombat(characterId, monsterType, victory)
 *    QuestSystem.notifyRegionEntered(characterId, regionId)
 *  QuestSystem advances matching quests automatically and emits events.
 */
contract QuestSystem is AccessControl {
    bytes32 public constant GAME_ROLE = keccak256("GAME_ROLE");

    // ── Main quest definitions ────────────────────────────────────────────────

    uint8 public constant MAIN_QUEST_COUNT = 9;

    enum MainStage {
        FIRST_FIRE,        // 0
        ARMED,             // 1
        FIRST_KILL,        // 2
        EXPLORER,          // 3
        RUINS_DELVER,      // 4
        SHADOW_TOUCHED,    // 5
        VOLCANO_VANGUARD,  // 6
        GOBLIN_SLAYER,     // 7
        CHAMPION           // 8
    }

    struct MainQuestDef {
        string  name;
        string  description;
        uint256 rewardItemType; // 0 = no item reward
        uint256 rewardAmount;
        uint8   requiredCount;  // kill/gather threshold
    }

    MainQuestDef[9] public mainQuestDefs;

    // ── Character main-quest progress ─────────────────────────────────────────

    /// characterId → highest completed stage + 1 (0 = none)
    mapping(uint256 => uint8) public mainQuestStage;
    /// characterId → progress counter for current stage (e.g. goblin kill count)
    mapping(uint256 => uint256) public mainQuestProgress;

    // ── Daily quest definitions (8 templates) ────────────────────────────────

    uint8 public constant DAILY_QUEST_COUNT = 8;

    enum DailyQuestType {
        GATHER_WOOD,        // 0 gather 5 Wood
        GATHER_FLINT,       // 1 gather 3 Flint
        KILL_GOBLIN,        // 2 kill 2 Goblins
        KILL_SHADOW,        // 3 kill 1 Shadow
        CRAFT_ANY,          // 4 craft 2 items
        EXPLORE_TILE,       // 5 move to 3 different tiles
        GATHER_BERRY,       // 6 gather 5 Berries
        GATHER_IRON         // 7 gather 2 IronOre
    }

    struct DailyQuestDef {
        string  name;
        uint8   requiredCount;
        uint256 rewardItemType;
        uint256 rewardAmount;
    }

    DailyQuestDef[8] public dailyQuestDefs;

    // ── Character daily-quest state ───────────────────────────────────────────

    struct DailyQuestState {
        uint8   questType;     // which daily quest
        uint256 progress;      // current count
        bool    completed;
        uint256 assignedDay;   // game day it was assigned
    }

    /// characterId → daily quest state
    mapping(uint256 => DailyQuestState) public dailyQuests;

    // ── Events ────────────────────────────────────────────────────────────────

    event MainQuestAdvanced(uint256 indexed characterId, uint8 stage, string stageName);
    event MainQuestCompleted(uint256 indexed characterId, uint8 stage, uint256 rewardItemType, uint256 rewardAmount);
    event DailyQuestAssigned(uint256 indexed characterId, uint8 questType, uint256 gameDay);
    event DailyQuestProgress(uint256 indexed characterId, uint8 questType, uint256 progress, uint256 required);
    event DailyQuestCompleted(uint256 indexed characterId, uint8 questType, uint256 rewardItemType, uint256 rewardAmount);

    // ── Constructor ───────────────────────────────────────────────────────────

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GAME_ROLE, admin);

        // Main quests
        mainQuestDefs[0] = MainQuestDef("First Fire",        "Craft a Torch",                     6,  1, 1);
        mainQuestDefs[1] = MainQuestDef("Armed",             "Craft a Sword",                     8,  1, 1);
        mainQuestDefs[2] = MainQuestDef("First Kill",        "Defeat any monster",                9,  1, 1); // reward: Leather
        mainQuestDefs[3] = MainQuestDef("Explorer",          "Enter the Dark Forest",             5,  1, 1); // reward: Axe
        mainQuestDefs[4] = MainQuestDef("Ruins Delver",      "Reach the Ruins",                   19, 1, 1); // AncientFragment
        mainQuestDefs[5] = MainQuestDef("Shadow Touched",    "Reach Shadow Realm & kill Shadow",  11, 1, 1); // ShadowMaterial
        mainQuestDefs[6] = MainQuestDef("Volcano Vanguard",  "Reach the Volcano",                 21, 1, 1); // LavaRock
        mainQuestDefs[7] = MainQuestDef("Goblin Slayer",     "Defeat 10 Goblins",                 10, 3, 10); // 3 Bones
        mainQuestDefs[8] = MainQuestDef("Champion",          "Defeat the TreeGuard",              12, 2, 1); // 2 RareWood

        // Daily quests
        dailyQuestDefs[0] = DailyQuestDef("Lumber Run",      5,  1,  3);  // 3 Wood
        dailyQuestDefs[1] = DailyQuestDef("Stone Collector", 3,  2,  2);  // 2 Flint
        dailyQuestDefs[2] = DailyQuestDef("Goblin Hunter",   2,  9,  1);  // 1 Leather
        dailyQuestDefs[3] = DailyQuestDef("Shadow Slayer",   1,  11, 1);  // ShadowMaterial
        dailyQuestDefs[4] = DailyQuestDef("Craftsman",       2,  3,  2);  // 2 Grass
        dailyQuestDefs[5] = DailyQuestDef("Wanderer",        3,  4,  2);  // 2 Berries
        dailyQuestDefs[6] = DailyQuestDef("Berry Picker",    5,  4,  3);  // 3 Berries
        dailyQuestDefs[7] = DailyQuestDef("Iron Miner",      2,  13, 1);  // IronOre (type 13)
    }

    // ── Daily quest management ────────────────────────────────────────────────

    /**
     * @notice Ensure a character has a daily quest assigned for `gameDay`.
     *         If the last assignment was for a different day, reassign.
     *         Seed comes from EventOracle (passed in by GameRegistry).
     */
    function ensureDailyQuest(
        uint256 characterId,
        uint256 gameDay,
        uint256 questSeed
    ) external onlyRole(GAME_ROLE) {
        DailyQuestState storage dq = dailyQuests[characterId];
        if (dq.assignedDay == gameDay) return; // already assigned for today

        uint8 questType = uint8(questSeed % DAILY_QUEST_COUNT);
        dailyQuests[characterId] = DailyQuestState({
            questType:   questType,
            progress:    0,
            completed:   false,
            assignedDay: gameDay
        });
        emit DailyQuestAssigned(characterId, questType, gameDay);
    }

    // ── Push notification handlers (called by other game contracts) ───────────

    /**
     * @notice Notify that a character gathered items.
     *         Advances matching daily quests.
     */
    function notifyGather(
        uint256 characterId,
        uint256 itemType,    // ItemNFT item type (1=Wood, 2=Flint, 3=Grass, 4=Berry, 13=IronOre, …)
        uint256 amount
    ) external onlyRole(GAME_ROLE) {
        DailyQuestState storage dq = dailyQuests[characterId];
        if (dq.completed) return;

        bool matches = false;
        if (dq.questType == uint8(DailyQuestType.GATHER_WOOD)  && itemType == 1) matches = true;
        if (dq.questType == uint8(DailyQuestType.GATHER_FLINT) && itemType == 2) matches = true;
        if (dq.questType == uint8(DailyQuestType.GATHER_BERRY) && itemType == 4) matches = true;
        if (dq.questType == uint8(DailyQuestType.GATHER_IRON)  && itemType == 13) matches = true;

        if (matches) {
            _advanceDailyQuest(characterId, dq, amount);
        }
    }

    /**
     * @notice Notify that a character crafted an item.
     */
    function notifyCraft(
        uint256 characterId,
        uint256 /*itemType*/
    ) external onlyRole(GAME_ROLE) {
        DailyQuestState storage dq = dailyQuests[characterId];
        if (dq.completed) return;
        if (dq.questType == uint8(DailyQuestType.CRAFT_ANY)) {
            _advanceDailyQuest(characterId, dq, 1);
        }
    }

    /**
     * @notice Notify that a character fought a monster.
     *         Advances both daily and main quests.
     * @param monsterType  0=Goblin, 1=Shadow, 2=TreeGuard
     */
    function notifyCombat(
        uint256 characterId,
        uint256 monsterType,
        bool    victory
    ) external onlyRole(GAME_ROLE) {
        if (!victory) return;

        // ── Daily quest ──────────────────────────────────────────────────────
        DailyQuestState storage dq = dailyQuests[characterId];
        if (!dq.completed) {
            bool dailyMatch = false;
            if (dq.questType == uint8(DailyQuestType.KILL_GOBLIN) && monsterType == 0) dailyMatch = true;
            if (dq.questType == uint8(DailyQuestType.KILL_SHADOW) && monsterType == 1) dailyMatch = true;
            if (dailyMatch) _advanceDailyQuest(characterId, dq, 1);
        }

        // ── Main quest ───────────────────────────────────────────────────────
        uint8 stage = mainQuestStage[characterId];

        if (stage == uint8(MainStage.FIRST_KILL)) {
            _completeMainStage(characterId, stage);
        } else if (stage == uint8(MainStage.SHADOW_TOUCHED) && monsterType == 1) {
            // SHADOW_TOUCHED requires both region entry (tracked separately) and shadow kill
            mainQuestProgress[characterId]++;
            if (mainQuestProgress[characterId] >= 2) { // 1=region entered, 2=shadow killed
                mainQuestProgress[characterId] = 0;
                _completeMainStage(characterId, stage);
            }
        } else if (stage == uint8(MainStage.GOBLIN_SLAYER) && monsterType == 0) {
            mainQuestProgress[characterId]++;
            emit MainQuestAdvanced(characterId, stage, mainQuestDefs[stage].name);
            if (mainQuestProgress[characterId] >= mainQuestDefs[stage].requiredCount) {
                mainQuestProgress[characterId] = 0;
                _completeMainStage(characterId, stage);
            }
        } else if (stage == uint8(MainStage.CHAMPION) && monsterType == 2) {
            _completeMainStage(characterId, stage);
        }
    }

    /**
     * @notice Notify that a character crafted an item (for main quest).
     */
    function notifyCraftMain(
        uint256 characterId,
        uint256 itemType
    ) external onlyRole(GAME_ROLE) {
        uint8 stage = mainQuestStage[characterId];
        if (stage == uint8(MainStage.FIRST_FIRE) && itemType == 6) {
            _completeMainStage(characterId, stage);
        } else if (stage == uint8(MainStage.ARMED) && itemType == 8) {
            _completeMainStage(characterId, stage);
        }
    }

    /**
     * @notice Notify that a character entered a new region.
     */
    function notifyRegionEntered(
        uint256 characterId,
        uint256 regionId
    ) external onlyRole(GAME_ROLE) {
        uint8 stage = mainQuestStage[characterId];

        if (stage == uint8(MainStage.EXPLORER) && regionId == 1) {
            _completeMainStage(characterId, stage);
        } else if (stage == uint8(MainStage.RUINS_DELVER) && regionId == 2) {
            _completeMainStage(characterId, stage);
        } else if (stage == uint8(MainStage.SHADOW_TOUCHED) && regionId == 3) {
            mainQuestProgress[characterId]++; // 1 of 2 (need region entry + shadow kill)
            if (mainQuestProgress[characterId] >= 2) {
                mainQuestProgress[characterId] = 0;
                _completeMainStage(characterId, stage);
            }
        } else if (stage == uint8(MainStage.VOLCANO_VANGUARD) && regionId == 4) {
            _completeMainStage(characterId, stage);
        }
    }

    /**
     * @notice Notify that a character moved to a new tile (for Wanderer daily quest).
     */
    function notifyTileMove(uint256 characterId) external onlyRole(GAME_ROLE) {
        DailyQuestState storage dq = dailyQuests[characterId];
        if (dq.completed) return;
        if (dq.questType == uint8(DailyQuestType.EXPLORE_TILE)) {
            _advanceDailyQuest(characterId, dq, 1);
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    function getMainQuestStage(uint256 characterId) external view returns (uint8) {
        return mainQuestStage[characterId];
    }

    function getDailyQuest(uint256 characterId)
        external view returns (DailyQuestState memory)
    {
        return dailyQuests[characterId];
    }

    function isMainQuestComplete(uint256 characterId) external view returns (bool) {
        return mainQuestStage[characterId] >= MAIN_QUEST_COUNT;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    function _advanceDailyQuest(
        uint256 characterId,
        DailyQuestState storage dq,
        uint256 increment
    ) internal {
        dq.progress += increment;
        uint8 required = dailyQuestDefs[dq.questType].requiredCount;
        emit DailyQuestProgress(characterId, dq.questType, dq.progress, required);
        if (dq.progress >= required) {
            dq.completed = true;
            emit DailyQuestCompleted(
                characterId,
                dq.questType,
                dailyQuestDefs[dq.questType].rewardItemType,
                dailyQuestDefs[dq.questType].rewardAmount
            );
        }
    }

    function _completeMainStage(uint256 characterId, uint8 stage) internal {
        MainQuestDef storage def = mainQuestDefs[stage];
        mainQuestStage[characterId] = stage + 1;
        emit MainQuestCompleted(characterId, stage, def.rewardItemType, def.rewardAmount);
    }
}
