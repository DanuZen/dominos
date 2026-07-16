// scenes/GameplayScene.ts (Phase 3 + 4)
// Drag & drop, FloatingText, RoundBanner, TurnTimer, drop zones

import Phaser from "phaser";
import { GameState, Tile } from "../types";
import { BoardManager } from "../ui/BoardManager";
import { PlayerHand } from "../ui/PlayerHand";
import { OpponentHUD } from "../ui/OpponentHUD";
import { GameHUD } from "../ui/GameHUD";
import { showFloatingText, showActionToast } from "../ui/FloatingText";
import { showRoundBanner } from "../ui/RoundBanner";
import { C, GAME_W, GAME_H, POSITIONS, BOARD_TILE } from "../constants";
import * as Colyseus from "colyseus.js";
import { mapSchemaToGameState } from "../network/schemaMapper";
import { getValidEdge, getPlayableTiles } from "../engine/board";
import { initializeGame, playTile, doPass } from "../engine/game";
import { chooseBotTile } from "../engine/bot";

// Drop zone area constants (world coordinates)
const BOARD_AREA_X = 160;
const BOARD_AREA_W = GAME_W - 320;
const DROP_ZONE_W = 150;
const DROP_ZONE_H = 110;

interface SceneData { 
  autoPlay?: boolean;
  isOnline?: boolean;
  roundNumber?: number;
  initialScores?: Record<string, number>;
}

export class GameplayScene extends Phaser.Scene {
  private gameState!: GameState;
  private boardManager!: BoardManager;
  private playerHand!: PlayerHand;
  private gameHUD!: GameHUD;
  private oppHUDs: OpponentHUD[] = [];
  private playerAvatarHUD!: OpponentHUD;
  private bgGfx!: Phaser.GameObjects.Graphics;
  private statusText!: Phaser.GameObjects.Text;
  private room!: Colyseus.Room;
  private client!: Colyseus.Client;
  private mySessionId: string = "";
  private roundNumber: number = 1;
  private isOnline: boolean = false;
  private autoPlay: boolean = false;
  private isBotProcessing: boolean = false;
  private initialScores?: Record<string, number>;

  private scorePill!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private settingsBtnGfx!: Phaser.GameObjects.Graphics;
  private settingsBtnText!: Phaser.GameObjects.Text;
  private settingsBtnZone!: Phaser.GameObjects.Zone;
  private settingsModalContainer!: Phaser.GameObjects.Container;
  private isMusicMuted: boolean = false;

  // Drop zones
  private leftDropZone!: Phaser.GameObjects.Zone;
  private rightDropZone!: Phaser.GameObjects.Zone;
  private dropZoneGfx!: Phaser.GameObjects.Graphics;
  private dropZoneVisible: boolean = false;

  private readonly PLAYER_NAMES = ["Kamu", "Bot Satu", "Bot Dua", "Bot Tiga"];
  private readonly PLAYER_IDS   = ["human", "bot1", "bot2", "bot3"];

  constructor() { super({ key: "GameplayScene" }); }

  init(data: SceneData): void { 
    this.autoPlay = data?.autoPlay ?? false; 
    this.isOnline = data?.isOnline ?? false;
    this.roundNumber = data?.roundNumber ?? 1;
    this.initialScores = data?.initialScores;
  }

