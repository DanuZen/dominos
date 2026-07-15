// ui/GameHUD.ts — Menampilkan info Babak dan Live Scoreboard (Peringkat Live)

import Phaser from "phaser";
import { GameState } from "../types";
import { C, GAME_W } from "../constants";

export class GameHUD {
  private scene: Phaser.Scene;
  private roundText: Phaser.GameObjects.Text;
  private rankTexts: Phaser.GameObjects.Text[] = [];
  private bgGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, initialRound: number) {
    this.scene = scene;

    // Top-Left: Round & Rank Panel
    this.bgGfx = scene.add.graphics();
    // Semi-transparent dark pill background for info
    this.bgGfx.fillStyle(0x000000, 0.5);
    this.bgGfx.fillRoundedRect(10, 10, 200, 60, 12);
    this.bgGfx.lineStyle(2, C.BLUE, 0.3);
    this.bgGfx.strokeRoundedRect(10, 10, 200, 60, 12);

    this.roundText = scene.add.text(30, 25, `Babak 1/6`, {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "14px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0, 0.5);

    scene.add.text(120, 25, "Peringkat", {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "12px", color: "#aaaaaa", fontStyle: "bold",
    }).setOrigin(0, 0.5);

    this.rankTexts.push(scene.add.text(120, 45, "1/4", {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "16px", color: "#ffd700", fontStyle: "bold",
    }).setOrigin(0, 0.5));

    // Top-Right Icons (Simulated UI icons)
    const trX = GAME_W - 120;
    scene.add.text(trX, 30, "📶 04:39  ⚙️", {
      fontFamily: "Arial", fontSize: "16px", color: "#ffffff"
    }).setOrigin(0.5);
  }

  update(state: GameState, roundNumber: number): void {
    this.roundText.setText(`Babak ${roundNumber}/6`);

    // Cari peringkat player human
    const sorted = [...state.players].sort((a, b) => a.score - b.score);
    let myRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].id === "human") {
        myRank = i + 1;
        break;
      }
    }
    
    this.rankTexts[0].setText(`${myRank}/${sorted.length}`);
  }
}
