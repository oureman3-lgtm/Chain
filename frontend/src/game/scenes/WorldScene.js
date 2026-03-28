import { Player }          from "../entities/Player.js";
import { SurvivalSystem }  from "../systems/SurvivalSystem.js";
import { DayNightSystem }  from "../systems/DayNightSystem.js";
import { InventorySystem } from "../systems/InventorySystem.js";
import { SpawnSystem }     from "../systems/SpawnSystem.js";
import { APTracker }       from "../systems/APTracker.js";
import { HUD }             from "../../ui/HUD.js";
import { InventoryPanel }  from "../../ui/InventoryPanel.js";
import { CraftingPanel }   from "../../ui/CraftingPanel.js";
import { CombatModal }     from "../../ui/CombatModal.js";
import { NotificationBar } from "../../ui/NotificationBar.js";
import {
  getAddress, getCharacterId, getCharacterStats,
  getPlayerItems, resolveGather, craftItem,
  initiateCombat, commitDay
} from "../../web3/contracts.js";
import { WORLD } from "../config/world.js";
import { ITEM_NAMES, RECIPES } from "../config/items.js";
import { MONSTER_BY_TYPE } from "../config/monsters.js";

export class WorldScene extends Phaser.Scene {
  constructor() { super("WorldScene"); }

  async create() {
    // ── Blockchain init ─────────────────────────────────────────────────────
    this.address     = await getAddress();
    this.characterId = await getCharacterId(this.address);
    const chainStats = await getCharacterStats(this.characterId);
    const chainItems = await getPlayerItems(this.address);

    // ── Local game state ─────────────────────────────────────────────────────
    this.state = {
      health:    chainStats.maxHealth,
      hunger:    chainStats.maxHunger,
      sanity:    chainStats.maxSanity,
      maxHealth: chainStats.maxHealth,
      maxHunger: chainStats.maxHunger,
      maxSanity: chainStats.maxSanity,
      level:     chainStats.level,
      daysSurvived: chainStats.daysSurvived
    };
    this.charStats   = chainStats;
    this.consumedIds = []; // items burned this day
    this.died        = false;

    // ── Systems ──────────────────────────────────────────────────────────────
    this.apTracker  = new APTracker();
    this.inventory  = new InventorySystem();
    this.inventory.loadFromChain(chainItems);
    this.survival   = new SurvivalSystem(this);
    this.spawner    = new SpawnSystem(this);
    this.dayNight   = new DayNightSystem(this, (day) => this._onDayEnd(day));

    // ── World background ─────────────────────────────────────────────────────
    this.add.rectangle(WORLD.WIDTH/2, WORLD.HEIGHT/2, WORLD.WIDTH, WORLD.HEIGHT, 0x3d6b35);
    this.spawner.spawnWorldResources();

    // ── Player ───────────────────────────────────────────────────────────────
    this.player = new Player(this, WORLD.WIDTH/2, WORLD.HEIGHT/2);

    // ── Darkness overlay (fixed to camera) ──────────────────────────────────
    this.darkOverlay = this.add.rectangle(400, 300, 800, 600, 0x000022, 0)
      .setScrollFactor(0)
      .setDepth(10);

    // ── UI ───────────────────────────────────────────────────────────────────
    this.hud           = new HUD(this.state, this.apTracker, chainStats.characterClass);
    this.invPanel      = new InventoryPanel(this.inventory);
    this.craftPanel    = new CraftingPanel(this.inventory, (r, ids) => this._onCraft(r, ids));
    this.combatModal   = new CombatModal((type, stance, weaponId) => this._onFight(type, stance, weaponId));
    this.notif         = new NotificationBar();

    this.inventory.onChange(() => {
      this.invPanel.render();
      this.craftPanel.render();
    });

    // ── Game events ──────────────────────────────────────────────────────────
    this.events.on("gatherNode",    (node) => this._onGather(node));
    this.events.on("attackMonster", (sprite) => this._onAttackMonster(sprite));
    this.events.on("night",         () => this.spawner.spawnNightMonsters(this.state));
    this.events.on("dawn",          () => this.spawner.clearMonsters());
    this.events.on("showTooltip",   ({ x, y, text }) => this.hud.showTooltip(x, y, text));
    this.events.on("hideTooltip",   () => this.hud.hideTooltip());
  }

