/**
 * characters.js – Axiom Wilds original character roster
 *
 * Six survivor archetypes with distinct playstyles.
 * Stats here must mirror CharacterNFT.sol ClassTemplate values.
 *
 * Special Ability IDs (matches CharacterNFT.sol):
 *   0 = NONE
 *   1 = FIRE_AFFINITY   (Kira)
 *   2 = IRON_WILL       (Draven)
 *   3 = LUCKY_HARVEST   (Lila)
 *   4 = SHADOW_STEP     (Vox)
 *   5 = ARCANE_CRAFT    (Sael)
 */

export const CHARACTERS = {
  ryn: {
    id:       "ryn",
    name:     "Ryn",
    title:    "The Scout",
    lore:     "A wandering explorer who survived the Axiom Collapse through wit and adaptability. "
            + "Neither the strongest nor the luckiest, Ryn's true power is resilience.",
    difficulty: 1,   // 1=easy, 2=medium, 3=hard
    playstyle: "Balanced – ideal first character. No glaring weakness, no extreme strength.",

    stats: {
      maxHealth:   100,
      maxHunger:   100,
      maxSanity:   100,
      attackPower:  22,
      defense:      12,
      luck:         12
    },
    specialAbility: 0,
    specialName:    "—",
    specialDesc:    "No special ability. Pure, balanced survivor.",

    // Visual / UI
    color:          0x4FC3F7,  // light blue
    spriteFrame:    0,         // row in characters_sheet.png
    portraitFile:   "ryn_portrait.png"
  },

  kira: {
    id:       "kira",
    name:     "Kira",
    title:    "The Pyromancer",
    lore:     "Once a researcher studying Axiom crystals, the explosion fused her with its fire energy. "
            + "Her temper burns as hot as her power.",
    difficulty: 2,
    playstyle: "Glass Cannon – devastating damage but fragile; sanity suffers at night.",

    stats: {
      maxHealth:    85,
      maxHunger:    90,
      maxSanity:    80,
      attackPower:  28,
      defense:       8,
      luck:         20
    },
    specialAbility: 1,
    specialName:    "Fire Affinity",
    specialDesc:    "+25% yield from SulfurVent and Lava-region nodes; +30% attack with Torch / FireElixir active.",

    color:          0xFF7043,
    spriteFrame:    1,
    portraitFile:   "kira_portrait.png"
  },

  draven: {
    id:       "draven",
    name:     "Draven",
    title:    "The Knight",
    lore:     "An ex-military officer whose heavy armour let him walk out of the collapsed city while "
            + "others fled. He fights to protect what little civilisation remains.",
    difficulty: 1,
    playstyle: "Tank – outlasts enemies through sheer durability; food consumption is high.",

    stats: {
      maxHealth:   130,
      maxHunger:   110,
      maxSanity:    90,
      attackPower:  20,
      defense:      20,
      luck:          6
    },
    specialAbility: 2,
    specialName:    "Iron Will",
    specialDesc:    "All incoming damage reduced by 20%. Immune to one-hit-kill below 10 HP (once per combat).",

    color:          0x90A4AE,
    spriteFrame:    2,
    portraitFile:   "draven_portrait.png"
  },

  lila: {
    id:       "lila",
    name:     "Lila",
    title:    "The Herbalist",
    lore:     "A healer who studied the Axiom flora before the collapse. She can find food and materials "
            + "where others find nothing, and her potions are legendary.",
    difficulty: 2,
    playstyle: "Gatherer / Support – exceptional resource collection; weaker in direct combat.",

    stats: {
      maxHealth:    90,
      maxHunger:   100,
      maxSanity:   110,
      attackPower:  14,
      defense:       9,
      luck:         30
    },
    specialAbility: 3,
    specialName:    "Lucky Harvest",
    specialDesc:    "All gather amounts ×1.5 (rounded up). Hidden stash probability during explore doubled.",

    color:          0xA5D6A7,
    spriteFrame:    3,
    portraitFile:   "lila_portrait.png"
  },

  vox: {
    id:       "vox",
    name:     "Vox",
    title:    "The Trickster",
    lore:     "A former thief who learned to weaponise the darkness itself. "
            + "The night that terrifies others is Vox's hunting ground.",
    difficulty: 3,
    playstyle: "Night Specialist – dominant after dark; fragile by day. High skill ceiling.",

    stats: {
      maxHealth:    80,
      maxHunger:    90,
      maxSanity:    95,
      attackPower:  24,
      defense:      10,
      luck:         25
    },
    specialAbility: 4,
    specialName:    "Shadow Step",
    specialDesc:    "At night: attack ×1.3 and no sanity penalty from nighttime exposure. "
                  + "Critical hit chance +15% in darkness.",

    color:          0xCE93D8,
    spriteFrame:    4,
    portraitFile:   "vox_portrait.png"
  },

  sael: {
    id:       "sael",
    name:     "Sael",
    title:    "The Sage",
    lore:     "An ancient-order scholar who survived by understanding the Axiom's patterns. "
            + "Sael doesn't fight the chaos — she manipulates it.",
    difficulty: 3,
    playstyle: "Alchemy / Crafting – unlocks extra recipes and bonus crafts; relies on preparation.",

    stats: {
      maxHealth:    90,
      maxHunger:    95,
      maxSanity:   120,
      attackPower:  18,
      defense:      12,
      luck:         15
    },
    specialAbility: 5,
    specialName:    "Arcane Craft",
    specialDesc:    "20% chance to keep one random input item after crafting. "
                  + "10% chance to craft a bonus extra output item.",

    color:          0xFFCC80,
    spriteFrame:    5,
    portraitFile:   "sael_portrait.png"
  }
};

export const CHARACTER_LIST = Object.values(CHARACTERS);

export function getCharacter(classId) {
  return CHARACTERS[classId] || null;
}

// Special ability names (index = specialAbility value in contract)
export const SPECIAL_ABILITY_NAMES = [
  "—",
  "Fire Affinity",
  "Iron Will",
  "Lucky Harvest",
  "Shadow Step",
  "Arcane Craft"
];

// Level-up stat bonuses (must match GameRegistry.sol constants)
export const LEVEL_UP_BONUSES = {
  maxHealth:   5,
  attackPower: 2,
  defense:     1,
  luck:        2
};
