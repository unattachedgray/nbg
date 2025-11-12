/**
 * Janggi FEN utilities
 * Since chess.js doesn't support Janggi, we need manual FEN manipulation
 *
 * Janggi starting position:
 * rnba1abnr/4k4/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/4K4/RNBA1ABNR w - - 0 1
 *
 * Key differences from chess:
 * - 9x10 board (9 files, 10 ranks)
 * - Generals (k/K) start in CENTER of palace (rank 1 and 8, file 4)
 * - Advisors on files 3 and 5
 * - Pieces sit on intersections, not in squares
 */

export interface JanggiPosition {
  board: (string | null)[][]; // 10x9 board
  turn: 'w' | 'b';
  moveNumber: number;
}

/**
 * Parse Janggi FEN into a position object
 * Example: rnba1abnr/4k4/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/4K4/RNBA1ABNR w - - 0 1
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
 * Validate if a Janggi move is legal (basic validation)
 * @param fen Current position FEN
 * @param move Move in notation like "a0b0" (from square to square)
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateJanggiMove(fen: string, move: string): {isValid: boolean; error?: string} {
  if (move.length < 4) {
    return {isValid: false, error: 'Invalid move notation'};
  }

  // Parse move notation (format: file+rank+file+rank, e.g., "e1e2" or "e10e9")
  // Find where second file starts (it's the first letter after the first file)
  const fromFile = move.charCodeAt(0) - 'a'.charCodeAt(0);
  let rankSplitIdx = 1;
  while (rankSplitIdx < move.length && (move[rankSplitIdx] < 'a' || move[rankSplitIdx] > 'i')) {
    rankSplitIdx++;
  }

  const fromRank = parseInt(move.substring(1, rankSplitIdx), 10);
  const toFile = move.charCodeAt(rankSplitIdx) - 'a'.charCodeAt(0);
  const toRank = parseInt(move.substring(rankSplitIdx + 1), 10);

  const from = move.substring(0, rankSplitIdx);
  const to = move.substring(rankSplitIdx);

  // Check if from and to are different
  if (from === to) {
    return {isValid: false, error: 'From and to squares must be different'};
  }

  // Validate coordinates (Janggi uses files a-i [0-8] and ranks 1-10)
  if (
    fromFile < 0 ||
    fromFile > 8 ||
    toFile < 0 ||
    toFile > 8 ||
    fromRank < 1 ||
    fromRank > 10 ||
    toRank < 1 ||
    toRank > 10
  ) {
    return {isValid: false, error: 'Move coordinates out of bounds'};
  }

  // For Janggi, Fairy-Stockfish uses rank notation 1-10 (not 0-9!)
  // Rank 1 = bottom (red), Rank 10 = top (blue)
  // FEN array uses 0-9: index 0 = top (blue), index 9 = bottom (red)
  // Conversion: FEN rank index = 10 - notation rank
  const fromRankIndex = 10 - fromRank;
  const toRankIndex = 10 - toRank;

  // Parse FEN
  const position = parseJanggiFEN(fen);

  // Check if there's a piece at from square
  const piece = position.board[fromRankIndex]?.[fromFile];

  // ALWAYS log for debugging the coordinate system
  console.log('=== JANGGI MOVE DEBUG ===');
  console.log('Engine move notation:', move);
  console.log('Parsed: file', String.fromCharCode(fromFile + 97), '(index', fromFile + ') rank', fromRank);
  console.log('Conversion: FEN rank', fromRankIndex, '= 10 -', fromRank);
  console.log('Piece at [', fromRankIndex, '][', fromFile, ']:', piece);

  if (!piece) {
    console.log('ERROR: No piece found!');
    console.log('Full board state:');
    position.board.forEach((rank, i) => {
      const rankStr = rank.map((p, fileIdx) => {
        const marker = (i === fromRankIndex && fileIdx === fromFile) ? ' <--HERE' : '';
        return `${String.fromCharCode(97 + fileIdx)}:${p || '___'}${marker}`;
      }).join(' ');
      console.log(`  FEN rank ${i}: ${rankStr}`);
    });
    console.log('=============================');
    return {isValid: false, error: 'No piece at from square'};
  }

  console.log('✓ Found piece:', piece);
  console.log('=========================');

  // Check if piece belongs to current player
  const pieceColor = piece[0]; // 'r' or 'b'
  const expectedColor = position.turn === 'w' ? 'r' : 'b';
  if (pieceColor !== expectedColor) {
    return {isValid: false, error: 'Not your turn - cannot move opponent\'s piece'};
  }

  // Check if capturing own piece
  const targetPiece = position.board[toRankIndex]?.[toFile];
  if (targetPiece && targetPiece[0] === pieceColor) {
    return {isValid: false, error: 'Cannot capture your own piece'};
  }

  // Basic validation passed
  // TODO: Add full Janggi movement rules (piece-specific movement patterns)
  return {isValid: true};
}

/**
 * Apply a move to a Janggi position and return updated position
 * @param fen Current position FEN
 * @param move Move in notation like "a0b0" (from square to square)
 * @returns Updated FEN, or original FEN if move is invalid
 */
export function applyMoveToFEN(fen: string, move: string): string {
  // Validate move first
  const validation = validateJanggiMove(fen, move);
  if (!validation.isValid) {
    console.error('Invalid move:', validation.error);
    return fen;
  }

  // Parse move notation (format: file+rank+file+rank, e.g., "e1e2" or "e10e9")
  // Find where second file starts (it's the first letter after the first file)
  const fromFile = move.charCodeAt(0) - 'a'.charCodeAt(0);
  let rankSplitIdx = 1;
  while (rankSplitIdx < move.length && (move[rankSplitIdx] < 'a' || move[rankSplitIdx] > 'i')) {
    rankSplitIdx++;
  }

  const fromRank = parseInt(move.substring(1, rankSplitIdx), 10);
  const toFile = move.charCodeAt(rankSplitIdx) - 'a'.charCodeAt(0);
  const toRank = parseInt(move.substring(rankSplitIdx + 1), 10);

  // For Janggi, Fairy-Stockfish uses rank notation 1-10 (not 0-9!)
  // Rank 1 = bottom (red), Rank 10 = top (blue)
  // FEN array uses 0-9: index 0 = top (blue), index 9 = bottom (red)
  // Conversion: FEN rank index = 10 - notation rank
  const fromRankIndex = 10 - fromRank;
  const toRankIndex = 10 - toRank;

  // Parse FEN
  const position = parseJanggiFEN(fen);

  // Get piece at from square (we already validated it exists)
  const piece = position.board[fromRankIndex][fromFile]!;

  // Move piece
  position.board[fromRankIndex][fromFile] = null;
  position.board[toRankIndex][toFile] = piece;

  // Toggle turn
  position.turn = position.turn === 'w' ? 'b' : 'w';

  // Increment move number if black just moved
  if (position.turn === 'w') {
    position.moveNumber++;
  }

  // Convert back to FEN
  return positionToFEN(position);
}
