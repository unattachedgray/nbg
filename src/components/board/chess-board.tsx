import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Pressable, Dimensions} from 'react-native';
import {Chess} from 'chess.js';
import {GameVariant, Square} from '../../types/game';

interface ChessBoardProps {
  variant?: GameVariant;
  onMove?: (from: Square, to: Square) => void;
  fen?: string;
}

const PIECE_SYMBOLS: Record<string, string> = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
  P: '♙',
  N: '♘',
  B: '♗',
  R: '♖',
  Q: '♕',
  K: '♔',
};

export function ChessBoard({
  variant = 'chess',
  onMove,
  fen,
}: ChessBoardProps): React.JSX.Element {
  const [game] = useState(() => new Chess(fen));
  const [board, setBoard] = useState(game.board());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);

  useEffect(() => {
    if (fen) {
      game.load(fen);
      setBoard(game.board());
    }
  }, [fen, game]);

  const handleSquarePress = (row: number, col: number) => {
    const files = 'abcdefgh';
    const ranks = '87654321';
    const square = `${files[col]}${ranks[row]}` as Square;

    if (selectedSquare) {
      // Try to make a move
      const move = game.move({
        from: selectedSquare,
        to: square,
        promotion: 'q', // Always promote to queen for simplicity
      });

      if (move) {
        setBoard(game.board());
        onMove?.(selectedSquare, square);
        setSelectedSquare(null);
        setLegalMoves([]);
      } else if (board[row][col] && board[row][col]!.color === game.turn()) {
        // Select different piece
        setSelectedSquare(square);
        const moves = game.moves({square: square as any, verbose: true});
        setLegalMoves(moves.map((m: any) => m.to));
      } else {
        // Deselect
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    } else {
      // Select a piece
      if (board[row][col] && board[row][col]!.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({square: square as any, verbose: true});
        setLegalMoves(moves.map((m: any) => m.to));
      }
    }
  };

  const getSquareColor = (row: number, col: number): string => {
    const isLight = (row + col) % 2 === 0;
    const files = 'abcdefgh';
    const ranks = '87654321';
    const square = `${files[col]}${ranks[row]}`;

    if (selectedSquare === square) {
      return '#f4e04d'; // Yellow for selected
    }
    if (legalMoves.includes(square)) {
      return isLight ? '#baca44' : '#a0b044'; // Green tint for legal moves
    }
    return isLight ? '#f0d9b5' : '#b58863'; // Standard chess board colors
  };

  const renderSquare = (row: number, col: number) => {
    const piece = board[row][col];
    const files = 'abcdefgh';
    const ranks = '87654321';
    const square = `${files[col]}${ranks[row]}`;

    return (
      <Pressable
        key={`${row}-${col}`}
        style={[
          styles.square,
          {backgroundColor: getSquareColor(row, col)},
        ]}
        onPress={() => handleSquarePress(row, col)}>
        {piece && (
          <Text
            style={[
              styles.piece,
              piece.color === 'w' ? styles.whitePiece : styles.blackPiece,
            ]}>
            {PIECE_SYMBOLS[piece.type.toUpperCase()]}
          </Text>
        )}
        {/* Show coordinates on edge squares */}
        {col === 0 && (
          <Text style={styles.rankLabel}>{ranks[row]}</Text>
        )}
        {row === 7 && (
          <Text style={styles.fileLabel}>{files[col]}</Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.board}>
        {board.map((rowPieces, row) => (
          <View key={row} style={styles.row}>
            {rowPieces.map((_, col) => renderSquare(row, col))}
          </View>
        ))}
      </View>
      <View style={styles.info}>
        <Text style={styles.turnText}>
          {game.turn() === 'w' ? 'White' : 'Black'} to move
        </Text>
        {game.isCheck() && <Text style={styles.checkText}>Check!</Text>}
        {game.isCheckmate() && (
          <Text style={styles.mateText}>Checkmate!</Text>
        )}
        {game.isStalemate() && (
          <Text style={styles.drawText}>Stalemate!</Text>
        )}
      </View>
    </View>
  );
}

const windowWidth = Dimensions.get('window').width;
const boardSize = Math.min(windowWidth - 40, 500);
const squareSize = boardSize / 8;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  board: {
    width: boardSize,
    height: boardSize,
    borderWidth: 2,
    borderColor: '#333333',
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
  },
  square: {
    width: squareSize,
    height: squareSize,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  piece: {
    fontSize: squareSize * 0.7,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  whitePiece: {
    color: '#ffffff',
  },
  blackPiece: {
    color: '#000000',
  },
  rankLabel: {
    position: 'absolute',
    top: 2,
    left: 2,
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.5)',
  },
  fileLabel: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(0, 0, 0, 0.5)',
  },
  info: {
    marginTop: 20,
    alignItems: 'center',
  },
  turnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  checkText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    marginTop: 8,
  },
  mateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 8,
  },
  drawText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 8,
  },
});
