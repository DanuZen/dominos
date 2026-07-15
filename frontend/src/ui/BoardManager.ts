// ============================================================
// ui/BoardManager.ts (v8 - Dual Branch Snake)
// - Layout yang benar: tumbuh dari root (tengah) ke dua arah
// - Tidak mengubah posisi/offset kartu yang sudah diletakkan
// - Rotasi akurat untuk baris balik
// ============================================================

import Phaser from "phaser";
import { BoardState, Tile, PlacedTile } from "../types";
import { DominoTileSprite } from "./DominoTileSprite";
import { POSITIONS, GAME_W, BOARD_TILE } from "../constants";

export interface DropZoneState {
  cx: number; cy: number; angle: number; isBalak: boolean; rowDir: 1 | -1;
}
export interface BoardLayoutResult {
  leftDropZone: DropZoneState | null;
  rightDropZone: DropZoneState | null;
}

// Batas horizontal (dalam koordinat container, pusat = 0)
// Margin diperkecil dari 260 ke 130 agar jalur kartu (larinya) lebih panjang sebelum berbelok
function getTurnX(): number {
  const rightBound = (POSITIONS.BOT_RIGHT.x - 130) - GAME_W / 2;
  const leftBound  = GAME_W / 2 - (POSITIONS.BOT_LEFT.x + 130);
  return Math.min(rightBound, leftBound);
}

interface SlotInfo {
  idx: number;
  cx: number; cy: number;
  angle: number;
  isBalak: boolean;
  isCorner: boolean;
}

