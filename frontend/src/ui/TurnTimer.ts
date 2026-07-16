// ui/TurnTimer.ts — Bar timer giliran, berkedip solid saat hampir habis

import Phaser from "phaser";
import { C } from "../constants";

export class TurnTimer {
  private scene: Phaser.Scene;
  private gfx: Phaser.GameObjects.Graphics;
  private x: number;
  private y: number;
  private w: number;
  private h: number = 6;
  private timerEvent?: Phaser.Time.TimerEvent;
  private remaining: number = 1;
  private blinkTween?: Phaser.Tweens.Tween;
  private onExpire?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.w = w;
    this.gfx = scene.add.graphics().setDepth(6);
    this.draw(1, false);
  }

  start(durationMs: number, onExpire?: () => void): void {
    this.stop();
    this.remaining = 1;
    this.onExpire = onExpire;
    const startTime = this.scene.time.now;

    this.timerEvent = this.scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        const elapsed = this.scene.time.now - startTime;
        this.remaining = Math.max(0, 1 - elapsed / durationMs);
        const isCritical = this.remaining < 0.25;
        this.draw(this.remaining, isCritical);

        if (this.remaining === 0) {
          this.stop();
          this.onExpire?.();
        }
      },
    });
  }

  stop(): void {
    this.timerEvent?.remove();
    this.timerEvent = undefined;
    this.blinkTween?.stop();
    this.blinkTween = undefined;
    this.draw(0, false);
  }

  reset(): void {
    this.stop();
    this.remaining = 1;
    this.draw(1, false);
  }

  hide(): void { this.gfx.setVisible(false); }
  show(): void { this.gfx.setVisible(true); }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    if (this.gfx.visible) {
      this.draw(this.remaining, this.remaining < 0.25);
    }
  }

  private draw(ratio: number, critical: boolean): void {
    this.gfx.clear();
    const filledW = this.w * ratio;

    // Track (background)
    this.gfx.fillStyle(0x333333);
    this.gfx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);

    // Fill — kuning → merah saat critical
    const fillColor = critical ? C.NEGATIVE : C.YELLOW;
    this.gfx.fillStyle(fillColor);
    this.gfx.fillRect(this.x - this.w / 2, this.y - this.h / 2, filledW, this.h);

    // Border
    this.gfx.lineStyle(1, C.BLACK);
    this.gfx.strokeRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
  }
}
