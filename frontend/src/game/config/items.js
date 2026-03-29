// Item type definitions (must match ItemNFT.sol)
export const ITEM_TYPES = {
  // Raw materials
  WOOD:              1,
  FLINT:             2,
  GRASS:             3,
  BERRY:             4,
  // Basic tools / gear
  AXE:               5,
  TORCH:             6,
  CAMPFIRE:          7,
  SWORD:             8,
  // Monster drops
  LEATHER:           9,
  BONE:              10,
  SHADOW_MATERIAL:   11,
  RARE_WOOD:         12,
  // Ores / gathered
  IRON_ORE:          13,
  IRON_INGOT:        14,
  MUSHROOM:          15,
  FISH:              16,
  HONEY:             17,
  HARDWOOD:          18,
  // Rare / region-gated
  ANCIENT_FRAGMENT:  19,
  SHADOW_CRYSTAL:    20,
  LAVA_ROCK:         21,
  GOBLIN_MEAT:       22,
  // Cooked food
  COOKED_MEAT:       23,
  STEW:              24,
  MUSHROOM_SOUP:     25,
  HONEY_BREAD:       26,
  // Advanced gear
  IRON_SWORD:        27,
  IRON_ARMOR:        28,
  SHADOW_BLADE:      29,
  // Equipment
  COOKING_POT:       30,
  PICKAXE:           31,
  FISHING_ROD:       32,
  // Quest / achievement
  ANCIENT_SWORD:     33,
  QUEST_RELIC:       34,
  EXPLORER_BADGE:    35,
  CHAMPION_BADGE:    36
};

export const ITEM_NAMES = {
  1:  "木材",      2:  "燧石",       3:  "草",         4:  "浆果",
  5:  "斧头",      6:  "火把",       7:  "营地篝火",   8:  "剑",
  9:  "皮革",      10: "骨头",       11: "暗影材料",   12: "稀有木材",
  13: "铁矿石",    14: "铁锭",       15: "蘑菇",       16: "鱼",
  17: "蜂蜜",      18: "硬木",       19: "远古碎片",   20: "暗影水晶",
  21: "熔岩石",    22: "哥布林肉",   23: "熟肉",       24: "浓汤",
  25: "蘑菇汤",    26: "蜂蜜面包",   27: "铁剑",       28: "铁甲",
  29: "暗影之刃",  30: "炊具",       31: "镐",         32: "鱼竿",
  33: "远古之剑",  34: "任务遗物",   35: "探险徽章",   36: "冠军徽章"
};

export const ITEM_COLORS = {
  1:  0x8B4513, 2:  0x808080, 3:  0x90EE90, 4:  0xFF4500,
  5:  0xCD853F, 6:  0xFF8C00, 7:  0xFF6347, 8:  0xC0C0C0,
  9:  0xA0522D, 10: 0xF5F5DC, 11: 0x800080, 12: 0x228B22,
  13: 0x8B7355, 14: 0xBEC8D1, 15: 0xD2691E, 16: 0x4169E1,
  17: 0xFFD700, 18: 0x556B2F, 19: 0xFFD700, 20: 0x9400D3,
  21: 0xFF4500, 22: 0xB22222, 23: 0xCD853F, 24: 0xD2691E,
  25: 0x8FBC8F, 26: 0xF0E68C, 27: 0x708090, 28: 0x778899,
  29: 0x4B0082, 30: 0x696969, 31: 0x808080, 32: 0xBDB76B,
  33: 0xDAA520, 34: 0xFF69B4, 35: 0x1E90FF, 36: 0xFFD700
};

// Whether item is consumable (food / one-use)
export const ITEM_CONSUMABLE = {
  4: true, 15: true, 16: true, 22: true,
  23: true, 24: true, 25: true, 26: true
};

// Hunger / health restored when eating
export const ITEM_FOOD_VALUE = {
  4:  { hunger: 20, health: 0 },
  23: { hunger: 40, health: 10 },
  24: { hunger: 60, health: 20 },
  25: { hunger: 35, health: 15 },
  26: { hunger: 30, health: 5 }
};

