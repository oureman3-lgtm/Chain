// Monster definitions (must match seed.js / CombatSystem)
export const MONSTERS = [
  {
    type:     0,
    name:     "小鬼",
    hp:       30,
    attack:   8,
    defense:  2,
    minLevel: 1,
    color:    0xFF4500,
    size:     16,
    spawnCondition: "night",   // when to spawn
    apCost:   15
  },
  {
    type:     1,
    name:     "暗影生物",
    hp:       60,
    attack:   18,
    defense:  5,
    minLevel: 2,
    color:    0x4B0082,
    size:     20,
    spawnCondition: "lowSanity", // when sanity < 30
    apCost:   20
  },
  {
    type:     2,
    name:     "树人卫士",
    hp:       120,
    attack:   25,
    defense:  10,
    minLevel: 4,
    color:    0x006400,
    size:     28,
    spawnCondition: "manyTreesCut", // after 10+ tree cuts in a day
    apCost:   30
  }
];

export const MONSTER_BY_TYPE = Object.fromEntries(MONSTERS.map(m => [m.type, m]));
