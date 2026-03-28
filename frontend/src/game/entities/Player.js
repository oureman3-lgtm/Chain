import { WORLD } from "../config/world.js";

export class Player {
  constructor(scene, x, y) {
    this.scene = scene;

    // Body
    this.sprite = scene.add.circle(x, y, 14, 0xFFD700);
    // Eyes
    this.eye1 = scene.add.circle(x + 4, y - 4, 3, 0x000000);
    this.eye2 = scene.add.circle(x - 4, y - 4, 3, 0x000000);

    // Create a container for easier movement
    this.container = scene.add.container(x, y, [
      scene.add.circle(0, 0, 14, 0xFFD700),
      scene.add.circle(4, -4, 3, 0x000000),
      scene.add.circle(-4, -4, 3, 0x000000),
      scene.add.triangle(0, 6, -6, -2, 6, -2, 0, 8, 0x8B4513) // body/legs
    ]);
    this.sprite.destroy();

    this.cursors  = scene.input.keyboard.createCursorKeys();
    this.wasd     = scene.input.keyboard.addKeys("W,A,S,D");
    this.speed    = WORLD.PLAYER_SPEED;

    // Campfire proximity tracking
    this.nearCampfire = false;

    this.scene.cameras.main.startFollow(this.container, true, 0.1, 0.1);
    this.scene.cameras.main.setBounds(0, 0, WORLD.WIDTH, WORLD.HEIGHT);
  }

  get x() { return this.container.x; }
  get y() { return this.container.y; }

  update(delta) {
    const dt = delta / 1000;
    let vx = 0, vy = 0;

    if (this.cursors.left.isDown  || this.wasd.A.isDown) vx = -this.speed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx =  this.speed;
    if (this.cursors.up.isDown    || this.wasd.W.isDown) vy = -this.speed;
    if (this.cursors.down.isDown  || this.wasd.S.isDown) vy =  this.speed;

    // Normalise diagonal
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.container.x = Phaser.Math.Clamp(this.container.x + vx * dt, 14, WORLD.WIDTH  - 14);
    this.container.y = Phaser.Math.Clamp(this.container.y + vy * dt, 14, WORLD.HEIGHT - 14);
  }

  flashDamage() {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0.2,
      yoyo: true,
      duration: 80,
      repeat: 3,
      onComplete: () => this.container.setAlpha(1)
    });
  }
}
