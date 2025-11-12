/**
 * Janggi3 Game Logic - Standalone Implementation
 * Ported from ladofa/janggi Python implementation
 *
 * Board: 10 rows × 9 columns (0-indexed)
 * Coordinate system: (row, col) where row 0 is top (Cho/Blue), row 9 is bottom (Han/Red)
 */

// Piece types
export enum PieceType {
  EMPTY = 0,
  // Han (Red/Bottom) pieces - positive values
  HAN_JOL = 1,    // Soldier (졸)
  HAN_SANG = 2,   // Elephant (상)
  HAN_MA = 3,     // Horse (마)
  HAN_PO = 4,     // Cannon (포)
  HAN_CHA = 5,    // Chariot (차)
  HAN_SA = 6,     // Guard (사)
  HAN_KING = 7,   // General (한)
  // Cho (Blue/Top) pieces - negative values
  CHO_JOL = -1,   // Soldier (병)
  CHO_SANG = -2,  // Elephant (象)
  CHO_MA = -3,    // Horse (馬)
  CHO_PO = -4,    // Cannon (包)
  CHO_CHA = -5,   // Chariot (車)
  CHO_SA = -6,    // Guard (士)
  CHO_KING = -7,  // General (초)
}

// Initial setup variations (elephant/horse positions)
export enum Setup {
  MSSM = 0, // 마상상마 (Horse-Elephant-Elephant-Horse)
  SMMS = 1, // 상마마상 (Elephant-Horse-Horse-Elephant)
  SMSM = 2, // 상마상마 (Elephant-Horse-Elephant-Horse)
  MSMS = 3, // 마상마상 (Horse-Elephant-Horse-Elephant)
}

export type Position = {
  row: number;
  col: number;
};

export type Move = {
  from: Position;
  to: Position;
};

export type Board = number[][]; // 10x9 array of PieceType values

// Palace (궁) coordinates for movement rules
const PALACE_COORDS = {
  cho: { rows: [0, 1, 2], cols: [3, 4, 5] }, // Top palace (Cho)
  han: { rows: [7, 8, 9], cols: [3, 4, 5] }, // Bottom palace (Han)
};

/**
 * Create initial board with specified setups
 */
export function createInitialBoard(
  hanSetup: Setup = Setup.MSSM,
  choSetup: Setup = Setup.MSSM
): Board {
  const board: Board = Array(10).fill(0).map(() => Array(9).fill(PieceType.EMPTY));

  // Cho (Blue/Top) pieces - rows 0-3
  board[0][0] = PieceType.CHO_CHA;
  board[0][3] = PieceType.CHO_SA;
  board[0][4] = PieceType.CHO_KING;
  board[0][5] = PieceType.CHO_SA;
  board[0][8] = PieceType.CHO_CHA;
  board[1][4] = PieceType.EMPTY; // King position (will be set below)
  board[2][1] = PieceType.CHO_PO;
  board[2][7] = PieceType.CHO_PO;
  board[3][0] = PieceType.CHO_JOL;
  board[3][2] = PieceType.CHO_JOL;
  board[3][4] = PieceType.CHO_JOL;
  board[3][6] = PieceType.CHO_JOL;
  board[3][8] = PieceType.CHO_JOL;

  // Cho King at correct position
  board[1][4] = PieceType.CHO_KING;

  // Han (Red/Bottom) pieces - rows 6-9
  board[9][0] = PieceType.HAN_CHA;
  board[9][3] = PieceType.HAN_SA;
  board[9][5] = PieceType.HAN_SA;
  board[9][8] = PieceType.HAN_CHA;
  board[8][4] = PieceType.HAN_KING;
  board[7][1] = PieceType.HAN_PO;
  board[7][7] = PieceType.HAN_PO;
  board[6][0] = PieceType.HAN_JOL;
  board[6][2] = PieceType.HAN_JOL;
  board[6][4] = PieceType.HAN_JOL;
  board[6][6] = PieceType.HAN_JOL;
  board[6][8] = PieceType.HAN_JOL;

  // Set elephant and horse positions based on setup
  setSetupPieces(board, 0, choSetup, false); // Cho (negative pieces)
  setSetupPieces(board, 9, hanSetup, true);  // Han (positive pieces)

  return board;
}

