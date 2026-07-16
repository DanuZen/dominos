import { GameState, GameStatus, PlayerState, Tile, PlacedTile, BoardState } from "../types";

export function mapSchemaToGameState(schemaState: any): GameState {
  // Convert players MapSchema to array
  const players: PlayerState[] = [];
  
  // Asumsikan turnOrder sudah ada, urutkan pemain berdasarkan turnOrder
  const turnOrder: string[] = Array.from(schemaState.turnOrder || []);
  
  turnOrder.forEach((id) => {
    const p = schemaState.players.get(id);
    if (!p) return;
    
    const hand: Tile[] = [];
    p.hand.forEach((t: any) => {
      hand.push({
        leftValue: t.leftValue,
        rightValue: t.rightValue,
        isBalak: t.isBalak
      });
    });

    players.push({
      id: p.id,
      name: p.name,
      score: p.score,
      hand: hand,
      hasPassedLastTurn: false // Tidak relevan lagi untuk UI murni
    });
  });

  const placedTiles: PlacedTile[] = [];
  if (schemaState.board && schemaState.board.placedTiles) {
    schemaState.board.placedTiles.forEach((pt: any) => {
      placedTiles.push({
        tile: {
          leftValue: pt.tile.leftValue,
          rightValue: pt.tile.rightValue,
          isBalak: pt.tile.isBalak
        },
        exposedLeft: pt.exposedLeft,
        exposedRight: pt.exposedRight
      });
    });
  }

  const board: BoardState = {
    placedTiles,
    leftEdgeValue: schemaState.board?.leftEdgeValue ?? -1,
    rightEdgeValue: schemaState.board?.rightEdgeValue ?? -1,
    rootIndex: schemaState.board?.rootIndex ?? 0
  };

  const currentTurnIndex = turnOrder.findIndex(id => id === schemaState.currentTurn);

  return {
    players,
    board,
    currentTurnIndex: currentTurnIndex >= 0 ? currentTurnIndex : 0,
    status: schemaState.status as GameStatus,
    consecutivePassCount: 0,
    roundPoints: 0
  };
}
