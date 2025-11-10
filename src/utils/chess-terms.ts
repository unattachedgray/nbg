import {ChessTerm} from '../types/game';

export const chessTerms: Record<string, ChessTerm> = {
  // Game Concepts
  check: {
    term: 'Check',
    definition: 'When a king is under direct attack by an opponent\'s piece.',
    example: 'After Qh5+, the black king is in check.',
  },
  checkmate: {
    term: 'Checkmate',
    definition:
      'When a king is in check and has no legal move to escape. This ends the game.',
    example: 'Scholar\'s Mate is a checkmate in four moves.',
  },
  stalemate: {
    term: 'Stalemate',
    definition:
      'When a player has no legal moves but is not in check. Results in a draw.',
    example:
      'If your opponent has only a king and no legal moves, it\'s a stalemate.',
  },
  castling: {
    term: 'Castling',
    definition:
      'A special king and rook move. The king moves two squares toward the rook, then the rook jumps over.',
    example: '0-0 for kingside castling, 0-0-0 for queenside castling.',
  },
  'en passant': {
    term: 'En Passant',
    definition:
      'A special pawn capture. If an opponent\'s pawn moves two squares forward and lands beside your pawn, you can capture it as if it had moved only one square.',
    example:
      'If Black plays e7-e5 next to your pawn on d5, you can capture with dxe6.',
  },

  // Tactical Patterns
  fork: {
    term: 'Fork',
    definition:
      'An attack on two or more pieces simultaneously with one piece.',
    example: 'A knight on e5 attacking both the queen on c6 and rook on g4.',
  },
  pin: {
    term: 'Pin',
    definition:
      'When a piece cannot move without exposing a more valuable piece behind it to capture.',
    example: 'A bishop pinning a knight to the king.',
  },
  skewer: {
    term: 'Skewer',
    definition:
      'An attack on a valuable piece that forces it to move, exposing a less valuable piece behind it.',
    example: 'A rook attacking the queen, forcing it to move and capturing the rook behind it.',
  },
  'discovered attack': {
    term: 'Discovered Attack',
    definition:
      'When moving one piece reveals an attack from another piece behind it.',
    example: 'Moving a knight reveals a bishop attack on the opponent\'s queen.',
  },
  'double check': {
    term: 'Double Check',
    definition:
      'When a king is put in check by two pieces simultaneously through a discovered attack.',
    example: 'Moving a knight puts the king in check while revealing a bishop check.',
  },

  // Strategic Concepts
  development: {
    term: 'Development',
    definition:
      'Moving pieces from their starting positions to more active squares in the opening.',
    example: 'Knights and bishops should be developed before the queen.',
  },
  'center control': {
    term: 'Center Control',
    definition:
      'Controlling the four central squares (d4, d5, e4, e5) with pawns and pieces.',
    example: 'Pawns on e4 and d4 give White strong center control.',
  },
  initiative: {
    term: 'Initiative',
    definition:
      'Having the ability to make threats and force the opponent to respond.',
    example: 'After a strong attack, White seized the initiative.',
  },
  tempo: {
    term: 'Tempo',
    definition:
      'A unit of time in chess, worth about one move. Gaining a tempo means making your opponent waste a move.',
    example: 'Attacking a piece with gain of tempo forces it to move again.',
  },
  space: {
    term: 'Space Advantage',
    definition: 'Controlling more squares on the board than the opponent.',
    example: 'Advanced pawns give you more space to maneuver your pieces.',
  },

  // Endgame Terms
  opposition: {
    term: 'Opposition',
    definition:
      'When two kings face each other with one square between them. The player not to move has the opposition.',
    example: 'In king and pawn endgames, having the opposition is crucial.',
  },
  zugzwang: {
    term: 'Zugzwang',
    definition:
      'A position where any move worsens one\'s position. The player would prefer not to move.',
    example: 'In endgames, putting your opponent in zugzwang can force a win.',
  },
  'passed pawn': {
    term: 'Passed Pawn',
    definition:
      'A pawn with no opposing pawns blocking its advance to promotion.',
    example: 'A passed pawn on the 7th rank is very dangerous.',
  },
  promotion: {
    term: 'Promotion',
    definition:
      'When a pawn reaches the 8th rank, it must be promoted to a queen, rook, bishop, or knight.',
    example: 'Promoting to a queen is most common, but underpromotion can be useful.',
  },

  // Janggi Terms (Korean Chess)
  palace: {
    term: 'Palace',
    definition: 'The 3x3 area in Janggi where the king and guards must stay.',
    example: 'The diagonal lines in the palace allow special movements.',
  },
  cannon: {
    term: 'Cannon (Po)',
    definition:
      'In Janggi, the cannon must jump over exactly one piece to capture.',
    example: 'The cannon is similar to Xiangqi but has different rules.',
  },

  // General Terms
  opening: {
    term: 'Opening',
    definition: 'The initial phase of the game, typically the first 10-15 moves.',
    example: 'The Sicilian Defense is a popular opening for Black.',
  },
  middlegame: {
    term: 'Middlegame',
    definition:
      'The phase after the opening where most pieces are developed and tactical battles occur.',
    example: 'Complex tactics and combinations are common in the middlegame.',
  },
  endgame: {
    term: 'Endgame',
    definition:
      'The final phase with few pieces remaining, where king activity becomes crucial.',
    example: 'King and pawn endgames require precise calculation.',
  },
  gambit: {
    term: 'Gambit',
    definition:
      'An opening where material (usually a pawn) is sacrificed for positional advantage or rapid development.',
    example: 'The King\'s Gambit sacrifices the f-pawn for quick development.',
  },
  sacrifice: {
    term: 'Sacrifice',
    definition:
      'Deliberately giving up material for compensation such as attack, position, or time.',
    example: 'A queen sacrifice can lead to checkmate.',
  },
  evaluation: {
    term: 'Evaluation',
    definition:
      'Assessing a position numerically. Positive values favor White, negative favor Black.',
    example: '+2.5 means White is ahead by about 2.5 pawns in material/position.',
  },
  'principal variation': {
    term: 'Principal Variation (PV)',
    definition:
      'The sequence of best moves found by a chess engine for both sides.',
    example: 'The engine shows the PV as the recommended continuation.',
  },
};

// Function to search for terms in text
export function findTermsInText(text: string): ChessTerm[] {
  const foundTerms: ChessTerm[] = [];
  const lowerText = text.toLowerCase();

  Object.keys(chessTerms).forEach((key) => {
    if (lowerText.includes(key.toLowerCase())) {
      foundTerms.push(chessTerms[key]);
    }
  });

  return foundTerms;
}

// Function to get term by key
export function getTerm(key: string): ChessTerm | undefined {
  return chessTerms[key.toLowerCase()];
}

// Function to get all terms for a variant
export function getTermsForVariant(variant: string): ChessTerm[] {
  if (variant === 'janggi') {
    return Object.values(chessTerms).filter(
      (term) =>
        term.term.includes('Janggi') ||
        term.term.includes('Palace') ||
        term.term.includes('Cannon') ||
        !term.term.includes('Chess'),
    );
  }
  return Object.values(chessTerms);
}
