/**
 * CombatModal – strategy selection before on-chain combat.
 * Player chooses stance and weapon, then confirms.
 */
export class CombatModal {
  constructor(onConfirm) {
    this.onConfirm = onConfirm;
    this.el = document.getElementById("combat-modal");
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.id = "combat-modal";
      this.el.className = "modal hidden";
      document.body.appendChild(this.el);
    }
  }

  show(monster, weapons, onConfirm) {
    this.el.classList.remove("hidden");
    this.el.innerHTML = `
      <div class="modal-box">
        <h2>⚔️ 遭遇${monster.name}</h2>
        <p class="monster-stats">HP ${monster.hp} · 攻击 ${monster.attack} · 防御 ${monster.defense}
          · 最低等级 ${monster.minLevel} · 消耗 ${monster.apCost} AP</p>

        <div class="modal-section">
          <label>战斗姿态</label>
          <div class="stance-group">
            <button class="stance-btn active" data-stance="0">进攻 (攻×1.3 / 防×0.7)</button>
            <button class="stance-btn" data-stance="1">平衡 (攻×1.0 / 防×1.0)</button>
            <button class="stance-btn" data-stance="2">防御 (攻×0.7 / 防×1.3)</button>
          </div>
        </div>

        <div class="modal-section">
          <label>武器</label>
          <select id="weapon-select">
            ${weapons.map(w => `<option value="${w.tokenId}">${w.label}${w.tokenId ? ` (#${w.tokenId})` : ""}</option>`).join("")}
          </select>
        </div>

        <div class="modal-actions">
          <button id="combat-confirm" class="btn-primary">确认战斗（链上）</button>
          <button id="combat-cancel"  class="btn-secondary">撤退</button>
        </div>
      </div>`;

    let selectedStance = 0;

    this.el.querySelectorAll(".stance-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.el.querySelectorAll(".stance-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedStance = Number(btn.dataset.stance);
      });
    });

    this.el.querySelector("#combat-confirm").addEventListener("click", async () => {
      const weaponId = Number(this.el.querySelector("#weapon-select").value);
      this.hide();
      await onConfirm(selectedStance, weaponId);
    });

    this.el.querySelector("#combat-cancel").addEventListener("click", () => this.hide());
  }

  hide() {
    this.el.classList.add("hidden");
    this.el.innerHTML = "";
  }
}
