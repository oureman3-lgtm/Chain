import { connectWallet, getAddress } from "../../web3/wallet.js";
import { loadContracts, isRegistered } from "../../web3/contracts.js";
import { NotificationBar } from "../../ui/NotificationBar.js";

export class MenuScene extends Phaser.Scene {
  constructor() { super("MenuScene"); }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Dark background
    this.add.rectangle(w/2, h/2, w, h, 0x1a1a2e);

    // Title
    this.add.text(w/2, h/2 - 160, "Don't Starve Chain", {
      fontSize: "42px", color: "#FFD700", fontFamily: "monospace",
      stroke: "#000000", strokeThickness: 4
    }).setOrigin(0.5);

    this.add.text(w/2, h/2 - 110, "区块链生存游戏", {
      fontSize: "20px", color: "#aaaaaa", fontFamily: "monospace"
    }).setOrigin(0.5);

    // Connect wallet button
    const btn = this.add.rectangle(w/2, h/2 - 20, 260, 50, 0x2d6a4f)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(w/2, h/2 - 20, "连接钱包", {
      fontSize: "20px", color: "#ffffff", fontFamily: "monospace"
    }).setOrigin(0.5);

    btn.on("pointerover",  () => btn.setFillStyle(0x40916c));
    btn.on("pointerout",   () => btn.setFillStyle(0x2d6a4f));
    btn.on("pointerdown",  () => this._onConnect(btn, btnText));

    this.notif = new NotificationBar();
  }

  async _onConnect(btn, btnText) {
    btnText.setText("连接中...");
    btn.disableInteractive();

    try {
      const address = await connectWallet();
      await loadContracts();

      const w = this.cameras.main.width;
      const h = this.cameras.main.height;

      this.add.text(w/2, h/2 + 40, `✓ ${address.slice(0,6)}...${address.slice(-4)}`, {
        fontSize: "14px", color: "#52b788", fontFamily: "monospace"
      }).setOrigin(0.5);

      // Check registration
      const registered = await isRegistered(address);

      if (registered) {
        btnText.setText("进入游戏 →");
        btn.setFillStyle(0x1b4332);
        btn.setInteractive({ useHandCursor: true });
        btn.removeAllListeners();
        btn.on("pointerdown", () => this.scene.start("WorldScene"));
      } else {
        this.scene.start("CharacterScene");
      }
    } catch (e) {
      this.notif.error("连接失败: " + e.message);
      btnText.setText("连接钱包");
      btn.setInteractive({ useHandCursor: true });
    }
  }
}
