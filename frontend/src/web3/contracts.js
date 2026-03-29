import { Contract } from "ethers";
import { signer } from "./wallet.js";

let addresses = null;
let _contracts = {};

export async function loadContracts() {
  const res = await fetch("/deployments/localhost.json");
  if (!res.ok) throw new Error("Deployments not found. Run deploy script first.");
  addresses = await res.json();

  const names = [
    "CharacterNFT", "ItemNFT",
    "EventOracle", "WorldMap", "TileResource",
    "IdleSystem", "QuestSystem",
    "GatherOracle", "CraftingSystem", "CombatSystem", "GameRegistry"
  ];
  for (const name of names) {
    const abiRes = await fetch(`/src/web3/abis/${name}.json`);
    const { abi } = await abiRes.json();
    _contracts[name] = new Contract(addresses[name], abi, signer);
  }

  return _contracts;
}

export function getContract(name) {
  if (!_contracts[name]) throw new Error(`Contract ${name} not loaded`);
  return _contracts[name];
}

// ── GameRegistry ──────────────────────────────────────────────────────────────

export async function isRegistered(address) {
  return getContract("GameRegistry").isRegistered(address);
}

export async function registerPlayer(characterClass) {
  const tx = await getContract("GameRegistry").registerPlayer(characterClass);
  return tx.wait();
}

/**
 * @param {object} params - all commitDay parameters
 */
export async function commitDay(params) {
  const {
    gatherCount   = 0,
    craftCount    = 0,
    eatCount      = 0,
    combatAP      = 0,
    moveCount     = 0,
    exploreCount  = 0,
    restCount     = 0,
    idleCount     = 0,
    daysSurvived,
    newLevel,
    died          = false,
    itemIdsToDestroy = [],
    craftedItemTypes = []
  } = params;
  const tx = await getContract("GameRegistry").commitDay(
    gatherCount, craftCount, eatCount, combatAP,
    moveCount, exploreCount, restCount, idleCount,
    daysSurvived, newLevel, died,
    itemIdsToDestroy, craftedItemTypes
  );
  return tx.wait();
}

/**
 * Move to a new tile (on-chain verification via WorldMap).
 */
export async function moveToTile(newTileId, daysSurvived, gameDay, newRegionId) {
  const tx = await getContract("GameRegistry").moveToTile(
    newTileId, daysSurvived, gameDay, newRegionId
  );
  return tx.wait();
}

// ── GatherOracle ──────────────────────────────────────────────────────────────

export async function resolveGather(characterId, resourceType, tileId, gameDay) {
  const tx = await getContract("GatherOracle").resolveGather(
    characterId, resourceType, tileId, gameDay
  );
  const receipt = await tx.wait();
  const event = receipt.logs.find(l => l.fragment?.name === "GatherResolved");
  return {
    itemType: Number(event.args.itemType),
    amount:   Number(event.args.amount)
  };
}

export async function localExplore(characterId, tileId, regionId, gameDay) {
  const tx = await getContract("GatherOracle").localExplore(
    characterId, tileId, regionId, gameDay
  );
  const receipt = await tx.wait();
  const event = receipt.logs.find(l => l.fragment?.name === "LocalExploreResult");
  return {
    outcome:  Number(event.args.outcome),
    itemType: Number(event.args.itemType),
    amount:   Number(event.args.amount)
  };
}

// ── CraftingSystem ────────────────────────────────────────────────────────────

export async function craftItem(recipeId, inputTokenIds) {
  const tx = await getContract("CraftingSystem").craft(recipeId, inputTokenIds);
  const receipt = await tx.wait();
  const event = receipt.logs.find(l => l.fragment?.name === "ItemCrafted");
  return {
    outputTokenId: Number(event.args.outputTokenId),
    outputType:    Number(event.args.outputType)
  };
}

// ── CombatSystem ──────────────────────────────────────────────────────────────

export async function initiateCombat(
  characterId, monsterType, stance, weaponTokenId = 0,
  currentRegion = 0, tileId = 0, gameDay = 0, isNight = false
) {
  const tx = await getContract("CombatSystem").initiateCombat(
    characterId, monsterType,
    { stance, weaponTokenId },
    currentRegion, tileId, gameDay, isNight
  );
  const receipt = await tx.wait();
  const event = receipt.logs.find(l => l.fragment?.name === "CombatFinished");
  return {
    victory:      event.args.victory,
    lootTokenId:  Number(event.args.lootTokenId),
    roundsFought: Number(event.args.roundsFought)
  };
}