  update(time, delta) {
    if (!this.player) return;

    this.player.update(delta);

    // Check campfire proximity
    const nearFire = this._isNearCampfire();

    // Survival
    const { isDead, isLowSanity } = this.survival.update(
      delta, this.state, this.dayNight.isNight, nearFire
    );

    // Day/night
    const darkAlpha = this.dayNight.update(delta);
    this.darkOverlay.setAlpha(darkAlpha);

    // Shadow spawn when sanity is low
    if (isLowSanity && this.dayNight.isDay && Math.random() < 0.0001) {
      this.spawner.spawnShadowMonsters();
    }

    // TreeGuard spawn after many tree cuts
    if (this.spawner.treeCutCount >= 10 && Math.random() < 0.00005) {
      this.spawner.spawnTreeGuard();
      this.spawner.treeCutCount = 0;
    }

    // Update HUD
    this.hud.update(this.state, this.apTracker, this.dayNight);

    // Death check
    if (isDead && !this.died) {
      this.died = true;
      this._onDeath();
    }
  }

  // ── Interaction handlers ───────────────────────────────────────────────────

  async _onGather(node) {
    if (node.isGathered) return;

    // Check player proximity
    const dx = this.player.x - node.x;
    const dy = this.player.y - node.y;
    if (Math.sqrt(dx*dx + dy*dy) > WORLD.INTERACT_RADIUS) {
      this.notif.warn("距离太远，请靠近后采集");
      return;
    }

    // AP check
    if (!this.apTracker.canGather()) {
      this.notif.warn("今日行动点已耗尽！等待明天重置");
      return;
    }

    this.notif.info("采集中，请在 MetaMask 确认...");
    try {
      this.apTracker.recordGather();
      const result = await resolveGather(this.characterId, node.resourceType);
      this.spawner.markGathered(node);

      // Reload items from chain
      const items = await getPlayerItems(this.address);
      this.inventory.loadFromChain(items);

      this.notif.success(`采集到 ${ITEM_NAMES[result.itemType]} ×${result.amount}`);
    } catch (e) {
      this.apTracker.gatherCount--; // rollback
      this.notif.error("采集失败: " + e.message);
    }
  }

  async _onCraft(recipe, inputTokenIds) {
    if (!this.apTracker.canCraft()) {
      this.notif.warn("今日行动点已耗尽！等待明天重置");
      return;
    }

    this.notif.info(`合成${recipe.name}，请在 MetaMask 确认...`);
    try {
      this.apTracker.recordCraft();
      const result = await craftItem(recipe.id, inputTokenIds);

      // Remove used items locally, add output
      for (const id of inputTokenIds) this.inventory.removeItem(id);

      const items = await getPlayerItems(this.address);
      this.inventory.loadFromChain(items);

      this.notif.success(`合成成功：${recipe.name} (NFT #${result.outputTokenId})`);
    } catch (e) {
      this.apTracker.craftCount--;
      this.notif.error("合成失败: " + e.message);
    }
  }

  _onAttackMonster(sprite) {
    const monster = sprite.monsterDef;

    // Level check
    if (this.charStats.level < monster.minLevel) {
      this.notif.warn(`等级不足！需要 ${monster.minLevel} 级`);
      return;
    }

    // AP check
    if (!this.apTracker.canFight(monster.apCost)) {
      this.notif.warn("今日行动点不足，无法战斗");
      return;
    }

    // Show combat modal (strategy selection)
    const weaponIds = this.inventory.getTokenIdsByType(8); // Sword
    const axeIds    = this.inventory.getTokenIdsByType(5); // Axe
    const weapons   = [
      { label: "徒手", tokenId: 0 },
      ...axeIds.map(id => ({ label: "斧头", tokenId: id })),
      ...weaponIds.map(id => ({ label: "剑", tokenId: id }))
    ];

    this.combatModal.show(monster, weapons, async (stance, weaponId) => {
      await this._executeCombat(sprite, monster, stance, weaponId);
    });
  }

