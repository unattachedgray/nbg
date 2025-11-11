import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Pressable, Dimensions} from 'react-native';
import {GameVariant} from '../../types/game';
import {JanggiPiece} from './janggi-piece';

interface JanggiBoardProps {
  variant?: GameVariant;
  onMove?: (from: string, to: string) => void;
  fen?: string;
  suggestedMove?: string;
  legalMoves?: string[]; // Legal moves from engine
}

// Janggi piece symbols (traditional Korean characters)
const PIECE_SYMBOLS: Record<string, string> = {
  // Red (Han) pieces - RED COLOR
  rk: '漢', // General (Han)
  ra: '士', // Advisor (Sa)
  rr: '車', // Chariot (Cha)
  rh: '馬', // Horse (Ma)
  re: '象', // Elephant (Sang)
  rc: '包', // Cannon (Po)
  rp: '卒', // Soldier (Jol)
  // Blue (Cho) pieces - BLUE COLOR
  bk: '楚', // General (Cho)
  ba: '士', // Advisor (Sa)
  br: '車', // Chariot (Cha)
  bh: '馬', // Horse (Ma)
  be: '象', // Elephant (Sang)
  bc: '包', // Cannon (Po)
  bp: '兵', // Soldier (Byeong)
};

export function JanggiBoard({
  variant = 'janggi',
  onMove,
  fen,
  suggestedMove,
  legalMoves = [],
}: JanggiBoardProps): React.JSX.Element {
  const parseFEN = (fenString: string): (string | null)[][] => {
    // Janggi FEN format: board is 10 ranks, 9 files
    // Example: rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR
    const [boardPart] = fenString.split(' ');
    const ranks = boardPart.split('/');

    // Validate that we have a Janggi FEN (10 ranks)
    if (ranks.length !== 10) {
      // Return empty 10x9 board instead of crashing
      return Array.from({length: 10}, () => Array(9).fill(null));
    }

    const newBoard: (string | null)[][] = [];

    for (let rank = 0; rank < 10; rank++) {
      const rankData = ranks[rank];
      if (!rankData) {
        newBoard.push(Array(9).fill(null));
        continue;
      }

      const row: (string | null)[] = [];

      for (let i = 0; i < rankData.length; i++) {
        const char = rankData[i];

        if (char >= '1' && char <= '9') {
          // Empty squares
          const emptyCount = parseInt(char);
          for (let j = 0; j < emptyCount; j++) {
            row.push(null);
          }
        } else {
          // Piece - map FEN notation to our internal notation
          const color = char === char.toUpperCase() ? 'r' : 'b';
          let piece = char.toLowerCase();

          // Janggi FEN uses chess-like notation, map to Janggi pieces:
          // n (knight) -> h (horse)
          // b (bishop) -> e (elephant)
          if (piece === 'n') piece = 'h';
          if (piece === 'b') piece = 'e';

          row.push(color + piece);
        }
      }

      newBoard.push(row);
    }

    return newBoard;
  };

  const [board, setBoard] = useState<(string | null)[][]>(() => {
    // Initialize with starting position if fen is provided
    if (fen) {
      return parseFEN(fen);
    }
    // Default empty 10x9 board
    return Array.from({length: 10}, () => Array(9).fill(null));
  });
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [availableMoves, setAvailableMoves] = useState<string[]>([]);

  // Parse Janggi FEN to board array when it changes
  useEffect(() => {
    if (fen) {
      const parsedBoard = parseFEN(fen);
      setBoard(parsedBoard);
    }
  }, [fen]);

  const getSquareNotation = (rank: number, file: number): string => {
    // Janggi notation: file (a-i) + rank (0-9)
    // Rank 0 is at the top (Red side), rank 9 at bottom (Blue side)
    const files = 'abcdefghi';
    return `${files[file]}${rank}`;
  };

  const handleSquarePress = (rank: number, file: number) => {
    const square = getSquareNotation(rank, file);
    const piece = board[rank]?.[file];

    if (selectedSquare) {
      // Try to make a move
      const moveNotation = `${selectedSquare}${square}`;

      // Check if this is a legal move
      if (legalMoves.some(m => m.startsWith(selectedSquare) && m.includes(square))) {
        onMove?.(selectedSquare, square);
        setSelectedSquare(null);
        setAvailableMoves([]);
      } else if (piece) {
        // Select new piece
        setSelectedSquare(square);
        // Filter legal moves for this piece
        const pieceMoves = legalMoves.filter(m => m.startsWith(square));
        setAvailableMoves(pieceMoves);
      } else {
        // Deselect
        setSelectedSquare(null);
        setAvailableMoves([]);
      }
    } else if (piece) {
      // Select piece
      setSelectedSquare(square);
      const pieceMoves = legalMoves.filter(m => m.startsWith(square));
      setAvailableMoves(pieceMoves);
    }
  };

  const isInPalace = (rank: number, file: number): boolean => {
    // Red palace: ranks 0-2, files 3-5
    // Blue palace: ranks 7-9, files 3-5
    return (
      (rank >= 0 && rank <= 2 && file >= 3 && file <= 5) ||
      (rank >= 7 && rank <= 9 && file >= 3 && file <= 5)
    );
  };

  const getSquareColor = (rank: number, file: number): string => {
    const square = getSquareNotation(rank, file);

    // Suggested move highlighting
    if (suggestedMove) {
      const from = suggestedMove.substring(0, 2);
      const to = suggestedMove.substring(2, 4);
      if (square === from) return '#90CAF9'; // Light blue
      if (square === to) return '#A5D6A7'; // Light green
    }

    // Selected square
    if (square === selectedSquare) return '#FFE082'; // Light yellow

    // Available move destinations
    if (availableMoves.some(m => m.includes(square) && !m.startsWith(square))) {
      return '#C5E1A5'; // Light lime
    }

    // Palace squares - slightly darker wood
    if (isInPalace(rank, file)) return '#C19A6B'; // Camel/light brown

    // River (between ranks 4 and 5) - lighter wood
    if (rank === 4 || rank === 5) return '#DEB887'; // Burlywood

    // Default - natural wood
    return '#D2B48C'; // Tan
  };

  const renderIntersection = (rank: number, file: number) => {
    const piece = board[rank]?.[file];
    const square = getSquareNotation(rank, file);
    const inPalace = isInPalace(rank, file);

    // Calculate position for this intersection
    const left = file * cellWidth;
    const top = rank * cellHeight;

    return (
      <Pressable
        key={`${rank}-${file}`}
        style={[
          styles.intersection,
          {
            left,
            top,
            width: cellWidth,
            height: cellHeight,
            backgroundColor: selectedSquare === square ? 'rgba(255, 224, 130, 0.5)' : 'transparent',
          },
        ]}
        onPress={() => handleSquarePress(rank, file)}>
        {/* Render piece centered on intersection */}
        {piece && (
          <View style={styles.pieceContainer}>
            <JanggiPiece
              piece={piece}
              size={Math.min(cellWidth * 0.9, cellHeight * 0.9)}
            />
          </View>
        )}

        {/* File labels (top row) */}
        {rank === 0 && (
          <Text style={styles.fileLabel}>
            {'abcdefghi'[file]}
          </Text>
        )}

        {/* Rank labels (left column) */}
        {file === 0 && (
          <Text style={styles.rankLabel}>{rank}</Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.board}>
        {/* Grid lines */}
        {Array.from({length: 10}, (_, i) => (
          <View
            key={`hline-${i}`}
            style={[
              styles.horizontalLine,
              {
                top: i * cellHeight,
                width: boardWidth,
              },
            ]}
          />
        ))}
        {Array.from({length: 9}, (_, i) => (
          <View
            key={`vline-${i}`}
            style={[
              styles.verticalLine,
              {
                left: i * cellWidth,
                height: boardHeight,
              },
            ]}
          />
        ))}

        {/* Palace diagonal lines */}
        {/* Red palace diagonals */}
        <View style={[styles.diagonalLine, {top: 0, left: 3 * cellWidth, width: 2 * cellWidth * 1.41, transform: [{rotate: '45deg'}]}]} />
        <View style={[styles.diagonalLine, {top: 0, left: 3 * cellWidth, width: 2 * cellWidth * 1.41, transform: [{rotate: '-45deg'}]}]} />

        {/* Blue palace diagonals */}
        <View style={[styles.diagonalLine, {top: 7 * cellHeight, left: 3 * cellWidth, width: 2 * cellWidth * 1.41, transform: [{rotate: '45deg'}]}]} />
        <View style={[styles.diagonalLine, {top: 7 * cellHeight, left: 3 * cellWidth, width: 2 * cellWidth * 1.41, transform: [{rotate: '-45deg'}]}]} />

        {/* Intersections with pieces */}
        {board.length === 0 ? (
          <Text style={{color: 'white', fontSize: 20}}>Loading board...</Text>
        ) : (
          Array.from({length: 10}, (_, rank) =>
            Array.from({length: 9}, (_, file) => renderIntersection(rank, file))
          )
        )}
      </View>
    </View>
  );
}

const windowWidth = Dimensions.get('window').width;
const boardHeight = Math.min(windowWidth - 40, 500); // 9x10 intersection grid
const boardWidth = boardHeight * 0.9;
// 9 files (a-i) means 8 spaces between them, 10 ranks (0-9) means 9 spaces
const cellWidth = boardWidth / 8; // Distance between vertical lines
const cellHeight = boardHeight / 9; // Distance between horizontal lines

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  board: {
    width: boardWidth,
    height: boardHeight,
    borderWidth: 4,
    borderColor: '#5D4037', // Dark brown border
    borderRadius: 4,
    backgroundColor: '#D2B48C', // Tan/wood color
    position: 'relative',
  },
  horizontalLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#3E2723', // Dark brown
  },
  verticalLine: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#3E2723', // Dark brown
  },
  diagonalLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#3E2723', // Dark brown
    transformOrigin: 'left center',
  },
  intersection: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieceContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileLabel: {
    position: 'absolute',
    top: -15,
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.6)',
  },
  rankLabel: {
    position: 'absolute',
    left: -15,
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.6)',
  },
});
