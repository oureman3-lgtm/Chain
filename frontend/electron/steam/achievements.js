/**
 * achievements.js
 * Maps Axiom Wilds on-chain milestones to Steam Achievement API names.
 *
 * Trigger: the game calls SteamAchievementManager.check(event, data)
 * after every significant on-chain action; this module decides which
 * Steam achievement (if any) to unlock.
 *
 * Steam achievement IDs must be registered in the Steamworks partner portal.
 */

export const STEAM_ACHIEVEMENTS = [
  // ── Survival milestones ────────────────────────────────────────────────
  { id: "SURVIVE_1",   label: "First Night",        check: d => d.daysSurvived >= 1  },
  { id: "SURVIVE_7",   label: "One Week",            check: d => d.daysSurvived >= 7  },
  { id: "SURVIVE_30",  label: "Veteran",             check: d => d.daysSurvived >= 30 },
  { id: "SURVIVE_100", label: "Eternal",             check: d => d.daysSurvived >= 100 },

  // ── Exploration ────────────────────────────────────────────────────────
  { id: "REGION_1",    label: "Into the Dark",       check: d => d.regionId >= 1 },
  { id: "REGION_2",    label: "Ruin Delver",         check: d => d.regionId >= 2 },
  { id: "REGION_3",    label: "Shadow Touched",      check: d => d.regionId >= 3 },
  { id: "REGION_4",    label: "Volcano Vanguard",    check: d => d.regionId >= 4 },
  { id: "TILES_10",    label: "Wanderer",            check: d => d.tilesVisited >= 10 },
  { id: "TILES_50",    label: "Cartographer",        check: d => d.tilesVisited >= 50 },

  // ── Combat ─────────────────────────────────────────────────────────────
  { id: "FIRST_KILL",  label: "Blood on Your Hands", check: d => d.event === "combat_victory" },
  { id: "KILL_10",     label: "Hunter",              check: d => d.totalKills >= 10  },
  { id: "KILL_100",    label: "Slayer",              check: d => d.totalKills >= 100 },
  { id: "BOSS_GOLEM",  label: "Golem Crusher",       check: d => d.event === "combat_victory" && d.monsterType === 4 },
  { id: "BOSS_VOID",   label: "Void Lord Vanquished",check: d => d.event === "combat_victory" && d.monsterType === 9 },
  { id: "NO_DEATH",    label: "Untouched",           check: d => d.daysSurvived >= 7 && d.deathCount === 0 },

  // ── Crafting ───────────────────────────────────────────────────────────
  { id: "FIRST_CRAFT", label: "Tinker",              check: d => d.event === "craft" },
  { id: "LEGENDARY",   label: "Master Smith",        check: d => d.craftedItemType >= 71 },
  { id: "ALCHEMIST",   label: "Alchemist",           check: d => d.event === "craft" && d.craftedItemType >= 56 && d.craftedItemType <= 70 },

  // ── Quests ─────────────────────────────────────────────────────────────
  { id: "QUEST_1",     label: "First Quest",         check: d => d.dailyQuestsCompleted >= 1  },
  { id: "QUEST_30",    label: "Dedicated",           check: d => d.dailyQuestsCompleted >= 30 },
  { id: "MAIN_DONE",   label: "Champion of the Wilds",check: d => d.mainQuestStage >= 9 },

  // ── Special ────────────────────────────────────────────────────────────
  { id: "BRIDGE_USED", label: "Chain Hopper",        check: d => d.event === "bridge_lock" },
  { id: "BLOOD_MOON",  label: "Blood Moon Survivor", check: d => d.event === "day_commit" && d.activeEvent === 8 && d.daysSurvived > 0 },
  { id: "VOID_RIFT",   label: "Rift Walker",         check: d => d.event === "explore" && d.outcome === 3 },
];

/**
 * SteamAchievementManager – checks and unlocks Steam achievements.
 * Call check() after any significant game action.
 */
export class SteamAchievementManager {
  constructor() {
    this._unlocked = new Set(
      JSON.parse(localStorage.getItem("aw_achievements") || "[]")
    );
  }

  /**
   * @param {string} event  – event type key
   * @param {object} data   – payload relevant to the event
   */
  check(event, data) {
    const payload = { event, ...data };
    for (const ach of STEAM_ACHIEVEMENTS) {
      if (this._unlocked.has(ach.id)) continue;
      if (ach.check(payload)) {
        this._unlock(ach.id);
      }
    }
  }

  _unlock(id) {
    if (this._unlocked.has(id)) return;
    this._unlocked.add(id);
    localStorage.setItem("aw_achievements", JSON.stringify([...this._unlocked]));

    if (window.steamAPI) {
      window.steamAPI.unlockAchievement(id).catch(console.warn);
    }
    console.log(`[Achievement] Unlocked: ${id}`);
  }

  isUnlocked(id) { return this._unlocked.has(id); }
}

export default new SteamAchievementManager();
