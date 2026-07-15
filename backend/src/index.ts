import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { DominoRoom } from "./rooms/DominoRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

app.use(cors());
app.use(express.json());

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: createServer(app)
  })
});

gameServer.define("domino_room", DominoRoom);

gameServer.listen(port).then(() => {
  console.log(`[Colyseus] Listening on ws://localhost:${port}`);
});
