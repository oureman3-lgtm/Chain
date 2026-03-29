/**
 * items.js – Axiom Wilds complete item catalog
 * Must stay in sync with ItemNFT.sol and seed-game.js
 */

// ── Item type IDs ─────────────────────────────────────────────────────────────
export const ITEM_TYPES = {
  // Tier 0 – Raw materials
  WOOD:              1,   FLINT:          2,   GRASS:          3,   BERRY:          4,
  CLAY:             37,   COAL:          38,   SULFUR:        39,   CRYSTAL_SHARD: 40,
  VINE:             41,   HERBAL_ROOT:   42,   SPIDER_SILK:   43,   GLACIER_ICE:   44,
  VOID_ESSENCE:     45,   ARROWS:        52,
  // Tier 1 – Basic tools & weapons
  AXE:               5,   TORCH:          6,   CAMPFIRE:       7,   SWORD:          8,
  ROPE:             47,   COOKING_POT:   30,   PICKAXE:       31,   FISHING_ROD:   32,
  // Tier 1 – Monster drops
  LEATHER:           9,   BONE:          10,   SHADOW_MATERIAL:11,  RARE_WOOD:     12,
  GOBLIN_MEAT:      22,   SPIDER_FANG:   62,   WOLF_PELT:     63,
  // Tier 1 – Cooked food
  COOKED_MEAT:      23,   STEW:          24,   MUSHROOM_SOUP: 25,   HONEY_BREAD:   26,
  SPICED_FISH:      67,   HERBAL_TEA:    68,
  // Tier 2 – Processed materials
  IRON_ORE:         13,   IRON_INGOT:    14,   MUSHROOM:      15,   FISH:          16,
  HONEY:            17,   HARDWOOD:      18,   ANCIENT_ALLOY: 46,
  // Tier 2 – Potions
  ANTIVENOM:        56,   STAMINA_POT:   57,   FIRE_ELIXIR:   58,
  FROST_TONIC:      69,   SHADOW_DRAUGHT:70,
  // Tier 2 – Standard gear
  IRON_SWORD:       27,   IRON_ARMOR:    28,   SHADOW_BLADE:  29,
  LEATHER_ARMOR:    48,   IRON_HELMET:   51,   BOW:           50,
  // Tier 3 – Rare / region
  ANCIENT_FRAGMENT: 19,   SHADOW_CRYSTAL:20,   LAVA_ROCK:     21,
  VOID_SHARD:       65,   GLACIER_CRYSTAL:66,  VOID_CORE:     64,
  // Tier 3 – Advanced gear
  MAGIC_STAFF:      49,   SPIDER_ARMOR:  53,   VOID_BLADE:    54,
  GLACIER_BLADE:    55,   SHADOW_CLOAK:  59,   CRYSTAL_ORB:   60,
  // Tier 4 – Legendary
  ANCIENT_SWORD:    33,   VOID_REAPER:   71,   GLACIER_EDGE:  72,
  // Quest / achievement
  QUEST_RELIC:      34,   EXPLORER_BADGE:35,   CHAMPION_BADGE:36,
  ANCIENT_KEY:      61,   STEAM_SEAL:    73
};

// ── Display names (Chinese + English) ────────────────────────────────────────
export const ITEM_NAMES = {
  1:"木材",    2:"燧石",    3:"草",      4:"浆果",    5:"斧头",    6:"火把",
  7:"营火",    8:"剑",      9:"皮革",   10:"骨头",   11:"暗影材料",12:"稀有木材",
  13:"铁矿石",14:"铁锭",   15:"蘑菇",   16:"鱼",    17:"蜂蜜",   18:"硬木",
  19:"远古碎片",20:"暗影水晶",21:"熔岩石",22:"哥布林肉",23:"熟肉",  24:"浓汤",
  25:"蘑菇汤", 26:"蜂蜜面包",27:"铁剑",  28:"铁甲",   29:"暗影之刃",30:"炊具",
  31:"镐",    32:"鱼竿",   33:"远古之剑",34:"任务遗物",35:"探险徽章",36:"冠军徽章",
  37:"黏土",  38:"煤炭",   39:"硫磺",   40:"水晶碎片",41:"藤蔓",  42:"草药根",
  43:"蜘蛛丝",44:"冰川冰", 45:"虚空精华",46:"远古合金",47:"绳索",  48:"皮甲",
  49:"魔法杖",50:"弓",    51:"铁盔",   52:"箭矢",  53:"蜘蛛甲",54:"虚空之刃",
  55:"冰川剑",56:"解毒药",57:"耐力药水",58:"火焰精华",59:"暗影斗篷",60:"水晶球",
  61:"远古钥匙",62:"蜘蛛獠牙",63:"狼皮",  64:"虚空核",65:"虚空碎片",66:"冰川水晶",
  67:"香辣鱼", 68:"草药茶", 69:"霜寒汤药",70:"暗影药剂",71:"虚空收割者",72:"冰川之刃",
  73:"Steam徽印"
};

