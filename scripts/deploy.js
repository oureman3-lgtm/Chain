const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. CharacterNFT
  const CharacterNFT = await ethers.getContractFactory("CharacterNFT");
  const characterNFT = await CharacterNFT.deploy(deployer.address);
  await characterNFT.waitForDeployment();
  console.log("CharacterNFT:", await characterNFT.getAddress());

  // 2. ItemNFT
  const ItemNFT = await ethers.getContractFactory("ItemNFT");
  const itemNFT = await ItemNFT.deploy(deployer.address);
  await itemNFT.waitForDeployment();
  console.log("ItemNFT:", await itemNFT.getAddress());

  // 3. GatherOracle
  const GatherOracle = await ethers.getContractFactory("GatherOracle");
  const gatherOracle = await GatherOracle.deploy(
    deployer.address,
    await characterNFT.getAddress(),
    await itemNFT.getAddress()
  );
  await gatherOracle.waitForDeployment();
  console.log("GatherOracle:", await gatherOracle.getAddress());

  // 4. CraftingSystem
  const CraftingSystem = await ethers.getContractFactory("CraftingSystem");
  const craftingSystem = await CraftingSystem.deploy(
    deployer.address,
    await itemNFT.getAddress()
  );
  await craftingSystem.waitForDeployment();
  console.log("CraftingSystem:", await craftingSystem.getAddress());

  // 5. CombatSystem
  const CombatSystem = await ethers.getContractFactory("CombatSystem");
  const combatSystem = await CombatSystem.deploy(
    deployer.address,
    await characterNFT.getAddress(),
    await itemNFT.getAddress()
  );
  await combatSystem.waitForDeployment();
  console.log("CombatSystem:", await combatSystem.getAddress());

  // 6. GameRegistry
  const GameRegistry = await ethers.getContractFactory("GameRegistry");
  const gameRegistry = await GameRegistry.deploy(
    deployer.address,
    await characterNFT.getAddress(),
    await itemNFT.getAddress()
  );
  await gameRegistry.waitForDeployment();
  console.log("GameRegistry:", await gameRegistry.getAddress());

  // --- Grant GAME_ROLE to registries and oracles ---
  const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));

  // CharacterNFT: GameRegistry and CombatSystem can mint/update
  await characterNFT.grantRole(GAME_ROLE, await gameRegistry.getAddress());
  await characterNFT.grantRole(GAME_ROLE, await combatSystem.getAddress());

  // ItemNFT: GatherOracle, CraftingSystem, CombatSystem, GameRegistry can mint/burn
  await itemNFT.grantRole(GAME_ROLE, await gatherOracle.getAddress());
  await itemNFT.grantRole(GAME_ROLE, await craftingSystem.getAddress());
  await itemNFT.grantRole(GAME_ROLE, await combatSystem.getAddress());
  await itemNFT.grantRole(GAME_ROLE, await gameRegistry.getAddress());

  console.log("Roles granted.");

  // --- Save deployment addresses ---
  const addresses = {
    CharacterNFT:   await characterNFT.getAddress(),
    ItemNFT:        await itemNFT.getAddress(),
    GatherOracle:   await gatherOracle.getAddress(),
    CraftingSystem: await craftingSystem.getAddress(),
    CombatSystem:   await combatSystem.getAddress(),
    GameRegistry:   await gameRegistry.getAddress(),
    chainId: (await ethers.provider.getNetwork()).chainId.toString()
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);
  fs.writeFileSync(
    path.join(deploymentsDir, "localhost.json"),
    JSON.stringify(addresses, null, 2)
  );

  // Copy ABIs to frontend
  const abiDir = path.join(__dirname, "..", "frontend", "src", "web3", "abis");
  if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });

  const contracts = ["CharacterNFT", "ItemNFT", "GatherOracle", "CraftingSystem", "CombatSystem", "GameRegistry"];
  for (const name of contracts) {
    const artifact = require(path.join(__dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`));
    fs.writeFileSync(
      path.join(abiDir, `${name}.json`),
      JSON.stringify({ abi: artifact.abi }, null, 2)
    );
  }

  console.log("ABIs copied to frontend.");
  console.log("\nDeployment complete!");
  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
