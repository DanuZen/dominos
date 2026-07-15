// ============================================================
// engine/test.ts
// Unit test manual untuk Rules Engine (Phase 1).
// Jalankan dengan: npx ts-node src/engine/test.ts
// ============================================================

import { generateDeck, shuffle, dealTiles, countTotalPips } from "./deck";
import { createEmptyBoard, getPlayableTiles, getValidEdge } from "./board";
import { initializeGame, playTile, doPass, getCurrentPlayableTiles } from "./game";
import { Tile } from "../types";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ❌ FAIL: ${name}`);
    console.log(`     → ${e.message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// ─── TEST SUITE 1: DECK ──────────────────────────────────────
console.log("\n━━━ SUITE 1: Deck ━━━");

test("generateDeck menghasilkan 28 kartu", () => {
  const deck = generateDeck();
  assert(deck.length === 28, `Harusnya 28, dapat ${deck.length}`);
});

test("generateDeck memiliki 7 kartu balak (kembar)", () => {
  const deck = generateDeck();
  const balak = deck.filter((t) => t.isBalak);
  assert(balak.length === 7, `Harusnya 7 balak, dapat ${balak.length}`);
});

test("shuffle menghasilkan 28 kartu", () => {
  const deck = shuffle(generateDeck());
  assert(deck.length === 28, `Harusnya 28, dapat ${deck.length}`);
});

test("dealTiles membagi 7 kartu ke 4 pemain (total 28)", () => {
  const deck = shuffle(generateDeck());
  const hands = dealTiles(deck, 4, 7);
  assert(hands.length === 4, `Harusnya 4 tangan, dapat ${hands.length}`);
  hands.forEach((hand, i) => {
    assert(hand.length === 7, `Pemain ${i} harusnya punya 7 kartu, dapat ${hand.length}`);
  });
});

test("countTotalPips menghitung benar", () => {
  const tiles: Tile[] = [
    { leftValue: 3, rightValue: 5, isBalak: false },
    { leftValue: 6, rightValue: 6, isBalak: true },
  ];
  const total = countTotalPips(tiles);
  assert(total === 20, `Harusnya 20, dapat ${total}`);
});

// ─── TEST SUITE 2: BOARD ─────────────────────────────────────
console.log("\n━━━ SUITE 2: Board ━━━");

test("getValidEdge menolak non-balak di langkah pertama", () => {
  const board = createEmptyBoard();
  const nonBalak: Tile = { leftValue: 3, rightValue: 5, isBalak: false };
  const edge = getValidEdge(nonBalak, board, true);
  assert(edge === null, `Non-balak harus ditolak di langkah pertama, dapat '${edge}'`);
});

test("getValidEdge mengizinkan balak di langkah pertama", () => {
  const board = createEmptyBoard();
  const balak: Tile = { leftValue: 6, rightValue: 6, isBalak: true };
  const edge = getValidEdge(balak, board, true);
  assert(edge === "both", `Balak harus diterima di langkah pertama, dapat '${edge}'`);
});

test("getPlayableTiles di langkah pertama hanya mengembalikan balak", () => {
  const hand: Tile[] = [
    { leftValue: 2, rightValue: 5, isBalak: false },
    { leftValue: 6, rightValue: 6, isBalak: true },
    { leftValue: 3, rightValue: 3, isBalak: true },
  ];
  const board = createEmptyBoard();
  const playable = getPlayableTiles(hand, board, true);
  assert(playable.length === 2, `Harusnya 2 kartu playable, dapat ${playable.length}`);
  assert(playable.every((t) => t.isBalak), "Semua kartu playable pertama harus balak");
});

// ─── TEST SUITE 3: GAME FLOW ──────────────────────────────────
console.log("\n━━━ SUITE 3: Game Flow ━━━");

test("initializeGame membuat 4 pemain dengan 7 kartu masing-masing", () => {
  const state = initializeGame(
    ["p1", "p2", "p3", "p4"],
    ["Alice", "Bob", "Charlie", "Diana"]
  );
  assert(state.players.length === 4, `Harusnya 4 pemain`);
  state.players.forEach((p) => {
    assert(p.hand.length === 7, `${p.name} harusnya punya 7 kartu, dapat ${p.hand.length}`);
  });
});

test("initializeGame status awal adalah 'first_move'", () => {
  const state = initializeGame(
    ["p1", "p2", "p3", "p4"],
    ["Alice", "Bob", "Charlie", "Diana"]
  );
  assert(state.status === "first_move", `Status harusnya 'first_move', dapat '${state.status}'`);
});

test("pemain pertama yang ditentukan selalu punya kartu balak", () => {
  // Jalankan beberapa kali untuk memeriksa konsistensi random
  for (let i = 0; i < 20; i++) {
    const state = initializeGame(
      ["p1", "p2", "p3", "p4"],
      ["Alice", "Bob", "Charlie", "Diana"]
    );
    const firstPlayer = state.players[state.currentTurnIndex];
    const hasBalak = firstPlayer.hand.some((t) => t.isBalak);
    assert(hasBalak, `Pemain pertama (${firstPlayer.name}) tidak punya balak pada iterasi ${i}!`);
  }
});

test("playTile menolak jika bukan giliran pemain", () => {
  const state = initializeGame(
    ["p1", "p2", "p3", "p4"],
    ["Alice", "Bob", "Charlie", "Diana"]
  );
  const wrongPlayer = state.players.find((p) => p.id !== state.players[state.currentTurnIndex].id)!;
  const tile = wrongPlayer.hand[0];
  const result = playTile(state, wrongPlayer.id, tile);
  assert(!result.success, "Harusnya gagal karena bukan giliran pemain ini");
});

test("playTile menolak non-balak di langkah pertama", () => {
  let state = initializeGame(
    ["p1", "p2", "p3", "p4"],
    ["Alice", "Bob", "Charlie", "Diana"]
  );
  const firstPlayer = state.players[state.currentTurnIndex];
  const nonBalak = firstPlayer.hand.find((t) => !t.isBalak);
  if (nonBalak) {
    const result = playTile(state, firstPlayer.id, nonBalak);
    assert(!result.success, "Harusnya gagal karena bukan balak di langkah pertama");
  } else {
    // Pemain punya semua balak, lewati test ini
    console.log("     (Skip: pemain pertama kebetulan punya semua balak)");
  }
});

test("playTile berhasil dengan kartu balak di langkah pertama", () => {
  const state = initializeGame(
    ["p1", "p2", "p3", "p4"],
    ["Alice", "Bob", "Charlie", "Diana"]
  );
  const firstPlayer = state.players[state.currentTurnIndex];
  const balak = firstPlayer.hand.find((t) => t.isBalak)!;
  const result = playTile(state, firstPlayer.id, balak);
  assert(result.success, `Harusnya berhasil, error: ${!result.success ? (result as any).error : ""}`);
  if (result.success) {
    assert(result.nextState.status === "playing", "Status harusnya berubah ke 'playing'");
    assert(
      result.nextState.players[state.currentTurnIndex].hand.length === 6,
      "Tangan pemain harusnya berkurang 1 kartu"
    );
  }
});

// ─── RINGKASAN ────────────────────────────────────────────────
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✅ Lulus  : ${passed}`);
console.log(`❌ Gagal  : ${failed}`);
console.log(`Total   : ${passed + failed}`);
if (failed === 0) {
  console.log("\n🎉 Semua test berhasil! Rules Engine Phase 1 siap.\n");
} else {
  console.log("\n⚠️  Ada test yang gagal. Periksa log di atas.\n");
  process.exit(1);
}
