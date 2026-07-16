import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

// Singleton instances
export const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
export const prisma = new PrismaClient();

const MATCHMAKING_QUEUE_KEY = "tournament:queue";

export class Matchmaker {
  /**
   * Adds a user to the matchmaking queue for the current tournament round.
   */
  static async joinQueue(userId: string) {
    // Check if user is already in queue
    const queue = await redis.lrange(MATCHMAKING_QUEUE_KEY, 0, -1);
    if (!queue.includes(userId)) {
      await redis.rpush(MATCHMAKING_QUEUE_KEY, userId);
    }
    
    // Attempt to form a match if enough players
    await this.tryMatchmake();
  }

  /**
   * Tries to pop 4 players from the queue to start a new match.
   */
  static async tryMatchmake() {
    // We need 4 players to start a table
    const queueLength = await redis.llen(MATCHMAKING_QUEUE_KEY);
    
    if (queueLength >= 4) {
      const players: string[] = [];
      for (let i = 0; i < 4; i++) {
        const userId = await redis.lpop(MATCHMAKING_QUEUE_KEY);
        if (userId) players.push(userId);
      }

      if (players.length === 4) {
        await this.createMatch(players);
      } else {
        // If something went wrong and we got less than 4, push them back
        for (const p of players) {
          await redis.lpush(MATCHMAKING_QUEUE_KEY, p);
        }
      }
    }
  }

  /**
   * Creates a Match in the database and broadcasts the Room ID to players via Redis Pub/Sub.
   */
  static async createMatch(userIds: string[]) {
    // Generate a unique Colyseus room ID
    const roomId = uuidv4(); 
    
    // Find active tournament or create one for demo purposes
    let tournament = await prisma.tournament.findFirst({
      where: { status: "ACTIVE" }
    });

    if (!tournament) {
      tournament = await prisma.tournament.create({
        data: {
          name: "Daily Tournament",
          status: "ACTIVE",
          currentRound: 1,
          totalPlayers: 64
        }
      });
    }

    const match = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        roundNumber: tournament.currentRound,
        status: "ACTIVE",
        roomId: roomId,
        players: {
          create: userIds.map((uid, index) => ({
            userId: uid,
            seatIndex: index
          }))
        }
      }
    });

    // Publish to a Redis channel so API servers/WebSockets know to redirect the players
    const payload = JSON.stringify({ matchId: match.id, roomId: roomId, players: userIds });
    await redis.publish("match_ready", payload);
  }

  /**
   * Get current queue count.
   */
  static async getQueueCount(): Promise<number> {
    return await redis.llen(MATCHMAKING_QUEUE_KEY);
  }
}
