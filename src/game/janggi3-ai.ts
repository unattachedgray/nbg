/**
 * Janggi3 Simple AI
 * Basic random move selection for now
 */

import { Board, Move, applyMove, getGameResult } from './janggi3-game';
import { getAllLegalMoves } from './janggi3-moves';

/**
 * Get AI move (random for now)
 */
export function getAIMove(board: Board, isHanTurn: boolean): Move | null {
  const legalMoves = getAllLegalMoves(board, isHanTurn);

  if (legalMoves.length === 0) {
    return null; // No legal moves
  }

  // For now, pick a random legal move
  const randomIndex = Math.floor(Math.random() * legalMoves.length);
  return legalMoves[randomIndex];
}

/**
 * Evaluate board position (simple material count)
 */
function evaluateBoard(board: Board): number {
  let score = 0;

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      score += getPieceValue(piece);
    }
  }

  return score;
}

function getPieceValue(piece: number): number {
  const absPiece = Math.abs(piece);
  const sign = piece > 0 ? 1 : -1;

  switch (absPiece) {
    case 1: return sign * 2;    // Soldier
    case 2: return sign * 3;    // Elephant
    case 3: return sign * 5;    // Horse
    case 4: return sign * 7;    // Cannon
    case 5: return sign * 13;   // Chariot
    case 6: return sign * 3;    // Guard
    case 7: return sign * 10000; // King
    default: return 0;
  }
}