export const ITEM_NAMES_EN = {
  1:"Wood",   2:"Flint",  3:"Grass",  4:"Berry",  5:"Axe",   6:"Torch",
  7:"Campfire",8:"Sword", 9:"Leather",10:"Bone",  11:"ShadowMaterial",12:"RareWood",
  13:"IronOre",14:"IronIngot",15:"Mushroom",16:"Fish",17:"Honey",18:"Hardwood",
  19:"AncientFragment",20:"ShadowCrystal",21:"LavaRock",22:"GoblinMeat",
  23:"CookedMeat",24:"Stew",25:"MushroomSoup",26:"HoneyBread",
  27:"IronSword",28:"IronArmor",29:"ShadowBlade",30:"CookingPot",31:"Pickaxe",32:"FishingRod",
  33:"AncientSword",34:"QuestRelic",35:"ExplorerBadge",36:"ChampionBadge",
  37:"Clay",38:"Coal",39:"Sulfur",40:"CrystalShard",41:"Vine",42:"HerbalRoot",
  43:"SpiderSilk",44:"GlacierIce",45:"VoidEssence",46:"AncientAlloy",47:"Rope",
  48:"LeatherArmor",49:"MagicStaff",50:"Bow",51:"IronHelmet",52:"Arrows",
  53:"SpiderArmor",54:"VoidBlade",55:"GlacierBlade",56:"Antivenom",57:"StaminaPotion",
  58:"FireElixir",59:"ShadowCloak",60:"CrystalOrb",61:"AncientKey",62:"SpiderFang",
  63:"WolfPelt",64:"VoidCore",65:"VoidShard",66:"GlacierCrystal",
  67:"SpicedFish",68:"HerbalTea",69:"FrostTonic",70:"ShadowDraught",
  71:"VoidReaper",72:"GlacierEdge",73:"SteamSeal"
};

// ── Tier classification ───────────────────────────────────────────────────────
export const ITEM_TIER = {
  0: [1,2,3,4,37,38,39,40,41,42,43,44,45,52],
  1: [5,6,7,8,9,10,11,12,22,23,24,25,26,30,31,32,47,62,63,67,68],
  2: [13,14,15,16,17,18,27,28,29,46,48,50,51,56,57,58,69,70],
  3: [19,20,21,49,53,54,55,59,60,61,64,65,66],
  4: [33,71,72]
};

export function getItemTier(itemType) {
  for (const [tier, types] of Object.entries(ITEM_TIER)) {
    if (types.includes(itemType)) return Number(tier);
  }
  return 0;
}

// ── Display colours (hex for Phaser) ─────────────────────────────────────────
export const ITEM_COLORS = {
  1:0x8B4513,  2:0x808080,  3:0x90EE90,  4:0xFF4500,  5:0xCD853F,  6:0xFF8C00,
  7:0xFF6347,  8:0xC0C0C0,  9:0xA0522D, 10:0xF5F5DC, 11:0x800080, 12:0x228B22,
  13:0x8B7355,14:0xBEC8D1, 15:0xD2691E, 16:0x4169E1, 17:0xFFD700, 18:0x556B2F,
  19:0xFFD700,20:0x9400D3, 21:0xFF4500, 22:0xB22222, 23:0xCD853F, 24:0xD2691E,
  25:0x8FBC8F,26:0xF0E68C, 27:0x708090, 28:0x778899, 29:0x4B0082, 30:0x696969,
  31:0x808080,32:0xBDB76B, 33:0xDAA520, 34:0xFF69B4, 35:0x1E90FF, 36:0xFFD700,
  37:0xDEB887,38:0x2F2F2F, 39:0xFFF44F, 40:0x87CEEB, 41:0x32CD32, 42:0x6B8E23,
  43:0xE0E0E0,44:0xADD8E6, 45:0x7B2FBE, 46:0xB8860B, 47:0x8B6914, 48:0x795548,
  49:0x7C4DFF,50:0x5D4037, 51:0x9E9E9E, 52:0xFFC107, 53:0x424242, 54:0x4A0080,
  55:0xB3E5FC,56:0x00BCD4, 57:0x26C6DA, 58:0xFF5722, 59:0x212121, 60:0x00E5FF,
  61:0xFFEB3B,62:0xF57F17, 63:0x795548, 64:0x311B92, 65:0x6A1B9A, 66:0x80DEEA,
  67:0xFF7043,68:0x8BC34A, 69:0x29B6F6, 70:0xAB47BC, 71:0x4A148C, 72:0x00838F,
  73:0x1565C0
};

