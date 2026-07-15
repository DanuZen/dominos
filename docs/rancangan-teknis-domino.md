# Rancangan Teknis Domino Tournament

Dokumen ini berisi cetak biru teknis untuk implementasi *Rules Engine*, arsitektur *State Multiplayer* via Colyseus, Skema Database, serta Struktur Komponen Phaser. Dokumen ini adalah turunan teknis dari `PRD.md` dan harus dijadikan referensi utama bagi tim pengembang.

---

## 1. Skema Database (PostgreSQL)

Database digunakan untuk persistensi data pengguna, rekam jejak turnamen, dan klasemen.

### Tabel `users`
- `id` (UUID, Primary Key)
- `username` (Varchar, Unique)
- `password_hash` (Varchar)
- `avatar_url` (Varchar, nullable)
- `chips` (Integer, default 1000)
- `created_at` (Timestamp)

### Tabel `tournaments`
- `id` (UUID, Primary Key)
- `title` (Varchar)
- `status` (Enum: 'registering', 'ongoing', 'completed')
- `total_players` (Integer, misal 48/64)
- `start_time` (Timestamp)

### Tabel `matches`
- `id` (UUID, Primary Key)
- `tournament_id` (UUID, Foreign Key)
- `round_number` (Integer)
- `player_ids` (Array of UUID, maks 4)
- `winner_id` (UUID, nullable)
- `scores` (JSONB, menyimpan poin akhir per pemain)
- `status` (Enum: 'waiting', 'playing', 'finished')

---

## 2. Skema State Colyseus (Multiplayer Sync)

Data State ini adalah data yang disinkronisasi setiap milidetik antara Node.js Server dan Klien (Phaser).

```typescript
import { Schema, ArraySchema, MapSchema, type } from "@colyseus/schema";

class Tile extends Schema {
    @type("number") leftValue: number;
    @type("number") rightValue: number;
    @type("boolean") isBalak: boolean;
}

class PlayerState extends Schema {
    @type("string") id: string;
    @type("string") username: string;
    @type("number") chips: number;
    @type("number") remainingTilesCount: number; // Untuk disinkronkan ke lawan
    @type("number") score: number;
    @type([ Tile ]) hand: ArraySchema<Tile>; // Hanya dikirim ke klien yang bersangkutan lewat fitur filter Colyseus
}

class GameState extends Schema {
    @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
    @type("string") currentTurn: string; // Player ID yang sedang giliran
    @type("number") turnTimeRemaining: number;
    @type([ Tile ]) boardTiles = new ArraySchema<Tile>();
    @type("number") leftEdgeValue: number;
    @type("number") rightEdgeValue: number;
    @type("string") status: string; // 'waiting', 'playing', 'finished'
}
```

---

## 3. Pseudo-Code Rules Engine

Logika inti yang dijalankan oleh server (Colyseus) dan klien (untuk validasi awal & mode Bot).
Semua fungsi ini berada di `/engine/` dan murni Typescript/Javascript (tanpa import Phaser).

### A. Persiapan dan Distribusi Kartu
```javascript
function initializeGame(players) {
    // 1. Buat 28 kartu domino standar (0-0 hingga 6-6)
    let deck = generateDominoDeck(); 
    
    // 2. Kocok kartu
    shuffle(deck);
    
    // 3. Distribusi 7 kartu ke masing-masing pemain (4 pemain * 7 = 28 kartu pas)
    for (let player of players) {
        player.hand = deck.popMultiple(7);
    }
    
    // 4. Tentukan giliran pertama secara Acak (RANDOM)
    state.currentTurn = getRandomPlayer(players);
    state.isFirstMove = true;
}
```

