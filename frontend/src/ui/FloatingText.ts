// ui/FloatingText.ts — Teks mengambang untuk notifikasi aksi

import Phaser from "phaser";

export function showFloatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: string = "#ffffff",
  fontSize: number = 20
): void {
  const txt = scene.add.text(x, y, text, {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: `${fontSize}px`,
    color,
    fontStyle: "bold",
    stroke: "#000000",
    strokeThickness: 4,
  }).setOrigin(0.5).setDepth(90);

  scene.tweens.add({
    targets: txt,
    y: y - 70,
    alpha: { from: 1, to: 0 },
    duration: 700,
    ease: "Sine.easeOut",
    onComplete: () => txt.destroy(),
  });
}

export function showActionToast(scene: Phaser.Scene, x: number, y: number, text: string): void {
  const gfx = scene.add.graphics().setDepth(88);
  const w = text.length * 9 + 32;
  const h = 34;
  gfx.fillStyle(0x111111); gfx.fillRect(x - w/2+4, y - h/2+4, w, h);
  gfx.fillStyle(0x252525); gfx.fillRect(x - w/2, y - h/2, w, h);
  gfx.lineStyle(2, 0x444444); gfx.strokeRect(x - w/2, y - h/2, w, h);

  const txt = scene.add.text(x, y, text, {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "13px", color: "#cccccc", fontStyle: "bold",
  }).setOrigin(0.5).setDepth(89);

  scene.time.delayedCall(700, () => {
    scene.tweens.add({
      targets: [gfx, txt], alpha: 0, y: y - 25, duration: 300,
      onComplete: () => { gfx.destroy(); txt.destroy(); },
    });
  });
}
