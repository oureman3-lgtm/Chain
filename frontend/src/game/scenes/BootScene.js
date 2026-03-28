export class BootScene extends Phaser.Scene {
  constructor() { super("BootScene"); }

  preload() {
    // Create a simple loading bar
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const barBg  = this.add.rectangle(w/2, h/2, 320, 20, 0x333333);
    const bar    = this.add.rectangle(w/2 - 160, h/2, 0, 16, 0xFFD700).setOrigin(0, 0.5);
    const label  = this.add.text(w/2, h/2 - 30, "Loading...", {
      fontSize: "18px", color: "#ffffff", fontFamily: "monospace"
    }).setOrigin(0.5);

    this.load.on("progress", v => { bar.width = 320 * v; });
    this.load.on("complete", () => { label.setText("Ready!"); });

    // No external assets needed for MVP – we draw everything programmatically.
    // If sprite sheets are added later, load them here.
  }

  create() {
    this.scene.start("MenuScene");
  }
}
