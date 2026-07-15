// ============================================================
// engine/turn.ts
// Manajemen giliran: pergantian pemain, deteksi pass,
// inisialisasi giliran pertama (dengan aturan wajib balak).
// PURE: Tidak mengimpor apa pun dari Phaser atau library UI.
// ============================================================

import { GameState, PlayerState } from "../types";
import { getPlayableTiles } from "./board";

/**
 * Mengembalikan index pemain berikutnya (berputar searah jarum jam).
 */
export function getNextPlayerIndex(
  currentIndex: number,
  totalPlayers: number
): number {
  return (currentIndex + 1) % totalPlayers;
}

/**
 * Menentukan index pemain yang berhak jalan pertama.
 * Aturan:
 * 1. Pemain pertama dipilih SECARA ACAK.
 * 2. Pemain pertama WAJIB memiliki kartu balak.
 * 3. Jika pemain yang terpilih tidak punya balak, giliran DIALIHKAN ke pemain
 *    berikutnya secara otomatis TANPA DENDA, sampai ditemukan yang punya balak.
 *
 * @returns Index pemain yang akan jalan pertama, atau -1 jika tidak ada yang punya balak (kasus ekstrem).
 */
export function determineFirstPlayer(players: PlayerState[]): number {
  const startIndex = Math.floor(Math.random() * players.length);

  for (let i = 0; i < players.length; i++) {
    const candidateIndex = (startIndex + i) % players.length;
    const candidate = players[candidateIndex];
    const hasBalak = candidate.hand.some((tile) => tile.isBalak);
    if (hasBalak) {
      return candidateIndex;
    }
  }

  // Kasus ekstrem: tidak ada pemain yang punya balak (teoritis tidak mungkin
  // dengan 28 kartu standar karena ada 7 balak untuk 4 pemain @7 kartu).
  // Fallback: kembalikan startIndex untuk mencegah game freeze.
  return startIndex;
}

/**
 * Memeriksa apakah pemain saat ini harus melakukan "Pass" (tidak punya kartu valid).
 * Pass terjadi saat tidak ada satu pun kartu di tangan yang bisa dimainkan.
 */
export function mustPass(state: GameState): boolean {
  const currentPlayer = state.players[state.currentTurnIndex];
  const playable = getPlayableTiles(
    currentPlayer.hand,
    state.board,
    state.status === "first_move"
  );
  return playable.length === 0;
}

/**
 * Memproses aksi Pass untuk pemain saat ini.
 * Menandai pemain sebagai sudah pass, menambah counter pass berurutan,
 * lalu beralih ke pemain berikutnya.
 * CATATAN: Transfer poin untuk kondisi pass masih menunggu konfirmasi aturan (TODO).
 *
 * @returns GameState baru setelah pass diproses
 */
export function processPass(state: GameState): GameState {
  const penalty = Math.floor(state.roundPoints / 2); // Misal 60 / 2 = 30
  
  // Cari pemain terakhir yang meletakkan kartu (yang tidak pass)
  let receiverIndex = (state.currentTurnIndex - 1 + state.players.length) % state.players.length;
  while (state.players[receiverIndex].hasPassedLastTurn && receiverIndex !== state.currentTurnIndex) {
    receiverIndex = (receiverIndex - 1 + state.players.length) % state.players.length;
  }

  const newPlayers = state.players.map((p, i) => {
    if (i === state.currentTurnIndex) {
      return { ...p, hasPassedLastTurn: true, score: p.score - penalty };
    }
    if (i === receiverIndex) {
      return { ...p, score: p.score + penalty };
    }
    return p;
  });

  return {
    ...state,
    players: newPlayers,
    currentTurnIndex: getNextPlayerIndex(
      state.currentTurnIndex,
      state.players.length
    ),
    consecutivePassCount: state.consecutivePassCount + 1,
  };
}

/**
 * Mereset flag hasPassedLastTurn untuk semua pemain (dipanggil setiap kali ada kartu yang turun).
 */
export function resetPassFlags(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({ ...p, hasPassedLastTurn: false })),
    consecutivePassCount: 0,
  };
}
