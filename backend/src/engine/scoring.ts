// ============================================================
// engine/scoring.ts
// Kalkulasi poin: kondisi kemenangan normal, kondisi Buntu/Gaple,
// dan bonus skor (Double/Triple/Kuartet - belum dikunci, TODO).
// PURE: Tidak mengimpor apa pun dari Phaser atau library UI.
// ============================================================

import { GameState, RoundResult } from "../types";
import { countTotalPips } from "./deck";

/**
 * Memeriksa apakah kondisi "Buntu/Gaple" sudah terjadi.
 * Buntu terjadi saat semua pemain pass berturut-turut sebanyak jumlah pemain
 * (artinya tidak ada satu pun yang bisa jalan dalam satu putaran penuh).
 */
export function isBuntu(state: GameState): boolean {
  return state.consecutivePassCount >= state.players.length;
}

/**
 * Memeriksa apakah ada pemain yang sudah menghabiskan seluruh kartunya
 * (kondisi kemenangan normal).
 *
 * @returns PlayerState pemenang, atau null jika belum ada
 */
export function checkNormalWin(state: GameState) {
  return state.players.find((p) => p.hand.length === 0) ?? null;
}

/**
 * Menghitung hasil akhir ronde untuk kondisi normal (ada yang kartunya habis).
 */
export function resolveNormalWin(state: GameState): RoundResult {
  const winner = checkNormalWin(state);
  if (!winner) {
    throw new Error("resolveNormalWin dipanggil tanpa pemenang yang valid.");
  }

  const playerScores: Record<string, number> = {};
  for (const player of state.players) {
    playerScores[player.id] = countTotalPips(player.hand);
  }

  return {
    winnerId: winner.id,
    winType: "normal",
    playerScores,
    description: `${winner.name} menang! Semua kartu berhasil diturunkan.`,
  };
}

/**
 * Menghitung hasil akhir ronde untuk kondisi Buntu/Gaple.
 * Pemenang adalah pemain dengan jumlah titik (pip) paling SEDIKIT di tangan.
 * Jika seri, pemenang adalah pemain yang giliran seharusnya jalan berikutnya (posisi paling awal).
 */
export function resolveBuntu(state: GameState): RoundResult {
  const playerScores: Record<string, number> = {};
  for (const player of state.players) {
    playerScores[player.id] = countTotalPips(player.hand);
  }

  // Urutkan berdasarkan poin (ascending), seri dipecah berdasarkan urutan giliran
  const sorted = [...state.players].sort((a, b) => {
    const scoreDiff = playerScores[a.id] - playerScores[b.id];
    if (scoreDiff !== 0) return scoreDiff;
    // Jika seri, pemain yang lebih dekat ke giliran saat ini menang
    const aIdx = state.players.indexOf(a);
    const bIdx = state.players.indexOf(b);
    return aIdx - bIdx;
  });

  const winner = sorted[0];

  return {
    winnerId: winner.id,
    winType: "buntu",
    playerScores,
    description: `GAPLE/BUNTU! ${winner.name} menang dengan titik terkecil (${playerScores[winner.id]} titik).`,
  };
}

// =============================================================
// TODO: Bonus Skor (Double, Triple, Kuartet)
// Aturan dan formula poin bonus belum dikonfirmasi.
// Akan diimplementasikan setelah aturan resmi ditetapkan.
// =============================================================

/**
 * (PLACEHOLDER) Memeriksa apakah kondisi bonus terjadi setelah sebuah kartu turun.
 * Kondisi bonus (Double/Triple/Kuartet) adalah saat beberapa pemain berturut-turut
 * tidak bisa jalan, lalu satu pemain berhasil memblokir total.
 *
 * @todo Implementasikan setelah formula bonus dikonfirmasi.
 */
export function checkBonusCondition(_state: GameState): null {
  // TODO: implementasi kalkulasi bonus Double/Triple/Kuartet
  return null;
}
