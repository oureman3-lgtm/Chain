import { ITEM_NAMES, ITEM_COLORS } from "../game/config/items.js";

export class InventoryPanel {
  constructor(inventory) {
    this.inventory = inventory;
    this.el = document.getElementById("inventory-panel");
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.id = "inventory-panel";
      this.el.className = "panel";
      document.getElementById("ui-panels").appendChild(this.el);
    }
    this.render();
  }

  render() {
    const items = this.inventory.getAll();
    if (items.length === 0) {
      this.el.innerHTML = `<div class="panel-title">背包</div><p class="empty-msg">背包为空</p>`;
      return;
    }

    // Group by type
    const counts = {};
    for (const item of items) {
      counts[item.itemType] = (counts[item.itemType] || 0) + 1;
    }

    const slots = Object.entries(counts).map(([type, count]) => {
      const t = Number(type);
      const color = "#" + (ITEM_COLORS[t] || 0x888888).toString(16).padStart(6, "0");
      return `
        <div class="inv-slot" title="${ITEM_NAMES[t]}">
          <div class="inv-icon" style="background:${color}"></div>
          <span class="inv-name">${ITEM_NAMES[t]}</span>
          <span class="inv-count">×${count}</span>
        </div>`;
    }).join("");

    this.el.innerHTML = `<div class="panel-title">背包 (${items.length})</div>
      <div class="inv-grid">${slots}</div>`;
  }
}
