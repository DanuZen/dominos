// ui/PlayerHand.ts (REVISI) — Drag & drop, hapus EdgeSelector

import Phaser from "phaser";
import { GameState, Tile } from "../types";
import { DominoTileSprite } from "./DominoTileSprite";
import { getPlayableTiles } from "../engine/board";
import { C, HAND_TILE, POSITIONS, GAME_W } from "../constants";
import { TurnTimer } from "./TurnTimer";

export class PlayerHand {
  private scene: Phaser.Scene;
  private bgGfx: Phaser.GameObjects.Graphics;
  private tileSprites: DominoTileSprite[] = [];
  private selectedSprite: DominoTileSprite | null = null;
  private draggingSprite: DominoTileSprite | null = null;
  private pendingDragSprite: DominoTileSprite | null = null;
  private pendingDragPointerX: number = 0;
  private pendingDragPointerY: number = 0;
  private timer: TurnTimer;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bgGfx = scene.add.graphics();
    // Timer bar di bawah area kartu
    this.timer = new TurnTimer(scene, POSITIONS.HAND.x, POSITIONS.HAND.y - 70, 280);
    this.timer.hide();
  }

  public destroy(): void {
    this.clearSelection();
    this.tileSprites.forEach((s) => s.destroy());
    this.tileSprites = [];
  }

  render(
    gameState: GameState,
    onTileClick: (tile: Tile) => void,
    onPass: () => void
  ): void {
    this.clearSelection();
    this.tileSprites.forEach((s) => s.destroy());
    this.tileSprites = [];
    this.draggingSprite = null;
    this.pendingDragSprite = null;

    // Hapus listener scene sebelumnya agar tidak menumpuk
    this.scene.input.off("pointerdown", this.onScenePointerDown, this);
    // Daftarkan satu listener pointerdown untuk seluruh hand
    this.scene.input.on("pointerdown", this.onScenePointerDown, this);

    const player = gameState.players[0];
    const hand = player.hand;
    const isMyTurn = gameState.currentTurnIndex === 0 && gameState.status !== "finished";
    const isFirstMove = gameState.status === "first_move";

    const playableTiles = isMyTurn
      ? getPlayableTiles(hand, gameState.board, isFirstMove)
      : [];
    const playableSet = new Set(playableTiles.map((t) => `${t.leftValue}-${t.rightValue}`));
    const canPass = isMyTurn && playableTiles.length === 0;

    const GAP = 8;
    const tileW = HAND_TILE.W + GAP;
    const totalW = hand.length * tileW - GAP;
    let startX = POSITIONS.HAND.x - totalW / 2 + HAND_TILE.W / 2;
    const tileY = POSITIONS.HAND.y;

    this.drawBackground(startX - HAND_TILE.W / 2 - 16, totalW + 32, isMyTurn);

    for (const tile of hand) {
      const key = `${tile.leftValue}-${tile.rightValue}`;
      const isPlayable = playableSet.has(key);
      const sprite = new DominoTileSprite(this.scene, startX, tileY, tile, "vertical");

      if (!isMyTurn || !isPlayable) {
        sprite.setTileState("disabled");
      } else {
        sprite.setTileState("playable");
        
        // Double tap logic
        let lastTapTime = 0;
        sprite.on("pointerup", (pointer: Phaser.Input.Pointer) => {
          if (pointer.getDistance() > 5) return; // Abaikan jika drag
          const now = this.scene.time.now;
          if (now - lastTapTime < 350) {
            onTileClick(tile);
            this.clearSelection();
            this.scene.events.emit("tile-drag-end"); // pastikan drop zone hilang
          } else {
            this.selectTile(sprite, tile);
          }
          lastTapTime = now;
        });

        // Drag & drop
        this.setupDrag(sprite, tile, startX, tileY);
      }

      this.tileSprites.push(sprite);
      startX += tileW;
    }

    // Indikator giliran & timer
    if (isMyTurn) {
      this.timer.show();
      this.timer.start(30000); // 30 detik per giliran
    } else {
      this.timer.hide();
      this.timer.reset();
    }
  }

  stopTimer(): void {
    this.timer.stop();
  }

  private selectTile(sprite: DominoTileSprite, tile: Tile) {
    if (this.selectedSprite === sprite) return;
    
    // Kembalikan sprite lama ke posisi semula
    if (this.selectedSprite) {
      this.scene.tweens.add({
        targets: this.selectedSprite,
        y: POSITIONS.HAND.y,
        duration: 150,
      });
    }

    this.selectedSprite = sprite;
    
    // Naikkan sprite baru
    this.scene.tweens.add({
      targets: sprite,
      y: POSITIONS.PLAYER.y - 20,
      duration: 150,
    });

    this.scene.events.emit("tile-selected", tile);
  }

  private clearSelection() {
    if (this.selectedSprite) {
      this.scene.tweens.add({
        targets: this.selectedSprite,
        y: POSITIONS.PLAYER.y,
        duration: 150,
      });
      this.selectedSprite = null;
    }
  }

  // Handler tunggal untuk pointerdown di scene — menentukan persis sprite mana yang diklik
  private onScenePointerDown(pointer: Phaser.Input.Pointer): void {
    this.draggingSprite = null;
    this.pendingDragSprite = null;

    // Phaser hitTestPointer mengembalikan semua GO di bawah pointer, urut teratas dulu
    const hits = this.scene.input.hitTestPointer(pointer) as Phaser.GameObjects.GameObject[];
    
    // Cari tile sprite pertama (teratas) yang ada dalam tangan kita
    for (const hit of hits) {
      if (hit instanceof DominoTileSprite && this.tileSprites.includes(hit)) {
        this.pendingDragSprite = hit;
        this.pendingDragPointerX = pointer.x;
        this.pendingDragPointerY = pointer.y;
        break;
      }
    }
  }

  private setupDrag(sprite: DominoTileSprite, tile: Tile, origX: number, origY: number): void {
    // Kita gunakan raw pointer events langsung dari scene karena Phaser drag system
    // tidak berfungsi baik pada Container.
    // pendingDragSprite di-set dari satu handler pointerdown level-scene (di render())
    // agar hanya satu kartu yg dipilih meski hitbox bertumpuk.
    
    let spriteStartX = 0;
    let spriteStartY = 0;

    const onMove = (pointer: Phaser.Input.Pointer) => {
      if (!sprite.active || !pointer.isDown) return;

      // Cek apakah sprite ini yang di-pending
      if (this.pendingDragSprite !== sprite) return;

      const dx = pointer.x - this.pendingDragPointerX;
      const dy = pointer.y - this.pendingDragPointerY;

      // Mulai drag setelah bergerak lebih dari 5px
      if (this.draggingSprite === null && Math.sqrt(dx * dx + dy * dy) > 5) {
        this.draggingSprite = sprite;
        spriteStartX = sprite.x;
        spriteStartY = sprite.y;
        this.scene.tweens.killTweensOf(sprite);
        sprite.setDepth(100);
        sprite.setAlpha(0.85);
        this.scene.events.emit("tile-drag-start", tile, sprite);
      }

      // Gerakkan hanya jika sprite INI yang sedang di-drag
      if (this.draggingSprite === sprite) {
        const dx2 = pointer.x - this.pendingDragPointerX;
        const dy2 = pointer.y - this.pendingDragPointerY;
        sprite.setPosition(spriteStartX + dx2, spriteStartY + dy2);
      }
    };

    const onUp = (pointer: Phaser.Input.Pointer) => {
      if (!sprite.active) return;
      if (this.draggingSprite !== sprite) {
        // Jika bukan yang di-drag tapi pending, bersihkan pending
        if (this.pendingDragSprite === sprite) this.pendingDragSprite = null;
        return;
      }
      
      this.draggingSprite = null;
      this.pendingDragSprite = null;
      sprite.setAlpha(1);
      sprite.setDepth(0);

      this.scene.events.emit("tile-drag-end", tile, sprite, pointer, (success: boolean) => {
        if (!success && sprite.active) {
          this.scene.tweens.add({
            targets: sprite,
            x: origX, y: origY,
            duration: 250,
            ease: "Back.easeOut",
          });
        }
      });
    };

    // Daftarkan listener di scene agar gerakan di luar sprite tetap terdeteksi
    this.scene.input.on("pointermove", onMove);
    this.scene.input.on("pointerup", onUp);

    // Bersihkan listener saat sprite di-destroy
    sprite.once("destroy", () => {
      this.scene.input.off("pointermove", onMove);
      this.scene.input.off("pointerup", onUp);
    });
  }

  private drawBackground(bx: number, bw: number, active: boolean): void {
    this.bgGfx.clear();
    const by = POSITIONS.HAND.y - HAND_TILE.H / 2 - 12;
    const bh = HAND_TILE.H + 24;

    if (active) {
      this.bgGfx.lineStyle(4, C.BLUE, 0.5);
      this.bgGfx.strokeRoundedRect(bx - 3, by - 3, bw + 6, bh + 6, 12);
    }

    // Shadow
    this.bgGfx.fillStyle(0x000000, 0.4);
    this.bgGfx.fillRoundedRect(bx + 4, by + 4, bw, bh, 8);
    
    // Main Panel
    this.bgGfx.fillStyle(active ? 0x16284a : C.SURFACE);
    this.bgGfx.fillRoundedRect(bx, by, bw, bh, 8);
    
    // Border
    this.bgGfx.lineStyle(2, active ? C.YELLOW : C.GRAY);
    this.bgGfx.strokeRoundedRect(bx, by, bw, bh, 8);
  }
}
