// ============================================================
// engine/deck.ts
// Pembuatan, pengocokan, dan distribusi kartu domino.
// PURE: Tidak mengimpor apa pun dari Phaser atau library UI.
// ============================================================

import { Tile } from "../types";

/**
 * Membuat 1 set lengkap kartu domino standar (28 kartu, dari [0|0] hingga [6|6]).
 */
export function generateDeck(): Tile[] {
  const deck: Tile[] = [];
  for (let left = 0; left <= 6; left++) {
    for (let right = left; right <= 6; right++) {
      deck.push({
        leftValue: left,
        rightValue: right,
        isBalak: left === right,
      });
    }
  }
  return deck; // Total: 28 kartu
}

/**
 * Mengocok array kartu menggunakan algoritma Fisher-Yates Shuffle.
 * Memodifikasi array asli dan mengembalikannya.
 */
export function shuffle(deck: Tile[]): Tile[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Membagikan kartu ke sejumlah pemain.
 * @param deck - Deck yang sudah dikocok
 * @param playerCount - Jumlah pemain (harus 4 untuk permainan standar)
 * @param tilesPerPlayer - Jumlah kartu per pemain (default 7)
 * @returns Array of Tile[] untuk setiap pemain
 */
export function dealTiles(
  deck: Tile[],
  playerCount: number = 4,
  tilesPerPlayer: number = 7
): Tile[][] {
  const totalNeeded = playerCount * tilesPerPlayer;
  if (deck.length < totalNeeded) {
    throw new Error(
      `Deck tidak cukup. Butuh ${totalNeeded}, hanya ada ${deck.length} kartu.`
    );
  }

  const hands: Tile[][] = [];
  const workingDeck = [...deck]; // Buat salinan agar deck asli tidak termutasi

  for (let i = 0; i < playerCount; i++) {
    hands.push(workingDeck.splice(0, tilesPerPlayer));
  }

  return hands;
}

/**
 * Menghitung total titik/pip dari satu set kartu.
 * Digunakan untuk menentukan pemenang kondisi Buntu.
 */
export function countTotalPips(tiles: Tile[]): number {
  return tiles.reduce(
    (total, tile) => total + tile.leftValue + tile.rightValue,
    0
  );
}
