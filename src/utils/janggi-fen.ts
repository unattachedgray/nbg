/**
 * Janggi FEN utilities
 * Since chess.js doesn't support Janggi, we need manual FEN manipulation
 */

export interface JanggiPosition {
  board: (string | null)[][]; // 10x9 board
  turn: 'w' | 'b';
  moveNumber: number;
}

/**
 * Parse Janggi FEN into a position object
 */
export function parseJanggiFEN(fen: string): JanggiPosition {
  const parts = fen.split(' ');
  const boardPart = parts[0];
  const turn = (parts[1] || 'w') as 'w' | 'b';
  const moveNumber = parseInt(parts[5] || '1', 10);

  const ranks = boardPart.split('/');
  const board: (string | null)[][] = [];

  for (let rank = 0; rank < 10; rank++) {
    const rankData = ranks[rank] || '';
    const row: (string | null)[] = [];

    for (let i = 0; i < rankData.length; i++) {
      const char = rankData[i];

      if (char >= '1' && char <= '9') {
        const emptyCount = parseInt(char);
        for (let j = 0; j < emptyCount; j++) {
          row.push(null);
        }
      } else {
        // Piece: map FEN notation to internal notation
        const color = char === char.toUpperCase() ? 'r' : 'b';
        let piece = char.toLowerCase();

        // Map chess-like notation to Janggi pieces
        if (piece === 'n') piece = 'h'; // knight -> horse
        if (piece === 'b') piece = 'e'; // bishop -> elephant

        row.push(color + piece);
      }
    }

    board.push(row);
  }

  return {board, turn, moveNumber};
}

/**
 * Convert position object back to FEN string
 */
export function positionToFEN(position: JanggiPosition): string {
  const ranks: string[] = [];

  for (let rank = 0; rank < 10; rank++) {
    let rankStr = '';
    let emptyCount = 0;

    for (let file = 0; file < 9; file++) {
      const piece = position.board[rank]?.[file];

      if (!piece) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rankStr += emptyCount.toString();
          emptyCount = 0;
        }

        // Convert internal notation back to FEN notation
        const color = piece[0];
        let pieceType = piece[1];

        // Map Janggi pieces back to chess-like notation
        if (pieceType === 'h') pieceType = 'n'; // horse -> knight
        if (pieceType === 'e') pieceType = 'b'; // elephant -> bishop

        rankStr += color === 'r' ? pieceType.toUpperCase() : pieceType;
      }
    }

    if (emptyCount > 0) {
      rankStr += emptyCount.toString();
    }

    ranks.push(rankStr);
  }

  return `${ranks.join('/')} ${position.turn} - - 0 ${position.moveNumber}`;
}

/**
 * Apply a move to a Janggi position and return updated position
 * @param fen Current position FEN
 * @param move Move in notation like "a0b0" (from square to square)
 * @returns Updated FEN
 */
export function applyMoveToFEN(fen: string, move: string): string {
  console.log('applyMoveToFEN called with FEN:', fen, 'move:', move);

  if (move.length < 4) {
    console.error('Invalid move notation:', move);
    return fen;
  }

  const from = move.substring(0, 2);
  const to = move.substring(2, 4);
  console.log('From:', from, 'To:', to);

  // Parse coordinates
  const fromFile = from.charCodeAt(0) - 'a'.charCodeAt(0);
  const fromRank = parseInt(from[1], 10);
  const toFile = to.charCodeAt(0) - 'a'.charCodeAt(0);
  const toRank = parseInt(to[1], 10);

  // Validate coordinates
  if (
    fromFile < 0 ||
    fromFile > 8 ||
    toFile < 0 ||
    toFile > 8 ||
    fromRank < 0 ||
    fromRank > 9 ||
    toRank < 0 ||
    toRank > 9
  ) {
    console.error('Invalid move coordinates:', move);
    return fen;
  }

  // Parse FEN
  const position = parseJanggiFEN(fen);

  // Get piece at from square
  const piece = position.board[fromRank]?.[fromFile];
  if (!piece) {
    console.error('No piece at from square:', from);
    return fen;
  }

  // Move piece
  position.board[fromRank][fromFile] = null;
  position.board[toRank][toFile] = piece;

  // Toggle turn
  position.turn = position.turn === 'w' ? 'b' : 'w';

  // Increment move number if black just moved
  if (position.turn === 'w') {
    position.moveNumber++;
  }

  // Convert back to FEN
  return positionToFEN(position);
}
