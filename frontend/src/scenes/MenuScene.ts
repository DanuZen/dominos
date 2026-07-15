// ============================================================
// scenes/MenuScene.ts — Layar judul Neo-Brutalist
// ============================================================

import Phaser from "phaser";
import { C, GAME_W, GAME_H } from "../constants";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create(): void {
    const gfx = this.add.graphics();

    // Background
    gfx.fillStyle(C.BG);
    gfx.fillRect(0, 0, GAME_W, GAME_H);

    // Horizontal separator lines
    gfx.lineStyle(2, C.GRAY);
    gfx.lineBetween(60, 180, GAME_W - 60, 180);
    gfx.lineBetween(60, GAME_H - 200, GAME_W - 60, GAME_H - 200);

    // Judul
    this.add.text(GAME_W / 2, 100, "DOMINO", {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "96px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 155, "TURNAMEN", {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "28px",
      color: "#fff200",
      fontStyle: "bold",
      letterSpacing: 12,
    }).setOrigin(0.5);

    // Deskripsi singkat
    this.add.text(GAME_W / 2, 260, "4 PEMAIN · ELIMINASI · REAL-TIME", {
      fontFamily: "'Inter', sans-serif",
      fontSize: "14px",
      color: "#666666",
      letterSpacing: 4,
    }).setOrigin(0.5);

    // Tombol MAIN MULTIPLAYER ONLINE
    this.createButton(GAME_W / 2, 340, "🌐  MAIN ONLINE (MULTIPLAYER)", C.YELLOW, C.BLACK, () => {
      this.scene.start("GameplayScene", { isOnline: true });
    });

    // Tombol MAIN OFFLINE (vs Bot)
    this.createButton(GAME_W / 2, 420, "🤖  MAIN OFFLINE VS BOT", C.SURFACE2, C.WHITE, () => {
      this.scene.start("GameplayScene", { isOnline: false });
    });

    // Tombol TONTON SIMULASI
    this.createButton(GAME_W / 2, 500, "👁  TONTON SIMULASI BOT", 0x111111, C.GRAY, () => {
      this.scene.start("GameplayScene", { isOnline: false, autoPlay: true });
    });

    // Credit
    this.add.text(GAME_W / 2, GAME_H - 40, "Phase 3–6 — Engine ✓ · Bot ✓ · UI ✓ · Colyseus ✓", {
      fontFamily: "'Inter', sans-serif",
      fontSize: "11px",
      color: "#444444",
    }).setOrigin(0.5);

    // Dekorasi domino tile kiri & kanan
    this.drawDecorativeTile(gfx, 160, GAME_H / 2, 5, 4);
    this.drawDecorativeTile(gfx, GAME_W - 160, GAME_H / 2, 3, 6);
  }

  private createButton(
    x: number, y: number,
    label: string,
    bgColor: number,
    textColor: number,
    onClick: () => void
  ): void {
    const w = 320;
    const h = 60;
    const gfx = this.add.graphics();

    // Hard shadow
    gfx.fillStyle(C.BLACK);
    gfx.fillRect(x - w / 2 + 6, y - h / 2 + 6, w, h);

    // Body
    gfx.fillStyle(bgColor);
    gfx.fillRect(x - w / 2, y - h / 2, w, h);

    // Border
    gfx.lineStyle(3, C.BLACK);
    gfx.strokeRect(x - w / 2, y - h / 2, w, h);

    // Text
    this.add.text(x, y, label, {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "16px",
      color: textColor === C.BLACK ? "#111111" : "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Hitbox
    const zone = this.add.zone(x, y, w, h).setInteractive();
    zone.on("pointerover", () => {
      gfx.clear();
      gfx.fillStyle(bgColor === C.YELLOW ? 0xccbb00 : 0x333333);
      gfx.fillRect(x - w / 2, y - h / 2, w, h);
      gfx.lineStyle(3, C.BLACK);
      gfx.strokeRect(x - w / 2, y - h / 2, w, h);
      this.input.setDefaultCursor("pointer");
    });
    zone.on("pointerout", () => {
      gfx.clear();
      gfx.fillStyle(C.BLACK);
      gfx.fillRect(x - w / 2 + 6, y - h / 2 + 6, w, h);
      gfx.fillStyle(bgColor);
      gfx.fillRect(x - w / 2, y - h / 2, w, h);
      gfx.lineStyle(3, C.BLACK);
      gfx.strokeRect(x - w / 2, y - h / 2, w, h);
      this.input.setDefaultCursor("default");
    });
    zone.on("pointerdown", onClick);
  }

  private drawDecorativeTile(
    gfx: Phaser.GameObjects.Graphics,
    x: number, y: number,
    left: number, right: number
  ): void {
    const w = 70;
    const h = 140;
    gfx.fillStyle(0x1e1e1e);
    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    gfx.lineStyle(2, C.GRAY);
    gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);
    gfx.lineBetween(x - w / 2 + 8, y, x + w / 2 - 8, y);
    // Pip sederhana
    gfx.fillStyle(0x444444);
    gfx.fillCircle(x, y - 30, 6);
    gfx.fillCircle(x, y + 30, 8);
  }
}