### B. Validasi Langkah (Placing a Tile)
```javascript
function canPlayTile(tile, state) {
    if (state.boardTiles.length === 0) {
        // Aturan Khusus: Langkah pertama WAJIB Balak (Kembar).
        // Jika pemain yang ditunjuk tidak memiliki kartu balak sama sekali,
        // giliran DIALIHKAN ke pemain berikutnya secara otomatis TANPA DENDA.
        // Ini terus berputar sampai ditemukan pemain yang memegang kartu balak.
        if (state.isFirstMove && !tile.isBalak) return false;
        return true; 
    }
    
    // Validasi ujung
    return tile.leftValue === state.leftEdgeValue || tile.rightValue === state.rightEdgeValue 
        || tile.rightValue === state.leftEdgeValue || tile.leftValue === state.rightEdgeValue;
}
```

### C. Kondisi Buntu / Gaple & Kemenangan Biasa
```javascript
function checkWinCondition(state) {
    // 1. Cek apakah ada yang kartunya habis (Kemenangan Biasa)
    for (let player of state.players) {
        if (player.hand.length === 0) {
            return { winner: player, type: 'normal' };
        }
    }
    
    // 2. Cek Kondisi Buntu / Gaple (Semua pemain berturut-turut Pass karena tidak ada yang cocok dengan kedua ujung)
    let allPlayersBlocked = checkAllBlocked(state);
    
    if (allPlayersBlocked) {
        // Aturan Khusus: Menghitung jumlah titik di kartu (pip) yang tersisa.
        // Pemenang adalah yang paling SEDIKIT titiknya.
        let winner = null;
        let minDots = Infinity;
        
        for (let player of state.players) {
            let totalDots = sumDots(player.hand);
            if (totalDots < minDots) {
                minDots = totalDots;
                winner = player;
            }
        }
        return { winner: winner, type: 'buntu', details: 'Poin pip terkecil menang' };
    }
    
    return null; // Belum ada yang menang
}
```

### D. Edge-Cases / TODOs untuk *Rules Engine*
Ada beberapa logika sekunder yang masih menunggu keputusan bisnis:
1. **Denda Lewat/Pass:** PRD mencatat adanya *transfer poin ke lawan penyebab blokir* jika seorang pemain terpaksa melakukan 'Pass' (tidak punya kartu). Nominal dan cara kalkulasinya masih berstatus `TODO`.
2. **Kondisi Langkah Pertama Tanpa Balak:** Pemain yang ditunjuk jalan duluan (secara random) mungkin tidak memegang kartu balak sama sekali di tangannya (walau probabilitasnya kecil). Aturan khusus ini berstatus `TODO`.
3. **Rumus Bonus:** Kalkulasi matematis untuk poin bonus (Kuartet, Triple, Double) berstatus `TODO` sebelum turnamen dimulai.

---

## 4. Hierarki Component Tree (Phaser 3)

Berikut adalah struktur hirarki objek visual (DisplayList) saat scene `GameplayScene` berjalan:

```text
Game
 └── GameplayScene (Scene)
      ├── BackgroundImage
      ├── BoardManager (Container)
      │    └── DominoTileSprite (GameObject Array) - Kartu-kartu yang sudah turun di meja
      ├── PlayerHand (Container) 
      │    ├── Area Tangan (Zone)
      │    └── DominoTileSprite (GameObject Array) - Kartu milik pemain (bisa di-drag/tap)
      ├── OpponentHUD_Left (Container)
      │    ├── AvatarBox
      │    ├── TurnTimerBar
      │    └── RemainingCardsIndicator (Tumpukan tertutup + Angka)
      ├── OpponentHUD_Top (Container)
      │    └── ...
      ├── OpponentHUD_Right (Container)
      │    └── ...
      └── UIOverlay (Container)
           ├── FloatingScoreText (Dinamic text +/-, akan ter-destroy sendiri)
           ├── RoundBanner ("BABAK 1" dst, slide in/out)
           └── IntermissionPanel (Tampil saat game selesai/mencari musuh)
```

**Catatan Khusus untuk DominoTileSprite:**
- Seluruh `DominoTileSprite` menerima parameter `skinId` (seperti yang dijabarkan di `StyleGuide.md`).
- Komponen ini tidak memuat gaya *Brutalist*, melainkan gaya klasik default.

---
*Dokumen ini merupakan panduan teknis yang hidup (living document) dan akan diperbarui setiap fase yang berhubungan diselesaikan.*
