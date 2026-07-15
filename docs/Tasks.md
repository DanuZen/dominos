# Development Tasks & Roadmap — Domino Tournament Game

## Phase 1: Rules Engine (Logika Inti, Tanpa UI)
- [x] Setup boilerplate project (TypeScript, struktur folder `engine/`, `types/`).
- [x] Definisikan tipe data inti: `Tile`, `PlayerState`, `BoardState`.
- [x] Implementasi fungsi `canPlay`, `getPlayableTiles`, `placeTile`.
- [x] Implementasi logika "Lewat/Pass" beserta transfer poin ke lawan penyebab blokir.
- [x] Implementasi rumus bonus skor Double/Triple/Kuartet (rumus final harus dikonfirmasi dulu ke saya sebelum dikunci).
- [x] Unit test rules engine dengan skenario manual (tanpa UI, cukup console log/test runner).

## Phase 2: Mode vs Bot AI (Playable Pertama)
- [x] Bangun bot AI sederhana (strategi: pilih tile playable pertama / random dulu untuk MVP).
- [x] Hubungkan rules engine dengan bot untuk simulasi 1 vs 3 bot penuh dari awal sampai selesai.
- [x] Validasi hasil skor akhir sesuai aturan yang ditentukan di Phase 1.

## Phase 3: UI Gameplay Dasar (Phaser)
- [x] Setup Phaser project + scene dasar (`BootScene`, `GameplayScene`).
- [x] Render papan (BoardManager) dan dock kartu pemain (drag/tap-to-play).
- [x] Buat `DominoTileSprite` sebagai komponen skinnable — terima parameter `skinId`, rekender skin "Classic" (default/standar) sebagai skin pertama.
- [x] Render avatar lawan (kiri/atas/kanan) dengan info nama, chip, jumlah kartu — style neo-brutalist (kotak, border tebal).
- [x] Hubungkan UI ke rules engine dari Phase 1–2 (gameplay vs bot bisa dimainkan secara visual).

## Phase 4: HUD & Efek Visual
- [x] HUD info babak dan peringkat live.
- [x] Floating score text (+/- poin) dan banner transisi babak.
- [x] Turn-timer glow di avatar, highlight kartu playable vs grayed-out.
- [x] Layar intermission (leaderboard podium, indikator bracket).

## Phase 5: Mobile Optimization
- [x] Forced landscape + overlay rotasi device.
- [x] Fullscreen API + anti-scroll/overscroll.
- [x] Optimasi hitbox drag/tap untuk layar kecil.
- [x] Texture packing/sprite sheet (N/A - Grafis kartu sepenuhnya digambar secara prosedural / canvas tanpa aset eksternal).

## Phase 6: Backend Realtime (Mode Online)
- [ ] Setup Colyseus room untuk 1 meja (4 pemain).
- [ ] Sinkronisasi state board & giliran antar client via room state.
- [ ] Validasi aturan di server (anti-cheat) menggunakan rules engine yang sama dari Phase 1.
- [ ] Reconnect handling saat pemain disconnect di tengah match.

## Phase 7: Sistem Turnamen & Matchmaking
- [ ] Skema database (players, tournaments, rounds, matches) — implementasi PostgreSQL.
- [ ] Logika pembagian meja per babak dan kalkulasi ranking cumulative_score.
- [ ] Penentuan jumlah pemain yang lolos tiap babak (rumus final harus dikonfirmasi).
- [ ] Matchmaking queue via Redis untuk babak berikutnya.

## Phase 8: Validasi Akhir & Finishing
- [ ] PWA: manifest.json + service worker caching.
- [ ] Edge-case: loading state, empty state, error/disconnect state.
- [ ] Pengujian manual end-to-end (bot mode + online mode + turnamen penuh).
- [ ] Bug fixing & optimasi performa sebelum deploy.
