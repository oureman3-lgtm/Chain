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

  // 3. EventOracle (stateless, no constructor deps)
  const EventOracle = await ethers.getContractFactory("EventOracle");
  const eventOracle = await EventOracle.deploy();
  await eventOracle.waitForDeployment();
  console.log("EventOracle:", await eventOracle.getAddress());

  // 4. WorldMap
  const WorldMap = await ethers.getContractFactory("WorldMap");
  const worldMap = await WorldMap.deploy(deployer.address);
  await worldMap.waitForDeployment();
  console.log("WorldMap:", await worldMap.getAddress());

  // 5. TileResource (depends on WorldMap)
  const TileResource = await ethers.getContractFactory("TileResource");
  const tileResource = await TileResource.deploy(
    deployer.address,
    await worldMap.getAddress()
  );
  await tileResource.waitForDeployment();
  console.log("TileResource:", await tileResource.getAddress());

  // 6. IdleSystem (depends on TileResource)
  const IdleSystem = await ethers.getContractFactory("IdleSystem");
  const idleSystem = await IdleSystem.deploy(
    deployer.address,
    await tileResource.getAddress()
  );
  await idleSystem.waitForDeployment();
  console.log("IdleSystem:", await idleSystem.getAddress());

  // 7. QuestSystem
  const QuestSystem = await ethers.getContractFactory("QuestSystem");
  const questSystem = await QuestSystem.deploy(deployer.address);
  await questSystem.waitForDeployment();
  console.log("QuestSystem:", await questSystem.getAddress());

  // 8. GatherOracle
  const GatherOracle = await ethers.getContractFactory("GatherOracle");
  const gatherOracle = await GatherOracle.deploy(
    deployer.address,
    await characterNFT.getAddress(),
    await itemNFT.getAddress()
  );
  await gatherOracle.waitForDeployment();
  console.log("GatherOracle:", await gatherOracle.getAddress());

  // 9. CraftingSystem
  const CraftingSystem = await ethers.getContractFactory("CraftingSystem");
  const craftingSystem = await CraftingSystem.deploy(
    deployer.address,
    await itemNFT.getAddress()
  );
  await craftingSystem.waitForDeployment();
  console.log("CraftingSystem:", await craftingSystem.getAddress());

  // 10. CombatSystem
  const CombatSystem = await ethers.getContractFactory("CombatSystem");
  const combatSystem = await CombatSystem.deploy(
    deployer.address,
    await characterNFT.getAddress(),
    await itemNFT.getAddress()
  );
  await combatSystem.waitForDeployment();
  console.log("CombatSystem:", await combatSystem.getAddress());

  // 11. GameRegistry
  const GameRegistry = await ethers.getContractFactory("GameRegistry");
  const gameRegistry = await GameRegistry.deploy(
    deployer.address,
    await characterNFT.getAddress(),
    await itemNFT.getAddress()
  );
  await gameRegistry.waitForDeployment();
  console.log("GameRegistry:", await gameRegistry.getAddress());

  // ── Wire integration addresses ──────────────────────────────────────────────

  // GatherOracle: set TileResource + QuestSystem
  await gatherOracle.setTileResource(await tileResource.getAddress());
  await gatherOracle.setQuestSystem(await questSystem.getAddress());

  // CombatSystem: set QuestSystem + EventOracle
  await combatSystem.setQuestSystem(await questSystem.getAddress());
  await combatSystem.setEventOracle(await eventOracle.getAddress());

  // GameRegistry: set all integrations
  await gameRegistry.setWorldMap(await worldMap.getAddress());
  await gameRegistry.setTileResource(await tileResource.getAddress());
  await gameRegistry.setQuestSystem(await questSystem.getAddress());
  await gameRegistry.setEventOracle(await eventOracle.getAddress());

  console.log("Integration addresses wired.");

  // ── Grant GAME_ROLE ─────────────────────────────────────────────────────────
  const GAME_ROLE = ethers.keccak256(ethers.toUtf8Bytes("GAME_ROLE"));

  // CharacterNFT: GameRegistry and CombatSystem can mint/update
  await characterNFT.grantRole(GAME_ROLE, await gameRegistry.getAddress());
  await characterNFT.grantRole(GAME_ROLE, await combatSystem.getAddress());

  // ItemNFT: GatherOracle, CraftingSystem, CombatSystem, GameRegistry can mint/burn
  await itemNFT.grantRole(GAME_ROLE, await gatherOracle.getAddress());
  await itemNFT.grantRole(GAME_ROLE, await craftingSystem.getAddress());
  await itemNFT.grantRole(GAME_ROLE, await combatSystem.getAddress());
  await itemNFT.grantRole(GAME_ROLE, await gameRegistry.getAddress());
  await itemNFT.grantRole(GAME_ROLE, await idleSystem.getAddress());

  // WorldMap: GameRegistry can move characters and record activity
  await worldMap.grantRole(GAME_ROLE, await gameRegistry.getAddress());
  await worldMap.grantRole(GAME_ROLE, await gatherOracle.getAddress());

  // TileResource: GameRegistry, GatherOracle, IdleSystem can consume/init
  await tileResource.grantRole(GAME_ROLE, await gameRegistry.getAddress());
  await tileResource.grantRole(GAME_ROLE, await gatherOracle.getAddress());
  await tileResource.grantRole(GAME_ROLE, await idleSystem.getAddress());

  // IdleSystem: GameRegistry calls rest/idle
  await idleSystem.grantRole(GAME_ROLE, await gameRegistry.getAddress());

  // QuestSystem: all game contracts can push notifications
  await questSystem.grantRole(GAME_ROLE, await gameRegistry.getAddress());
  await questSystem.grantRole(GAME_ROLE, await gatherOracle.getAddress());
  await questSystem.grantRole(GAME_ROLE, await combatSystem.getAddress());

  console.log("Roles granted.");

  // ── Save deployment addresses ──────────────────────────────────────────────
  const addresses = {
    CharacterNFT:   await characterNFT.getAddress(),
    ItemNFT:        await itemNFT.getAddress(),
    EventOracle:    await eventOracle.getAddress(),
    WorldMap:       await worldMap.getAddress(),
    TileResource:   await tileResource.getAddress(),
    IdleSystem:     await idleSystem.getAddress(),
    QuestSystem:    await questSystem.getAddress(),
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

  // ── Copy ABIs to frontend ──────────────────────────────────────────────────
  const abiDir = path.join(__dirname, "..", "frontend", "src", "web3", "abis");
  if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });

  const contractNames = [
    "CharacterNFT", "ItemNFT", "EventOracle", "WorldMap",
    "TileResource", "IdleSystem", "QuestSystem",
    "GatherOracle", "CraftingSystem", "CombatSystem", "GameRegistry"
  ];
  for (const name of contractNames) {
    const artifact = require(path.join(
      __dirname, "..", "artifacts", "contracts", `${name}.sol`, `${name}.json`
    ));
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