// ── IdleSystem ────────────────────────────────────────────────────────────────

export async function rest(characterId) {
  const tx = await getContract("IdleSystem").rest(characterId);
  const receipt = await tx.wait();
  const event = receipt.logs.find(l => l.fragment?.name === "Rested");
  return {
    sanityRestored: Number(event.args.sanityRestored),
    apBonus:        Number(event.args.apBonus)
  };
}

export async function idleAction(characterId, tileId, luck, gameDay) {
  const tx = await getContract("IdleSystem").idle(characterId, tileId, luck, gameDay);
  const receipt = await tx.wait();
  const event = receipt.logs.find(l => l.fragment?.name === "IdleCompleted");
  return {
    resourceType: Number(event.args.resourceType),
    amount:       Number(event.args.amount)
  };
}

export async function canRest(characterId) {
  const [canDo, cooldown] = await getContract("IdleSystem").canRest(characterId);
  return { canDo, cooldown: Number(cooldown) };
}

export async function canIdle(characterId) {
  const [canDo, cooldown] = await getContract("IdleSystem").canIdle(characterId);
  return { canDo, cooldown: Number(cooldown) };
}

// ── EventOracle ───────────────────────────────────────────────────────────────

export async function getTileEvent(tileId, gameDay) {
  const info = await getContract("EventOracle").getTileEvent(tileId, gameDay);
  return {
    eventType:      Number(info.eventType),
    intensity:      Number(info.intensity),
    requiresAction: info.requiresAction
  };
}

// ── WorldMap ──────────────────────────────────────────────────────────────────

export async function getCharacterTile(characterId) {
  return Number(await getContract("WorldMap").getCharacterTile(characterId));
}

export async function getAdjacentTiles(tileId) {
  const tiles = await getContract("WorldMap").getAdjacentTiles(tileId);
  return tiles.map(Number);
}

export async function getTilePlayerCount(tileId) {
  return Number(await getContract("WorldMap").getTilePlayerCount(tileId));
}

// ── TileResource ──────────────────────────────────────────────────────────────

export async function getAllTileStock(tileId, gameDay) {
  const stocks = await getContract("TileResource").getAllStock(tileId, gameDay);
  return stocks.map(Number);
}

// ── QuestSystem ───────────────────────────────────────────────────────────────

export async function getMainQuestStage(characterId) {
  return Number(await getContract("QuestSystem").getMainQuestStage(characterId));
}

export async function getDailyQuest(characterId) {
  const dq = await getContract("QuestSystem").getDailyQuest(characterId);
  return {
    questType:   Number(dq.questType),
    progress:    Number(dq.progress),
    completed:   dq.completed,
    assignedDay: Number(dq.assignedDay)
  };
}

// ── CharacterNFT ─────────────────────────────────────────────────────────────

export async function getCharacterStats(characterId) {
  const stats = await getContract("CharacterNFT").getStats(characterId);
  return {
    level:          Number(stats.level),
    maxHealth:      Number(stats.maxHealth),
    maxHunger:      Number(stats.maxHunger),
    maxSanity:      Number(stats.maxSanity),
    attackPower:    Number(stats.attackPower),
    defense:        Number(stats.defense),
    luck:           Number(stats.luck),
    daysSurvived:   Number(stats.daysSurvived),
    deathCount:     Number(stats.deathCount),
    characterClass: stats.characterClass
  };
}

export async function getCharacterId(address) {
  return Number(await getContract("GameRegistry").getCharacterId(address));
}

// ── ItemNFT ───────────────────────────────────────────────────────────────────

export async function getPlayerItems(address) {
  const itemNFT = getContract("ItemNFT");
  const balance = Number(await itemNFT.balanceOf(address));
  const items = [];
  for (let i = 0; i < balance; i++) {
    const tokenId = Number(await itemNFT.tokenOfOwnerByIndex(address, i));
    const data    = await itemNFT.getItem(tokenId);
    items.push({
      tokenId,
      itemType:   Number(data.itemType),
      durability: Number(data.durability),
      name:       data.name
    });
  }
  return items;
}
