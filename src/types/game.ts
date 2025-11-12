export type GameVariant = 'chess' | 'janggi' | 'janggi2' | 'xiangqi' | 'shogi';

export type PieceColor = 'white' | 'black' | 'red' | 'blue';

export type Square = string; // e.g., 'e4', 'a1'

export interface Move {
  from: Square;
  to: Square;
  promotion?: string;
  san?: string; // Standard Algebraic Notation
  captured?: string;
}

export interface GameState {
  variant: GameVariant;
  fen: string; // Forsyth–Edwards Notation
  moves: Move[];
  currentPlayer: PieceColor;
  isGameOver: boolean;
  result?: 'win' | 'draw' | 'loss';
}

export interface EngineAnalysis {
  depth: number;
  score: number;
  bestMove: string;
  pv: string[]; // Principal Variation
  nodes: number;
  nps: number; // Nodes per second
  time: number; // milliseconds
  multipv?: EngineAnalysis[]; // Multi-PV lines
}

export type GameMode = 'player-vs-ai' | 'ai-vs-ai' | 'learning' | 'analysis';

export interface GameSettings {
  variant: GameVariant;
  mode: GameMode;
  engineStrength?: number; // 1-20
  aiSpeed?: 'instant' | 'fast' | 'normal' | 'slow';
  showAnalysis: boolean;
  showHints: boolean;
}

export interface ChessTerm {
  term: string;
  definition: string;
  example?: string;
}
