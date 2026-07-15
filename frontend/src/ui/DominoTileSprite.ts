// ============================================================
// ui/DominoTileSprite.ts
// Komponen tile domino yang bisa di-skin (skinnable).
// Menerima skinId sebagai parameter — skin default: "classic".
// TIDAK memakai gaya brutalist — tile selalu gaya klasik/standar.
//
// Orientasi:
//   "horizontal"     → tile normal di papan (88×44, garis pembagi vertikal)
//   "board-vertical" → balak di papan, tegak 90° (44×88, garis pembagi horizontal)
//   "vertical"       → tile di tangan pemain (52×104, garis pembagi horizontal)
// ============================================================

import Phaser from "phaser";
import { C, PIP_POSITIONS, BOARD_TILE, BALAK_TILE, HAND_TILE } from "../constants";
import { Tile } from "../types";

export type TileOrientation = "horizontal" | "board-vertical" | "vertical";
export type TileState = "normal" | "playable" | "disabled" | "selected";
export type SkinId = "classic";

export class DominoTileSprite extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private tile: Tile;
  private orientation: TileOrientation;
  private tileState: TileState;
  private skinId: SkinId;
  private tileW: number;
  private tileH: number;
  private onClickCallback?: (tile: Tile, sprite: DominoTileSprite) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    tile: Tile,
    orientation: TileOrientation = "horizontal",
    skinId: SkinId = "classic"
  ) {
    super(scene, x, y);
    this.tile = tile;
    this.orientation = orientation;
    this.skinId = skinId;
    this.tileState = "normal";

    if (orientation === "horizontal") {
      this.tileW = BOARD_TILE.W;
      this.tileH = BOARD_TILE.H;
    } else if (orientation === "board-vertical") {
      // Balak di papan: dimensi tegak (44×88)
      this.tileW = BALAK_TILE.W;
      this.tileH = BALAK_TILE.H;
    } else {
      // "vertical" — tile di tangan pemain
      this.tileW = HAND_TILE.W;
      this.tileH = HAND_TILE.H;
    }

    this.gfx = scene.add.graphics();
    this.add(this.gfx);
    this.draw();

    this.setSize(this.tileW, this.tileH);
    
    // Perbesar hitbox sebesar 15px di setiap sisi untuk mempermudah tap di mobile
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.tileW / 2 - 15, -this.tileH / 2 - 15, this.tileW + 30, this.tileH + 30),
      Phaser.Geom.Rectangle.Contains
    );

    this.on("pointerover", this.onHover, this);
    this.on("pointerout", this.onOut, this);
    this.on("pointerdown", this.onClick, this);

    scene.add.existing(this);
  }

  setTileState(state: TileState): this {
    this.tileState = state;
    this.draw();
    if (state === "playable") {
      this.setInteractive(
        new Phaser.Geom.Rectangle(-this.tileW / 2 - 15, -this.tileH / 2 - 15, this.tileW + 30, this.tileH + 30),
        Phaser.Geom.Rectangle.Contains
      );
    } else if (state === "disabled") {
      this.disableInteractive();
    }
    return this;
  }

  setOnClick(cb: (tile: Tile, sprite: DominoTileSprite) => void): this {
    this.onClickCallback = cb;
    return this;
  }

  getTile(): Tile {
    return this.tile;
  }

  private draw(): void {
    this.gfx.clear();
    const w = this.tileW;
    const h = this.tileH;

    // Pilih konstanta yang sesuai orientasi
    const isHorizontal = this.orientation === "horizontal";
    const conf = isHorizontal ? BOARD_TILE : (this.orientation === "board-vertical" ? BALAK_TILE : HAND_TILE);
    const r    = conf.R;
    const pipR = conf.PIP;
    let borderW = conf.BORDER;

    // Warna berdasarkan state
    let bgColor     = C.TILE_BG;
    let borderColor = C.TILE_BORDER;
    let pipColor    = C.TILE_PIP;

    if (this.tileState === "disabled") {
      bgColor  = 0xcccccc;
      pipColor = 0x888888;
    } else if (this.tileState === "selected") {
      borderColor = C.YELLOW;
      borderW = 3;
    }

    // Highlight kuning di luar tile untuk kartu yang bisa dimainkan
    if (this.tileState === "playable") {
      this.gfx.lineStyle(3, C.YELLOW, 1);
      this.gfx.strokeRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, r + 2);
    }

    // Background
    this.gfx.fillStyle(bgColor);
    this.gfx.fillRoundedRect(-w / 2, -h / 2, w, h, r);

    // Border
    this.gfx.lineStyle(borderW, borderColor);
    this.gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

    // Garis pembagi tengah:
    // - horizontal tile: garis vertikal di tengah (x=0)
    // - vertical tiles (board-vertical & vertical): garis horizontal di tengah (y=0)
    this.gfx.lineStyle(borderW, borderColor);
    if (isHorizontal) {
      this.gfx.lineBetween(0, -h / 2 + 4, 0, h / 2 - 4);
    } else {
      this.gfx.lineBetween(-w / 2 + 4, 0, w / 2 - 4, 0);
    }

    // Gambar pip menggunakan nilai yang sudah diorientasikan dengan benar
    // (tile.leftValue = nilai di sisi PERTAMA, tile.rightValue = sisi KEDUA)
    this.gfx.fillStyle(pipColor);
    this.drawPips(this.tile.leftValue, pipR, "first");
    this.drawPips(this.tile.rightValue, pipR, "second");
  }

  private drawPips(value: number, pipR: number, half: "first" | "second"): void {
    const positions = PIP_POSITIONS[value] ?? [];
    const w = this.tileW;
    const h = this.tileH;

    let halfOffsetX: number;
    let halfOffsetY: number;
    let halfW: number;
    let halfH: number;

    if (this.orientation === "horizontal") {
      // Horizontal: half kiri (first) dan kanan (second)
      halfW = w / 2;
      halfH = h;
      halfOffsetX = half === "first" ? -w / 2 : 0;
      halfOffsetY = -h / 2;
    } else {
      // Vertical (board-vertical & vertical): half atas (first) dan bawah (second)
      halfW = w;
      halfH = h / 2;
      halfOffsetX = -w / 2;
      halfOffsetY = half === "first" ? -h / 2 : 0;
    }

    for (const [px, py] of positions) {
      const dotX = halfOffsetX + halfW * px;
      const dotY = halfOffsetY + halfH * py;
      this.gfx.fillCircle(dotX, dotY, pipR);
    }
  }

  private onHover(): void {
    if (this.tileState === "playable") {
      this.setScale(1.08);
      this.setDepth(10);
    }
  }

  private onOut(): void {
    this.setScale(1);
    this.setDepth(0);
  }

  private onClick(): void {
    if (this.tileState === "playable" && this.onClickCallback) {
      this.onClickCallback(this.tile, this);
    }
  }
}

/** Menggambar tile tertutup (punggung kartu) untuk lawan */
export function drawFaceDownTile(
  gfx: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  gfx.fillStyle(C.BLUE);
  gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4);
  gfx.lineStyle(2, C.BLACK);
  gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 4);
  gfx.fillStyle(0x0035cc, 0.8);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const dx = x - w / 2 + 8 + col * (w - 10);
      const dy = y - h / 2 + 8 + row * ((h - 10) / 2);
      gfx.fillCircle(dx, dy, 2);
    }
  }
}
