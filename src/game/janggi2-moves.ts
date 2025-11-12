/**
 * Janggi2 Move Generation
 * Based on janggi3-moves.ts
 * Used for local move validation before sending to engine
 */

import {
  Board,
  Position,
  Move,
  PieceType,
  inBoard,
  getPiece,
  isHanPiece,
  isChoPiece,
} from './janggi2-game';

// Movement patterns for Ma (Horse) - moves like a knight but can be blocked
const MA_WAYS: [Position, Position][] = [
  [{ row: -1, col: 0 }, { row: -2, col: -1 }], // Up, then up-left
  [{ row: -1, col: 0 }, { row: -2, col: 1 }],  // Up, then up-right
  [{ row: 1, col: 0 }, { row: 2, col: -1 }],   // Down, then down-left
  [{ row: 1, col: 0 }, { row: 2, col: 1 }],    // Down, then down-right
  [{ row: 0, col: 1 }, { row: 1, col: 2 }],    // Right, then down-right
  [{ row: 0, col: 1 }, { row: -1, col: 2 }],   // Right, then up-right
  [{ row: 0, col: -1 }, { row: 1, col: -2 }],  // Left, then down-left
  [{ row: 0, col: -1 }, { row: -1, col: -2 }], // Left, then up-left
];

// Movement patterns for Sang (Elephant) - moves diagonally but can be blocked
const SANG_WAYS: [Position, Position, Position][] = [
  [{ row: 0, col: 1 }, { row: 1, col: 2 }, { row: 2, col: 3 }],
  [{ row: 0, col: -1 }, { row: 1, col: -2 }, { row: 2, col: -3 }],
  [{ row: 0, col: 1 }, { row: -1, col: 2 }, { row: -2, col: 3 }],
  [{ row: 0, col: -1 }, { row: -1, col: -2 }, { row: -2, col: -3 }],
  [{ row: 1, col: 0 }, { row: 2, col: 1 }, { row: 3, col: 2 }],
  [{ row: 1, col: 0 }, { row: 2, col: -1 }, { row: 3, col: -2 }],
  [{ row: -1, col: 0 }, { row: -2, col: 1 }, { row: -3, col: 2 }],
  [{ row: -1, col: 0 }, { row: -2, col: -1 }, { row: -3, col: -2 }],
];

// Soldier movement (forward and sideways)
const JOL_WAYS: Position[] = [
  { row: 0, col: -1 }, // Left
  { row: 0, col: 1 },  // Right
  { row: -1, col: 0 }, // Forward (for Han)
];

/**
 * Get all legal moves for a piece at given position
 */
export function getLegalMoves(board: Board, from: Position, isHanTurn: boolean): Move[] {
  const piece = getPiece(board, from);

  // Check if piece belongs to current player
  if (piece === PieceType.EMPTY) return [];
  if (isHanTurn && !isHanPiece(piece)) return [];
  if (!isHanTurn && !isChoPiece(piece)) return [];

  const moves: Move[] = [];
  const absPiece = Math.abs(piece);

  switch (absPiece) {
    case Math.abs(PieceType.HAN_CHA):
    case Math.abs(PieceType.CHO_CHA):
      return getChariotMoves(board, from, piece);

    case Math.abs(PieceType.HAN_PO):
    case Math.abs(PieceType.CHO_PO):
      return getCannonMoves(board, from, piece);

    case Math.abs(PieceType.HAN_MA):
    case Math.abs(PieceType.CHO_MA):
      return getHorseMoves(board, from, piece);

    case Math.abs(PieceType.HAN_SANG):
    case Math.abs(PieceType.CHO_SANG):
      return getElephantMoves(board, from, piece);

    case Math.abs(PieceType.HAN_SA):
    case Math.abs(PieceType.CHO_SA):
    case Math.abs(PieceType.HAN_KING):
    case Math.abs(PieceType.CHO_KING):
      return getPalaceMoves(board, from, piece);

    case Math.abs(PieceType.HAN_JOL):
    case Math.abs(PieceType.CHO_JOL):
      return getSoldierMoves(board, from, piece);
  }

  return moves;
}

/**
 * Get all legal moves for current player
 */
export function getAllLegalMoves(board: Board, isHanTurn: boolean): Move[] {
  const moves: Move[] = [];

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const pos = { row, col };
      const piece = getPiece(board, pos);

      if (isHanTurn && isHanPiece(piece)) {
        moves.push(...getLegalMoves(board, pos, isHanTurn));
      } else if (!isHanTurn && isChoPiece(piece)) {
        moves.push(...getLegalMoves(board, pos, isHanTurn));
      }
    }
  }

  return moves;
}

function canCapture(piece: number, targetPiece: number): boolean {
  if (targetPiece === PieceType.EMPTY) return true;
  return (piece > 0 && targetPiece < 0) || (piece < 0 && targetPiece > 0);
}

