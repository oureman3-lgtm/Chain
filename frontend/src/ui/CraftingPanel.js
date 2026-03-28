import { RECIPES, ITEM_NAMES } from "../game/config/items.js";

export class CraftingPanel {
  constructor(inventory, onCraft) {
    this.inventory = inventory;
    this.onCraft   = onCraft;
    this.el = document.getElementById("crafting-panel");
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.id = "crafting-panel";
      this.el.className = "panel";
      document.getElementById("ui-panels").appendChild(this.el);
    }
    this.render();
  }

  render() {
    const rows = RECIPES.map(recipe => {
      const canCraft = this.inventory.hasIngredients(recipe);
      const inputDesc = recipe.inputs.map(i => `${ITEM_NAMES[i.type]}×${i.amount}`).join(" + ");
      return `
        <div class="craft-row ${canCraft ? "craftable" : "unavail"}">
          <div class="craft-info">
            <span class="craft-name">${recipe.name}</span>
            <span class="craft-req">${inputDesc}</span>
          </div>
          <button class="craft-btn" data-id="${recipe.id}" ${canCraft ? "" : "disabled"}>
            合成
          </button>
        </div>`;
    }).join("");

    this.el.innerHTML = `<div class="panel-title">合成台</div>
      <div class="craft-list">${rows}</div>`;

    this.el.querySelectorAll(".craft-btn:not([disabled])").forEach(btn => {
      btn.addEventListener("click", () => {
        const recipeId = Number(btn.dataset.id);
        const recipe   = RECIPES.find(r => r.id === recipeId);
        const tokenIds = this.inventory.pickCraftTokenIds(recipe);
        if (tokenIds) this.onCraft(recipe, tokenIds);
      });
    });
  }
}
