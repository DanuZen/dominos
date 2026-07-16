import { Room, Client } from "colyseus";
import { GameState, PlayerSchema, TileSchema, PlacedTileSchema, BoardStateSchema } from "./schema/GameState";
import { GameState as EngineGameState, Tile as EngineTile } from "../types";
import { initializeGame, playTile, doPass } from "../engine/game";
import { chooseBotTile } from "../engine/bot";
import { getValidEdge } from "../engine/board";
import { prisma } from "../services/Matchmaker";

export class DominoRoom extends Room<{ state: GameState }> {
  maxClients = 4;
  private engineState!: EngineGameState;
  private turnTimeout: any;
  private matchId?: string;

  onCreate(options: any) {
    if (options.matchId) {
      this.matchId = options.matchId;
    }

    this.setState(new GameState());
    this.state.status = "waiting";
    this.state.round = 1;
    this.state.board = new BoardStateSchema();
    this.state.board.leftEdgeValue = -1;
    this.state.board.rightEdgeValue = -1;
    this.state.board.rootIndex = 0;

    this.onMessage("PLAY_TILE", (client, message) => {
      this.handlePlayTile(client, message);
    });

    this.onMessage("PASS", (client) => {
      this.handlePass(client);
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    
    const player = new PlayerSchema();
    player.id = client.sessionId;
    player.name = options.name || `Player ${this.clients.length}`;
    player.score = 0;
    player.isBot = false;
    player.connected = true;
    
    this.state.players.set(client.sessionId, player);
    this.state.turnOrder.push(client.sessionId);

    if (this.clients.length === this.maxClients) {
      this.startGame();
    }
  }

  async onLeave(client: Client, code?: number) {
    const consented = code === 1000;
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.connected = false;
    }

    if (!consented) {
      try {
        await this.allowReconnection(client, 20);
        if (player) player.connected = true;
      } catch (e) {
        if (player) player.isBot = true;
        if (this.state.currentTurn === client.sessionId) {
          this.handlePass(client); // Bot auto-passes for now
        }
      }
    } else {
      if (player) player.isBot = true;
    }
  }

  private startGame() {
    const ids = Array.from(this.state.players.keys());
    const names = ids.map(id => this.state.players.get(id)!.name);
    
    this.engineState = initializeGame(ids, names);
    this.syncSchema();
    this.startTurnTimer();
  }

  private syncSchema() {
    // 1. Sync Game Status
    const engineStatus = this.engineState.status;
    if (engineStatus === "first_move" || engineStatus === "playing") {
      this.state.status = "playing";
    } else if (engineStatus === "finished") {
      this.state.status = "round_over";
    } else if (engineStatus === "waiting") {
      this.state.status = "waiting";
    }
    
    // 2. Sync Turn
    const currentId = this.engineState.players[this.engineState.currentTurnIndex].id;
    this.state.currentTurn = currentId;

    // 3. Sync Players & Hands
    this.engineState.players.forEach((p) => {
      const playerSchema = this.state.players.get(p.id);
      if (!playerSchema) return;
      
      playerSchema.score = p.score;
      
      // Update hand (recreate to ensure sync)
      playerSchema.hand.clear();
      p.hand.forEach((t) => {
        const ts = new TileSchema();
        ts.leftValue = t.leftValue;
        ts.rightValue = t.rightValue;
        ts.isBalak = t.isBalak;
        ts.id = t.leftValue * 10 + t.rightValue; // unique enough for dominoes
        playerSchema.hand.push(ts);
      });
    });

    // 4. Sync Board
    this.state.board.leftEdgeValue = this.engineState.board.leftEdgeValue;
    this.state.board.rightEdgeValue = this.engineState.board.rightEdgeValue;
    this.state.board.rootIndex = this.engineState.board.rootIndex ?? 0;
    
    this.state.board.placedTiles.clear();
    this.engineState.board.placedTiles.forEach((pt) => {
      const ts = new TileSchema();
      ts.leftValue = pt.tile.leftValue;
      ts.rightValue = pt.tile.rightValue;
      ts.isBalak = pt.tile.isBalak;
      
      const pts = new PlacedTileSchema();
      pts.tile = ts;
      pts.exposedLeft = pt.exposedLeft;
      pts.exposedRight = pt.exposedRight;
      this.state.board.placedTiles.push(pts);
    });
  }

  private handlePlayTile(client: Client, message: { tile: EngineTile, edge?: "left" | "right" }) {
    if (this.state.currentTurn !== client.sessionId) return;
    if (this.turnTimeout) { this.turnTimeout.clear(); this.turnTimeout = null; }

    const result = playTile(this.engineState, client.sessionId, message.tile, message.edge);
    if (result.success) {
      this.engineState = result.nextState;
      this.syncSchema();
      
      if (result.roundResult) {
        this.broadcast("ROUND_RESULT", result.roundResult);
        this.handleRoundEnd();
      } else {
        this.startTurnTimer();
      }
    } else {
      client.send("ERROR", result.error);
      this.startTurnTimer();
    }
  }

  private handlePass(client: Client) {
    if (this.state.currentTurn !== client.sessionId) return;
    if (this.turnTimeout) { this.turnTimeout.clear(); this.turnTimeout = null; }
    
    const result = doPass(this.engineState, client.sessionId);
    if (result.success) {
      this.engineState = result.nextState;
      this.syncSchema();
      
      if (result.roundResult) {
        this.broadcast("ROUND_RESULT", result.roundResult);
        this.handleRoundEnd();
      } else {
        this.startTurnTimer();
      }
    } else {
      client.send("ERROR", result.error);
      this.startTurnTimer();
    }
  }

  private startTurnTimer() {
    if (this.turnTimeout) {
      this.turnTimeout.clear();
      this.turnTimeout = null;
    }
    
    if (this.engineState.status === "finished") return;

    this.turnTimeout = this.clock.setTimeout(() => {
      this.autoPlayCurrentTurn();
    }, 10000);
  }

  private autoPlayCurrentTurn() {
    if (this.engineState.status === "finished") return;

    const currentPlayerId = this.engineState.players[this.engineState.currentTurnIndex].id;
    const chosen = chooseBotTile(this.engineState, "medium");

    let result;
    if (!chosen) {
      result = doPass(this.engineState, currentPlayerId);
    } else {
      const edge = getValidEdge(chosen, this.engineState.board, this.engineState.status === "first_move");
      const chosenEdge = edge === "both" 
        ? (Math.random() < 0.5 ? "left" : "right")
        : (edge as "left" | "right");
      
      result = playTile(this.engineState, currentPlayerId, chosen, chosenEdge);
    }

    if (!result.success) {
      result = doPass(this.engineState, currentPlayerId);
    }

    if (result.success) {
      this.engineState = result.nextState;
      this.syncSchema();
      
      if (result.roundResult) {
        this.broadcast("ROUND_RESULT", result.roundResult);
        this.handleRoundEnd();
      } else {
        this.startTurnTimer();
      }
    }
  }

  private handleRoundEnd() {
    if (this.state.round < 6) {
      this.clock.setTimeout(() => {
        this.state.round += 1;
        
        // Pass existing players but reset hand and board
        const ids = Array.from(this.state.players.keys());
        const names = ids.map(id => this.state.players.get(id)!.name);
        
        // Retain cumulative scores! 
        // initializeGame doesn't take initial scores in standard constructor unless modified
        // Wait, initializeGame(ids, names, initialScores?) is modified in GameplayScene... 
        // let's just initialize and overwrite scores with cumulative
        const currentScores = ids.map(id => this.state.players.get(id)!.score);
        this.engineState = initializeGame(ids, names, currentScores);
        this.syncSchema();
        this.startTurnTimer();
      }, 5000);
    } else {
      this.finishMatch();
    }
  }

  private async finishMatch() {
    this.broadcast("MATCH_FINISHED");
    if (this.matchId) {
      try {
        // Save results to Prisma
        const sorted = Array.from(this.state.players.values()).sort((a, b) => a.score - b.score);
        // Top 2 advance
        const winners = sorted.slice(0, 2).map(p => p.id);
        
        for (const p of sorted) {
          await prisma.matchPlayer.updateMany({
            where: { matchId: this.matchId, userId: p.id },
            data: { cumulativeScore: p.score, isWinner: winners.includes(p.id) }
          });
        }
        
        await prisma.match.update({
          where: { id: this.matchId },
          data: { status: "COMPLETED" }
        });
        
      } catch (err) {
        console.error("Failed to save match result", err);
      }
    }
    
    this.clock.setTimeout(() => {
      this.disconnect();
    }, 5000);
  }
}