// ── Consumable flag ───────────────────────────────────────────────────────────
export const ITEM_CONSUMABLE = new Set([4,15,16,22,23,24,25,26,56,57,58,67,68,69,70]);

// ── Food restore values { hunger, health, sanity } ────────────────────────────
export const FOOD_VALUES = {
  4:  { hunger: 20, health:  0, sanity:  5 },
  15: { hunger: 10, health:  0, sanity: 10 },
  16: { hunger: 15, health:  5, sanity:  0 },
  23: { hunger: 40, health: 10, sanity:  0 },
  24: { hunger: 60, health: 20, sanity:  5 },
  25: { hunger: 35, health: 15, sanity: 10 },
  26: { hunger: 30, health:  5, sanity: 15 },
  67: { hunger: 30, health: 10, sanity:  5 },
  68: { hunger: 10, health:  5, sanity: 20 },
};

// ── Potion effects ────────────────────────────────────────────────────────────
export const POTION_EFFECTS = {
  56: { type: "antivenom",   desc: "Cures poison; +10 HP" },
  57: { type: "stamina",     desc: "+25 AP bonus today" },
  58: { type: "fire",        desc: "+40% attack for 3 rounds; Kira: +60%" },
  69: { type: "frost",       desc: "Slow enemy for 2 rounds; +20 HP" },
  70: { type: "shadow",      desc: "+30% crit chance for 1 combat" },
};

// ── AP costs (must match GameRegistry.sol) ────────────────────────────────────
export const AP_COSTS = {
  GATHER:  5,
  CRAFT:   10,
  EAT:     2,
  MOVE:    5,
  EXPLORE: 5,
  REST:    20,
  IDLE:    50
};
export const AP_BONUS_REST  = 10;
export const MAX_DAILY_AP   = 100;
export const AP_WARNING     = 30;
export const AP_CRITICAL    = 10;

