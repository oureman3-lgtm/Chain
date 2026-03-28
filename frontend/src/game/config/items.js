// Item type definitions (must match ItemNFT.sol)
export const ITEM_TYPES = {
  WOOD:           1,
  FLINT:          2,
  GRASS:          3,
  BERRY:          4,
  AXE:            5,
  TORCH:          6,
  CAMPFIRE:       7,
  SWORD:          8,
  LEATHER:        9,
  BONE:           10,
  SHADOW_MATERIAL:11,
  RARE_WOOD:      12
};

export const ITEM_NAMES = {
  1: "木材",  2: "燧石",  3: "草",    4: "浆果",
  5: "斧头",  6: "火把",  7: "营地",  8: "剑",
  9: "皮革",  10: "骨头", 11: "暗影材料", 12: "稀有木材"
};

export const ITEM_COLORS = {
  1: 0x8B4513, 2: 0x808080, 3: 0x90EE90, 4: 0xFF4500,
  5: 0xCD853F, 6: 0xFF8C00, 7: 0xFF6347, 8: 0xC0C0C0,
  9: 0xA0522D, 10: 0xF5F5DC, 11: 0x800080, 12: 0x228B22
};

// AP cost per action (must match GameRegistry.sol)
export const AP_COSTS = {
  GATHER:  5,
  CRAFT:   10,
  EAT:     2,
  MOVE:    0  // movement is free at contract level
};

export const MAX_DAILY_AP = 100;

// Crafting recipes (must match seed.js)
export const RECIPES = [
  { id: 0, name: "斧头",  inputs: [{ type: 1, amount: 2 }, { type: 2, amount: 1 }], output: 5 },
  { id: 1, name: "火把",  inputs: [{ type: 1, amount: 1 }, { type: 3, amount: 1 }], output: 6 },
  { id: 2, name: "营地",  inputs: [{ type: 1, amount: 4 }, { type: 2, amount: 2 }], output: 7 },
  { id: 3, name: "剑",    inputs: [{ type: 1, amount: 1 }, { type: 2, amount: 3 }], output: 8 }
];

// Resource node types (must match GatherOracle.sol)
export const RESOURCE_TYPES = {
  TREE:       0,
  ROCK:       1,
  GRASS_BUSH: 2,
  BERRY_BUSH: 3
};

export const RESOURCE_COLORS = {
  0: 0x228B22,  // tree - dark green
  1: 0x696969,  // rock - gray
  2: 0x90EE90,  // grass - light green
  3: 0xFF6347   // berry - orange-red
};

export const RESOURCE_NAMES = {
  0: "树木", 1: "岩石", 2: "草丛", 3: "浆果丛"
};