function getChariotMoves(board: Board, from: Position, piece: number): Move[] {
  const moves: Move[] = [];

  // Orthogonal directions
  const directions = [
    { row: -1, col: 0 }, // Up
    { row: 1, col: 0 },  // Down
    { row: 0, col: -1 }, // Left
    { row: 0, col: 1 },  // Right
  ];

  for (const dir of directions) {
    let to = { row: from.row + dir.row, col: from.col + dir.col };

    while (inBoard(to)) {
      const targetPiece = getPiece(board, to);

      if (targetPiece === PieceType.EMPTY) {
        moves.push({ from, to: { ...to } });
      } else {
        if (canCapture(piece, targetPiece)) {
          moves.push({ from, to: { ...to } });
        }
        break; // Can't jump over pieces
      }

      to.row += dir.row;
      to.col += dir.col;
    }
  }

  // TODO: Add palace diagonal movements

  return moves;
}

function getCannonMoves(board: Board, from: Position, piece: number): Move[] {
  const moves: Move[] = [];

  // Cannon must jump over exactly one piece (not another cannon)
  const directions = [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ];

  for (const dir of directions) {
    let jumped = false;
    let to = { row: from.row + dir.row, col: from.col + dir.col };

    while (inBoard(to)) {
      const targetPiece = getPiece(board, to);

      if (!jumped) {
        // Looking for piece to jump over
        if (targetPiece === PieceType.EMPTY) {
          to.row += dir.row;
          to.col += dir.col;
          continue;
        } else if (Math.abs(targetPiece) === Math.abs(PieceType.HAN_PO)) {
          break; // Can't jump over cannons
        } else {
          jumped = true;
          to.row += dir.row;
          to.col += dir.col;
          continue;
        }
      } else {
        // After jumping, can land on empty or capture
        if (targetPiece === PieceType.EMPTY) {
          moves.push({ from, to: { ...to } });
        } else if (Math.abs(targetPiece) !== Math.abs(PieceType.HAN_PO) && canCapture(piece, targetPiece)) {
          moves.push({ from, to: { ...to } });
          break;
        } else {
          break;
        }
      }

      to.row += dir.row;
      to.col += dir.col;
    }
  }

  return moves;
}

function getHorseMoves(board: Board, from: Position, piece: number): Move[] {
  const moves: Move[] = [];

  for (const [block, dest] of MA_WAYS) {
    const blockPos = { row: from.row + block.row, col: from.col + block.col };
    const toPos = { row: from.row + dest.row, col: from.col + dest.col };

    if (!inBoard(toPos)) continue;

    // Check if blocking position is empty
    if (getPiece(board, blockPos) !== PieceType.EMPTY) continue;

    const targetPiece = getPiece(board, toPos);
    if (canCapture(piece, targetPiece)) {
      moves.push({ from, to: toPos });
    }
  }

  return moves;
}

function getElephantMoves(board: Board, from: Position, piece: number): Move[] {
  const moves: Move[] = [];

  for (const [block1, block2, dest] of SANG_WAYS) {
    const block1Pos = { row: from.row + block1.row, col: from.col + block1.col };
    const block2Pos = { row: from.row + block2.row, col: from.col + block2.col };
    const toPos = { row: from.row + dest.row, col: from.col + dest.col };

    if (!inBoard(toPos)) continue;

    // Check if both blocking positions are empty
    if (getPiece(board, block1Pos) !== PieceType.EMPTY) continue;
    if (getPiece(board, block2Pos) !== PieceType.EMPTY) continue;

    const targetPiece = getPiece(board, toPos);
    if (canCapture(piece, targetPiece)) {
      moves.push({ from, to: toPos });
    }
  }

  return moves;
}

function getPalaceMoves(board: Board, from: Position, piece: number): Move[] {
  const moves: Move[] = [];

  // Palace pieces can only move one step orthogonally or diagonally within palace
  const directions = [
    { row: -1, col: 0 },  // Up
    { row: 1, col: 0 },   // Down
    { row: 0, col: -1 },  // Left
    { row: 0, col: 1 },   // Right
    { row: -1, col: -1 }, // Diagonal
    { row: -1, col: 1 },
    { row: 1, col: -1 },
    { row: 1, col: 1 },
  ];

  for (const dir of directions) {
    const to = { row: from.row + dir.row, col: from.col + dir.col };

    if (!inBoard(to)) continue;

    // Must stay in palace
    const inChoPalace = to.row >= 0 && to.row <= 2 && to.col >= 3 && to.col <= 5;
    const inHanPalace = to.row >= 7 && to.row <= 9 && to.col >= 3 && to.col <= 5;

    if (!inChoPalace && !inHanPalace) continue;

    const targetPiece = getPiece(board, to);
    if (canCapture(piece, targetPiece)) {
      moves.push({ from, to });
    }
  }

  return moves;
}

function getSoldierMoves(board: Board, from: Position, piece: number): Move[] {
  const moves: Move[] = [];
  const isHan = piece > 0;

  for (const way of JOL_WAYS) {
    let to = { row: from.row + way.row * (isHan ? -1 : 1), col: from.col + way.col };

    if (!inBoard(to)) continue;

    const targetPiece = getPiece(board, to);
    if (canCapture(piece, targetPiece)) {
      moves.push({ from, to });
    }
  }

  // TODO: Add diagonal moves in palace

  return moves;
}
