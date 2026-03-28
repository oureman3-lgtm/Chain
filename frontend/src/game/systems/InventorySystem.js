import { ITEM_NAMES, ITEM_TYPES } from "../config/items.js";

/**
 * Local inventory management.
 * Items are synced from the chain on load; changes are local
 * until commitDay or craft transactions confirm on-chain.
 */
export class InventorySystem {
  constructor() {
    // Map of tokenId → { tokenId, itemType, name, durability }
    this.items = new Map();
    this.listeners = [];
  }

  loadFromChain(chainItems) {
    this.items.clear();
    for (const item of chainItems) {
      this.items.set(item.tokenId, item);
    }
    this._notify();
  }

  addItem(item) {
    this.items.set(item.tokenId, item);
    this._notify();
  }

  removeItem(tokenId) {
    this.items.delete(tokenId);
    this._notify();
  }

  getByType(itemType) {
    return [...this.items.values()].filter(i => i.itemType === itemType);
  }

  getTokenIdsByType(itemType) {
    return this.getByType(itemType).map(i => i.tokenId);
  }

  countByType(itemType) {
    return this.getByType(itemType).length;
  }

  hasIngredients(recipe) {
    for (const { type, amount } of recipe.inputs) {
      if (this.countByType(type) < amount) return false;
    }
    return true;
  }

  /** Returns token IDs to pass to the craft() call, or null if not enough. */
  pickCraftTokenIds(recipe) {
    if (!this.hasIngredients(recipe)) return null;
    const ids = [];
    for (const { type, amount } of recipe.inputs) {
      const available = this.getTokenIdsByType(type);
      ids.push(...available.slice(0, amount));
    }
    return ids;
  }

  getAll() {
    return [...this.items.values()];
  }

  onChange(fn) { this.listeners.push(fn); }
  _notify() { this.listeners.forEach(fn => fn(this.getAll())); }
}
