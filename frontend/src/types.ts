export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameStatus = 'WAITING_FOR_PLAYERS' | 'IN_PROGRESS' | 'FINISHED';

export interface PlayerDTO {
  id: string;
  nome: string;
  x: number;
  y: number;
  vivo: boolean;
  ap: number;
  movementLeft: number;
  maxMovement?: number;
  bombsPlantedThisTurn: number;
}

export interface GameStateDTO {
  board: number[][];
  players: PlayerDTO[];
  currentTurnPlayerId: string | null;
  status: GameStatus;
  winnerId: string | null;
  winnerName: string | null;
  turnNumber: number;
  lastActionMessage: string;
}

export const CELL = {
  EMPTY: 0,
  WALL: 1,
  DESTRUCTIBLE: 2,
  BOMB: 3,
  FIRE: 4,
} as const;
