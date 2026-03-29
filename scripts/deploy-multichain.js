/**
 * deploy-multichain.js
 * Axiom Wilds – multi-chain deployment script
 *
 * Usage:
 *   npx hardhat run scripts/deploy-multichain.js --network polygon
 *   npx hardhat run scripts/deploy-multichain.js --network arbitrum
 *   npx hardhat run scripts/deploy-multichain.js --network base
 *   npx hardhat run scripts/deploy-multichain.js --network localhost
 *
 * After deploying on each chain, wire bridge contracts with:
 *   npx hardhat run scripts/wire-bridge.js --network polygon
 */

const { ethers, network } = require("hardhat");
const fs   = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId    = (await ethers.provider.getNetwork()).chainId.toString();
  const netName    = network.name;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Axiom Wilds – Deploy on ${netName} (chainId=${chainId})`);
  console.log(`${"=".repeat(60)}`);
  console.log("Deployer:", deployer.address);
  console.log("Balance: ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "native\n");

  const deploy = async (name, ...args) => {
    process.stdout.write(`  Deploying ${name.padEnd(22)}... `);
    const F = await ethers.getContractFactory(name);
    const c = await F.deploy(...args);
    await c.waitForDeployment();
    const addr = await c.getAddress();
    console.log(addr);
    return c;
  };

  // ── Core NFTs ─────────────────────────────────────────────────────────────
  const characterNFT   = await deploy("CharacterNFT",   deployer.address);
  const itemNFT        = await deploy("ItemNFT",        deployer.address);

  // ── Stateless oracles ────────────────────────────────────────────────────
  const eventOracle    = await deploy("EventOracle");
  const worldMap       = await deploy("WorldMap",       deployer.address);

  // ── Stateful systems ─────────────────────────────────────────────────────
  const tileResource   = await deploy("TileResource",   deployer.address, await worldMap.getAddress());
  const idleSystem     = await deploy("IdleSystem",     deployer.address, await tileResource.getAddress());
  const questSystem    = await deploy("QuestSystem",    deployer.address);
  const gatherOracle   = await deploy("GatherOracle",   deployer.address, await characterNFT.getAddress(), await itemNFT.getAddress());
  const craftingSystem = await deploy("CraftingSystem", deployer.address, await itemNFT.getAddress());
  const combatSystem   = await deploy("CombatSystem",   deployer.address, await characterNFT.getAddress(), await itemNFT.getAddress());
  const gameRegistry   = await deploy("GameRegistry",   deployer.address, await characterNFT.getAddress(), await itemNFT.getAddress());

  // ── Cross-chain bridge ───────────────────────────────────────────────────
  const bridge         = await deploy("CrossChainBridge", deployer.address, await characterNFT.getAddress(), await itemNFT.getAddress());

  console.log("\n  Wiring integration addresses...");

  await gatherOracle.setTileResource(await tileResource.getAddress());
  await gatherOracle.setQuestSystem(await questSystem.getAddress());
  await combatSystem.setQuestSystem(await questSystem.getAddress());
  await combatSystem.setEventOracle(await eventOracle.getAddress());
  await gameRegistry.setWorldMap(await worldMap.getAddress());
  await gameRegistry.setTileResource(await tileResource.getAddress());
  await gameRegistry.setQuestSystem(await questSystem.getAddress());
  await gameRegistry.setEventOracle(await eventOracle.getAddress());

  console.log("  Integration addresses wired.");

  // ── Grant roles ───────────────────────────────────────────────────────────
  console.log("\n  Granting roles...");
  const GAME_ROLE   = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));
  const BRIDGE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BRIDGE_ROLE"));

  const bridgeAddr      = await bridge.getAddress();
  const gameRegistryAddr = await gameRegistry.getAddress();
  const combatAddr       = await combatSystem.getAddress();
  const gatherAddr       = await gatherOracle.getAddress();
  const craftAddr        = await craftingSystem.getAddress();
  const idleAddr         = await idleSystem.getAddress();
  const questAddr        = await questSystem.getAddress();
  const tileAddr         = await tileResource.getAddress();
  const worldAddr        = await worldMap.getAddress();

  // CharacterNFT
  await characterNFT.grantRole(GAME_ROLE, gameRegistryAddr);
  await characterNFT.grantRole(GAME_ROLE, combatAddr);
  await characterNFT.grantRole(BRIDGE_ROLE, bridgeAddr);

  // ItemNFT
  await itemNFT.grantRole(GAME_ROLE, gatherAddr);
  await itemNFT.grantRole(GAME_ROLE, craftAddr);
  await itemNFT.grantRole(GAME_ROLE, combatAddr);
  await itemNFT.grantRole(GAME_ROLE, gameRegistryAddr);
  await itemNFT.grantRole(GAME_ROLE, idleAddr);
  await itemNFT.grantRole(BRIDGE_ROLE, bridgeAddr);

  // WorldMap
  await worldMap.grantRole(GAME_ROLE, gameRegistryAddr);
  await worldMap.grantRole(GAME_ROLE, gatherAddr);

  // TileResource
  await tileResource.grantRole(GAME_ROLE, gameRegistryAddr);
  await tileResource.grantRole(GAME_ROLE, gatherAddr);
  await tileResource.grantRole(GAME_ROLE, idleAddr);

  // IdleSystem / CombatSystem
  await idleSystem.grantRole(GAME_ROLE, gameRegistryAddr);
  await combatSystem.grantRole(GAME_ROLE, gameRegistryAddr);

  // QuestSystem
  await questSystem.grantRole(GAME_ROLE, gameRegistryAddr);
  await questSystem.grantRole(GAME_ROLE, gatherAddr);
  await questSystem.grantRole(GAME_ROLE, combatAddr);

  console.log("  Roles granted.");

  // ── Seed recipes and monsters ─────────────────────────────────────────────
  console.log("\n  Seeding game data...");
  await require("./seed-game")(craftingSystem, combatSystem);
  console.log("  Seed complete.");

  // ── Save deployment ───────────────────────────────────────────────────────
  const addresses = {
    network:         netName,
    chainId,
    deployer:        deployer.address,
    CharacterNFT:    await characterNFT.getAddress(),
    ItemNFT:         await itemNFT.getAddress(),
    EventOracle:     await eventOracle.getAddress(),
    WorldMap:        await worldMap.getAddress(),
    TileResource:    await tileResource.getAddress(),
    IdleSystem:      await idleSystem.getAddress(),
    QuestSystem:     await questSystem.getAddress(),
    GatherOracle:    await gatherAddr,
    CraftingSystem:  await craftAddr,
    CombatSystem:    await combatAddr,
    GameRegistry:    await gameRegistryAddr,
    CrossChainBridge: bridgeAddr
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);
  const outPath = path.join(deploymentsDir, `${netName}.json`);
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log(`\n  Deployment saved → deployments/${netName}.json`);

  // Copy ABIs to frontend
  const abiDir = path.join(__dirname, "..", "frontend", "src", "web3", "abis");
  if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });
  const contractNames = [
    "CharacterNFT", "ItemNFT", "EventOracle", "WorldMap",
    "TileResource", "IdleSystem", "QuestSystem",
    "GatherOracle", "CraftingSystem", "CombatSystem", "GameRegistry",
    "bridge/CrossChainBridge"
  ];
  for (const name of contractNames) {
    const baseName = name.split("/").pop();
    const artifact = require(path.join(
      __dirname, "..", "artifacts", "contracts", `${name}.sol`, `${baseName}.json`
    ));
    fs.writeFileSync(
      path.join(abiDir, `${baseName}.json`),
      JSON.stringify({ abi: artifact.abi }, null, 2)
    );
  }
  console.log("  ABIs copied to frontend.");

  console.log(`\n${"=".repeat(60)}`);
  console.log("  Deployment complete!");
  console.log(`${"=".repeat(60)}\n`);
  console.log(JSON.stringify(addresses, null, 2));
}

main().catch((err) => { console.error(err); process.exit(1); });
