// scenes/IntermissionScene.ts
// Layar jeda antar babak (Leaderboard Podium, Peringkat Sementara)

import Phaser from "phaser";
import { RoundResult, PlayerState } from "../types";
import { C, GAME_W, GAME_H } from "../constants";

interface SceneData {
  roundNumber: number;
  players: PlayerState[]; // Players dengan skor terupdate dari ronde sebelumnya
  roundResult: RoundResult;
  autoPlay: boolean;
  isOnline: boolean;
}

export class IntermissionScene extends Phaser.Scene {
  private sceneData!: SceneData;

  constructor() {
    super({ key: "IntermissionScene" });
  }

  init(data: SceneData): void {
    this.sceneData = data;
  }

  create(): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(C.BG);
    gfx.fillRect(0, 0, GAME_W, GAME_H);

    // Header
    this.add.text(GAME_W / 2, 80, `HASIL RONDE ${this.sceneData.roundNumber}`, {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "48px", color: "#fff200", fontStyle: "bold",
    }).setOrigin(0.5);

    this.add.text(GAME_W / 2, 130, this.sceneData.roundResult.description, {
      fontFamily: "'Inter', sans-serif",
      fontSize: "18px", color: "#aaaaaa",
    }).setOrigin(0.5);

    // Kumpulkan skor baru menggunakan pointsDelta:
    const newPlayers = this.sceneData.players.map(p => {
      const delta = this.sceneData.roundResult.pointsDelta?.[p.id] || 0;
      return { ...p, score: p.score + delta, delta };
    });

    // Urutkan (Terbesar = rank 1)
    newPlayers.sort((a, b) => b.score - a.score);

    // Podium / Leaderboard
    const startY = 220;
    for (let i = 0; i < 4; i++) {
      const p = newPlayers[i];
      if (!p) continue;

      const y = startY + i * 70;
      // In online mode, we highlight based on mySessionId, but for simplicity here we can just say "Kamu" or check ID
      const isYou = p.id === "human" || (this.sceneData.isOnline && p.name.startsWith("Player"));

      // Panel
      gfx.fillStyle(C.BLACK);
      gfx.fillRect(GAME_W / 2 - 250 + 6, y - 30 + 6, 500, 60);
      gfx.fillStyle(isYou ? 0x2e2e10 : C.SURFACE2);
      gfx.fillRect(GAME_W / 2 - 250, y - 30, 500, 60);
      gfx.lineStyle(2, isYou ? C.YELLOW : C.GRAY);
      gfx.strokeRect(GAME_W / 2 - 250, y - 30, 500, 60);

      // Rank
      this.add.text(GAME_W / 2 - 220, y, `#${i + 1}`, {
        fontFamily: "'Space Grotesk', sans-serif", fontSize: "24px",
        color: i === 0 ? "#fff200" : "#aaaaaa", fontStyle: "bold"
      }).setOrigin(0, 0.5);

      // Nama
      this.add.text(GAME_W / 2 - 140, y, p.name, {
        fontFamily: "'Space Grotesk', sans-serif", fontSize: "20px",
        color: "#ffffff", fontStyle: isYou ? "bold" : "normal"
      }).setOrigin(0, 0.5);

      const deltaStr = p.delta > 0 ? `+${p.delta}` : `${p.delta}`;
      const deltaColor = p.delta > 0 ? "#00e676" : (p.delta < 0 ? "#ff5555" : "#aaaaaa");

      this.add.text(GAME_W / 2 + 100, y, `${deltaStr} pt`, {
        fontFamily: "'Space Grotesk', sans-serif", fontSize: "20px",
        color: deltaColor, fontStyle: "bold"
      }).setOrigin(1, 0.5);

      // Total Skor
      this.add.text(GAME_W / 2 + 220, y, `${p.score} pt`, {
        fontFamily: "'Space Grotesk', sans-serif", fontSize: "24px",
        color: isYou ? "#fff200" : "#00e676", fontStyle: "bold"
      }).setOrigin(1, 0.5);
    }

    // Tombol Next Round
    const btnW = 220;
    const btnH = 50;
    const btnX = GAME_W / 2;
    const btnY = GAME_H - 100;

    gfx.fillStyle(C.BLACK);
    gfx.fillRect(btnX - btnW / 2 + 6, btnY - btnH / 2 + 6, btnW, btnH);
    gfx.fillStyle(C.BLUE);
    gfx.fillRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH);
    gfx.lineStyle(3, C.BLACK);
    gfx.strokeRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH);

    this.add.text(btnX, btnY, "LANJUT RONDE BERIKUTNYA ▶", {
      fontFamily: "'Space Grotesk', sans-serif", fontSize: "14px",
      color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5);

    const zone = this.add.zone(btnX, btnY, btnW, btnH).setInteractive();
    zone.on("pointerdown", () => {
      // Simpan skor sebagai objek map id -> score
      const initialScores: Record<string, number> = {};
      newPlayers.forEach(p => initialScores[p.id] = p.score);
      
      this.scene.start("GameplayScene", {
        autoPlay: this.sceneData.autoPlay,
        isOnline: this.sceneData.isOnline,
        roundNumber: this.sceneData.roundNumber + 1,
        initialScores
      });
    });
    zone.on("pointerover", () => this.input.setDefaultCursor("pointer"));
    zone.on("pointerout", () => this.input.setDefaultCursor("default"));
  }
}