  create(): void {
    this.bgGfx = this.add.graphics();
    this.drawBackground();

    // Default empty state before connection
    this.gameState = {
      players: [],
      board: { placedTiles: [], leftEdgeValue: -1, rightEdgeValue: -1, rootIndex: 0 },
      currentTurnIndex: 0,
      status: "waiting",
      consecutivePassCount: 0,
      roundPoints: 0
    };

    this.boardManager = new BoardManager(this);
    this.playerHand   = new PlayerHand(this);
    this.gameHUD      = new GameHUD(this, this.roundNumber);
    this.oppHUDs = [
      new OpponentHUD(this, POSITIONS.BOT_LEFT.x,  POSITIONS.BOT_LEFT.y,  "left"),
      new OpponentHUD(this, POSITIONS.BOT_TOP.x,   POSITIONS.BOT_TOP.y,   "top"),
      new OpponentHUD(this, POSITIONS.BOT_RIGHT.x, POSITIONS.BOT_RIGHT.y, "right"),
    ];
    this.playerAvatarHUD = new OpponentHUD(this, POSITIONS.PLAYER.x, POSITIONS.PLAYER.y, "left");

    this.statusText = this.add.text(GAME_W / 2, GAME_H - 140, "", {
      fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", color: "#00d4ff", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(20);

    // Score pill background
    this.scorePill = this.add.graphics().setDepth(-5);
    this.scorePill.fillStyle(0x000000, 0.4);
    this.scorePill.fillRoundedRect(0, 0, 160, 30, 15);
    
    this.scoreText = this.add.text(0, 0, "Poin: 60", {
      fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", color: "#ffffff", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(-5);

    this.createSettingsButton();
    this.setupDropZones();
    this.setupDragListeners();

    if (this.isOnline) {
      this.setStatus("Menghubungkan ke server...");
      this.connectToServer();
    } else {
      const names = this.autoPlay ? ["Bot Alpha","Bot Beta","Bot Gamma","Bot Delta"] : this.PLAYER_NAMES;
      const ids   = this.autoPlay ? ["bot0","bot1","bot2","bot3"] : this.PLAYER_IDS;
      this.gameState = initializeGame(ids, names, this.initialScores);
      this.mySessionId = ids[0];
      
      showRoundBanner(this, "RONDE DIMULAI!", "Seret kartu ke ujung meja", () => {
        this.renderState();
        this.time.delayedCall(200, () => this.processTurn());
      });
    }

    // Force initial UI positioning after all elements are created
    const { width, height } = this.scale.gameSize;
    const zoom = Math.min(width / GAME_W, height / GAME_H);
    const logicalWidth = width / zoom;
    const logicalHeight = height / zoom;
    this.updateUIPositions(logicalWidth, logicalHeight);
  }

  private async connectToServer() {
    this.client = new Colyseus.Client("ws://localhost:2567");
    
    try {
      const options: any = { name: "Player " + Math.floor(Math.random() * 1000) };
      if (this.scene.settings.data) {
        const data = this.scene.settings.data as any;
        if (data.matchId) options.matchId = data.matchId;
      }
      
      this.room = await this.client.joinOrCreate("domino_room", options);
      this.mySessionId = this.room.sessionId;
      this.setStatus("Menunggu pemain lain...");

      this.room.onStateChange((state) => {
        const prevStatus = this.gameState.status;
        this.gameState = mapSchemaToGameState(state);
        
        // Re-order players so "mySessionId" is always at index 0 for UI rendering
        const myIdx = this.gameState.players.findIndex(p => p.id === this.mySessionId);
        if (myIdx > 0) {
          const players = this.gameState.players;
          this.gameState.players = [
            ...players.slice(myIdx),
            ...players.slice(0, myIdx)
          ];
          // adjust currentTurnIndex
          const oldTurnId = players[this.gameState.currentTurnIndex]?.id;
          this.gameState.currentTurnIndex = this.gameState.players.findIndex(p => p.id === oldTurnId);
        }

        if (prevStatus === "waiting" && this.gameState.status === "playing") {
          showRoundBanner(this, "RONDE DIMULAI!", "Game on!");
        }

        this.renderState();
      });

      this.room.onMessage("ROUND_RESULT", (result) => {
        this.showResult(result);
      });

      this.room.onMessage("ERROR", (msg) => {
        showActionToast(this, GAME_W / 2, POSITIONS.BOARD.y - 70, msg);
      });

    } catch (e) {
      console.error("Gagal terhubung", e);
      this.setStatus("Gagal terhubung ke server.");
    }
  }

  // ─── DROP ZONES ─────────────────────────────────────────

  private setupDropZones(): void {
    this.dropZoneGfx = this.add.graphics().setDepth(20).setVisible(false);

    // Zones akan di-update posisinya nanti saat showDropZones
    this.leftDropZone = this.add.zone(0, 0, 88, 44)
      .setDropZone().setName("left").setDepth(25);

    this.rightDropZone = this.add.zone(0, 0, 88, 44)
      .setDropZone().setName("right").setDepth(25);
  }

  private showDropZones(tile: Tile): void {
    const isFirstMove = this.gameState.status === "first_move";
    const edge = getValidEdge(tile, this.gameState.board, isFirstMove);

    const showLeft  = edge === "left"  || edge === "both" || isFirstMove;
    const showRight = edge === "right" || edge === "both" || isFirstMove;

    this.drawDropZoneGfx(showLeft, showRight);

    // Selalu tampilkan, apapun state sebelumnya
    this.dropZoneVisible = true;
    this.tweens.killTweensOf(this.dropZoneGfx);
    this.dropZoneGfx.setVisible(true).setAlpha(1);
  }

  private hideDropZones(): void {
    this.dropZoneVisible = false;
    this.tweens.killTweensOf(this.dropZoneGfx);
    this.tweens.add({
      targets: this.dropZoneGfx, alpha: 0, duration: 120,
      onComplete: () => this.dropZoneGfx.setVisible(false),
    });
  }

  private drawDropZoneGfx(showLeft: boolean, showRight: boolean): void {
    this.dropZoneGfx.clear();
    const layout = this.boardManager.lastLayoutResult;
    
    // Board masih kosong (first move) — tampilkan 1 slot di tengah
    if (!layout) {
      if (showRight || showLeft) {
        const cx = GAME_W / 2;
        const cy = POSITIONS.BOARD.y;
        this.dropZoneGfx.lineStyle(4, C.YELLOW);
        this.dropZoneGfx.strokeRoundedRect(cx - BOARD_TILE.W/2, cy - BOARD_TILE.H/2, BOARD_TILE.W, BOARD_TILE.H, 8);
        this.dropZoneGfx.fillStyle(C.YELLOW, 0.2);
        this.dropZoneGfx.fillRoundedRect(cx - BOARD_TILE.W/2, cy - BOARD_TILE.H/2, BOARD_TILE.W, BOARD_TILE.H, 8);
        
        this.leftDropZone.setPosition(cx, cy).setSize(BOARD_TILE.W, BOARD_TILE.H).setAngle(0);
        this.rightDropZone.setPosition(cx, cy).setSize(BOARD_TILE.W, BOARD_TILE.H).setAngle(0);
      }
      return;
    }

    const boardContainer = this.boardManager.getContainer();
    const bx = boardContainer.x;
    const by = boardContainer.y;

    const drawZone = (z: {cx: number; cy: number; angle: number; isBalak: boolean}, isLeft: boolean) => {
      const wx = bx + z.cx;
      const wy = by + z.cy;
      // Kita tidak tahu apakah pemain menaruh balak atau normal, jadi render sesuai arah jalurnya saja.
      // Jika angle 90 atau 270 (atau forceVertical), berarti jalurnya mengharuskan vertikal. 
      // Tapi untuk drop zone, kita pakai standar angle saja.
      const isVertical = z.angle === 90 || z.angle === 270;
      const w = isVertical ? BOARD_TILE.H : BOARD_TILE.W;
      const h = isVertical ? BOARD_TILE.W : BOARD_TILE.H;
      
      this.dropZoneGfx.lineStyle(3, C.YELLOW, 0.9);
      this.dropZoneGfx.strokeRoundedRect(wx - w/2, wy - h/2, w, h, 6);
      this.dropZoneGfx.fillStyle(C.YELLOW, 0.18);
      this.dropZoneGfx.fillRoundedRect(wx - w/2, wy - h/2, w, h, 6);

      const zone = isLeft ? this.leftDropZone : this.rightDropZone;
      zone.setPosition(wx, wy).setSize(w, h).setAngle(0);
    };

    if (showLeft && layout.leftDropZone) {
      drawZone(layout.leftDropZone, true);
    }
    
    if (showRight && layout.rightDropZone) {
      drawZone(layout.rightDropZone, false);
    }
  }

  private setupDragListeners(): void {
    // Drag events dari PlayerHand
    this.events.on("tile-drag-start", this.showDropZones, this);
    this.events.on("tile-selected", this.showDropZones, this);
    this.events.on("tile-drag-end", this.handleTileDragEnd, this);
  }

  private handleTileDragEnd(tile?: Tile, sprite?: any, pointer?: Phaser.Input.Pointer, callback?: (success: boolean) => void): void {
    this.hideDropZones();

    if (!tile || !pointer || !callback) return;

    const isFirstMove = this.gameState.status === "first_move";
    const layout = this.boardManager.lastLayoutResult;
    let chosenEdge: "left" | "right" | null = null;
    const hitRadius = 150; // Toleransi sangat besar agar pasti kena

    if (isFirstMove) {
      // First move zone di tengah
      const cx = GAME_W / 2;
      const cy = POSITIONS.BOARD.y;
      if (Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, cx, cy) < hitRadius) {
        chosenEdge = "right";
      }
    } else if (layout) {
      const edgeValid = getValidEdge(tile, this.gameState.board, isFirstMove);
      const canPlayLeft = edgeValid === "left" || edgeValid === "both";
      const canPlayRight = edgeValid === "right" || edgeValid === "both";

      if (canPlayLeft && layout.leftDropZone) {
        if (Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.leftDropZone.x, this.leftDropZone.y) < hitRadius) {
          chosenEdge = "left";
        }
      }
      
      if (!chosenEdge && canPlayRight && layout.rightDropZone) {
        if (Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, this.rightDropZone.x, this.rightDropZone.y) < hitRadius) {
          chosenEdge = "right";
        }
      }
    }

    if (chosenEdge) {
      const validEdge = getValidEdge(tile, this.gameState.board, isFirstMove);
      if (validEdge === chosenEdge || validEdge === "both" || isFirstMove) {
        this.playerHand.stopTimer();
        this.commitPlayerMove(tile, chosenEdge);
        callback(true); // Berhasil drop, jangan snap back
        return;
      } else {
        showActionToast(this, GAME_W / 2, POSITIONS.BOARD.y - 70, "Kartu tidak cocok di sisi ini!");
      }
    }
    
    // Gagal drop (meleset atau salah sisi)
    callback(false);
  }

  // ─── ALUR UTAMA (OFFLINE) ────────────────────────────────

  private processTurn(): void {
    if (this.isOnline) return;
    if (this.isBotProcessing || this.gameState.status === "finished") return;

    const current = this.gameState.players[this.gameState.currentTurnIndex];
    const isHuman = current.id === "human" && !this.autoPlay;

    this.renderState();

    if (!isHuman) {
      this.isBotProcessing = true;
      this.time.delayedCall(700, () => {
        this.processBotTurn();
        this.isBotProcessing = false;
      });
    } else {
      const playableTiles = getPlayableTiles(
        current.hand,
        this.gameState.board,
        this.gameState.status === "first_move"
      );
      if (playableTiles.length === 0) {
        this.time.delayedCall(1000, () => {
          this.onPlayerPass();
        });
      }
    }
  }

  private processBotTurn(): void {
    if (this.isOnline) return;
    try {
      const current = this.gameState.players[this.gameState.currentTurnIndex];
      const chosen  = chooseBotTile(this.gameState, "medium");
      const botPos  = this.getBotScreenPos(this.gameState.currentTurnIndex);

      let result;
      if (!chosen) {
        showActionToast(this, botPos.x, botPos.y - 60, `${current.name}: LEWAT`);
        const penalty = Math.floor(this.gameState.roundPoints / 2);
        showFloatingText(this, botPos.x, botPos.y - 40, `-${penalty}`, "#ff5555", 16);
        result = doPass(this.gameState, current.id);
      } else {
      const edge = getValidEdge(chosen, this.gameState.board, this.gameState.status === "first_move");
      const chosenEdge: "left" | "right" = edge === "both"
        ? (Math.random() < 0.5 ? "left" : "right")
        : (edge as "left" | "right");
      result = playTile(this.gameState, current.id, chosen, chosenEdge);
    }

    if (!result.success) result = doPass(this.gameState, current.id);

      if (result.success) {
        this.gameState = result.nextState;
        this.renderState();
        if (result.roundResult) {
          this.time.delayedCall(400, () => this.showResult(result.roundResult!));
          return;
        }
      } else {
        // Jika bot gagal main (misal doPass gagal)
        this.setStatus(`Bot Error: ${result.error}`);
        return;
      }
      this.time.delayedCall(200, () => this.processTurn());
    } catch (e: any) {
      this.setStatus(`CRASH: ${e.message}`);
      console.error(e);
    }
  }

  // ─── INPUT PEMAIN ─────────────────────────────────────────

  private onPlayerTileClick(tile: Tile): void {
    const isFirstMove = this.gameState.status === "first_move";
    const edge = getValidEdge(tile, this.gameState.board, isFirstMove);

    if (edge === null) {
      showActionToast(this, GAME_W / 2, POSITIONS.BOARD.y - 70, "Kartu tidak cocok!");
      return;
    }

    if (edge === "both" && !isFirstMove) {
      // Dual-edge: drop zones sudah terbuka lewat tile-selected event.
      // Pemain tinggal drag ke zone yang diinginkan, atau ketuk salah satu
      // Tidak perlu toast — indikator kuning sudah terlihat.
      return;
    }

    // Single-edge atau first move: langsung mainkan
    const directEdge: "left" | "right" = edge === "left" ? "left" : "right";
    this.hideDropZones();
    this.playerHand.stopTimer();
    this.commitPlayerMove(tile, isFirstMove ? "right" : directEdge);
  }

  private commitPlayerMove(tile: Tile, edge: "left" | "right"): void {
    if (this.isOnline) {
      if (this.room) this.room.send("PLAY_TILE", { tile, edge });
    } else {
      const isFirstMove = this.gameState.status === "first_move";
      const result = playTile(this.gameState, this.mySessionId, tile, isFirstMove ? undefined : edge);

      if (!result.success) {
        showActionToast(this, GAME_W / 2, POSITIONS.BOARD.y - 70, (result as any).error);
        return;
      }

      this.gameState = result.nextState;
      this.renderState();

      if (result.roundResult) {
        this.time.delayedCall(400, () => this.showResult(result.roundResult!));
        return;
      }
      this.time.delayedCall(300, () => this.processTurn());
    }
  }

  private onPlayerPass(): void {
    this.playerHand.stopTimer();
    if (this.isOnline) {
      if (this.room) this.room.send("PASS");
    } else {
      const result = doPass(this.gameState, this.mySessionId);
      if (!result.success) {
        showActionToast(this, GAME_W / 2, POSITIONS.PLAYER.y - 80, (result as any).error);
        return;
      }
      showActionToast(this, POSITIONS.PLAYER.x, POSITIONS.PLAYER.y - 60, "LEWAT");
      const penalty = Math.floor(this.gameState.roundPoints / 2);
      showFloatingText(this, POSITIONS.PLAYER.x, POSITIONS.PLAYER.y - 40, `-${penalty}`, "#ff5555", 16);
      this.gameState = result.nextState;
      this.renderState();
      if (result.roundResult) {
        this.time.delayedCall(400, () => this.showResult(result.roundResult!));
        return;
      }
      this.time.delayedCall(300, () => this.processTurn());
    }
  }

  private onPlayerTimeout(): void {
    if (this.isOnline || this.gameState.status === "finished") return;
    
    showActionToast(this, GAME_W / 2, POSITIONS.PLAYER.y - 80, "Waktu habis! Auto-play...");
    
    this.time.delayedCall(500, () => {
      const current = this.gameState.players[0]; 
      const chosen = chooseBotTile(this.gameState, "medium");
      
      if (!chosen) {
        this.onPlayerPass();
      } else {
        const edge = getValidEdge(chosen, this.gameState.board, this.gameState.status === "first_move");
        const chosenEdge: "left" | "right" = edge === "both"
          ? (Math.random() < 0.5 ? "left" : "right")
          : (edge as "left" | "right");
        
        this.hideDropZones();
        this.commitPlayerMove(chosen, chosenEdge);
      }
    });
  }

  // ─── RENDER ──────────────────────────────────────────────

  private renderState(): void {
    this.boardManager.render(this.gameState.board);
    this.gameHUD.update(this.gameState, 1);
    this.playerHand.render(
      this.gameState,
      (tile) => this.onPlayerTileClick(tile),
      () => this.onPlayerPass(),
      () => this.onPlayerTimeout()
    );
    
    // Render Player Avatar
    if (this.gameState.players.length > 0) {
      this.playerAvatarHUD.render(
        this.gameState.players[0],
        this.gameState.currentTurnIndex === 0
      );
    }

    // Render Bot Avatars
    for (let i = 0; i < 3; i++) {
      if (this.gameState.players[i + 1]) {
        this.oppHUDs[i].render(
          this.gameState.players[i + 1],
          this.gameState.currentTurnIndex === i + 1
        );
      }
    }

    // Hapus label drop zone lama yang menempel di scene
    this.children.getAll().forEach((c) => {
      if ((c as Phaser.GameObjects.Text).name === "dropLabel") c.destroy();
    });
  }

  // ─── RESULT ──────────────────────────────────────────────

  private showResult(result: import("../types").RoundResult): void {
    const winner = this.gameState.players.find((p) => p.id === result.winnerId);
    const isPlayerWin = result.winnerId === this.mySessionId;

    // Phase 4: Banner selesai
    showRoundBanner(this, isPlayerWin ? "🏆 MENANG!" : "RONDE SELESAI", winner?.name ?? "");

    // Tunggu banner selesai, lalu pindah ke layar jeda (Intermission)
    this.time.delayedCall(1800, () => {
      this.scene.start("IntermissionScene", {
        roundNumber: this.roundNumber,
        players: this.gameState.players,
        roundResult: result,
        autoPlay: this.autoPlay,
        isOnline: this.isOnline
      });
    });
  }

  // ─── HELPERS ─────────────────────────────────────────────

  private getBotScreenPos(playerIndex: number): { x: number; y: number } {
    if (playerIndex === 1) return { x: POSITIONS.BOT_LEFT.x,  y: POSITIONS.BOT_LEFT.y };
    if (playerIndex === 2) return { x: POSITIONS.BOT_TOP.x,   y: POSITIONS.BOT_TOP.y };
    if (playerIndex === 3) return { x: POSITIONS.BOT_RIGHT.x, y: POSITIONS.BOT_RIGHT.y };
    return { x: GAME_W / 2, y: GAME_H / 2 };
  }

  private makeBtn(x: number, y: number, label: string, cb: () => void): void {
    const w = 160; const h = 44; const g = this.add.graphics().setDepth(202);
    g.fillStyle(C.BLACK); g.fillRect(x-w/2+4, y-h/2+4, w, h);
    g.fillStyle(C.SURFACE2); g.fillRect(x-w/2, y-h/2, w, h);
    g.lineStyle(2, C.YELLOW); g.strokeRect(x-w/2, y-h/2, w, h);
    this.add.text(x, y, label, {
      fontFamily: "'Space Grotesk', sans-serif", fontSize: "13px",
      color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(203);
    const z = this.add.zone(x, y, w, h).setInteractive().setDepth(204);
    z.on("pointerdown", cb);
    z.on("pointerover", () => this.input.setDefaultCursor("pointer"));
    z.on("pointerout",  () => this.input.setDefaultCursor("default"));
  }

  private drawBackground(): void {
    // Background Image
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, "bg_game").setDepth(-10);
    const updateBg = () => {
      const { width, height } = this.scale.gameSize;
      const zoom = Math.min(width / GAME_W, height / GAME_H);
      this.cameras.main.setZoom(zoom);
      this.cameras.main.centerOn(GAME_W / 2, GAME_H / 2);

      const logicalWidth = width / zoom;
      const logicalHeight = height / zoom;

      const scaleX = logicalWidth / bg.width;
      const scaleY = logicalHeight / bg.height;
      const bgScale = Math.max(scaleX, scaleY);
      bg.setScale(bgScale);
      
      this.updateUIPositions(logicalWidth, logicalHeight);
    };
    this.scale.on('resize', updateBg, this);
    this.events.once('shutdown', () => this.scale.off('resize', updateBg, this));
    updateBg();
  }

  private createSettingsButton(): void {
    this.settingsBtnGfx = this.add.graphics().setDepth(20);
    this.settingsBtnText = this.add.text(0, 0, "⚙️", {
      fontFamily: "'Space Grotesk', sans-serif", fontSize: "28px", color: "#ffffff",
    }).setOrigin(0.5).setDepth(21);
    this.settingsBtnZone = this.add.zone(0, 0, 48, 48).setInteractive();
    
    this.settingsBtnZone.on("pointerdown", () => this.toggleSettingsModal());
    this.settingsBtnZone.on("pointerover", () => {
      this.input.setDefaultCursor("pointer");
      this.settingsBtnText.setScale(1.1);
    });
    this.settingsBtnZone.on("pointerout",  () => {
      this.input.setDefaultCursor("default");
      this.settingsBtnText.setScale(1);
    });
    
    this.createSettingsModal();
  }

  private toggleSettingsModal(): void {
    if (this.settingsModalContainer) {
      this.settingsModalContainer.setVisible(!this.settingsModalContainer.visible);
    }
  }

  private createSettingsModal(): void {
    this.settingsModalContainer = this.add.container(GAME_W / 2, GAME_H / 2).setDepth(100).setVisible(false);
    
    // Background Overlay (blocks clicks behind it)
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(-GAME_W*2, -GAME_H*2, GAME_W * 4, GAME_H * 4);
    
    // Make overlay interactive to block clicks
    const blockerZone = this.add.zone(0, 0, GAME_W*4, GAME_H*4).setInteractive();

    // Modal Box
    overlay.fillStyle(0x16284a, 0.95);
    overlay.fillRoundedRect(-150, -100, 300, 200, 16);
    overlay.lineStyle(2, C.BLUE);
    overlay.strokeRoundedRect(-150, -100, 300, 200, 16);
    
    const title = this.add.text(0, -70, "PENGATURAN", {
      fontFamily: "'Space Grotesk', sans-serif", fontSize: "18px", color: "#ffffff", fontStyle: "bold"
    }).setOrigin(0.5);

    const closeBtn = this.add.text(120, -70, "✖", {
      fontFamily: "Arial", fontSize: "20px", color: "#ff5555"
    }).setOrigin(0.5).setInteractive();
    closeBtn.on("pointerdown", () => this.settingsModalContainer.setVisible(false));
    closeBtn.on("pointerover", () => this.input.setDefaultCursor("pointer"));
    closeBtn.on("pointerout", () => this.input.setDefaultCursor("default"));

    // Music Button
    const musicBtnGfx = this.add.graphics();
    musicBtnGfx.fillStyle(C.SURFACE2);
    musicBtnGfx.fillRoundedRect(-100, -30, 200, 44, 8);
    musicBtnGfx.lineStyle(2, C.YELLOW);
    musicBtnGfx.strokeRoundedRect(-100, -30, 200, 44, 8);
    
    const musicText = this.add.text(0, -8, this.isMusicMuted ? "🎵 Nyalakan Musik" : "🎵 Matikan Musik", {
      fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", color: "#ffffff"
    }).setOrigin(0.5);
    
    const musicZone = this.add.zone(0, -8, 200, 44).setInteractive();
    musicZone.on("pointerdown", () => {
      this.isMusicMuted = !this.isMusicMuted;
      musicText.setText(this.isMusicMuted ? "🎵 Nyalakan Musik" : "🎵 Matikan Musik");
    });
    musicZone.on("pointerover", () => this.input.setDefaultCursor("pointer"));
    musicZone.on("pointerout", () => this.input.setDefaultCursor("default"));

    // Exit Button
    const exitBtnGfx = this.add.graphics();
    exitBtnGfx.fillStyle(0xcc0000);
    exitBtnGfx.fillRoundedRect(-100, 30, 200, 44, 8);
    exitBtnGfx.lineStyle(2, 0xff5555);
    exitBtnGfx.strokeRoundedRect(-100, 30, 200, 44, 8);
    
    const exitText = this.add.text(0, 52, "🚪 Keluar", {
      fontFamily: "'Space Grotesk', sans-serif", fontSize: "16px", color: "#ffffff", fontStyle: "bold"
    }).setOrigin(0.5);
    
    const exitZone = this.add.zone(0, 52, 200, 44).setInteractive();
    exitZone.on("pointerdown", () => this.scene.start("MenuScene"));
    exitZone.on("pointerover", () => this.input.setDefaultCursor("pointer"));
    exitZone.on("pointerout", () => this.input.setDefaultCursor("default"));

    this.settingsModalContainer.add([blockerZone, overlay, title, closeBtn, musicBtnGfx, musicText, musicZone, exitBtnGfx, exitText, exitZone]);
  }

  private updateUIPositions(logicalWidth: number, logicalHeight: number): void {
    const leftX = (GAME_W / 2) - (logicalWidth / 2);
    const rightX = (GAME_W / 2) + (logicalWidth / 2);
    const topY = (GAME_H / 2) - (logicalHeight / 2);
    const bottomY = (GAME_H / 2) + (logicalHeight / 2);

    POSITIONS.PLAYER.x = leftX + 180;
    POSITIONS.PLAYER.y = bottomY - 120;
    POSITIONS.HAND.x = GAME_W / 2;
    POSITIONS.HAND.y = bottomY - 65;
    POSITIONS.BOT_LEFT.x = leftX + 120;
    POSITIONS.BOT_LEFT.y = GAME_H / 2;
    POSITIONS.BOT_RIGHT.x = rightX - 120;
    POSITIONS.BOT_RIGHT.y = GAME_H / 2;
    POSITIONS.BOT_TOP.x = GAME_W / 2;
    POSITIONS.BOT_TOP.y = topY + 100;

    if (this.gameHUD) this.gameHUD.setPosition(leftX, topY);
    if (this.oppHUDs && this.oppHUDs.length === 3) {
      this.oppHUDs[0].setPosition(POSITIONS.BOT_LEFT.x, POSITIONS.BOT_LEFT.y);
      this.oppHUDs[1].setPosition(POSITIONS.BOT_TOP.x, POSITIONS.BOT_TOP.y);
      this.oppHUDs[2].setPosition(POSITIONS.BOT_RIGHT.x, POSITIONS.BOT_RIGHT.y);
    }
    if (this.playerAvatarHUD) {
      this.playerAvatarHUD.setPosition(POSITIONS.PLAYER.x, POSITIONS.PLAYER.y);
    }
    
    if (this.statusText) {
      this.statusText.setPosition(GAME_W / 2, bottomY - 140);
    }
    
    if (this.scorePill && this.scoreText) {
      this.scorePill.clear();
      this.scorePill.fillStyle(0x000000, 0.4);
      this.scorePill.fillRoundedRect(GAME_W / 2 - 80, POSITIONS.BOARD.y - 140, 160, 30, 15);
      this.scoreText.setPosition(GAME_W / 2, POSITIONS.BOARD.y - 125);
    }

    if (this.settingsBtnGfx && this.settingsBtnText && this.settingsBtnZone) {
      const bx = rightX - 40;
      const by = topY + 40;
      this.settingsBtnGfx.clear();
      this.settingsBtnGfx.fillStyle(0x16284a, 0.8);
      this.settingsBtnGfx.fillCircle(bx, by, 24);
      this.settingsBtnGfx.lineStyle(2, 0x00d4ff);
      this.settingsBtnGfx.strokeCircle(bx, by, 24);
      
      this.settingsBtnText.setPosition(bx, by);
      this.settingsBtnZone.setPosition(bx, by);
    }

    if (this.gameState && this.gameState.status) {
      this.renderState();
    }
  }

  private setStatus(msg: string): void { this.statusText?.setText(msg); }
}
