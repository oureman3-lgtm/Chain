import { WORLD } from "../config/world.js";
import { RESOURCE_TYPES, RESOURCE_COLORS, RESOURCE_NAMES } from "../config/items.js";
import { MONSTERS, MONSTER_BY_TYPE } from "../config/monsters.js";

export class SpawnSystem {
  constructor(scene) {
    this.scene = scene;
    this.resourceNodes = [];
    this.monsterSprites = [];
    this.treeCutCount = 0;
  }

  spawnWorldResources() {
    const configs = [
      { type: RESOURCE_TYPES.TREE,       count: WORLD.TREE_COUNT  },
      { type: RESOURCE_TYPES.ROCK,       count: WORLD.ROCK_COUNT  },
      { type: RESOURCE_TYPES.GRASS_BUSH, count: WORLD.GRASS_COUNT },
      { type: RESOURCE_TYPES.BERRY_BUSH, count: WORLD.BERRY_COUNT }
    ];

    for (const { type, count } of configs) {
      for (let i = 0; i < count; i++) {
        const x = 50 + Math.random() * (WORLD.WIDTH  - 100);
        const y = 50 + Math.random() * (WORLD.HEIGHT - 100);
        this._createResourceNode(x, y, type);
      }
    }
  }

  _createResourceNode(x, y, type) {
    const color = RESOURCE_COLORS[type];
    const size  = type === RESOURCE_TYPES.TREE ? 20 :
                  type === RESOURCE_TYPES.ROCK ? 18 : 14;

    const node = this.scene.add.circle(x, y, size, color);
    node.setInteractive({ useHandCursor: true });
    node.resourceType = type;
    node.isGathered   = false;
    node.name         = RESOURCE_NAMES[type];

    // Hover label
    node.on("pointerover", () => {
      this.scene.events.emit("showTooltip", { x, y: y - size - 5, text: node.name });
    });
    node.on("pointerout", () => {
      this.scene.events.emit("hideTooltip");
    });
    node.on("pointerdown", () => {
      this.scene.events.emit("gatherNode", node);
    });

    this.resourceNodes.push(node);
    return node;
  }

  markGathered(node) {
    node.isGathered = true;
    node.setAlpha(0.3);
    node.disableInteractive();
    if (node.resourceType === RESOURCE_TYPES.TREE) this.treeCutCount++;

    // Respawn after 60 seconds
    this.scene.time.delayedCall(60_000, () => {
      node.isGathered = false;
      node.setAlpha(1);
      node.setInteractive({ useHandCursor: true });
    });
  }

  spawnNightMonsters(playerState) {
    const goblin = MONSTER_BY_TYPE[0];
    const count  = Math.min(3, Math.floor(Math.random() * 3) + 1);
    for (let i = 0; i < count; i++) {
      this._spawnMonster(goblin);
    }
  }

  spawnShadowMonsters() {
    const shadow = MONSTER_BY_TYPE[1];
    this._spawnMonster(shadow);
  }

  spawnTreeGuard() {
    const tg = MONSTER_BY_TYPE[2];
    this._spawnMonster(tg);
  }

  _spawnMonster(monsterDef) {
    const { scene } = this;
    const player = scene.player;
    // Spawn off-screen relative to player
    const angle = Math.random() * Math.PI * 2;
    const dist  = 300 + Math.random() * 200;
    const x = Phaser.Math.Clamp(player.x + Math.cos(angle) * dist, 20, WORLD.WIDTH  - 20);
    const y = Phaser.Math.Clamp(player.y + Math.sin(angle) * dist, 20, WORLD.HEIGHT - 20);

    const sprite = scene.add.circle(x, y, monsterDef.size, monsterDef.color);
    sprite.setInteractive({ useHandCursor: true });
    sprite.monsterType = monsterDef.type;
    sprite.monsterDef  = monsterDef;

    sprite.on("pointerdown", () => {
      scene.events.emit("attackMonster", sprite);
    });
    sprite.on("pointerover", () => {
      scene.events.emit("showTooltip", { x, y: y - monsterDef.size - 5, text: monsterDef.name });
    });
    sprite.on("pointerout", () => scene.events.emit("hideTooltip"));

    // Simple chase AI
    sprite.chaseTimer = scene.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (!sprite.active) return;
        const dx = player.x - sprite.x;
        const dy = player.y - sprite.y;
        const dist2 = Math.sqrt(dx * dx + dy * dy);
        if (dist2 < 400) {
          const speed = 60;
          sprite.x += (dx / dist2) * speed * 0.5;
          sprite.y += (dy / dist2) * speed * 0.5;
        }
      }
    });

    this.monsterSprites.push(sprite);
    return sprite;
  }

  removeMonster(sprite) {
    sprite.chaseTimer?.remove();
    sprite.destroy();
    this.monsterSprites = this.monsterSprites.filter(m => m !== sprite);
  }

  clearMonsters() {
    for (const m of this.monsterSprites) {
      m.chaseTimer?.remove();
      m.destroy();
    }
    this.monsterSprites = [];
  }
}
