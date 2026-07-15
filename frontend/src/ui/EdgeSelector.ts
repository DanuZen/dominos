// ============================================================
// ui/EdgeSelector.ts
// Overlay UI untuk memilih sisi peletakan kartu (Kiri / Kanan).
// Muncul saat kartu bisa diletakkan di kedua ujung papan.
// Gaya Neo-Brutalist: hard shadow, border tebal, tombol tegas.
// ============================================================

import Phaser from "phaser";
import { Tile } from "../types";
import { C, GAME_W, GAME_H } from "../constants";
import { DominoTileSprite } from "./DominoTileSprite";

export type EdgeChoice = "left" | "right";

export class EdgeSelector {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private callback?: (edge: EdgeChoice) => void;
  private previewSprite?: DominoTileSprite;
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_W / 2, GAME_H / 2 - 40);
    this.container.setDepth(100);
    this.container.setVisible(false);
    this.buildUI();
  }

  private buildUI(): void {
    const gfx = this.scene.add.graphics();
    const panelW = 480;
    const panelH = 130;

    // Backdrop gelap tipis di belakang panel
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(C.BLACK, 0.55);
    backdrop.fillRect(-GAME_W / 2, -GAME_H / 2, GAME_W, GAME_H);
    this.container.add(backdrop);

    // Hard shadow
    gfx.fillStyle(C.BLACK);
    gfx.fillRect(-panelW / 2 + 7, -panelH / 2 + 7, panelW, panelH);

    // Panel background
    gfx.fillStyle(C.SURFACE);
    gfx.fillRect(-panelW / 2, -panelH / 2, panelW, panelH);

    // Border kuning tebal (brutalist)
    gfx.lineStyle(4, C.YELLOW);
    gfx.strokeRect(-panelW / 2, -panelH / 2, panelW, panelH);

    this.container.add(gfx);

    // Judul
    const title = this.scene.add.text(0, -42, "LETAKKAN DI MANA?", {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "14px",
      color: "#fff200",
      fontStyle: "bold",
      letterSpacing: 3,
    }).setOrigin(0.5);
    this.container.add(title);

    // Tombol KIRI (◀)
    this.buildEdgeButton(-140, 14, "◀  UJUNG KIRI", "left", C.BLUE);

    // Tombol KANAN (▶)
    this.buildEdgeButton(140, 14, "UJUNG KANAN  ▶", "right", C.YELLOW);

    // Label papan kiri/kanan (diisi saat show())
    const leftLabel = this.scene.add.text(-220, 14, "", {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "11px",
      color: "#aaaaaa",
    }).setOrigin(0.5).setName("leftLabel");
    this.container.add(leftLabel);

    const rightLabel = this.scene.add.text(220, 14, "", {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "11px",
      color: "#aaaaaa",
    }).setOrigin(0.5).setName("rightLabel");
    this.container.add(rightLabel);

    // Tombol batal (ESC / X kecil)
    const cancelGfx = this.scene.add.graphics();
    cancelGfx.fillStyle(C.GRAY);
    cancelGfx.fillRect(panelW / 2 - 28, -panelH / 2, 28, 28);
    cancelGfx.lineStyle(2, C.BLACK);
    cancelGfx.strokeRect(panelW / 2 - 28, -panelH / 2, 28, 28);
    this.container.add(cancelGfx);

    const cancelText = this.scene.add.text(panelW / 2 - 14, -panelH / 2 + 14, "✕", {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "13px",
      color: "#ffffff",
    }).setOrigin(0.5);
    this.container.add(cancelText);

    const cancelZone = this.scene.add.zone(panelW / 2 - 14, -panelH / 2 + 14, 28, 28).setInteractive();
    cancelZone.on("pointerdown", () => this.hide());
    cancelZone.on("pointerover", () => this.scene.input.setDefaultCursor("pointer"));
    cancelZone.on("pointerout", () => this.scene.input.setDefaultCursor("default"));
    this.container.add(cancelZone);
  }

  private buildEdgeButton(x: number, y: number, label: string, edge: EdgeChoice, color: number): void {
    const w = 170;
    const h = 48;
    const gfx = this.scene.add.graphics();

    // Shadow
    gfx.fillStyle(C.BLACK);
    gfx.fillRect(x - w / 2 + 5, y - h / 2 + 5, w, h);

    // Body
    gfx.fillStyle(color);
    gfx.fillRect(x - w / 2, y - h / 2, w, h);

    // Border hitam
    gfx.lineStyle(3, C.BLACK);
    gfx.strokeRect(x - w / 2, y - h / 2, w, h);

    this.container.add(gfx);

    const text = this.scene.add.text(x, y, label, {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "13px",
      color: color === C.YELLOW ? "#111111" : "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.container.add(text);

    // Zone interaktif
    const zone = this.scene.add.zone(x, y, w, h).setInteractive();
    zone.on("pointerdown", () => {
      this.select(edge);
    });
    zone.on("pointerover", () => {
      gfx.clear();
      gfx.fillStyle(color === C.YELLOW ? 0xccbb00 : 0x0035cc);
      gfx.fillRect(x - w / 2, y - h / 2, w, h);
      gfx.lineStyle(3, C.BLACK);
      gfx.strokeRect(x - w / 2, y - h / 2, w, h);
      this.scene.input.setDefaultCursor("pointer");
    });
    zone.on("pointerout", () => {
      gfx.clear();
      gfx.fillStyle(C.BLACK);
      gfx.fillRect(x - w / 2 + 5, y - h / 2 + 5, w, h);
      gfx.fillStyle(color);
      gfx.fillRect(x - w / 2, y - h / 2, w, h);
      gfx.lineStyle(3, C.BLACK);
      gfx.strokeRect(x - w / 2, y - h / 2, w, h);
    });
    this.container.add(zone);
  }

  /**
   * Tampilkan edge selector untuk tile tertentu.
   * @param tile - Tile yang akan ditempatkan
   * @param leftEdgeValue - Nilai ujung kiri papan saat ini
   * @param rightEdgeValue - Nilai ujung kanan papan saat ini
   * @param onChoose - Callback dipanggil dengan pilihan edge
   */
  show(
    tile: Tile,
    leftEdgeValue: number,
    rightEdgeValue: number,
    onChoose: (edge: EdgeChoice) => void
  ): void {
    this.callback = onChoose;
    this.isVisible = true;

    // Update label ujung
    const leftLabel = this.container.getByName("leftLabel") as Phaser.GameObjects.Text;
    const rightLabel = this.container.getByName("rightLabel") as Phaser.GameObjects.Text;
    if (leftLabel) leftLabel.setText(`[${leftEdgeValue}]`);
    if (rightLabel) rightLabel.setText(`[${rightEdgeValue}]`);

    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.container.setScale(0.9);

    // Animasi slide-in tegas (brutalist: cepat, tanpa easing lembut)
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: "Back.easeOut",
    });
  }

  hide(): void {
    this.isVisible = false;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleX: 0.95,
      scaleY: 0.95,
      duration: 100,
      ease: "Sine.easeIn",
      onComplete: () => this.container.setVisible(false),
    });
  }

  private select(edge: EdgeChoice): void {
    const cb = this.callback;
    this.hide();
    // Panggil callback setelah animasi dismiss singkat
    this.scene.time.delayedCall(120, () => cb?.(edge));
  }

  get visible(): boolean {
    return this.isVisible;
  }
}
