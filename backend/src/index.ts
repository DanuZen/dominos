import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { DominoRoom } from "./rooms/DominoRoom";
import { Matchmaker } from "./services/Matchmaker";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

// Matchmaking API
app.post("/api/tournament/join", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    
    await Matchmaker.joinQueue(userId);
    const count = await Matchmaker.getQueueCount();
    
    return res.json({ success: true, message: "Joined queue", queueCount: count });
  } catch (err) {
    console.error("Matchmaking error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: createServer(app)
  })
});

gameServer.define("domino_room", DominoRoom);

gameServer.listen(port).then(() => {
  console.log(`[Colyseus] Listening on ws://localhost:${port}`);
});