// ── Crafting recipes (must match seed-game.js indices) ────────────────────────
export const RECIPES = [
  { id: 0,  name:"斧头",      inputs:[{t:1,n:2},{t:2,n:1}],       out:5  },
  { id: 1,  name:"火把",      inputs:[{t:1,n:1},{t:3,n:1}],       out:6  },
  { id: 2,  name:"营火",      inputs:[{t:1,n:4},{t:2,n:2}],       out:7  },
  { id: 3,  name:"剑",        inputs:[{t:1,n:1},{t:2,n:3}],       out:8  },
  { id: 4,  name:"绳索",      inputs:[{t:41,n:3}],                out:47 },
  { id: 5,  name:"鱼竿",      inputs:[{t:1,n:2},{t:3,n:2}],       out:32 },
  { id: 6,  name:"炊具",      inputs:[{t:14,n:2},{t:1,n:1}],      out:30 },
  { id: 7,  name:"镐",        inputs:[{t:14,n:1},{t:1,n:2}],      out:31 },
  { id: 8,  name:"铁锭",      inputs:[{t:13,n:3}],                out:14 },
  { id: 9,  name:"铁剑",      inputs:[{t:14,n:2},{t:18,n:1}],     out:27 },
  { id: 10, name:"铁甲",      inputs:[{t:14,n:3},{t:9,n:2}],      out:28 },
  { id: 11, name:"皮甲",      inputs:[{t:9,n:3},{t:41,n:2}],      out:48 },
  { id: 12, name:"铁盔",      inputs:[{t:14,n:2}],                out:51 },
  { id: 13, name:"弓",        inputs:[{t:18,n:2},{t:43,n:1}],     out:50 },
  { id: 14, name:"箭矢",      inputs:[{t:2,n:1},{t:41,n:1}],      out:52 },
  { id: 15, name:"熟肉",      inputs:[{t:22,n:1}],                out:23 },
  { id: 16, name:"蘑菇汤",    inputs:[{t:15,n:2}],                out:25 },
  { id: 17, name:"浓汤",      inputs:[{t:22,n:1},{t:15,n:1}],     out:24 },
  { id: 18, name:"蜂蜜面包",  inputs:[{t:17,n:1},{t:3,n:2}],      out:26 },
  { id: 19, name:"香辣鱼",    inputs:[{t:16,n:1},{t:39,n:1}],     out:67 },
  { id: 20, name:"草药茶",    inputs:[{t:42,n:1}],                out:68 },
  { id: 21, name:"解毒药",    inputs:[{t:42,n:2}],                out:56 },
  { id: 22, name:"耐力药水",  inputs:[{t:42,n:1},{t:17,n:1}],     out:57 },
  { id: 23, name:"火焰精华",  inputs:[{t:39,n:2},{t:17,n:1}],     out:58 },
  { id: 24, name:"霜寒汤药",  inputs:[{t:44,n:1},{t:42,n:1}],     out:69 },
  { id: 25, name:"暗影药剂",  inputs:[{t:11,n:1},{t:45,n:1}],     out:70 },
  { id: 26, name:"远古之剑",  inputs:[{t:19,n:2},{t:14,n:3}],     out:33 },
  { id: 27, name:"魔法杖",    inputs:[{t:19,n:1},{t:14,n:3}],     out:49 },
  { id: 28, name:"蜘蛛甲",    inputs:[{t:43,n:3},{t:62,n:2}],     out:53 },
  { id: 29, name:"远古合金",  inputs:[{t:19,n:2},{t:14,n:3}],     out:46 },
  { id: 30, name:"暗影之刃",  inputs:[{t:20,n:1},{t:14,n:2}],     out:29 },
  { id: 31, name:"暗影斗篷",  inputs:[{t:20,n:1},{t:43,n:3}],     out:59 },
  { id: 32, name:"水晶球",    inputs:[{t:40,n:3},{t:19,n:1}],     out:60 },
  { id: 33, name:"虚空之刃",  inputs:[{t:65,n:1},{t:14,n:3}],     out:54 },
  { id: 34, name:"冰川剑",    inputs:[{t:66,n:1},{t:14,n:2}],     out:55 },
  { id: 35, name:"虚空收割者",inputs:[{t:64,n:1},{t:65,n:2},{t:46,n:1}], out:71 },
  { id: 36, name:"冰川之刃",  inputs:[{t:66,n:2},{t:46,n:1}],     out:72 },
];

// ── Resource node types (must match GatherOracle.sol) ─────────────────────────
export const RESOURCE_TYPES = {
  TREE:           0,
  ROCK:           1,
  GRASS_PATCH:    2,
  BERRY_BUSH:     3,
  IRON_DEPOSIT:   4,
  MUSHROOM_PATCH: 5,
  FISHING_SPOT:   6,
  BEEHIVE:        7,
  HARDWOOD_TREE:  8,
  CLAY_DEPOSIT:   9,
  COAL_SEAM:     10,
  SULFUR_VENT:   11,
  CRYSTAL_CLUSTER:12,
  VINE_PATCH:    13,
  HERBAL_GARDEN: 14,
  SPIDER_NEST:   15,
  GLACIER_FISSURE:16
};

export const RESOURCE_NAMES = {
  0:"树木",  1:"岩石",   2:"草丛",   3:"浆果丛",
  4:"铁矿",  5:"蘑菇",   6:"鱼塘",   7:"蜂巢",
  8:"硬木树",9:"泥土",  10:"煤层",  11:"硫磺喷口",
  12:"水晶簇",13:"藤蔓", 14:"草药园",15:"蜘蛛巢",
  16:"冰川裂隙"
};

export const RESOURCE_COLORS = {
  0:0x228B22, 1:0x696969, 2:0x90EE90, 3:0xFF6347, 4:0x8B7355,
  5:0xD2691E, 6:0x4169E1, 7:0xFFD700, 8:0x556B2F, 9:0xDEB887,
  10:0x2F2F2F,11:0xFFF44F,12:0x87CEEB,13:0x32CD32,14:0x6B8E23,
  15:0xE0E0E0,16:0xADD8E6
};

// Resource nodes available per region
export const RESOURCE_BY_REGION = {
  0: [0,1,2,3,9,13,14],          // Grasslands
  1: [0,1,4,5,8,10,12,13,15],   // Dark Forest
  2: [4,5,8,11,12,14,15],        // Ruins
  3: [4,10,11,14,15],            // Shadow Realm
  4: [4,10,11,16]                // Volcano
};
