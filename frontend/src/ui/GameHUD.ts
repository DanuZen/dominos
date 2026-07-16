// ui/GameHUD.ts — Menampilkan info Babak dan Live Scoreboard (Peringkat Live)

import Phaser from "phaser";
import { GameState } from "../types";
import { C, GAME_W } from "../constants";

export class GameHUD {
  private scene: Phaser.Scene;
  private roundText: Phaser.GameObjects.Text;
  private rankTexts: Phaser.GameObjects.Text[] = [];
  private bgGfx: Phaser.GameObjects.Graphics;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, initialRound: number) {
    this.scene = scene;

    const tw = 140;
    const th = 56;
    const tr = 6;

    this.bgGfx = scene.add.graphics();
    
    // Shadow
    this.bgGfx.fillStyle(0x000000, 0.3);
    this.bgGfx.fillRoundedRect(3, 3, tw, th, tr);
    
    // Background (Domino Tile White)
    this.bgGfx.fillStyle(0xffffff, 1);
    this.bgGfx.fillRoundedRect(0, 0, tw, th, tr);
    
    // Border
    this.bgGfx.lineStyle(2, 0xaaaaaa, 1);
    this.bgGfx.strokeRoundedRect(0, 0, tw, th, tr);

    // Separator (Center line of Domino)
    this.bgGfx.lineStyle(2, 0xaaaaaa, 1);
    this.bgGfx.lineBetween(tw / 2, 4, tw / 2, th - 4);

    // Left Half: Round
    this.roundText = scene.add.text(tw / 4, th / 2, `Babak\n1/6`, {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "14px", color: "#333333", fontStyle: "bold",
      align: "center"
    }).setOrigin(0.5);

    // Right Half: Rank
    const rankLabel = scene.add.text((tw / 4) * 3, th / 2 - 10, "RANK", {
      fontFamily: "'Inter', sans-serif",
      fontSize: "11px", color: "#555555", fontStyle: "bold",
    }).setOrigin(0.5);

    this.rankTexts.push(scene.add.text((tw / 4) * 3, th / 2 + 8, "1/4", {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "16px", color: "#cc0000", fontStyle: "bold",
    }).setOrigin(0.5));

    this.container = scene.add.container(20, 20, [
      this.bgGfx, this.roundText, rankLabel, this.rankTexts[0]
    ]).setDepth(20);
  }

  setPosition(leftX: number, topY: number): void {
    // Memberikan jarak yang pas dari ujung layar
    this.container.setPosition(leftX + 24, topY + 24);
  }

  update(state: GameState, roundNumber: number, myId: string = "human"): void {
    this.roundText.setText(`Babak\n${roundNumber}/6`);

    // Sort player scores descending
    const sorted = [...state.players].sort((a, b) => b.score - a.score);
    const myRank = sorted.findIndex(p => p.id === myId) + 1;
    this.rankTexts[0].setText(`${myRank}/${sorted.length}`);
  }
}
