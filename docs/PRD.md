# Web Domino Tournament Game

## Overview
- **Deskripsi:** Game domino berbasis web dengan mode single-player (vs bot AI) dan mode multiplayer online real-time, dilengkapi sistem turnamen eliminasi bertingkat (48/64 pemain hingga babak final 4 pemain).
- **Tech Stack Utama:** Phaser 3, TypeScript, Node.js + Colyseus (realtime backend), PostgreSQL, Redis (matchmaking/queue).
- **Dokumen Pendamping:** Skema database lengkap, pseudo-code rules engine, dan component tree Phaser ada di `rancangan-teknis-domino.md` — jadikan referensi teknis saat masuk ke tahap implementasi Phase 1 dan 3 di Tasks.md.

## Target User
- **Guest/Pemain Baru:** Bisa main vs bot tanpa akun, untuk belajar aturan.
- **Pemain Terdaftar:** Punya profil, chip/koin, riwayat turnamen, bisa ikut turnamen online.
- **Administrator:** Mengelola jadwal turnamen, memantau match, menangani laporan cheat/bug.

## Features & Scope

### 1. Autentikasi & Manajemen Pengguna
- [ ] Pendaftaran akun baru (Sign Up) dan Sign In/Sign Out.
- [ ] Profil pemain: username, avatar, jumlah chip.
- [ ] Proteksi rute untuk halaman yang butuh login (mis. ikut turnamen).

### 2. Rules Engine Domino (Core Feature)
- [ ] Sistem giliran turn-based sesuai kartu yang tersedia di papan.
- [ ] Deteksi kondisi "Lewat/Pass" saat pemain tidak punya kartu valid.
- [ ] Transfer poin dari pemain yang lewat ke lawan penyebab blokir.
- [ ] Sistem bonus skor: Double, Triple, Kuartet.
- [ ] Rules engine bersifat "pure" (tidak bergantung UI) agar reusable di client (bot) & server (validasi online).

### 3. Mode Permainan
- [ ] Mode vs Bot AI (offline, minimal 1 tingkat kesulitan untuk MVP).
- [ ] Mode Online Real-time 4 pemain per meja (via Colyseus room).
- [ ] Sistem turnamen eliminasi bertingkat (konfigurasi jumlah pemain awal, ranking per babak, babak final 4 pemain).

### 4. Sistem Skin Domino (Kustomisasi/Monetisasi)
- [ ] Domino tile default menggunakan style **standar/klasik** (netral, bukan mengikuti tema brutalist UI shell) — lihat StyleGuide.md.
- [ ] Arsitektur tile mendukung skin: tile di-render dari `skinId` (bukan style hardcoded), agar skin baru tinggal ditambah sebagai set aset baru tanpa ubah logic.
- [ ] Skin memengaruhi tampilan tile saja (warna dasar, motif, warna pip) — ukuran/proporsi/area interaktif tile harus tetap konsisten antar skin agar tidak mengganggu gameplay/hitbox.
- [ ] (Opsional, fase lanjut) Sistem unlock/pembelian skin memakai chip atau mata uang premium — detail monetisasi menyusul.

### 5. UI/UX Gameplay
- [ ] Tata letak meja landscape, papan domino di tengah, user di bawah, lawan di kiri/atas/kanan.
- [ ] HUD: info babak (Babak 1/6), peringkat live (21/48), timer giliran di avatar.
- [ ] Feedback visual: kartu playable menyala/pop-up, kartu tidak valid grayed-out.
- [ ] Indikator jumlah kartu lawan (tumpukan kartu tertutup + angka sisa kartu) di dekat tiap avatar lawan.
- [ ] Notifikasi aksi otomatis: teks transparan singkat seperti "Lewat" (saat pass) atau "Geng" (saat kondisi permainan macet/tutup total).
- [ ] Floating score text (+360 hijau, -120 merah), banner transisi babak ("BABAK 1", dst).
- [ ] Layar intermission: leaderboard podium, status matchmaking ("Menghitung Peringkat...", "Mencocokkan..."), indikator bracket turnamen (32 → 16 → 8 → Trofi Final).

### 6. Mobile Web Optimization
- [ ] Forced landscape + overlay rotasi perangkat.
- [ ] Fullscreen API, anti-scroll/overscroll.
- [ ] Tap-to-play & drag-and-drop dengan hitbox diperbesar.
- [ ] Auto-switch rendering WebGL (jika didukung GPU HP) dengan fallback ke HTML5 Canvas untuk perangkat lama.
- [ ] Multi-resolution asset loading (SD untuk layar kecil, HD untuk tablet/retina) untuk menghemat RAM.
- [ ] PWA: manifest.json ("Add to Home Screen") + service worker untuk caching aset statis.

## Success Criteria (Non-Functional Requirements)
- Game harus tetap responsif di koneksi mobile (3G/4G) dan perangkat kelas menengah ke bawah.
- Validasi aturan permainan (anti-cheat) harus dilakukan di server untuk mode online, bukan hanya client.
- Loading awal harus dioptimasi (sprite sheet, lazy load aset per babak).
- Penanganan error jelas: disconnect saat match online harus punya mekanisme reconnect/timeout, bukan crash.
- Kode modular: rules engine, rendering (Phaser), dan networking harus terpisah jelas.
