import { Contract } from "ethers";
import { signer } from "./wallet.js";

let addresses = null;
let _contracts = {};

export async function loadContracts() {
  // Load deployment addresses
  const res = await fetch("/deployments/localhost.json");
  if (!res.ok) throw new Error("Deployments not found. Run deploy script first.");
  addresses = await res.json();

  // Load ABIs
  const names = ["CharacterNFT", "ItemNFT", "GatherOracle", "CraftingSystem", "CombatSystem", "GameRegistry"];
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

// ── GameRegistry helpers ─────────────────────────────────────────────────────

export async function isRegistered(address) {
  return getContract("GameRegistry").isRegistered(address);
}

export async function registerPlayer(characterClass) {
  const tx = await getContract("GameRegistry").registerPlayer(characterClass);
  return tx.wait();
}

export async function commitDay(params) {
  const {
    gatherCount, craftCount, eatCount, combatAP,
    daysSurvived, newLevel, died, itemIdsToDestroy
  } = params;
  const tx = await getContract("GameRegistry").commitDay(
    gatherCount, craftCount, eatCount, combatAP,
    daysSurvived, newLevel, died, itemIdsToDestroy
  );
  return tx.wait();
}

// ── GatherOracle helpers ─────────────────────────────────────────────────────

export async function resolveGather(characterId, resourceType) {
  const tx = await getContract("GatherOracle").resolveGather(characterId, resourceType);
  const receipt = await tx.wait();
  const event = receipt.logs.find(l => l.fragment?.name === "GatherResolved");
  return {
    itemType: Number(event.args.itemType),
    amount:   Number(event.args.amount),
    tokenIds: [] // fetched separately if needed
  };
}

// ── CraftingSystem helpers ────────────────────────────────────────────────────

export async function craftItem(recipeId, inputTokenIds) {
  const tx = await getContract("CraftingSystem").craft(recipeId, inputTokenIds);
  const receipt = await tx.wait();
  const event = receipt.logs.find(l => l.fragment?.name === "ItemCrafted");
  return {
    outputTokenId: Number(event.args.outputTokenId),
    outputType:    Number(event.args.outputType)
  };
}

// ── CombatSystem helpers ──────────────────────────────────────────────────────

export async function initiateCombat(characterId, monsterType, stance, weaponTokenId = 0) {
  const tx = await getContract("CombatSystem").initiateCombat(
    characterId, monsterType, { stance, weaponTokenId }
  );
  const receipt = await tx.wait();
  const event = receipt.logs.find(l => l.fragment?.name === "CombatFinished");
  return {
    victory:      event.args.victory,
    lootTokenId:  Number(event.args.lootTokenId),
    roundsFought: Number(event.args.roundsFought)
  };
}

// ── CharacterNFT helpers ─────────────────────────────────────────────────────

export async function getCharacterStats(characterId) {
  const stats = await getContract("CharacterNFT").getStats(characterId);
  return {
    level:         Number(stats.level),
    maxHealth:     Number(stats.maxHealth),
    maxHunger:     Number(stats.maxHunger),
    maxSanity:     Number(stats.maxSanity),
    attackPower:   Number(stats.attackPower),
    defense:       Number(stats.defense),
    luck:          Number(stats.luck),
    daysSurvived:  Number(stats.daysSurvived),
    deathCount:    Number(stats.deathCount),
    characterClass: stats.characterClass
  };
}

export async function getCharacterId(address) {
  return Number(await getContract("GameRegistry").getCharacterId(address));
}

// ── ItemNFT helpers ───────────────────────────────────────────────────────────

export async function getPlayerItems(address) {
  const itemNFT = getContract("ItemNFT");
  const balance = Number(await itemNFT.balanceOf(address));
  const items = [];
  for (let i = 0; i < balance; i++) {
    const tokenId = Number(await itemNFT.tokenOfOwnerByIndex(address, i));
    const data = await itemNFT.getItem(tokenId);
    items.push({
      tokenId,
      itemType:   Number(data.itemType),
      durability: Number(data.durability),
      name:       data.name
    });
  }
  return items;
}
