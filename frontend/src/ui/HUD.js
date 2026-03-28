/**
 * HUD – DOM overlay for status bars and AP tracker.
 * Injected into #hud-root div in index.html.
 */
export class HUD {
  constructor(state, apTracker, characterClass) {
    this.el = document.getElementById("hud-root");
    if (!this.el) {
      this.el = document.createElement("div");
      this.el.id = "hud-root";
      document.body.appendChild(this.el);
    }
    this.el.innerHTML = this._template(characterClass);
    this._tooltip = null;
    this.update(state, apTracker, null);
  }

  _template(cls) {
    const classLabel = { wilson: "威尔逊", willow: "薇洛", wendy: "温蒂" }[cls] || cls;
    return `
    <div class="hud-bars">
      <div class="hud-bar-row">
        <span class="hud-icon">❤️</span>
        <div class="hud-bar-bg"><div id="bar-health" class="hud-bar health-bar" style="width:100%"></div></div>
        <span id="val-health" class="hud-val">100</span>
      </div>
      <div class="hud-bar-row">
        <span class="hud-icon">🍖</span>
        <div class="hud-bar-bg"><div id="bar-hunger" class="hud-bar hunger-bar" style="width:100%"></div></div>
        <span id="val-hunger" class="hud-val">100</span>
      </div>
      <div class="hud-bar-row">
        <span class="hud-icon">🧠</span>
        <div class="hud-bar-bg"><div id="bar-sanity" class="hud-bar sanity-bar" style="width:100%"></div></div>
        <span id="val-sanity" class="hud-val">100</span>
      </div>
      <div class="hud-bar-row">
        <span class="hud-icon">⚡</span>
        <div class="hud-bar-bg"><div id="bar-ap" class="hud-bar ap-bar" style="width:100%"></div></div>
        <span id="val-ap" class="hud-val">100</span>
      </div>
    </div>
    <div class="hud-top-right">
      <span id="hud-day" class="hud-day">第 1 天</span>
      <span id="hud-phase" class="hud-phase">白天</span>
      <span class="hud-class">${classLabel}</span>
    </div>
    <div id="tooltip" class="hud-tooltip" style="display:none"></div>
    `;
  }

  update(state, apTracker, dayNight) {
    this._setBar("health", state.health, state.maxHealth, "#e63946");
    this._setBar("hunger", state.hunger, state.maxHunger, "#e9c46a");
    this._setBar("sanity", state.sanity, state.maxSanity, "#a8dadc");
    if (apTracker) {
      const ap = 100 - apTracker.used;
      this._setBar("ap",     ap, 100, "#52b788");
      document.getElementById("val-ap").textContent = Math.max(0, ap);
    }
    if (dayNight) {
      const d = document.getElementById("hud-day");
      const p = document.getElementById("hud-phase");
      if (d) d.textContent = `第 ${dayNight.day} 天`;
      if (p) p.textContent = dayNight.isNight ? "🌙 黑夜" : dayNight.isDusk ? "🌇 黄昏" : "☀️ 白天";
    }
  }

  _setBar(name, value, max, color) {
    const bar = document.getElementById(`bar-${name}`);
    const val = document.getElementById(`val-${name}`);
    if (!bar) return;
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    bar.style.width = pct + "%";
    bar.style.background = color;
    if (val) val.textContent = Math.ceil(value);
  }

  showTooltip(x, y, text) {
    const t = document.getElementById("tooltip");
    if (!t) return;
    t.textContent = text;
    t.style.left  = x + "px";
    t.style.top   = y + "px";
    t.style.display = "block";
  }

  hideTooltip() {
    const t = document.getElementById("tooltip");
    if (t) t.style.display = "none";
  }
}
