// ============================================================
// ui/OpponentHUD.ts
// Panel info lawan: nama, jumlah kartu tersisa, turn indicator.
// Kartu lawan ditampilkan tertutup (face-down).
// ============================================================

import Phaser from "phaser";
import { PlayerState } from "../types";
import { C } from "../constants";

export type OpponentPosition = "left" | "top" | "right";

export class OpponentHUD {
  private scene: Phaser.Scene;
  private position: OpponentPosition;
  private x: number;
  private y: number;
  private gfx: Phaser.GameObjects.Graphics;
  private pointsText: Phaser.GameObjects.Text;
  private avatarInitials: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    position: OpponentPosition
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.position = position;
    this.gfx = scene.add.graphics();

    const textStyle = {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold",
    };

    // Avatar Text
    this.avatarInitials = scene.add.text(x, y - 10, "?", {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "24px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(2);

    // Player Name
    this.nameText = scene.add.text(x, y + 30, "...", {
      ...textStyle, fontSize: "14px", color: "#dddddd"
    }).setOrigin(0.5).setDepth(2);
    
    // Score Text (will be drawn next to the gem)
    this.pointsText = scene.add.text(x + 8, y + 48, "0", {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "14px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(2);

    // Turn/Alarm/Card Count Indicator (placed slightly offset from the avatar)
    this.cardCountText = scene.add
      .text(x + 40, y - 5, "7", {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "14px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5).setDepth(4);

    this.turnArrow = scene.add
      .text(x, y - 50, "▼", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#fff200",
      })
      .setOrigin(0.5).setDepth(4)
      .setVisible(false);
  }

  render(player: PlayerState, isCurrentTurn: boolean): void {
    this.gfx.clear();

    const cx = this.x;
    const cy = this.y - 10;
    const r = 28;

    // 1. Draw Alarm/Card Count Badge background
    const alarmX = cx + 40;
    const alarmY = cy;
    this.gfx.fillStyle(C.ALARM);
    this.gfx.fillRoundedRect(alarmX - 12, alarmY - 12, 24, 24, 6);
    this.gfx.lineStyle(2, C.YELLOW);
    this.gfx.strokeRoundedRect(alarmX - 12, alarmY - 12, 24, 24, 6);

    // 2. Draw Score Gem (Pink Diamond)
    const gemX = cx - 20;
    const gemY = cy + 58;
    this.gfx.fillStyle(C.GEM);
    this.gfx.beginPath();
    this.gfx.moveTo(gemX, gemY - 6);
    this.gfx.lineTo(gemX + 6, gemY);
    this.gfx.lineTo(gemX, gemY + 6);
    this.gfx.lineTo(gemX - 6, gemY);
    this.gfx.closePath();
    this.gfx.fillPath();

    // 3. Draw Avatar Ring
    if (isCurrentTurn) {
      this.gfx.lineStyle(6, C.BLUE, 0.6);
      this.gfx.strokeCircle(cx, cy, r + 6);
      this.gfx.lineStyle(2, C.YELLOW, 1);
      this.gfx.strokeCircle(cx, cy, r + 2);
    }

    // Avatar background
    this.gfx.fillStyle(C.SURFACE);
    this.gfx.fillCircle(cx, cy, r);

    // Avatar border (Gold Frame)
    this.gfx.lineStyle(3, C.YELLOW);
    this.gfx.strokeCircle(cx, cy, r);
    // Inner green/blue accent
    this.gfx.lineStyle(2, C.POSITIVE);
    this.gfx.strokeCircle(cx, cy, r - 3);

    this.avatarInitials.setText(player.name.charAt(0).toUpperCase());
    this.nameText.setText(player.name);
    this.pointsText.setText(`${player.score ?? 0}`);
    
    this.cardCountText.setText(
      player.hand.length === 0 ? "0" : `${player.hand.length}`
    );

    this.turnArrow.setVisible(isCurrentTurn);
  }
}
