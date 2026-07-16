// ============================================================
// ui/DominoTileSprite.ts
// Komponen tile domino menggunakan aset gambar (images).
// ============================================================

import Phaser from "phaser";
import { C, BOARD_TILE, BALAK_TILE, HAND_TILE } from "../constants";
import { Tile } from "../types";

export type TileOrientation = "horizontal" | "board-vertical" | "vertical";
export type TileState = "normal" | "playable" | "disabled" | "selected";

export class DominoTileSprite extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private img: Phaser.GameObjects.Image;
  private tile: Tile;
  private orientation: TileOrientation;
  private tileState: TileState;
  private tileW: number;
  private tileH: number;
  private onClickCallback?: (tile: Tile, sprite: DominoTileSprite) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    tile: Tile,
    orientation: TileOrientation = "horizontal"
  ) {
    super(scene, x, y);
    this.tile = tile;
    this.orientation = orientation;
    this.tileState = "normal";

    if (orientation === "horizontal") {
      this.tileW = BOARD_TILE.W;
      this.tileH = BOARD_TILE.H;
    } else if (orientation === "board-vertical") {
      this.tileW = BALAK_TILE.W;
      this.tileH = BALAK_TILE.H;
    } else {
      this.tileW = HAND_TILE.W;
      this.tileH = HAND_TILE.H;
    }

    const minVal = Math.min(this.tile.leftValue, this.tile.rightValue);
    const maxVal = Math.max(this.tile.leftValue, this.tile.rightValue);
    const key = `domino_${minVal}${maxVal}`;

    this.img = scene.add.image(0, 0, key);
    
    if (orientation === "horizontal") {
      this.img.setDisplaySize(this.tileH, this.tileW);
      if (this.tile.leftValue > this.tile.rightValue) {
        this.img.setAngle(90);
      } else {
        this.img.setAngle(-90);
      }
    } else {
      this.img.setDisplaySize(this.tileW, this.tileH);
      if (this.tile.leftValue > this.tile.rightValue) {
        this.img.setAngle(180);
      } else {
        this.img.setAngle(0);
      }
    }

    this.gfx = scene.add.graphics();
    this.add(this.img);
    this.add(this.gfx);
    
    this.drawStateGfx();

    this.setSize(this.tileW, this.tileH);
    
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
    this.drawStateGfx();
    
    if (state === "disabled") {
      this.img.setTint(0x888888);
      this.disableInteractive();
    } else {
      this.img.clearTint();
      if (state === "playable") {
        this.setInteractive(
          new Phaser.Geom.Rectangle(-this.tileW / 2 - 15, -this.tileH / 2 - 15, this.tileW + 30, this.tileH + 30),
          Phaser.Geom.Rectangle.Contains
        );
      }
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

  private drawStateGfx(): void {
    this.gfx.clear();
    const w = this.tileW;
    const h = this.tileH;
    const isHorizontal = this.orientation === "horizontal";
    const conf = isHorizontal ? BOARD_TILE : (this.orientation === "board-vertical" ? BALAK_TILE : HAND_TILE);
    const r = conf.R;

    if (this.tileState === "selected") {
      this.gfx.lineStyle(4, C.YELLOW);
      this.gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    }

    if (this.tileState === "playable") {
      this.gfx.lineStyle(4, C.YELLOW, 1);
      this.gfx.strokeRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, r + 2);
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
