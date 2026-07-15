# Design System & Code Standard — Domino Tournament Game

## Visual Theme
- **Style:** Minimalist Neo-Brutalist — flat color, kontras tinggi, outline tebal, hard shadow (tanpa blur), tanpa gradient/skeuomorphism. Kesan jujur, berani, "raw", tapi tetap rapi dan gampang dipindai mata di layar kecil.
- **Kenapa cocok untuk domino:** bentuk kartu domino (kotak, pip solid, garis pembagi tegas) secara natural sudah brutalist. UI tidak perlu menutupinya dengan shadow lembut atau gradient — cukup pertegas garis dan kontras yang sudah ada di objeknya sendiri.

## Scope Style: UI Shell vs. Domino Tile
- **UI Shell (HUD, tombol, panel, avatar, banner, skor):** neo-brutalist penuh — ini identitas visual utama game.
- **Domino Tile (kartu itu sendiri):** style **standar/klasik** — tile putih/krem polos, pip hitam solid, border tipis standar (bukan border tebal brutalist). Alasannya: tile akan jadi **skinnable asset** (fitur skin domino direncanakan), jadi bentuknya harus netral dan universal, tidak terikat gaya UI shell yang mungkin berubah tema di masa depan.
- **Implikasi teknis:** render domino tile sebagai komponen/texture terpisah (`DominoTileSprite`) yang menerima `skinId` sebagai parameter — jangan hardcode style brutalist ke tile itu sendiri. Lihat bagian "Sistem Skin Domino" di PRD.md.

## Color Palette
- **Background:** `#f2f0e9` (off-white/cream) atau `#111111` (hitam pekat) — pilih satu sebagai base, elemen lain dibangun di atasnya sebagai blok warna solid.
- **Primary Accent:** `#fff200` (kuning terang) — dipakai untuk highlight giliran aktif dan CTA utama.
- **Secondary Accent:** `#0047ff` (biru elektrik) — untuk elemen sekunder (tombol menu, avatar lawan).
- **Positive Score:** `#00e676` (hijau terang, flat, tanpa gradasi).
- **Negative Score:** `#ff3b30` (merah flat untuk pengurangan poin).
- **Outline/Border (UI Shell):** `#000000` — border tebal 2–4px di hampir semua elemen (tombol, panel, avatar) adalah ciri khas brutalist. **Domino tile tidak memakai border tebal ini** — tile pakai border standar tipis (1–2px) sesuai skin default.
- **Text:** `#000000` di atas background terang, `#ffffff` di atas blok warna gelap/solid. Tidak ada abu-abu medium — kontras selalu tinggi.

## Typography & UI Elements
- **Font:** Sans-serif tebal dan geometris (mis. "Space Grotesk", "Archivo Black", atau "Inter" Bold/ExtraBold) — dipakai konsisten di HUD, skor, dan judul. Hindari font tipis/regular untuk elemen penting.
- **Buttons:** Sudut tajam atau radius sangat kecil (0–4px), border hitam tebal, hard shadow offset (mis. `shadow: 4px 4px 0 #000`, bukan soft blur). Efek klik: tombol "turun" (shadow mengecil) saat ditekan — feedback taktil khas brutalist.
- **Cards (Kartu Domino):** **Standar/klasik** — tile putih/krem polos, sudut membulat kecil (radius wajar, bukan tajam), pip hitam solid, border tipis 1–2px. Kartu playable disorot dengan outline warna aksen (kuning) tambahan di luar tile, bukan mengubah bentuk tile itu sendiri. Skin default ini adalah "Classic" — skin lain nantinya bisa mengganti warna/motif tile tanpa mengubah ukuran/proporsi dasar.
- **Panel/HUD:** Blok warna solid dengan border tebal, tanpa transparansi/blur — kontras dengan tren "glassmorphism".
- **Avatar Pemain:** Bentuk kotak/persegi dengan border tebal (bukan lingkaran halus) untuk konsistensi dengan gaya brutalist; turn-timer ditampilkan sebagai bar/progress kotak, bukan ring melingkar.
- **Spacing:** Kelipatan 8px, elemen ditata dengan grid yang jelas dan tegas — brutalism menghargai keteraturan struktural walau warnanya berani.

## Animasi & Feedback Visual
- Minimalkan easing halus — gunakan gerakan cepat dan tegas (mis. `ease-out` singkat 150–250ms) sesuai jiwa "raw/direct" dari brutalism, bukan animasi yang terlalu smooth/mendayu.
- Floating score text: muncul cepat, sedikit "snap" di awal (scale overshoot kecil), lalu fade out singkat (~600ms) — tanpa efek glow/blur.
- Banner babak ("BABAK 1"): slide-in tegas dari samping/atas dengan hard stop, bukan fade lembut.
- Turn indicator: bar/border berkedip solid (on/off tanpa gradasi opacity halus) — bukan pulsing glow.
- Transisi antar scene: cut atau slide cepat, hindari cross-fade panjang yang terkesan "lembut".

## Code Architecture Standard
- **Naming Convention:** PascalCase untuk class/Scene Phaser (`GameplayScene`, `BoardManager`), camelCase untuk fungsi/variabel (`calculateBonusScore`), UPPER_SNAKE_CASE untuk konstanta aturan (`MAX_HAND_SIZE`).
- **File Structure:**
  ```
  src/
    engine/        # rules engine murni (tidak import Phaser)
      board.ts
      scoring.ts
      turn.ts
    scenes/        # Phaser scenes
    ui/            # komponen UI reusable (HUD, avatar, card sprite)
    network/       # client Colyseus, event handlers
    server/        # room logic, validasi server-side
    types/         # shared types (Tile, PlayerState, dst)
  ```
- **State Management:** Gunakan satu `GameStateManager` terpusat untuk data yang dibawa lintas Scene (skor, ranking, sisa peserta) — jangan simpan di Scene individual.
- **Separation of Concerns:** Rules engine (`engine/`) tidak boleh mengimpor apa pun dari Phaser — ini yang memungkinkan logic yang sama dipakai di server untuk validasi anti-cheat.
- **Responsiveness:** Mobile-first, desain untuk landscape 16:9 dahulu, baru sesuaikan untuk tablet/desktop dengan scaling Phaser (`Scale.FIT` atau `Scale.RESIZE`).
