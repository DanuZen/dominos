// ============================================================
// main.ts — Entry point Phaser 3
// ============================================================

import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameplayScene } from "./scenes/GameplayScene";
import { IntermissionScene } from "./scenes/IntermissionScene";
import { GAME_W, GAME_H } from "./constants";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL jika tersedia, fallback ke Canvas
  width: GAME_W,
  height: GAME_H,
  parent: "game-container",
  backgroundColor: "#0a1024",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: false,
  antialias: true,
  antialiasGL: true,
  scene: [BootScene, MenuScene, GameplayScene, IntermissionScene],
  input: {
    activePointers: 3, // Support multi-touch
  },
};

new Phaser.Game(config);
