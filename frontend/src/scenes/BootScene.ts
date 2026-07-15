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
    // Semua aset digambar secara programatik — tidak ada file eksternal
  }

  create(): void {
    this.cameras.main.setBackgroundColor(C.BG);
    this.scene.start("MenuScene");
  }
}
