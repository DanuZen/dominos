// ============================================================
// types/index.ts
// Semua tipe data inti untuk proyek Domino Tournament Game.
// Digunakan bersama oleh engine/, scenes/, dan network/.
// ============================================================

/** Representasi satu kartu domino */
export interface Tile {
  leftValue: number;  // Nilai sisi kiri (0-6)
  rightValue: number; // Nilai sisi kanan (0-6)
  isBalak: boolean;   // True jika leftValue === rightValue (kartu kembar)
}

/** Sisi/ujung kartu di meja yang bisa ditempel */
export type BoardEdge = "left" | "right";

/** Sebuah kartu yang sudah diletakkan di meja, beserta orientasinya */
export interface PlacedTile {
  tile: Tile;
  /** Nilai yang menghadap ke kiri di papan */
  exposedLeft: number;
  /** Nilai yang menghadap ke kanan di papan */
  exposedRight: number;
}

/** State satu pemain */
export interface PlayerState {
  id: string;
  name: string;
  hand: Tile[];        // Kartu di tangan pemain
  score: number;       // Poin akumulatif
  hasPassedLastTurn: boolean; // Apakah pemain ini pass di giliran terakhirnya
}

/** State penuh papan permainan */
export interface BoardState {
  placedTiles: PlacedTile[]; // Semua kartu yang sudah turun di meja, berurutan
  leftEdgeValue: number;     // Nilai ujung kiri papan (tempat tempel baru)
  rightEdgeValue: number;    // Nilai ujung kanan papan (tempat tempel baru)
  rootIndex: number;         // Index tile pertama yang diletakkan (untuk layout)
}

/** Status permainan saat ini */
export type GameStatus =
  | "waiting"      // Menunggu pemain/mulai
  | "first_move"   // Giliran pembuka (wajib balak)
  | "playing"      // Permainan berlangsung normal
  | "finished";    // Permainan selesai

/** Hasil akhir sebuah ronde */
export type WinType = "normal" | "buntu";

export interface RoundResult {
  winnerId: string;
  winType: WinType;
  playerScores: Record<string, number>; // ID pemain -> total titik sisa
  description: string;
  multiplierType?: "Quartet" | "Triple" | "Double";
  multiplierValue?: number;
  pointsDelta?: Record<string, number>; // Perubahan skor akhir setiap pemain
}

/** State permainan secara keseluruhan */
export interface GameState {
  players: PlayerState[];
  board: BoardState;
  currentTurnIndex: number;  // Index di array players
  status: GameStatus;
  consecutivePassCount: number; // Penghitung pass berurutan (untuk deteksi buntu)
  roundPoints: number; // Poin dasar per ronde (mis. 60)
  lastPlayedTile?: Tile; // Kartu terakhir yang diletakkan
}