  async _executeCombat(sprite, monster, stance, weaponId) {
    this.notif.info("战斗开始，请在 MetaMask 确认...");
    try {
      this.apTracker.recordCombat(monster.apCost);
      const result = await initiateCombat(this.characterId, monster.type, stance, weaponId);

      // Apply HP delta locally
      if (!result.victory) {
        this.state.health = 0;
      }

      this.spawner.removeMonster(sprite);

      if (result.victory) {
        this.notif.success(
          result.lootTokenId > 0
            ? `胜利！获得战利品 NFT #${result.lootTokenId}`
            : "胜利！（无掉落）"
        );
        // Reload inventory
        const items = await getPlayerItems(this.address);
        this.inventory.loadFromChain(items);
      } else {
        this.notif.error("战败！角色死亡...");
      }
    } catch (e) {
      this.apTracker.combatAP -= monster.apCost;
      this.notif.error("战斗失败: " + e.message);
    }
  }

  async _onDeath() {
    this.notif.error("你死了！正在提交死亡记录...");
    try {
      await commitDay(this.apTracker.toCommitParams(
        this.state.daysSurvived, this.state.level, true, this.consumedIds
      ));
    } catch (_) {}

    // Show death screen overlay
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const overlay = this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.85).setScrollFactor(0).setDepth(20);
    this.add.text(w/2, h/2 - 30, "你死了", {
      fontSize: "48px", color: "#ff4444", fontFamily: "monospace"
    }).setScrollFactor(0).setDepth(21).setOrigin(0.5);

    const respawnBtn = this.add.rectangle(w/2, h/2 + 50, 200, 44, 0x2d6a4f)
      .setScrollFactor(0).setDepth(21).setInteractive({ useHandCursor: true });
    this.add.text(w/2, h/2 + 50, "重新开始", {
      fontSize: "18px", color: "#fff", fontFamily: "monospace"
    }).setScrollFactor(0).setDepth(22).setOrigin(0.5);
    respawnBtn.on("pointerdown", () => this.scene.restart());
  }

  async _onDayEnd(day) {
    // Prompt player to commit
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const banner = this.add.rectangle(w/2, h - 60, 500, 44, 0x1b4332, 0.95)
      .setScrollFactor(0).setDepth(15);
    const txt = this.add.text(w/2, h - 60, `第 ${day-1} 天结束 — 点击提交进度`, {
      fontSize: "15px", color: "#FFD700", fontFamily: "monospace"
    }).setScrollFactor(0).setDepth(16).setOrigin(0.5);

    banner.setInteractive({ useHandCursor: true });
    banner.on("pointerdown", async () => {
      banner.disableInteractive();
      txt.setText("提交中...");
      try {
        await commitDay(this.apTracker.toCommitParams(
          day, this.state.level, false, this.consumedIds
        ));
        this.apTracker.reset();
        this.consumedIds = [];
        this.state.daysSurvived = day;
        this.notif.success(`第 ${day-1} 天进度已上链！`);
      } catch (e) {
        this.notif.error("提交失败: " + e.message);
      }
      banner.destroy();
      txt.destroy();
    });

    // Auto-dismiss after 30s
    this.time.delayedCall(30_000, () => { banner.destroy(); txt.destroy(); });
  }

  _isNearCampfire() {
    // Check if any campfire item is placed nearby (simplified: always false for MVP)
    // In a full implementation, placed campfire objects would be tracked here
    return false;
  }
}
