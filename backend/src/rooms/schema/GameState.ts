import { Schema, ArraySchema, type, MapSchema } from "@colyseus/schema";

export class TileSchema extends Schema {
  @type("number") leftValue!: number;
  @type("number") rightValue!: number;
  @type("boolean") isBalak!: boolean;
  @type("number") id!: number; // Untuk membedakan tile yang sama nilainya, misal 0-27
}

export class PlacedTileSchema extends Schema {
  @type(TileSchema) tile!: TileSchema;
  @type("number") exposedLeft!: number;
  @type("number") exposedRight!: number;
}

export class PlayerSchema extends Schema {
  @type("string") id!: string;
  @type("string") name!: string;
  @type("number") score!: number;
  @type("boolean") isBot!: boolean;
  @type("boolean") connected!: boolean;
  @type([ TileSchema ]) hand = new ArraySchema<TileSchema>();
}

export class BoardStateSchema extends Schema {
  @type([ PlacedTileSchema ]) placedTiles = new ArraySchema<PlacedTileSchema>();
  @type("number") leftEdgeValue!: number;
  @type("number") rightEdgeValue!: number;
  @type("number") rootIndex!: number;
}

export class GameState extends Schema {
  @type("string") status!: "waiting" | "playing" | "round_over" | "game_over";
  @type("number") round!: number;
  @type("string") currentTurn!: string; // player id
  @type(BoardStateSchema) board = new BoardStateSchema();
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type([ "string" ]) turnOrder = new ArraySchema<string>();
}
