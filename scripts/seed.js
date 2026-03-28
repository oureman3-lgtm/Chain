const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const addresses = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", "localhost.json"), "utf8")
  );

  const CraftingSystem = await ethers.getContractAt("CraftingSystem", addresses.CraftingSystem);
  const CombatSystem   = await ethers.getContractAt("CombatSystem",   addresses.CombatSystem);

  // --- Crafting Recipes ---
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

  // --- Monsters ---
  // Monster 0: Goblin – night spawn, level 1+
  // Loot: Leather(9) 70%, Bone(10) 30%
  await CombatSystem.addMonster(
    "Goblin", 30, 8, 2, 1,
    [9, 10], [70, 30],
    15 // AP cost
  );
  console.log("Monster 0: Goblin (level 1+)");

  // Monster 1: Shadow – appears when sanity < 30, level 2+
  // Loot: ShadowMaterial(11) 100%
  await CombatSystem.addMonster(
    "Shadow", 60, 18, 5, 2,
    [11], [100],
    20 // AP cost
  );
  console.log("Monster 1: Shadow (level 2+)");

  // Monster 2: TreeGuard – appears after chopping many trees, level 4+
  // Loot: RareWood(12) 60%, Leather(9) 40%
  await CombatSystem.addMonster(
    "TreeGuard", 120, 25, 10, 4,
    [12, 9], [60, 40],
    30 // AP cost
  );
  console.log("Monster 2: TreeGuard (level 4+)");

  console.log("\nSeed complete!");
}

main().catch((err) => { console.error(err); process.exit(1); });
