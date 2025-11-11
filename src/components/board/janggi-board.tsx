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
    console.log('JanggiBoard: Parsing FEN:', fenString);
    // Janggi FEN format: board is 10 ranks, 9 files
    // Example: rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR
    const [boardPart] = fenString.split(' ');
    const ranks = boardPart.split('/');

    // Validate that we have a Janggi FEN (10 ranks)
    if (ranks.length !== 10) {
      console.error('JanggiBoard: Invalid FEN - expected 10 ranks, got', ranks.length);
      console.error('JanggiBoard: This looks like a chess FEN, not Janggi');
      // Return empty 10x9 board instead of crashing
      return Array.from({length: 10}, () => Array(9).fill(null));
    }

    const newBoard: (string | null)[][] = [];

    for (let rank = 0; rank < 10; rank++) {
      const rankData = ranks[rank];
      if (!rankData) {
        console.error('JanggiBoard: Missing rank data for rank', rank);
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

    console.log('JanggiBoard: Parsed board has', newBoard.length, 'ranks');
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
    console.log('JanggiBoard: useEffect triggered - FEN prop changed:', fen);
    console.log('JanggiBoard: FEN validation - split length:', fen ? fen.split('/').length : 'no FEN');
    if (fen) {
      const parsedBoard = parseFEN(fen);
      console.log('JanggiBoard: Parsed board, length:', parsedBoard.length);
      setBoard(parsedBoard);
      console.log('JanggiBoard: Board state updated');
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

  const renderSquare = (rank: number, file: number) => {
    const piece = board[rank]?.[file];
    const square = getSquareNotation(rank, file);
    const inPalace = isInPalace(rank, file);

    return (
      <Pressable
        key={`${rank}-${file}`}
        style={[
          styles.intersection,
          {backgroundColor: getSquareColor(rank, file)},
        ]}
        onPress={() => handleSquarePress(rank, file)}>
        {/* Render piece */}
        {piece && (
          <JanggiPiece
            piece={piece}
            size={Math.min(intersectionWidth * 0.8, intersectionHeight * 0.8)}
          />
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

        {/* Palace diagonal markers */}
        {inPalace && (rank % 2 === file % 2 || (rank === 1 && file === 4) || (rank === 8 && file === 4)) && (
          <View style={styles.palaceMark} />
        )}
      </Pressable>
    );
  };

  console.log('JanggiBoard: Rendering with board length:', board.length);
  console.log('JanggiBoard: FEN prop:', fen);

  return (
    <View style={styles.container}>
      <View style={styles.board}>
        {board.length === 0 ? (
          <Text style={{color: 'white', fontSize: 20}}>Loading board...</Text>
        ) : (
          Array.from({length: 10}, (_, rank) => (
            <View key={rank} style={styles.rank}>
              {Array.from({length: 9}, (_, file) => renderSquare(rank, file))}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const windowWidth = Dimensions.get('window').width;
const boardHeight = Math.min(windowWidth - 40, 540); // 9x10 aspect ratio
const boardWidth = boardHeight * 0.9;
const intersectionWidth = boardWidth / 9;
const intersectionHeight = boardHeight / 10;

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
  },
  rank: {
    flexDirection: 'row',
  },
  intersection: {
    width: intersectionWidth,
    height: intersectionHeight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 0.5,
    borderColor: '#8B4513', // Saddle brown
  },
  fileLabel: {
    position: 'absolute',
    top: 2,
    left: 2,
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.4)',
  },
  rankLabel: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.4)',
  },
  palaceMark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6D4C41',
  },
});
