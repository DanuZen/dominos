// ============================================================
// engine/simulation.ts
// Simulator permainan penuh: menjalankan satu ronde dari awal
// sampai selesai secara otomatis (berguna untuk testing dan
// validasi aturan tanpa UI).
// PURE: Tidak mengimpor apa pun dari Phaser atau library UI.
// ============================================================

import { GameState, RoundResult } from "../types";
import { initializeGame, playTile, doPass, ActionResult } from "./game";
import { chooseBotTile, chooseBotEdge, BotDifficulty } from "./bot";
import { getValidEdge } from "./board";

/** Log satu aksi dalam simulasi */
export interface SimulationLog {
  turn: number;
  playerId: string;
  playerName: string;
  action: "play" | "pass";
  tile?: string; // Format: "[L|R]"
  edge?: string;
}

/** Hasil lengkap satu simulasi */
export interface SimulationResult {
  roundResult: RoundResult;
  logs: SimulationLog[];
  totalTurns: number;
}

/** Format tile menjadi string yang mudah dibaca */
function tileToString(tile: { leftValue: number; rightValue: number }): string {
  return `[${tile.leftValue}|${tile.rightValue}]`;
}

/**
 * Menjalankan satu ronde permainan penuh secara otomatis.
 * Semua pemain dikendalikan oleh Bot AI (berguna untuk validasi rules engine).
 *
 * @param difficulty - Tingkat kesulitan semua bot
 * @param verbose - Jika true, log setiap aksi ke console
 * @returns SimulationResult berisi hasil akhir dan log lengkap
 */
export function runSimulation(
  difficulty: BotDifficulty = "easy",
  verbose: boolean = false
): SimulationResult {
  const playerIds = ["bot1", "bot2", "bot3", "bot4"];
  const playerNames = ["Bot Alpha", "Bot Beta", "Bot Gamma", "Bot Delta"];

  let state: GameState = initializeGame(playerIds, playerNames);
  const logs: SimulationLog[] = [];
  let turnCount = 0;
  const MAX_TURNS = 200; // Guard: mencegah infinite loop jika ada bug logika

  if (verbose) {
    console.log("\n🎮 Simulasi dimulai!");
    console.log(
      `Pemain pertama: ${state.players[state.currentTurnIndex].name} (index: ${state.currentTurnIndex})`
    );
    console.log("─".repeat(50));
  }

  while (state.status !== "finished" && turnCount < MAX_TURNS) {
    turnCount++;
    const currentPlayer = state.players[state.currentTurnIndex];
    const chosenTile = chooseBotTile(state, difficulty);

    let result: ActionResult;

    if (chosenTile === null) {
      // Bot harus Pass
      result = doPass(state, currentPlayer.id);
      logs.push({
        turn: turnCount,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        action: "pass",
      });

      if (verbose) {
        console.log(
          `Turn ${turnCount} | ${currentPlayer.name.padEnd(12)} | PASS (kartu sisa: ${currentPlayer.hand.length})`
        );
      }
    } else {
      // Bot meletakkan kartu
      const isFirstMove = state.status === "first_move";
      const rawEdge = chooseBotEdge(chosenTile, state);
      const chosenEdge = rawEdge === "both" ? (isFirstMove ? "both" : "right") : rawEdge;

      // Override playTile agar kita bisa tentukan edge: pakai internal board langsung
      // (playTile default ke "right" jika "both", kita perlu tetap menggunakannya)
      result = playTile(state, currentPlayer.id, chosenTile);

      logs.push({
        turn: turnCount,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        action: "play",
        tile: tileToString(chosenTile),
        edge: chosenEdge,
      });

      if (verbose) {
        console.log(
          `Turn ${turnCount} | ${currentPlayer.name.padEnd(12)} | MAIN ${tileToString(chosenTile).padEnd(8)} sisi ${chosenEdge} | kartu sisa: ${currentPlayer.hand.length - 1} | papan: [${result.success ? result.nextState.board.leftEdgeValue : "?"}...${result.success ? result.nextState.board.rightEdgeValue : "?"}]`
        );
      }
    }

    if (!result.success) {
      // Seharusnya tidak terjadi jika bot logic benar
      throw new Error(
        `[Simulasi] Error pada turn ${turnCount} oleh ${currentPlayer.name}: ${(result as any).error}`
      );
    }

    state = result.nextState;

    if (result.roundResult) {
      // Permainan selesai
      if (verbose) {
        console.log("\n" + "━".repeat(50));
        console.log(`🏆 ${result.roundResult.description}`);
        console.log(`   Tipe kemenangan: ${result.roundResult.winType.toUpperCase()}`);
        console.log("   Skor akhir (titik sisa):");
        for (const player of state.players) {
          const pip = result.roundResult.playerScores[player.id];
          const isWinner = player.id === result.roundResult.winnerId;
          console.log(
            `   ${isWinner ? "👑" : "  "} ${player.name}: ${pip} titik`
          );
        }
        console.log(`   Total giliran: ${turnCount}`);
        console.log("━".repeat(50) + "\n");
      }

      return {
        roundResult: result.roundResult,
        logs,
        totalTurns: turnCount,
      };
    }
  }

  // Guard: jika loop melebihi MAX_TURNS (indikasi bug)
  throw new Error(
    `[Simulasi] Melebihi batas ${MAX_TURNS} giliran tanpa ada pemenang. Kemungkinan ada bug di rules engine.`
  );
}

