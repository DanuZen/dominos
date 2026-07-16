// ============================================================
// scenes/BootScene.ts — Inisialisasi awal, langsung ke Menu
// ============================================================

import Phaser from "phaser";
import { C } from "../constants";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Load background assets from public folder
    this.load.image("bg_lobby", "/background_lobby.png");
    this.load.image("bg_game", "/background_game.png");

    // Load domino tile assets (0-6)
    for (let i = 0; i <= 6; i++) {
      for (let j = i; j <= 6; j++) {
        const key = `domino_${i}${j}`;
        this.load.image(key, `/domino/${key}.png`);
      }
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.BG);
    this.scene.start("MenuScene");
  }
}
