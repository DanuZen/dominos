// ============================================================
// engine/test-bot.ts
// Test Phase 2: Bot AI + Validasi Simulasi Penuh.
// Jalankan dengan: npx ts-node src/engine/test-bot.ts
// ============================================================

import { runSimulation, runBatchSimulation } from "./simulation";
import { initializeGame } from "./game";
import { chooseBotTile } from "./bot";

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

// ─── SUITE 1: BOT AI ─────────────────────────────────────────
console.log("\n━━━ SUITE 1: Bot AI Logic ━━━");

test("chooseBotTile mengembalikan null jika tidak ada kartu valid (Pass)", () => {
  // Buat state dimana pemain tidak punya kartu cocok
  const state = initializeGame(
    ["p1", "p2", "p3", "p4"],
    ["Alice", "Bot1", "Bot2", "Bot3"]
  );
  // Cari pemain yang BUKAN giliran pertama dan kosongkan tangan mereka
  const nonFirstIdx = state.currentTurnIndex === 0 ? 1 : 0;
  const modifiedState = {
    ...state,
    currentTurnIndex: nonFirstIdx,
    status: "playing" as const,
    board: {
      ...state.board,
      leftEdgeValue: 0,
      rightEdgeValue: 0,
      placedTiles: [{ tile: { leftValue: 0, rightValue: 0, isBalak: true }, exposedLeft: 0, exposedRight: 0 }],
    },
    players: state.players.map((p, i) => {
      if (i === nonFirstIdx) {
        // Tangan berisi hanya kartu yang tidak cocok (nilai 5-6)
        return {
          ...p,
          hand: [
            { leftValue: 5, rightValue: 6, isBalak: false },
            { leftValue: 4, rightValue: 5, isBalak: false },
          ],
        };
      }
      return p;
    }),
  };

  const chosen = chooseBotTile(modifiedState, "easy");
  assert(chosen === null, `Harusnya null (Pass), dapat: ${JSON.stringify(chosen)}`);
});

test("chooseBotTile (easy) mengembalikan kartu valid dari tangan", () => {
  const state = initializeGame(
    ["p1", "p2", "p3", "p4"],
    ["Alice", "Bot1", "Bot2", "Bot3"]
  );
  const firstPlayer = state.players[state.currentTurnIndex];
  const chosen = chooseBotTile(state, "easy");
  // Di first_move, harus balak
  assert(chosen !== null, "Harusnya ada kartu yang bisa dimainkan");
  assert(chosen!.isBalak === true, "Kartu first_move harus balak");
  assert(
    firstPlayer.hand.some(
      (t) => t.leftValue === chosen!.leftValue && t.rightValue === chosen!.rightValue
    ),
    "Kartu yang dipilih harus ada di tangan pemain"
  );
});

test("chooseBotTile (medium) memilih kartu dengan pip tertinggi", () => {
  const state = initializeGame(
    ["p1", "p2", "p3", "p4"],
    ["Alice", "Bot1", "Bot2", "Bot3"]
  );
  const nonFirstIdx = state.currentTurnIndex === 0 ? 1 : 0;
  // Buat state di mana bot punya beberapa pilihan
  const modifiedState = {
    ...state,
    currentTurnIndex: nonFirstIdx,
    status: "playing" as const,
    board: {
      ...state.board,
      leftEdgeValue: 3,
      rightEdgeValue: 5,
      placedTiles: [{ tile: { leftValue: 3, rightValue: 5, isBalak: false }, exposedLeft: 3, exposedRight: 5 }],
    },
    players: state.players.map((p, i) => {
      if (i === nonFirstIdx) {
        return {
          ...p,
          hand: [
            { leftValue: 3, rightValue: 1, isBalak: false }, // pip 4, cocok kiri
            { leftValue: 5, rightValue: 6, isBalak: false }, // pip 11, cocok kanan ← harusnya dipilih
            { leftValue: 3, rightValue: 2, isBalak: false }, // pip 5, cocok kiri
          ],
        };
      }
      return p;
    }),
  };

  const chosen = chooseBotTile(modifiedState, "medium");
  assert(chosen !== null, "Harusnya ada pilihan");
  assert(
    chosen!.leftValue === 5 && chosen!.rightValue === 6,
    `Medium harusnya pilih [5|6] (pip 11), dapat [${chosen!.leftValue}|${chosen!.rightValue}]`
  );
});

// ─── SUITE 2: SIMULASI SATU GAME PENUH ───────────────────────
console.log("\n━━━ SUITE 2: Simulasi Penuh ━━━");

test("Simulasi easy berhasil diselesaikan (ada pemenang)", () => {
  const result = runSimulation("easy", false);
  assert(result.roundResult !== undefined, "Harusnya ada roundResult");
  assert(
    result.roundResult.winnerId !== "",
    "Harusnya ada winnerId yang valid"
  );
  assert(result.totalTurns > 0, "Harusnya ada giliran yang dimainkan");
  assert(result.totalTurns < 200, "Harusnya selesai sebelum 200 giliran (guard-check)");
});

test("Simulasi medium berhasil diselesaikan (ada pemenang)", () => {
  const result = runSimulation("medium", false);
  assert(result.roundResult !== undefined, "Harusnya ada roundResult");
  assert(["bot1", "bot2", "bot3", "bot4"].includes(result.roundResult.winnerId), "Winner ID harus valid");
});

test("Tipe kemenangan selalu 'normal' atau 'buntu'", () => {
  for (let i = 0; i < 10; i++) {
    const result = runSimulation("easy", false);
    assert(
      result.roundResult.winType === "normal" || result.roundResult.winType === "buntu",
      `WinType tidak valid: ${result.roundResult.winType}`
    );
  }
});

test("50 simulasi berturut-turut tanpa error (stabilitas rules engine)", () => {
  let errors = 0;
  for (let i = 0; i < 50; i++) {
    try {
      runSimulation("easy", false);
    } catch {
      errors++;
    }
  }
  assert(errors === 0, `Ada ${errors} simulasi yang crash dari 50 percobaan`);
});

test("playerScores di hasil buntu mencakup semua 4 pemain", () => {
  // Cari hasil buntu dengan menjalankan beberapa simulasi
  let buntuFound = false;
  for (let i = 0; i < 30; i++) {
    const result = runSimulation("easy", false);
    if (result.roundResult.winType === "buntu") {
      const scores = result.roundResult.playerScores;
      assert(Object.keys(scores).length === 4, "Harusnya ada 4 entri skor");
      assert(
        Object.values(scores).every((s) => s >= 0),
        "Semua skor harus non-negatif"
      );
      buntuFound = true;
      break;
    }
  }
  if (!buntuFound) {
    // Buntu mungkin jarang, ini bukan failure
    console.log("     (Info: Buntu tidak muncul dalam 30 percobaan, lewati validasi skor buntu)");
  }
});

// ─── RINGKASAN & BATCH STATS ──────────────────────────────────
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`✅ Lulus  : ${passed}`);
console.log(`❌ Gagal  : ${failed}`);
console.log(`Total   : ${passed + failed}`);

if (failed === 0) {
  console.log("\n🎉 Semua test Phase 2 berhasil! Bot AI siap.\n");
  // Jalankan batch simulation untuk melihat statistik
  runBatchSimulation(200, "easy");
  runBatchSimulation(200, "medium");
} else {
  console.log("\n⚠️  Ada test yang gagal. Periksa log di atas.\n");
  process.exit(1);
}
