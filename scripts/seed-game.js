/**
 * seed-game.js
 * Shared seeding logic – called by both deploy.js (localhost) and deploy-multichain.js.
 * Exports an async function that receives the CraftingSystem and CombatSystem contract instances.
 */

module.exports = async function seedGame(craftingSystem, combatSystem) {

  // ── Crafting Recipes ──────────────────────────────────────────────────────
  // addRecipe(inputTypes[], inputAmounts[], outputType)

  const recipes = [
    // Tier 1 – Basic survival
    { inputs: [[1, 2],   [2, 1]],   out: 5  }, //  0 Axe          (Wood×2 + Flint×1)
    { inputs: [[1, 3],   [1, 1]],   out: 6  }, //  1 Torch        (Wood + Grass)
    { inputs: [[1, 2],   [4, 2]],   out: 7  }, //  2 Campfire     (Wood×4 + Flint×2)
    { inputs: [[1, 2],   [1, 3]],   out: 8  }, //  3 Sword        (Wood + Flint×3)
    { inputs: [[41],     [3]],      out: 47 }, //  4 Rope         (Vine×3)
    { inputs: [[1, 3],   [2, 2]],   out: 32 }, //  5 FishingRod   (Wood×2 + Grass×2)
    { inputs: [[14, 1],  [2, 1]],   out: 30 }, //  6 CookingPot   (IronIngot×2 + Wood)
    { inputs: [[14, 1],  [1, 2]],   out: 31 }, //  7 Pickaxe      (IronIngot + Wood×2)

    // Tier 2 – Metal working
    { inputs: [[13],     [3]],      out: 14 }, //  8 IronIngot    (IronOre×3)
    { inputs: [[14, 18], [2, 1]],   out: 27 }, //  9 IronSword    (IronIngot×2 + Hardwood)
    { inputs: [[14, 9],  [3, 2]],   out: 28 }, // 10 IronArmor    (IronIngot×3 + Leather×2)
    { inputs: [[9, 41],  [3, 2]],   out: 48 }, // 11 LeatherArmor (Leather×3 + Vine×2)
    { inputs: [[14],     [2]],      out: 51 }, // 12 IronHelmet   (IronIngot×2)
    { inputs: [[18, 43], [2, 1]],   out: 50 }, // 13 Bow          (Hardwood×2 + SpiderSilk)
    { inputs: [[2, 41],  [1, 1]],   out: 52 }, // 14 Arrows       (Flint + Vine) → 3 arrows

    // Tier 2 – Alchemy / Food
    { inputs: [[22],     [1]],      out: 23 }, // 15 CookedMeat   (GoblinMeat)
    { inputs: [[15],     [2]],      out: 25 }, // 16 MushroomSoup (Mushroom×2)
    { inputs: [[22, 15], [1, 1]],   out: 24 }, // 17 Stew         (GoblinMeat + Mushroom)
    { inputs: [[17, 3],  [1, 2]],   out: 26 }, // 18 HoneyBread   (Honey + Grass×2)
    { inputs: [[16, 39], [1, 1]],   out: 67 }, // 19 SpicedFish   (Fish + Sulfur)
    { inputs: [[42],     [1]],      out: 68 }, // 20 HerbalTea    (HerbalRoot)
    { inputs: [[42],     [2]],      out: 56 }, // 21 Antivenom    (HerbalRoot×2)
    { inputs: [[42, 17], [1, 1]],   out: 57 }, // 22 Stamina Pot  (HerbalRoot + Honey)
    { inputs: [[39, 17], [2, 1]],   out: 58 }, // 23 FireElixir   (Sulfur×2 + Honey)
    { inputs: [[44, 42], [1, 1]],   out: 69 }, // 24 FrostTonic   (GlacierIce + HerbalRoot)
    { inputs: [[11, 45], [1, 1]],   out: 70 }, // 25 ShadowDrght  (ShadowMat + VoidEssence)

    // Tier 3 – Advanced gear (region ≥ 2)
    { inputs: [[19, 14], [2, 3]],   out: 33 }, // 26 AncientSword (AncientFrag×2 + IronIngot×3)
    { inputs: [[19, 14], [1, 3]],   out: 49 }, // 27 MagicStaff   (AncientFrag + IronIngot×3)
    { inputs: [[43, 62], [3, 2]],   out: 53 }, // 28 SpiderArmor  (SpiderSilk×3 + SpiderFang×2)
    { inputs: [[19, 14], [2, 3]],   out: 46 }, // 29 AncientAlloy (AncientFrag×2 + IronIngot×3)

    // Tier 3 – Shadow / Void (region ≥ 3)
    { inputs: [[20, 14], [1, 2]],   out: 29 }, // 30 ShadowBlade  (ShadowCrystal + IronIngot×2)
    { inputs: [[20, 43], [1, 3]],   out: 59 }, // 31 ShadowCloak  (ShadowCrystal + SpiderSilk×3)
    { inputs: [[40, 19], [3, 1]],   out: 60 }, // 32 CrystalOrb   (CrystalShard×3 + AncientFrag)
    { inputs: [[65, 14], [1, 3]],   out: 54 }, // 33 VoidBlade    (VoidShard + IronIngot×3)

    // Tier 3 – Glacier (region ≥ 3)
    { inputs: [[66, 14], [1, 2]],   out: 55 }, // 34 GlacierBlade (GlacierCrystal + IronIngot×2)

    // Tier 4 – Legendary (region ≥ 4)
    { inputs: [[64, 65, 46], [1, 2, 1]], out: 71 }, // 35 VoidReaper  (VoidCore+VoidShard×2+AncientAlloy)
    { inputs: [[66, 46],     [2, 1]],   out: 72 }, // 36 GlacierEdge (GlacierCrystal×2+AncientAlloy)
  ];

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    await craftingSystem.addRecipe(r.inputs[0], r.inputs[1], r.out);
    process.stdout.write(`  Recipe ${String(i).padStart(2)}: ${getItemName(r.out)}\n`);
  }

  // ── Monsters ─────────────────────────────────────────────────────────────
  // addMonster(name, hp, atk, def, minLevel, minRegion, lootTypes[], lootWeights[], apCost)

  const monsters = [
    // Grasslands (region 0)
    { name: "Wolf",       hp:  35, atk: 10, def:  3, lvl: 1, rgn: 0, loot: [[9,  63],  [60, 40]], ap: 12 },
    { name: "Goblin",     hp:  45, atk: 12, def:  3, lvl: 1, rgn: 0, loot: [[9,  10, 22], [45,30,25]], ap: 15 },
    // Dark Forest (region 1)
    { name: "Spider",     hp:  55, atk: 14, def:  5, lvl: 2, rgn: 1, loot: [[43, 62],  [55, 45]], ap: 18 },
    { name: "TreeGuard",  hp: 130, atk: 28, def: 12, lvl: 4, rgn: 1, loot: [[12, 18],  [60, 40]], ap: 30 },
    // Ruins (region 2)
    { name: "IronGolem",  hp: 190, atk: 32, def: 22, lvl: 5, rgn: 2, loot: [[14, 19],  [50, 50]], ap: 40 },
    { name: "Bandit",     hp:  80, atk: 20, def:  8, lvl: 3, rgn: 2, loot: [[9, 14, 10],[35,35,30]], ap: 22 },
    // Shadow Realm (region 3)
    { name: "Shadow",     hp:  70, atk: 22, def:  6, lvl: 3, rgn: 3, loot: [[11, 20],  [60, 40]], ap: 20 },
    { name: "VoidWalker", hp: 160, atk: 38, def: 14, lvl: 6, rgn: 3, loot: [[64, 45, 65],[40,35,25]], ap: 45 },
    // Volcano (region 4)
    { name: "LavaBeast",  hp: 260, atk: 45, def: 18, lvl: 7, rgn: 4, loot: [[21, 65],  [55, 45]], ap: 50 },
    { name: "VoidLord",   hp: 400, atk: 55, def: 25, lvl: 9, rgn: 4, loot: [[64, 66, 65],[30,35,35]], ap: 60 },
  ];

  for (let i = 0; i < monsters.length; i++) {
    const m = monsters[i];
    await combatSystem.addMonster(
      m.name, m.hp, m.atk, m.def, m.lvl, m.rgn,
      m.loot[0], m.loot[1], m.ap
    );
    console.log(`  Monster ${i}: ${m.name} (region ${m.rgn}, level ${m.lvl}+)`);
  }
};

function getItemName(type) {
  const names = {
    5:"Axe",6:"Torch",7:"Campfire",8:"Sword",14:"IronIngot",22:"CookedMeat→",
    23:"CookedMeat",24:"Stew",25:"MushroomSoup",26:"HoneyBread",27:"IronSword",
    28:"IronArmor",29:"ShadowBlade",30:"CookingPot",31:"Pickaxe",32:"FishingRod",
    33:"AncientSword",46:"AncientAlloy",47:"Rope",48:"LeatherArmor",49:"MagicStaff",
    50:"Bow",51:"IronHelmet",52:"Arrows",53:"SpiderArmor",54:"VoidBlade",
    55:"GlacierBlade",56:"Antivenom",57:"StaminaPotion",58:"FireElixir",
    59:"ShadowCloak",60:"CrystalOrb",67:"SpicedFish",68:"HerbalTea",
    69:"FrostTonic",70:"ShadowDraught",71:"VoidReaper",72:"GlacierEdge"
  };
  return names[type] || `ItemType(${type})`;
}
