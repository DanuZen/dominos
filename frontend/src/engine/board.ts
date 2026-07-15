// ============================================================
// engine/board.ts
// Logika papan permainan: meletakkan kartu, validasi ujung,
// dan menentukan ujung kiri/kanan aktif.
// PURE: Tidak mengimpor apa pun dari Phaser atau library UI.
// ============================================================

import { Tile, BoardState, BoardEdge, PlacedTile } from "../types";

/**
 * Membuat state papan yang kosong untuk awal permainan.
 */
export function createEmptyBoard(): BoardState {
  return {
    placedTiles: [],
    leftEdgeValue: -1,  // -1 berarti papan kosong
    rightEdgeValue: -1,
    rootIndex: 0,
  };
}

/**
 * Memeriksa apakah sebuah kartu bisa diletakkan di papan saat ini.
 * Mengembalikan sisi (BoardEdge) yang valid, atau null jika tidak bisa dimainkan.
 *
 * @param tile - Kartu yang ingin dimainkan
 * @param board - State papan saat ini
 * @param isFirstMove - True jika ini adalah langkah pembuka permainan
 */
export function getValidEdge(
  tile: Tile,
  board: BoardState,
  isFirstMove: boolean
): BoardEdge | "both" | null {
  // --- Aturan Langkah Pertama ---
  if (isFirstMove) {
    // Wajib balak. Jika tidak balak, tidak bisa dimainkan.
    if (!tile.isBalak) return null;
    return "both"; // Kartu pertama tidak punya sisi, menginisialisasi kedua ujung
  }

  // --- Validasi Langkah Normal ---
  const { leftEdgeValue, rightEdgeValue } = board;
  const canMatchLeft =
    tile.leftValue === leftEdgeValue || tile.rightValue === leftEdgeValue;
  const canMatchRight =
    tile.leftValue === rightEdgeValue || tile.rightValue === rightEdgeValue;

  if (canMatchLeft && canMatchRight) return "both"; // Bisa di keduanya
  if (canMatchLeft) return "left";
  if (canMatchRight) return "right";
  return null; // Tidak cocok dengan ujung manapun
}

/**
 * Mendaftarkan kartu yang diletakkan ke sisi tertentu di papan.
 * Mengembalikan BoardState baru (immutable update).
 *
 * @param board - State papan sebelumnya
 * @param tile - Kartu yang diletakkan
 * @param edge - Sisi mana kartu diletakkan ("left" | "right" | "both" untuk pembuka)
 */
export function placeTileOnBoard(
  board: BoardState,
  tile: Tile,
  edge: BoardEdge | "both"
): BoardState {
  const newBoard = { ...board, placedTiles: [...board.placedTiles] };

  if (edge === "both") {
    // Kartu pembuka permainan
    const placed: PlacedTile = {
      tile,
      exposedLeft: tile.leftValue,
      exposedRight: tile.rightValue,
    };
    newBoard.placedTiles.push(placed);
    // Untuk kartu balak, kedua sisi nilainya sama
    newBoard.leftEdgeValue = tile.leftValue;
    newBoard.rightEdgeValue = tile.rightValue;
    return newBoard;
  }

  if (edge === "left") {
    // Orientasi: pastikan nilai yang cocok menjadi sisi "dalam" (menyambung)
    const faceValue = board.leftEdgeValue;
    let exposedLeft: number;
    let exposedRight: number;

    if (tile.rightValue === faceValue) {
      // [?|faceValue] menyambung ke kiri, ujung kiri baru = tile.leftValue
      exposedLeft = tile.leftValue;
      exposedRight = tile.rightValue;
    } else {
      // [faceValue|?] menyambung ke kiri (dibalik), ujung kiri baru = tile.rightValue
      exposedLeft = tile.rightValue;
      exposedRight = tile.leftValue;
    }

    newBoard.placedTiles.unshift({ tile, exposedLeft, exposedRight });
    newBoard.leftEdgeValue = exposedLeft;
    newBoard.rootIndex++; // Karena array di-unshift, index root geser ke kanan
    return newBoard;
  }

  if (edge === "right") {
    const faceValue = board.rightEdgeValue;
    let exposedLeft: number;
    let exposedRight: number;

    if (tile.leftValue === faceValue) {
      // [faceValue|?] menyambung ke kanan, ujung kanan baru = tile.rightValue
      exposedLeft = tile.leftValue;
      exposedRight = tile.rightValue;
    } else {
      // [?|faceValue] menyambung ke kanan (dibalik), ujung kanan baru = tile.leftValue
      exposedLeft = tile.rightValue;
      exposedRight = tile.leftValue;
    }

    newBoard.placedTiles.push({ tile, exposedLeft, exposedRight });
    newBoard.rightEdgeValue = exposedRight;
    return newBoard;
  }

  return newBoard;
}

/**
 * Mengembalikan daftar semua kartu dari tangan pemain yang bisa dimainkan
 * berdasarkan kondisi papan saat ini.
 */
export function getPlayableTiles(
  hand: Tile[],
  board: BoardState,
  isFirstMove: boolean
): Tile[] {
  return hand.filter(
    (tile) => getValidEdge(tile, board, isFirstMove) !== null
  );
}
