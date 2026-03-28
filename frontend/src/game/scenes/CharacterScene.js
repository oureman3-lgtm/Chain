import { registerPlayer } from "../../web3/contracts.js";
import { NotificationBar } from "../../ui/NotificationBar.js";

const CLASSES = [
  {
    id:    "wilson",
    name:  "威尔逊",
    desc:  "科学家\n均衡属性\nHP 100 · 饥饿 100 · 精神 100\n攻击 20 · 幸运 10",
    color: 0xFFD700
  },
  {
    id:    "willow",
    name:  "薇洛",
    desc:  "纵火狂\n高幸运，擅长采集\nHP 90 · 饥饿 100 · 精神 100\n攻击 15 · 幸运 25",
    color: 0xFF6347
  },
  {
    id:    "wendy",
    name:  "温蒂",
    desc:  "阴郁少女\n强战斗，低精神上限\nHP 110 · 饥饿 100 · 精神 80\n攻击 30 · 幸运 8",
    color: 0x9370DB
  }
];

export class CharacterScene extends Phaser.Scene {
  constructor() { super("CharacterScene"); }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w/2, h/2, w, h, 0x1a1a2e);
    this.add.text(w/2, 60, "选择角色", {
      fontSize: "32px", color: "#FFD700", fontFamily: "monospace"
    }).setOrigin(0.5);

    this.selected = null;
    this.confirmBtn = null;
    this.notif = new NotificationBar();

    const spacing = 220;
    const startX  = w/2 - spacing;

    CLASSES.forEach((cls, i) => {
      const cx = startX + i * spacing;
      const cy = h/2;
      this._createCard(cx, cy, cls);
    });
  }

  _createCard(cx, cy, cls) {
    const card = this.add.rectangle(cx, cy, 190, 260, 0x2d2d4e)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x444466);

    const avatar = this.add.circle(cx, cy - 70, 35, cls.color);

    const nameText = this.add.text(cx, cy + 0, cls.name, {
      fontSize: "18px", color: "#ffffff", fontFamily: "monospace"
    }).setOrigin(0.5);

    const descText = this.add.text(cx, cy + 75, cls.desc, {
      fontSize: "11px", color: "#aaaaaa", fontFamily: "monospace",
      align: "center", wordWrap: { width: 170 }
    }).setOrigin(0.5);

    card.on("pointerover",  () => card.setFillStyle(0x3d3d6e));
    card.on("pointerout",   () => {
      card.setFillStyle(this.selected === cls.id ? 0x1b4332 : 0x2d2d4e);
    });
    card.on("pointerdown",  () => this._selectClass(cls.id, card));

    card._classId = cls.id;
    card._cls     = cls;
  }

  _selectClass(classId, card) {
    this.selected = classId;
    this.scene.scene.children.each(obj => {
      if (obj._classId) {
        obj.setFillStyle(obj._classId === classId ? 0x1b4332 : 0x2d2d4e);
        obj.setStrokeStyle(2, obj._classId === classId ? 0x52b788 : 0x444466);
      }
    });
    this._showConfirmButton();
  }

  _showConfirmButton() {
    if (this.confirmBtn) return;
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.confirmBtn = this.add.rectangle(w/2, h - 80, 240, 50, 0x2d6a4f)
      .setInteractive({ useHandCursor: true });
    this.confirmText = this.add.text(w/2, h - 80, "铸造角色 NFT", {
      fontSize: "18px", color: "#ffffff", fontFamily: "monospace"
    }).setOrigin(0.5);

    this.confirmBtn.on("pointerover",  () => this.confirmBtn.setFillStyle(0x40916c));
    this.confirmBtn.on("pointerout",   () => this.confirmBtn.setFillStyle(0x2d6a4f));
    this.confirmBtn.on("pointerdown",  () => this._mint());
  }

  async _mint() {
    if (!this.selected) return;
    this.confirmText.setText("铸造中...");
    this.confirmBtn.disableInteractive();
    this.notif.info("正在铸造角色 NFT，请在 MetaMask 中确认...");

    try {
      await registerPlayer(this.selected);
      this.notif.success("角色铸造成功！进入游戏...");
      this.time.delayedCall(1500, () => this.scene.start("WorldScene"));
    } catch (e) {
      this.notif.error("铸造失败: " + e.message);
      this.confirmText.setText("铸造角色 NFT");
      this.confirmBtn.setInteractive({ useHandCursor: true });
    }
  }
}
