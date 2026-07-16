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
  private avatarInitials: Phaser.GameObjects.Text;
  private nameText: Phaser.GameObjects.Text;
  private cardCountText: Phaser.GameObjects.Text;
  private badgeImg: Phaser.GameObjects.Image;
  private badgePip: Phaser.GameObjects.Arc;
  private turnArrow?: Phaser.GameObjects.Text;

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
      fontSize: "36px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(2);

    // Player Name
    this.nameText = scene.add.text(x, y + 42, "...", {
      ...textStyle, fontSize: "16px", color: "#dddddd"
    }).setOrigin(0.5).setDepth(2);
    
    // Score Text (will be drawn next to the gem)
    this.pointsText = scene.add.text(x + 10, y + 62, "0", {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "16px", color: "#ffffff", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(2);

    // Card Count Badge Background (Actual Domino Image)
    this.badgeImg = scene.add.image(x + 50, y, "domino_00")
      .setDisplaySize(24, 44)
      .setDepth(3);
      
    this.badgePip = scene.add.circle(x + 50, y - 10, 3, 0xcc0000).setDepth(4);

    // Turn/Alarm/Card Count Indicator (Domino Tile Style)
    this.cardCountText = scene.add
      .text(x + 50, y + 10, "7", {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "14px",
        color: "#cc0000",
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
    const r = 38;

    // 2. Draw Score Gem (Pink Diamond)
    const gemX = cx - 25;
    const gemY = cy + 72;
    this.gfx.fillStyle(C.GEM);
    this.gfx.beginPath();
    this.gfx.moveTo(gemX, gemY - 7);
    this.gfx.lineTo(gemX + 7, gemY);
    this.gfx.lineTo(gemX, gemY + 7);
    this.gfx.lineTo(gemX - 7, gemY);
    this.gfx.closePath();
    this.gfx.fillPath();

    // 3. Draw Avatar Ring
    if (isCurrentTurn) {
      // Glow effect
      this.gfx.fillStyle(C.YELLOW, 0.2);
      this.gfx.fillCircle(cx, cy, r + 12);
      
      this.gfx.lineStyle(8, C.BLUE, 0.7);
      this.gfx.strokeCircle(cx, cy, r + 7);
      this.gfx.lineStyle(3, C.YELLOW, 1);
      this.gfx.strokeCircle(cx, cy, r + 3);
    }

    // Avatar background
    this.gfx.fillStyle(0x111c38); // Darker rich blue
    this.gfx.fillCircle(cx, cy, r);

    // Avatar border (Gold Frame)
    this.gfx.lineStyle(4, C.YELLOW);
    this.gfx.strokeCircle(cx, cy, r);
    // Inner accent
    this.gfx.lineStyle(2, C.POSITIVE);
    this.gfx.strokeCircle(cx, cy, r - 5);

    this.avatarInitials.setText(player.name.charAt(0).toUpperCase());
    this.nameText.setText(player.name);
    this.pointsText.setText(`${player.score ?? 0}`);
    
    this.cardCountText.setText(
      player.hand.length === 0 ? "0" : `${player.hand.length}`
    );

    this.turnArrow?.setVisible(isCurrentTurn);
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.avatarInitials.setPosition(x, y - 10);
    this.nameText.setPosition(x, y + 42);
    this.pointsText.setPosition(x + 10, y + 62);
    this.badgeImg.setPosition(x + 50, y);
    this.badgePip.setPosition(x + 50, y - 10);
    this.cardCountText.setPosition(x + 50, y + 10);
    this.turnArrow?.setPosition(x, y - 60);
  }
}