/**
 * Menjalankan simulasi sejumlah N kali dan merekap statistiknya.
 * Berguna untuk memvalidasi distribusi kemenangan dan mendeteksi edge-case.
 *
 * @param count - Jumlah simulasi yang dijalankan
 * @param difficulty - Tingkat kesulitan bot
 */
export function runBatchSimulation(
  count: number,
  difficulty: BotDifficulty = "easy"
): void {
  const winCount: Record<string, number> = {
    bot1: 0, bot2: 0, bot3: 0, bot4: 0,
  };
  const winType: Record<string, number> = { normal: 0, buntu: 0 };
  let totalTurns = 0;
  let errors = 0;

  for (let i = 0; i < count; i++) {
    try {
      const sim = runSimulation(difficulty, false);
      winCount[sim.roundResult.winnerId] = (winCount[sim.roundResult.winnerId] ?? 0) + 1;
      winType[sim.roundResult.winType]++;
      totalTurns += sim.totalTurns;
    } catch (e: any) {
      errors++;
      console.error(`[Simulasi #${i + 1}] Error:`, e.message);
    }
  }

  const playerNames: Record<string, string> = {
    bot1: "Bot Alpha", bot2: "Bot Beta",
    bot3: "Bot Gamma", bot4: "Bot Delta",
  };

  console.log(`\n━━━ HASIL BATCH SIMULASI (${count}x, difficulty: ${difficulty}) ━━━`);
  console.log("\nDistribusi Kemenangan:");
  for (const [id, wins] of Object.entries(winCount)) {
    const pct = ((wins / count) * 100).toFixed(1);
    const bar = "█".repeat(Math.round(wins / count * 30));
    console.log(`  ${playerNames[id]}: ${wins.toString().padStart(4)} kali (${pct}%) ${bar}`);
  }
  console.log("\nTipe Kemenangan:");
  console.log(`  Normal (kartu habis) : ${winType["normal"]} (${((winType["normal"] / count) * 100).toFixed(1)}%)`);
  console.log(`  Buntu/Gaple          : ${winType["buntu"]} (${((winType["buntu"] / count) * 100).toFixed(1)}%)`);
  console.log(`\nRata-rata giliran per game: ${(totalTurns / count).toFixed(1)}`);
  if (errors > 0) console.log(`⚠️  Error: ${errors} simulasi gagal`);
  console.log("━".repeat(50) + "\n");
}
