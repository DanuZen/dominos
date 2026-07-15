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

  const { leftEdgeValue, rightEdgeValue } = state.board;
  let multiplier: "Quartet" | "Triple" | "Double" = "Double";
  let multiplierValue = 2;

  // Cek Kuartet: Ujung kiri dan ujung kanan papan bernilai sama
  if (leftEdgeValue !== -1 && leftEdgeValue === rightEdgeValue) {
    multiplier = "Quartet";
    multiplierValue = 4;
  } 
  // Cek Triple: Kartu terakhir adalah Balak
  else if (state.lastPlayedTile && state.lastPlayedTile.isBalak) {
    multiplier = "Triple";
    multiplierValue = 3;
  }
  // Default: Double
  else {
    multiplier = "Double";
    multiplierValue = 2;
  }

  const basePenalty = state.roundPoints * multiplierValue; // Misal 60 * 2 = 120 per pemain kalah

  const playerScores: Record<string, number> = {};
  const pointsDelta: Record<string, number> = {};
  
  let winnerTotalGain = 0;

  for (const player of state.players) {
    // playerScores hanya melacak sisa pip (kalau mau ditampilkan)
    playerScores[player.id] = countTotalPips(player.hand);

    if (player.id !== winner.id) {
      pointsDelta[player.id] = -basePenalty;
      winnerTotalGain += basePenalty;
    }
  }

  pointsDelta[winner.id] = winnerTotalGain;

  // Lakukan update mutasi pada state pemain yang dikembalikan di luar (opsional, tapi idealnya di apply oleh game loop/di return delta)
  // Untuk game.ts playTile(), saat ini hanya menyimpan RoundResult. Poin akan diupdate ke pemain nanti di UI/Server lewat delta.

  return {
    winnerId: winner.id,
    winType: "normal",
    playerScores,
    pointsDelta,
    multiplierType: multiplier,
    multiplierValue: multiplierValue,
    description: `${winner.name} memenangkan babak dengan ${multiplier}!`,
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

  let winnerId = state.players[0].id;
  let minPips = Infinity;
  // Urutan iterasi penting: mulai dari currentTurnIndex (yang seharusnya jalan berikutnya jika tidak buntu)
  for (let i = 0; i < state.players.length; i++) {
    const idx = (state.currentTurnIndex + i) % state.players.length;
    const player = state.players[idx];
    if (playerScores[player.id] < minPips) {
      minPips = playerScores[player.id];
      winnerId = player.id;
    }
  }

  const basePenalty = state.roundPoints; // 1x untuk Buntu
  const pointsDelta: Record<string, number> = {};
  let winnerTotalGain = 0;

  for (const player of state.players) {
    if (player.id !== winnerId) {
      pointsDelta[player.id] = -basePenalty;
      winnerTotalGain += basePenalty;
    }
  }
  pointsDelta[winnerId] = winnerTotalGain;

  const winnerPlayer = state.players.find((p) => p.id === winnerId)!;

  return {
    winnerId,
    winType: "buntu",
    playerScores,
    pointsDelta,
    description: `Buntu! ${winnerPlayer.name} menang dengan sisa pip terkecil (${minPips}).`,
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