export class BoardManager {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private tileSprites: DominoTileSprite[] = [];
  public lastLayoutResult: BoardLayoutResult | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(GAME_W / 2, POSITIONS.BOARD.y);
  }

  public getContainer(): Phaser.GameObjects.Container { return this.container; }

  render(board: BoardState): BoardLayoutResult | null {
    this.tileSprites.forEach((s) => s.destroy());
    this.tileSprites = [];
    this.lastLayoutResult = null;

    const tiles = board.placedTiles;
    if (tiles.length === 0) return null;

    const { slots, leftDropZone, rightDropZone } = this.computeLayout(board);

    for (let i = 0; i < tiles.length; i++) {
      const s = slots[i];
      if (!s) continue;
      
      const displayTile: Tile = {
        leftValue: tiles[i].exposedLeft,
        rightValue: tiles[i].exposedRight,
        isBalak: s.isBalak,
      };

      const orientation = "horizontal"; // semua menggunakan sprite horizontal dasar
      const sprite = new DominoTileSprite(
        this.scene, s.cx, s.cy, displayTile, orientation
      );
      if (s.angle !== 0) sprite.setAngle(s.angle);

      this.scene.children.remove(sprite);
      this.container.add(sprite);
      this.tileSprites.push(sprite);
    }

    this.lastLayoutResult = { leftDropZone, rightDropZone };
    return this.lastLayoutResult;
  }

  private computeLayout(board: BoardState) {
    const tiles = board.placedTiles;
    const rootIdx = board.rootIndex ?? 0;
    const TURN_X = getTurnX();

    const allSlots: SlotInfo[] = [];
    let rightDropZone: DropZoneState | null = null;
    let leftDropZone: DropZoneState | null = null;

    // Root Tile
    const rootTile = tiles[rootIdx];
    const rootIsBalak = rootTile.tile.isBalak;
    const rootHalfW = rootIsBalak ? BOARD_TILE.H / 2 : BOARD_TILE.W / 2;
    allSlots[rootIdx] = {
      idx: rootIdx, cx: 0, cy: 0, angle: rootIsBalak ? 90 : 0, isBalak: rootIsBalak, isCorner: false
    };

    // Right Branch
    if (rootIdx + 1 < tiles.length) {
      const res = this.processBranch(tiles, rootIdx + 1, tiles.length - 1, 1, rootHalfW, 0, 1, 1, TURN_X, true);
      res.slots.forEach(s => allSlots[s.idx] = s);
      rightDropZone = res.dropZone;
    } else {
      rightDropZone = { cx: rootHalfW + BOARD_TILE.W / 2, cy: 0, angle: 0, isBalak: false, rowDir: 1 };
    }

    // Left Branch
    if (rootIdx - 1 >= 0) {
      const res = this.processBranch(tiles, rootIdx - 1, 0, -1, -rootHalfW, 0, -1, -1, TURN_X, false);
      res.slots.forEach(s => allSlots[s.idx] = s);
      leftDropZone = res.dropZone;
    } else {
      leftDropZone = { cx: -rootHalfW - BOARD_TILE.W / 2, cy: 0, angle: 0, isBalak: false, rowDir: -1 };
    }

    return { slots: allSlots, leftDropZone, rightDropZone };
  }

  private processBranch(
    tiles: PlacedTile[],
    from: number,
    to: number,
    step: number,
    startPenX: number,
    startPenY: number,
    startDir: 1 | -1,
    yDir: 1 | -1,
    TURN_X: number,
    isRightBranch: boolean
  ) {
    const slots: SlotInfo[] = [];
    let dir = startDir;
    let penX = startPenX;
    let penY = startPenY;
    let turnState = 0; // 0 = normal, 1 = butuh tile kedua untuk melengkapi belokan (U-Turn)
    let cornerCX = 0;
    let currentEdgeY = 0;

    const end = to + step;
    for (let i = from; i !== end; i += step) {
      const isBalak = tiles[i].tile.isBalak;

      // Jika sedang berada di tengah-tengah proses belokan (tile kedua U-Turn)
      if (turnState === 1) {
        const newDir = dir === 1 ? -1 : 1;
        
        if (isBalak) {
          // Jika tile kedua adalah balak, ia ditumpuk vertikal secara natural
          const cy = currentEdgeY + yDir * (BOARD_TILE.W / 2);
          slots.push({
            idx: i, cx: cornerCX, cy, angle: 90, isBalak: true, isCorner: true
          });
          currentEdgeY = currentEdgeY + yDir * BOARD_TILE.W;
          
          dir = newDir;
          penY = cy;
          penX = cornerCX + newDir * (BOARD_TILE.H / 2);
        } else {
          // Jika tile normal, posisikan horizontal untuk menjembatani arah baru
          const baseAngle = (isRightBranch ? newDir === 1 : newDir === -1) ? 0 : 180;
          const cx = cornerCX + newDir * (BOARD_TILE.H / 2);
          const cy = currentEdgeY + yDir * (BOARD_TILE.H / 2);
          
          slots.push({
            idx: i, cx, cy, angle: baseAngle, isBalak: false, isCorner: true
          });
          
          dir = newDir;
          penY = cy;
          penX = cx + newDir * (BOARD_TILE.W / 2);
        }
        
        turnState = 0;
        continue;
      }

      const overRight = dir === 1 && (penX + BOARD_TILE.W) > TURN_X;
      const overLeft  = dir === -1 && (penX - BOARD_TILE.W) < -TURN_X;
      const willTurn  = !isBalak && (overRight || overLeft);

      if (willTurn) {
        cornerCX = dir === 1 ? penX + BOARD_TILE.H / 2 : penX - BOARD_TILE.H / 2;
        // Tile pertama dari belokan selalu vertikal
        const tileH = BOARD_TILE.W;
        const cy = penY + yDir * (tileH / 2);

        slots.push({
          idx: i, cx: cornerCX, cy, angle: 90, isBalak: false, isCorner: true
        });

        currentEdgeY = penY + yDir * tileH;
        turnState = 1; // Menandakan kita butuh 1 tile lagi untuk menyelesaikan U-Turn
      } else {
        const baseAngle = (isRightBranch ? dir === 1 : dir === -1) ? 0 : 180;
        const angle = isBalak ? 90 : baseAngle;
        const halfW = isBalak ? BOARD_TILE.H / 2 : BOARD_TILE.W / 2;
        
        const cx = penX + dir * halfW;
        const cy = penY;

        slots.push({
          idx: i, cx, cy, angle, isBalak, isCorner: false
        });

        penX = penX + dir * (halfW * 2);
      }
    }

    let dropZoneState: DropZoneState;
    if (turnState === 1) {
      // Drop zone untuk tile kedua di belokan (tampilkan indikator arah baru secara horizontal)
      const newDir = dir === 1 ? -1 : 1;
      const cx = cornerCX + newDir * (BOARD_TILE.H / 2);
      const cy = currentEdgeY + yDir * (BOARD_TILE.H / 2);
      const baseAngle = (isRightBranch ? newDir === 1 : newDir === -1) ? 0 : 180;
      
      dropZoneState = {
        cx, cy, angle: baseAngle, isBalak: false, rowDir: newDir
      };
    } else {
      dropZoneState = {
        cx: penX + dir * (BOARD_TILE.W / 2),
        cy: penY,
        angle: 0,
        isBalak: false,
        rowDir: dir
      };
    }

    return { slots, dropZone: dropZoneState };
  }
}
