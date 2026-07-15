// ============================================================
// engine/bot.ts
// Logika Bot AI untuk mode Single-Player (vs Bot).
// Strategi MVP: Pilih kartu terbaik dari tangan berdasarkan
// beberapa heuristik sederhana (bukan random murni).
// PURE: Tidak mengimpor apa pun dari Phaser atau library UI.
// ============================================================

import { GameState, Tile } from "../types";
import { getCurrentPlayableTiles } from "./game";
import { getValidEdge } from "./board";

/** Tingkat kesulitan Bot */
export type BotDifficulty = "easy" | "medium";

/**
 * Bot AI: Pilih kartu mana yang akan dimainkan.
 * Mengembalikan Tile yang dipilih, atau null jika harus Pass.
 *
 * @param state - State permainan saat ini
 * @param difficulty - Tingkat kesulitan bot
 */
export function chooseBotTile(
  state: GameState,
  difficulty: BotDifficulty = "easy"
): Tile | null {
  const playable = getCurrentPlayableTiles(state);

  if (playable.length === 0) return null; // Harus Pass

  switch (difficulty) {
    case "easy":
      return chooseTileEasy(playable);
    case "medium":
      return chooseTileMedium(playable, state);
    default:
      return chooseTileEasy(playable);
  }
}

/**
 * Strategi EASY: Pilih kartu valid secara acak.
 * Tidak ada pertimbangan taktis — cocok untuk tutorial/latihan.
 */
function chooseTileEasy(playable: Tile[]): Tile {
  const idx = Math.floor(Math.random() * playable.length);
  return playable[idx];
}

/**
 * Strategi MEDIUM: Pilih kartu dengan nilai pip tertinggi terlebih dahulu.
 * Logika: membuang kartu berpoin besar lebih awal mengurangi risiko kalah di kondisi Buntu.
 * Prioritas tambahan: kartu balak (kembar) dimainkan duluan jika pip-nya besar.
 */
function chooseTileMedium(playable: Tile[], state: GameState): Tile {
  // Hitung nilai pip total tiap kartu (heuristik: buang yang paling besar dulu)
  const scored = playable.map((tile) => {
    const pipValue = tile.leftValue + tile.rightValue;
    // Bonus sedikit untuk balak agar tidak ditumpuk terlalu lama
    const balakBonus = tile.isBalak ? 1 : 0;
    return { tile, score: pipValue + balakBonus };
  });

  // Urutkan descending (pip terbesar duluan)
  scored.sort((a, b) => b.score - a.score);
  return scored[0].tile;
}

/**
 * Menentukan sisi mana kartu Bot akan diletakkan.
 * Jika kartu bisa di keduanya, pilih sisi kanan (default konvensi).
 * Bisa dikustomisasi untuk strategi lebih lanjut di masa depan.
 */
export function chooseBotEdge(
  tile: Tile,
  state: GameState
): "left" | "right" | "both" {
  const isFirstMove = state.status === "first_move";
  const edge = getValidEdge(tile, state.board, isFirstMove);

  if (edge === "both") return isFirstMove ? "both" : "right";
  if (edge === "left") return "left";
  if (edge === "right") return "right";

  // Fallback (tidak seharusnya terjadi jika chooseBotTile sudah benar)
  return "right";
}