function setSetupPieces(board: Board, row: number, setup: Setup, isHan: boolean) {
  const MA = isHan ? PieceType.HAN_MA : PieceType.CHO_MA;
  const SANG = isHan ? PieceType.HAN_SANG : PieceType.CHO_SANG;

  switch (setup) {
    case Setup.MSSM:
      board[row][1] = MA;
      board[row][2] = SANG;
      board[row][6] = SANG;
      board[row][7] = MA;
      break;
    case Setup.SMMS:
      board[row][1] = SANG;
      board[row][2] = MA;
      board[row][6] = MA;
      board[row][7] = SANG;
      break;
    case Setup.SMSM:
      board[row][1] = SANG;
      board[row][2] = MA;
      board[row][6] = SANG;
      board[row][7] = MA;
      break;
    case Setup.MSMS:
      board[row][1] = MA;
      board[row][2] = SANG;
      board[row][6] = MA;
      board[row][7] = SANG;
      break;
  }
}

/**
 * Check if position is within board bounds
 */
export function inBoard(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 10 && pos.col >= 0 && pos.col < 9;
}

/**
 * Check if position is in palace
 */
export function inPalace(pos: Position): boolean {
  const inChoPalace = PALACE_COORDS.cho.rows.includes(pos.row) &&
                      PALACE_COORDS.cho.cols.includes(pos.col);
  const inHanPalace = PALACE_COORDS.han.rows.includes(pos.row) &&
                      PALACE_COORDS.han.cols.includes(pos.col);
  return inChoPalace || inHanPalace;
}

/**
 * Get piece at position
 */
export function getPiece(board: Board, pos: Position): number {
  if (!inBoard(pos)) return PieceType.EMPTY;
  return board[pos.row][pos.col];
}

/**
 * Set piece at position
 */
export function setPiece(board: Board, pos: Position, piece: number): void {
  if (inBoard(pos)) {
    board[pos.row][pos.col] = piece;
  }
}

/**
 * Check if piece belongs to current player (Han = positive, Cho = negative)
 */
export function isHanPiece(piece: number): boolean {
  return piece > 0;
}

export function isChoPiece(piece: number): boolean {
  return piece < 0;
}

/**
 * Apply move to board (returns new board)
 */
export function applyMove(board: Board, move: Move): Board {
  const newBoard = board.map(row => [...row]);
  const piece = getPiece(newBoard, move.from);
  setPiece(newBoard, move.from, PieceType.EMPTY);
  setPiece(newBoard, move.to, piece);
  return newBoard;
}

/**
 * Check if game is over
 * Returns: 1 (Han wins), -1 (Cho wins), 0 (Bikjang draw), null (game continues)
 */
export function getGameResult(board: Board): number | null {
  const hanArea = board.slice(7); // Rows 7-9 (Han palace area)
  const choArea = board.slice(0, 3); // Rows 0-2 (Cho palace area)

  const hanKingInHanArea = hanArea.some(row => row.includes(PieceType.HAN_KING));
  const choKingInChoArea = choArea.some(row => row.includes(PieceType.CHO_KING));
  const choKingInHanArea = hanArea.some(row => row.includes(PieceType.CHO_KING));
  const hanKingInChoArea = choArea.some(row => row.includes(PieceType.HAN_KING));

  // Han king captured
  if (!hanKingInHanArea) {
    return choKingInHanArea ? 0 : -1; // Bikjang or Cho wins
  }

  // Cho king captured
  if (!choKingInChoArea) {
    return hanKingInChoArea ? 0 : 1; // Bikjang or Han wins
  }

  return null; // Game continues
}

/**
 * Convert position to algebraic notation (e.g., "e4")
 */
export function positionToNotation(pos: Position): string {
  const files = 'abcdefghi';
  return `${files[pos.col]}${pos.row}`;
}

/**
 * Convert algebraic notation to position
 */
export function notationToPosition(notation: string): Position | null {
  if (notation.length < 2) return null;
  const files = 'abcdefghi';
  const col = files.indexOf(notation[0]);
  const row = parseInt(notation[1], 10);
  if (col === -1 || isNaN(row) || row < 0 || row > 9) return null;
  return { row, col };
}
