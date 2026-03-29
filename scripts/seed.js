const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const addresses = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", "localhost.json"), "utf8")
  );

  const CraftingSystem = await ethers.getContractAt("CraftingSystem", addresses.CraftingSystem);
  const CombatSystem   = await ethers.getContractAt("CombatSystem",   addresses.CombatSystem);

  // ── Crafting Recipes ────────────────────────────────────────────────────────

  // Basic recipes (region 0)
  // Recipe 0: Axe = Wood×2 + Flint×1
  await CraftingSystem.addRecipe([1, 2], [2, 1], 5);
  console.log("Recipe 0: Axe (Wood×2 + Flint×1)");

  // Recipe 1: Torch = Wood×1 + Grass×1
  await CraftingSystem.addRecipe([1, 3], [1, 1], 6);
  console.log("Recipe 1: Torch (Wood×1 + Grass×1)");

  // Recipe 2: Campfire = Wood×4 + Flint×2
  await CraftingSystem.addRecipe([1, 2], [4, 2], 7);
  console.log("Recipe 2: Campfire (Wood×4 + Flint×2)");

  // Recipe 3: Sword = Wood×1 + Flint×3
  await CraftingSystem.addRecipe([1, 2], [1, 3], 8);
  console.log("Recipe 3: Sword (Wood×1 + Flint×3)");

  // Extended recipes (region 1+)
  // Recipe 4: IronIngot = IronOre×3
  await CraftingSystem.addRecipe([13], [3], 14);
  console.log("Recipe 4: IronIngot (IronOre×3)");

  // Recipe 5: IronSword = IronIngot×2 + Hardwood×1
  await CraftingSystem.addRecipe([14, 18], [2, 1], 27);
  console.log("Recipe 5: IronSword (IronIngot×2 + Hardwood×1)");

  // Recipe 6: IronArmor = IronIngot×3 + Leather×2
  await CraftingSystem.addRecipe([14, 9], [3, 2], 28);
  console.log("Recipe 6: IronArmor (IronIngot×3 + Leather×2)");

  // Recipe 7: Pickaxe = IronIngot×1 + Wood×2
  await CraftingSystem.addRecipe([14, 1], [1, 2], 31);
  console.log("Recipe 7: Pickaxe (IronIngot×1 + Wood×2)");

  // Recipe 8: FishingRod = Wood×2 + Grass×2
  await CraftingSystem.addRecipe([1, 3], [2, 2], 32);
  console.log("Recipe 8: FishingRod (Wood×2 + Grass×2)");

  // Recipe 9: CookingPot = IronIngot×2 + Wood×1
  await CraftingSystem.addRecipe([14, 1], [2, 1], 30);
  console.log("Recipe 9: CookingPot (IronIngot×2 + Wood×1)");

  // Cooked food recipes
  // Recipe 10: CookedMeat = GoblinMeat×1
  await CraftingSystem.addRecipe([22], [1], 23);
  console.log("Recipe 10: CookedMeat (GoblinMeat×1)");

  // Recipe 11: MushroomSoup = Mushroom×2
  await CraftingSystem.addRecipe([15], [2], 25);
  console.log("Recipe 11: MushroomSoup (Mushroom×2)");

  // Recipe 12: Stew = GoblinMeat×1 + Mushroom×1
  await CraftingSystem.addRecipe([22, 15], [1, 1], 24);
  console.log("Recipe 12: Stew (GoblinMeat×1 + Mushroom×1)");

  // Recipe 13: HoneyBread = Honey×1 + Grass×2
  await CraftingSystem.addRecipe([17, 3], [1, 2], 26);
  console.log("Recipe 13: HoneyBread (Honey×1 + Grass×2)");

  // Advanced recipes (region 3+)
  // Recipe 14: ShadowBlade = ShadowCrystal×1 + IronIngot×2
  await CraftingSystem.addRecipe([20, 14], [1, 2], 29);
  console.log("Recipe 14: ShadowBlade (ShadowCrystal×1 + IronIngot×2)");

  // Recipe 15: AncientSword = AncientFragment×2 + IronIngot×3
  await CraftingSystem.addRecipe([19, 14], [2, 3], 33);
  console.log("Recipe 15: AncientSword (AncientFragment×2 + IronIngot×3)");

  // ── Monsters ────────────────────────────────────────────────────────────────
  // addMonster(name, hp, attack, defense, minLevel, minRegion, lootTypes, lootWeights, apCost)

  // Monster 0: Goblin – region 0, night spawn, level 1+
  // Loot: Leather(9)=50, Bone(10)=30, GoblinMeat(22)=20
  await CombatSystem.addMonster(
    "Goblin", 30, 8, 2, 1, 0,
    [9, 10, 22], [50, 30, 20],
    15
  );
  console.log("Monster 0: Goblin (region 0, level 1+)");

  // Monster 1: Shadow – region 3, appears when sanity < 30, level 2+
  // Loot: ShadowMaterial(11)=70, ShadowCrystal(20)=30
  await CombatSystem.addMonster(
    "Shadow", 60, 18, 5, 2, 3,
    [11, 20], [70, 30],
    20
  );
  console.log("Monster 1: Shadow (region 3, level 2+)");

  // Monster 2: TreeGuard – region 1, appears after chopping many trees, level 4+
  // Loot: RareWood(12)=60, Hardwood(18)=40
  await CombatSystem.addMonster(
    "TreeGuard", 120, 25, 10, 4, 1,
    [12, 18], [60, 40],
    30
  );
  console.log("Monster 2: TreeGuard (region 1, level 4+)");

  // Monster 3: IronGolem – region 2, ruins guardian, level 5+
  // Loot: IronIngot(14)=50, AncientFragment(19)=50
  await CombatSystem.addMonster(
    "IronGolem", 180, 30, 20, 5, 2,
    [14, 19], [50, 50],
    40
  );
  console.log("Monster 3: IronGolem (region 2, level 5+)");

  // Monster 4: LavaBeast – region 4, volcano terror, level 7+
  // Loot: LavaRock(21)=60, ShadowCrystal(20)=40
  await CombatSystem.addMonster(
    "LavaBeast", 250, 40, 15, 7, 4,
    [21, 20], [60, 40],
    50
  );
  console.log("Monster 4: LavaBeast (region 4, level 7+)");

  console.log("\nSeed complete!");
}

main().catch((err) => { console.error(err); process.exit(1); });
