/**
 * Janggi2 Engine-Based AI
 * Uses Fairy-Stockfish engine for move selection and evaluation
 */

import { Board, Move, boardToFEN, engineMoveToMove } from './janggi2-game';
import { XBoardEngine } from '../services/xboard-engine';

/**
 * Get AI move from engine
 */
export async function getEngineMove(
  board: Board,
  isHanTurn: boolean,
  engine: XBoardEngine,
  timeMs: number = 2000
): Promise<Move | null> {
  try {
    // Convert board to FEN
    const fen = boardToFEN(board, isHanTurn);

    // Get best move from engine
    const engineMoveStr = await engine.getBestMove(fen, timeMs);

    if (!engineMoveStr) {
      return null;
    }

    // Convert engine move to Move object
    const move = engineMoveToMove(engineMoveStr);
    return move;
  } catch (error) {
    console.error('Error getting engine move:', error);
    return null;
  }
}

/**
 * Get position evaluation from engine
 */
export async function getEngineEvaluation(
  board: Board,
  isHanTurn: boolean,
  engine: XBoardEngine,
  depth: number = 15
): Promise<{
  score: number;
  bestMove: Move | null;
  depth: number;
  pv: string[];
} | null> {
  try {
    // Convert board to FEN
    const fen = boardToFEN(board, isHanTurn);

    // Get analysis from engine
    const analysis = await engine.analyze(fen, depth);

    if (!analysis) {
      return null;
    }

    // Convert best move to Move object
    const bestMove = analysis.bestMove ? engineMoveToMove(analysis.bestMove) : null;

    return {
      score: analysis.score,
      bestMove,
      depth: analysis.depth,
      pv: analysis.pv,
    };
  } catch (error) {
    console.error('Error getting engine evaluation:', error);
    return null;
  }
}