// AP cost per action (must match GameRegistry.sol)
export const AP_COSTS = {
  GATHER:  5,
  CRAFT:   10,
  EAT:     2,
  MOVE:    5,
  EXPLORE: 5,
  REST:    20,
  IDLE:    50
};

export const AP_BONUS_REST = 10;  // AP refunded per rest action
export const MAX_DAILY_AP  = 100;

// Crafting recipes (must match seed.js recipe indices)
export const RECIPES = [
  { id:  0, name: "斧头",     inputs: [{ type: 1, amount: 2 }, { type: 2, amount: 1 }], output: 5  },
  { id:  1, name: "火把",     inputs: [{ type: 1, amount: 1 }, { type: 3, amount: 1 }], output: 6  },
  { id:  2, name: "营地篝火", inputs: [{ type: 1, amount: 4 }, { type: 2, amount: 2 }], output: 7  },
  { id:  3, name: "剑",       inputs: [{ type: 1, amount: 1 }, { type: 2, amount: 3 }], output: 8  },
  { id:  4, name: "铁锭",     inputs: [{ type: 13, amount: 3 }],                        output: 14 },
  { id:  5, name: "铁剑",     inputs: [{ type: 14, amount: 2 }, { type: 18, amount: 1 }], output: 27 },
  { id:  6, name: "铁甲",     inputs: [{ type: 14, amount: 3 }, { type: 9, amount: 2 }], output: 28 },
  { id:  7, name: "镐",       inputs: [{ type: 14, amount: 1 }, { type: 1, amount: 2 }], output: 31 },
  { id:  8, name: "鱼竿",     inputs: [{ type: 1, amount: 2 }, { type: 3, amount: 2 }], output: 32 },
  { id:  9, name: "炊具",     inputs: [{ type: 14, amount: 2 }, { type: 1, amount: 1 }], output: 30 },
  { id: 10, name: "熟肉",     inputs: [{ type: 22, amount: 1 }],                        output: 23 },
  { id: 11, name: "蘑菇汤",   inputs: [{ type: 15, amount: 2 }],                        output: 25 },
  { id: 12, name: "浓汤",     inputs: [{ type: 22, amount: 1 }, { type: 15, amount: 1 }], output: 24 },
  { id: 13, name: "蜂蜜面包", inputs: [{ type: 17, amount: 1 }, { type: 3, amount: 2 }], output: 26 },
  { id: 14, name: "暗影之刃", inputs: [{ type: 20, amount: 1 }, { type: 14, amount: 2 }], output: 29 },
  { id: 15, name: "远古之剑", inputs: [{ type: 19, amount: 2 }, { type: 14, amount: 3 }], output: 33 }
];

// Resource node types (must match GatherOracle.sol)
export const RESOURCE_TYPES = {
  TREE:         0,
  ROCK:         1,
  GRASS_BUSH:   2,
  BERRY_BUSH:   3,
  IRON_DEPOSIT: 4,
  MUSHROOMS:    5,
  FISHING_SPOT: 6,
  BEEHIVE:      7,
  HARDWOOD_TREE:8
};

export const RESOURCE_COLORS = {
  0: 0x228B22, 1: 0x696969, 2: 0x90EE90, 3: 0xFF6347,
  4: 0x8B7355, 5: 0xD2691E, 6: 0x4169E1, 7: 0xFFD700,
  8: 0x556B2F
};

export const RESOURCE_NAMES = {
  0: "树木", 1: "岩石", 2: "草丛", 3: "浆果丛",
  4: "铁矿", 5: "蘑菇", 6: "鱼塘", 7: "蜂巢",
  8: "硬木树"
};

// Which resource types appear in which regions
export const RESOURCE_BY_REGION = {
  0: [0, 1, 2, 3],           // Grasslands
  1: [0, 1, 4, 5, 8],        // Dark Forest
  2: [4, 5, 8, 6],           // Ruins
  3: [4, 7],                 // Shadow Realm
  4: [4, 1]                  // Volcano
};
