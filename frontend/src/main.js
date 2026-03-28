import Phaser from "phaser";
import { BootScene }      from "./game/scenes/BootScene.js";
import { MenuScene }      from "./game/scenes/MenuScene.js";
import { CharacterScene } from "./game/scenes/CharacterScene.js";
import { WorldScene }     from "./game/scenes/WorldScene.js";

// Make Phaser global so scene files can reference it without import
window.Phaser = Phaser;

const config = {
  type:   Phaser.AUTO,
  width:  800,
  height: 600,
  parent: "game-container",
  backgroundColor: "#1a1a2e",
  scene: [BootScene, MenuScene, CharacterScene, WorldScene],
  input: {
    keyboard: true,
    mouse: true
  }
};

new Phaser.Game(config);
