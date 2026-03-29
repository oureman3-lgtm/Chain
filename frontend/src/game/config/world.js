export const WORLD = {
  WIDTH:  2400,
  HEIGHT: 2400,
  TILE_SIZE: 32,

  // Day/night timings (milliseconds)
  DAY_DURATION:   300_000,  // 5 minutes
  DUSK_DURATION:   30_000,  // 30 seconds
  NIGHT_DURATION:  30_000,  // 30 seconds (AP commit window)

  // Resource nodes per world (per tile/screen)
  TREE_COUNT:       12,
  ROCK_COUNT:        6,
  GRASS_COUNT:       9,
  BERRY_COUNT:       6,

  // Survival decay per second
  HUNGER_DECAY:     0.05,   // 100 → 0 in ~33 minutes
  SANITY_DECAY_DAY: 0.02,
  SANITY_DECAY_NIGHT: 0.08, // 4× faster at night
  HEALTH_DECAY_HUNGRY: 0.1, // lose HP when hunger = 0

  // Near-campfire sanity restore per second
  CAMPFIRE_SANITY_RESTORE: 0.15,

  // Berry restores
  BERRY_HUNGER_RESTORE: 20,

  // Player speed (pixels/second)
  PLAYER_SPEED: 150,

  // Interaction radius (pixels)
  INTERACT_RADIUS: 50,
};

// ── Region definitions (must match WorldMap.sol) ────────────────────────────
export const REGIONS = [
  { id: 0, name: "草原",     minDays:  0, gridW: 5, gridH: 5, biome: "grass",   color: 0x558B2F },
  { id: 1, name: "黑森林",   minDays:  7, gridW: 4, gridH: 4, biome: "forest",  color: 0x1B5E20 },
  { id: 2, name: "废墟",     minDays: 14, gridW: 3, gridH: 3, biome: "ruins",   color: 0x5D4037 },
  { id: 3, name: "暗影领域", minDays: 21, gridW: 2, gridH: 2, biome: "shadow",  color: 0x4A148C },
  { id: 4, name: "熔岩地带", minDays: 30, gridW: 2, gridH: 2, biome: "volcano", color: 0xBF360C }
];

// Tile ID encoding helpers (must match WorldMap.sol constants)
export const TILE_STRIDE   = 1_000;
export const REGION_STRIDE = 1_000_000;
export const START_TILE_ID = 2_002;  // region 0, (x=2, y=2)

export function encodeTileId(regionId, x, y) {
  return regionId * REGION_STRIDE + y * TILE_STRIDE + x;
}

export function decodeTileId(tileId) {
  const regionId = Math.floor(tileId / REGION_STRIDE);
  const rem      = tileId % REGION_STRIDE;
  const y        = Math.floor(rem / TILE_STRIDE);
  const x        = rem % TILE_STRIDE;
  return { regionId, x, y };
}

// ── Daily event types (must match EventOracle.sol) ──────────────────────────
export const EVENT_TYPES = {
  0: { name: "无事",       key: "NONE"           },
  1: { name: "商人到访",   key: "MERCHANT_VISIT"  },
  2: { name: "陨石雨",     key: "METEOR_SHOWER"   },
  3: { name: "诡夜",       key: "HAUNTED_NIGHT"   },
  4: { name: "资源繁盛",   key: "RESOURCE_BLOOM"  },
  5: { name: "远古传送门", key: "ANCIENT_PORTAL"  },
  6: { name: "诅咒之雨",   key: "CURSED_RAIN"     },
  7: { name: "遗弃营地",   key: "ABANDONED_CAMP"  }
};

// ── Main quest stages (must match QuestSystem.sol) ──────────────────────────
export const MAIN_QUESTS = [
  { stage: 0, name: "第一把火",   desc: "合成一个火把" },
  { stage: 1, name: "武装自己",   desc: "合成一把剑" },
  { stage: 2, name: "初次猎杀",   desc: "击败任意怪物" },
  { stage: 3, name: "探险者",     desc: "进入黑森林" },
  { stage: 4, name: "废墟探索者", desc: "到达废墟" },
  { stage: 5, name: "暗影触碰",   desc: "进入暗影领域并击败暗影生物" },
  { stage: 6, name: "熔岩先锋",   desc: "到达熔岩地带" },
  { stage: 7, name: "哥布林杀手", desc: "击败10只哥布林" },
  { stage: 8, name: "冠军",       desc: "击败树人卫士" }
];

// ── AP budget display thresholds ─────────────────────────────────────────────
export const AP_WARNING_THRESHOLD = 30;  // show yellow warning below 30 AP
export const AP_CRITICAL_THRESHOLD = 10; // show red warning below 10 AP
