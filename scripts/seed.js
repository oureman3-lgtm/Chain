const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const addresses = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", "localhost.json"), "utf8")
  );

  const craftingSystem = await ethers.getContractAt("CraftingSystem", addresses.CraftingSystem);
  const combatSystem   = await ethers.getContractAt("CombatSystem",   addresses.CombatSystem);

  await require("./seed-game")(craftingSystem, combatSystem);

  console.log("\nSeed complete!");
}

main().catch((err) => { console.error(err); process.exit(1); });
