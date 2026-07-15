// ============================================================
// engine/game.ts
// Orkestrator utama Rules Engine: menginisialisasi permainan,
// memproses setiap aksi pemain, dan memeriksa kondisi akhir.
// Ini adalah API utama yang dikonsumsi oleh UI (Phaser) dan
// Server (Colyseus) untuk mengontrol alur permainan.
// PURE: Tidak mengimpor apa pun dari Phaser atau library UI.
// ============================================================

import { GameState, Tile, PlayerState, RoundResult } from "../types";
import { generateDeck, shuffle, dealTiles } from "./deck";
import { createEmptyBoard, placeTileOnBoard, getValidEdge, getPlayableTiles } from "./board";
import { determineFirstPlayer, processPass, resetPassFlags, mustPass, getNextPlayerIndex } from "./turn";
import { checkNormalWin, isBuntu, resolveNormalWin, resolveBuntu } from "./scoring";

/** Hasil dari setiap aksi pemain */
export type ActionResult =
  | { success: true; nextState: GameState; roundResult?: RoundResult }
  | { success: false; error: string };

/**
 * Menginisialisasi satu ronde permainan baru dengan pemain yang diberikan.
 * Mengocok kartu, membagi 7 kartu per pemain, dan menentukan siapa yang jalan pertama.
 *
 * @param playerIds - Array berisi ID pemain (tepat 4)
 * @param playerNames - Array berisi nama pemain, sesuai urutan playerIds
 */
export function initializeGame(
  playerIds: string[],
  playerNames: string[],
  initialScores?: Record<string, number>
): GameState {
  if (playerIds.length !== 4) {
    throw new Error("Permainan domino membutuhkan tepat 4 pemain.");
  }

  const deck = shuffle(generateDeck());
  const hands = dealTiles(deck, 4, 7);

  const players: PlayerState[] = playerIds.map((id, i) => ({
    id,
    name: playerNames[i],
    hand: hands[i],
    score: initialScores?.[id] ?? 0,
    hasPassedLastTurn: false,
  }));

  const firstPlayerIndex = determineFirstPlayer(players);

  return {
    players,
    board: createEmptyBoard(),
    currentTurnIndex: firstPlayerIndex,
    status: "first_move",
    consecutivePassCount: 0,
  };
}

/**
 * Aksi: Pemain meletakkan kartu.
 * Memvalidasi kartu, memperbarui papan, menghapus kartu dari tangan pemain,
 * memeriksa kondisi menang, lalu beralih ke giliran berikutnya.
 *
 * @param state - State permainan saat ini
 * @param playerId - ID pemain yang melakukan aksi
 * @param tile - Kartu yang ingin dimainkan
 */
export function playTile(
  state: GameState,
  playerId: string,
  tile: Tile,
  preferredEdge?: "left" | "right"
): ActionResult {
  const currentPlayer = state.players[state.currentTurnIndex];

  // Validasi giliran
  if (currentPlayer.id !== playerId) {
    return { success: false, error: "Bukan giliran Anda." };
  }

  const isFirstMove = state.status === "first_move";

  // Validasi kartu ada di tangan pemain
  const tileIndex = currentPlayer.hand.findIndex(
    (t) => t.leftValue === tile.leftValue && t.rightValue === tile.rightValue
  );
  if (tileIndex === -1) {
    return { success: false, error: "Kartu tidak ada di tangan Anda." };
  }

  // Validasi apakah kartu bisa dimainkan di papan
  const validEdge = getValidEdge(tile, state.board, isFirstMove);
  if (validEdge === null) {
    return { success: false, error: "Kartu tidak cocok dengan ujung papan." };
  }

  // Tentukan sisi yang dipilih:
  // - Langkah pertama: selalu "both"
  // - Bisa keduanya: gunakan preferredEdge dari UI, default "right"
  // - Hanya satu sisi: gunakan sisi yang valid
  let chosenEdge: "left" | "right" | "both";
  if (isFirstMove) {
    chosenEdge = "both";
  } else if (validEdge === "both") {
    chosenEdge = preferredEdge ?? "right";
  } else {
    chosenEdge = validEdge as "left" | "right";
  }
  const newBoard = placeTileOnBoard(state.board, tile, chosenEdge);

  // Hapus kartu dari tangan pemain
  const newHand = [...currentPlayer.hand];
  newHand.splice(tileIndex, 1);
  const updatedPlayer: PlayerState = { ...currentPlayer, hand: newHand };

  // Update state pemain
  const newPlayers = state.players.map((p, i) =>
    i === state.currentTurnIndex ? updatedPlayer : p
  );

  let newState: GameState = resetPassFlags({
    ...state,
    players: newPlayers,
    board: newBoard,
    currentTurnIndex: getNextPlayerIndex(state.currentTurnIndex, state.players.length),
    status: isFirstMove ? "playing" : "playing",
  });

  // Periksa kondisi menang normal (tangan kosong)
  const winner = checkNormalWin(newState);
  if (winner) {
    newState = { ...newState, status: "finished" };
    return {
      success: true,
      nextState: newState,
      roundResult: resolveNormalWin(newState),
    };
  }

  return { success: true, nextState: newState };
}

/**
 * Aksi: Pemain melakukan Pass (tidak punya kartu valid).
 * Memvalidasi bahwa pemain memang tidak bisa jalan, lalu
 * memproses pass dan memeriksa kondisi Buntu.
 *
 * @param state - State permainan saat ini
 * @param playerId - ID pemain yang melakukan pass
 */
export function doPass(
  state: GameState,
  playerId: string
): ActionResult {
  const currentPlayer = state.players[state.currentTurnIndex];

  if (currentPlayer.id !== playerId) {
    return { success: false, error: "Bukan giliran Anda." };
  }

  // Pastikan pemain memang tidak bisa jalan
  if (!mustPass(state)) {
    return {
      success: false,
      error: "Anda masih memiliki kartu yang bisa dimainkan. Tidak bisa Pass.",
    };
  }

  const newState = processPass(state);

  // Periksa kondisi Buntu setelah pass
  if (isBuntu(newState)) {
    const finalState: GameState = { ...newState, status: "finished" };
    return {
      success: true,
      nextState: finalState,
      roundResult: resolveBuntu(finalState),
    };
  }

  return { success: true, nextState: newState };
}

/**
 * Mendapatkan kartu-kartu yang bisa dimainkan oleh pemain saat ini.
 * Berguna untuk highlight kartu di UI dan untuk logika Bot AI.
 */
export function getCurrentPlayableTiles(state: GameState): Tile[] {
  const currentPlayer = state.players[state.currentTurnIndex];
  return getPlayableTiles(
    currentPlayer.hand,
    state.board,
    state.status === "first_move"
  );
}
