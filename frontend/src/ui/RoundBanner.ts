// ui/RoundBanner.ts — Banner transisi ronde/babak, slide-in tegas

import Phaser from "phaser";
import { C, GAME_W, GAME_H } from "../constants";

export function showRoundBanner(
  scene: Phaser.Scene,
  mainText: string,
  subText: string = "",
  onComplete?: () => void
): void {
  const gfx = scene.add.graphics().setDepth(95);
  const bannerH = 90;

  // Gambar berpusat di (0,0) agar bisa di-scale dari tengah
  gfx.fillStyle(C.BLACK);
  gfx.fillRect(-GAME_W / 2, -bannerH / 2 + 6, GAME_W, bannerH);
  
  gfx.fillStyle(C.YELLOW);
  gfx.fillRect(-GAME_W / 2, -bannerH / 2, GAME_W, bannerH);
  
  gfx.lineStyle(4, C.BLACK);
  gfx.lineBetween(-GAME_W / 2, -bannerH / 2, GAME_W / 2, -bannerH / 2);
  gfx.lineBetween(-GAME_W / 2, bannerH / 2, GAME_W / 2, bannerH / 2);

  gfx.setPosition(GAME_W / 2, GAME_H / 2);
  gfx.scaleX = 0; // Mulai tersembunyi (lebar 0)

  // Main text
  const main = scene.add.text(GAME_W / 2, GAME_H / 2 - (subText ? 10 : 0), mainText, {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "44px", color: "#111111", fontStyle: "bold",
  }).setOrigin(0.5).setDepth(96).setAlpha(0).setScale(1.5); // Mulai besar (zoom effect)

  // Sub text
  let sub: Phaser.GameObjects.Text | null = null;
  if (subText) {
    sub = scene.add.text(GAME_W / 2, GAME_H / 2 + 45, subText, {
      fontFamily: "'Inter', sans-serif",
      fontSize: "15px", color: "#333333", fontStyle: "bold"
    }).setOrigin(0.5).setDepth(96).setAlpha(0);
  }

  // --- ANIMASI MASUK ---
  
  // 1. Pita kuning melebar dari tengah
  scene.tweens.add({
    targets: gfx,
    scaleX: 1,
    duration: 350,
    ease: "Cubic.easeOut"
  });

  // 2. Teks utama mengecil ke ukuran normal dengan efek memantul (Impact)
  scene.tweens.add({
    targets: main,
    scale: 1,
    alpha: 1,
    duration: 400,
    ease: "Back.easeOut",
    delay: 150 // Stagger: muncul sedikit setelah pita mulai melebar
  });

  // 3. Subteks meluncur ke atas secara halus
  if (sub) {
    scene.tweens.add({
      targets: sub,
      y: GAME_H / 2 + 25, // Target posisi Y naik 20px
      alpha: 1,
      duration: 300,
      ease: "Cubic.easeOut",
      delay: 350
    });
  }

  // --- ANIMASI KELUAR ---
  
  scene.time.delayedCall(1600, () => {
    scene.tweens.add({
      targets: [gfx, main, sub].filter(Boolean),
      alpha: 0,
      y: "-=30", // Semuanya melayang perlahan ke atas saat menghilang
      duration: 250,
      ease: "Power2",
      onComplete: () => {
        gfx.destroy();
        main.destroy();
        sub?.destroy();
        onComplete?.();
      }
    });
  });
}
