import React, {useState} from 'react';
import {View, Text, StyleSheet, Pressable, Dimensions, Image, ImageSourcePropType} from 'react-native';
import {
  Board as GameBoard,
  Position,
  getPiece,
  PieceType,
} from '../../game/janggi2-game';

// Janggi piece images (ladofa/janggi style)
const PIECE_IMAGES: Record<string, ImageSourcePropType> = {
  // Han (Red) pieces
  'han_jol': require('../../assets/janggi2-pieces/rp.png'),
  'han_sang': require('../../assets/janggi2-pieces/re.png'),
  'han_ma': require('../../assets/janggi2-pieces/rh.png'),
  'han_po': require('../../assets/janggi2-pieces/rc.png'),
  'han_cha': require('../../assets/janggi2-pieces/rr.png'),
  'han_sa': require('../../assets/janggi2-pieces/ra.png'),
  'han_king': require('../../assets/janggi2-pieces/rk.png'),
  // Cho (Blue) pieces
  'cho_jol': require('../../assets/janggi2-pieces/bp.png'),
  'cho_sang': require('../../assets/janggi2-pieces/be.png'),
  'cho_ma': require('../../assets/janggi2-pieces/bh.png'),
  'cho_po': require('../../assets/janggi2-pieces/bc.png'),
  'cho_cha': require('../../assets/janggi2-pieces/br.png'),
  'cho_sa': require('../../assets/janggi2-pieces/ba.png'),
  'cho_king': require('../../assets/janggi2-pieces/bk.png'),
};

interface Janggi2BoardProps {
  board: GameBoard;
  onMove?: (from: Position, to: Position) => void;
  highlightedMoves?: Position[];
  disabled?: boolean;
}

// Board dimensions - 9 files (A-I) × 10 ranks (1-10)
const BOARD_COLS = 9; // 9 vertical lines
const BOARD_ROWS = 10; // 10 horizontal lines
const windowWidth = Dimensions.get('window').width;
const maxBoardWidth = Math.min(windowWidth - 60, 640);
const LABEL_SIZE = 50; // Space for grid labels (increased more to prevent overlap)
const CELL_SIZE = (maxBoardWidth - LABEL_SIZE * 2) / (BOARD_COLS - 1); // Distance between lines
const GRID_WIDTH = (BOARD_COLS - 1) * CELL_SIZE;
const GRID_HEIGHT = (BOARD_ROWS - 1) * CELL_SIZE;
const BOARD_WIDTH = GRID_WIDTH + LABEL_SIZE * 2;
const BOARD_HEIGHT = GRID_HEIGHT + LABEL_SIZE * 2;

export function Janggi2Board({
  board,
  onMove,
  highlightedMoves = [],
  disabled = false,
}: Janggi2BoardProps): React.JSX.Element {
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);

  // Safety check - if board is undefined, don't render
  if (!board) {
    return <View style={styles.container}><Text>Loading board...</Text></View>;
  }

  const handleCellPress = (row: number, col: number) => {
    if (disabled) return;

    const clickedPos = { row, col };

    if (selectedPos) {
      // Second click - try to make a move
      if (selectedPos.row === row && selectedPos.col === col) {
        // Clicked same position - deselect
        setSelectedPos(null);
      } else {
        // Try to move
        onMove?.(selectedPos, clickedPos);
        setSelectedPos(null);
      }
    } else {
      // First click - select piece
      const piece = getPiece(board, clickedPos);
      if (piece !== PieceType.EMPTY) {
        setSelectedPos(clickedPos);
      }
    }
  };

  const getPieceImage = (piece: number): ImageSourcePropType | null => {
    const absPiece = Math.abs(piece);
    const isHan = piece > 0;
    const color = isHan ? 'han' : 'cho';

    const pieceNames: Record<number, string> = {
      1: 'jol',
      2: 'sang',
      3: 'ma',
      4: 'po',
      5: 'cha',
      6: 'sa',
      7: 'king',
    };

    const pieceName = pieceNames[absPiece];
    if (!pieceName) return null;

    return PIECE_IMAGES[`${color}_${pieceName}`] || null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.board}>
        {/* File labels (A-I) - on the lines, not squares */}
        {Array.from({length: BOARD_COLS}).map((_, i) => (
          <Text
            key={`file-top-${i}`}
            style={[styles.label, {
              top: 5,
              left: LABEL_SIZE + i * CELL_SIZE - 7,
            }]}>
            {'ABCDEFGHI'[i]}
          </Text>
        ))}
        {Array.from({length: BOARD_COLS}).map((_, i) => (
          <Text
            key={`file-bottom-${i}`}
            style={[styles.label, {
              bottom: 5,
              left: LABEL_SIZE + i * CELL_SIZE - 7,
            }]}>
            {'ABCDEFGHI'[i]}
          </Text>
        ))}
        {/* Rank labels (1-10, with 10 at top, 1 at bottom) - on the lines, not squares */}
        {Array.from({length: BOARD_ROWS}).map((_, i) => (
          <Text
            key={`rank-left-${i}`}
            style={[styles.label, {
              top: LABEL_SIZE + i * CELL_SIZE - 8,
              left: 5,
            }]}>
            {10 - i}
          </Text>
        ))}
        {Array.from({length: BOARD_ROWS}).map((_, i) => (
          <Text
            key={`rank-right-${i}`}
            style={[styles.label, {
              top: LABEL_SIZE + i * CELL_SIZE - 8,
              right: 5,
            }]}>
            {10 - i}
          </Text>
        ))}

        {/* Draw grid lines - horizontal and vertical */}
        <View style={{position: 'absolute', top: LABEL_SIZE, left: LABEL_SIZE}}>
          {/* Horizontal lines */}
          {Array.from({length: BOARD_ROWS}).map((_, i) => (
            <View
              key={`hline-${i}`}
              style={{
                position: 'absolute',
                top: i * CELL_SIZE,
                left: 0,
                width: GRID_WIDTH,
                height: 2,
                backgroundColor: '#3E2723',
                zIndex: 1,
              }}
            />
          ))}
          {/* Vertical lines */}
          {Array.from({length: BOARD_COLS}).map((_, i) => (
            <View
              key={`vline-${i}`}
              style={{
                position: 'absolute',
                left: i * CELL_SIZE,
                top: 0,
                width: 2,
                height: GRID_HEIGHT,
                backgroundColor: '#3E2723',
                zIndex: 1,
              }}
            />
          ))}
          {/* Clickable intersection points */}
          {Array.from({length: BOARD_ROWS}).map((_, row) =>
            Array.from({length: BOARD_COLS}).map((_, col) => {
              const isSelected = selectedPos?.row === row && selectedPos?.col === col;
              const isHighlighted = highlightedMoves.some(
                pos => pos.row === row && pos.col === col
              );

              return (
                <Pressable
                  key={`int-${row}-${col}`}
                  style={{
                    position: 'absolute',
                    width: CELL_SIZE * 0.4,
                    height: CELL_SIZE * 0.4,
                    top: row * CELL_SIZE - (CELL_SIZE * 0.2),
                    left: col * CELL_SIZE - (CELL_SIZE * 0.2),
                    backgroundColor: isSelected
                      ? 'rgba(255, 224, 130, 0.6)'
                      : isHighlighted
                      ? 'rgba(129, 199, 132, 0.5)'
                      : 'transparent',
                    borderRadius: 1000,
                  }}
                  onPress={() => handleCellPress(row, col)}
                />
              );
            })
          )}
        </View>

        {/* Draw palace diagonal lines using small dots along the path */}
        {/* Blue palace (top) - top-left to bottom-right (3,0) to (5,2) */}
        {Array.from({length: 30}).map((_, i) => {
          const progress = i / 29;
          return (
            <View key={`blue-diag1-${i}`} style={{
              position: 'absolute',
              width: 2,
              height: 2,
              backgroundColor: '#3E2723',
              top: Math.round(LABEL_SIZE + 0 * CELL_SIZE + progress * 2 * CELL_SIZE),
              left: Math.round(LABEL_SIZE + 3 * CELL_SIZE + progress * 2 * CELL_SIZE),
              zIndex: 2,
            }} />
          );
        })}
        {/* Blue palace (top) - top-right to bottom-left (5,0) to (3,2) */}
        {Array.from({length: 30}).map((_, i) => {
          const progress = i / 29;
          return (
            <View key={`blue-diag2-${i}`} style={{
              position: 'absolute',
              width: 2,
              height: 2,
              backgroundColor: '#3E2723',
              top: Math.round(LABEL_SIZE + 0 * CELL_SIZE + progress * 2 * CELL_SIZE),
              left: Math.round(LABEL_SIZE + 5 * CELL_SIZE - progress * 2 * CELL_SIZE),
              zIndex: 2,
            }} />
          );
        })}
        {/* Red palace (bottom) - top-left to bottom-right (3,7) to (5,9) */}
        {Array.from({length: 30}).map((_, i) => {
          const progress = i / 29;
          return (
            <View key={`red-diag1-${i}`} style={{
              position: 'absolute',
              width: 2,
              height: 2,
              backgroundColor: '#3E2723',
              top: Math.round(LABEL_SIZE + 7 * CELL_SIZE + progress * 2 * CELL_SIZE),
              left: Math.round(LABEL_SIZE + 3 * CELL_SIZE + progress * 2 * CELL_SIZE),
              zIndex: 2,
            }} />
          );
        })}
        {/* Red palace (bottom) - top-right to bottom-left (5,7) to (3,9) */}
        {Array.from({length: 30}).map((_, i) => {
          const progress = i / 29;
          return (
            <View key={`red-diag2-${i}`} style={{
              position: 'absolute',
              width: 2,
              height: 2,
              backgroundColor: '#3E2723',
              top: Math.round(LABEL_SIZE + 7 * CELL_SIZE + progress * 2 * CELL_SIZE),
              left: Math.round(LABEL_SIZE + 5 * CELL_SIZE - progress * 2 * CELL_SIZE),
              zIndex: 2,
            }} />
          );
        })}

        {/* Draw pieces */}
        {board.map((row, rowIdx) =>
          row.map((piece, colIdx) => {
            if (piece === PieceType.EMPTY) return null;

            const pieceSize = CELL_SIZE * 0.75;
            const offset = pieceSize / 2;
            const pieceImage = getPieceImage(piece);
            const isSelected = selectedPos?.row === rowIdx && selectedPos?.col === colIdx;

            return (
              <Pressable
                key={`piece-${rowIdx}-${colIdx}`}
                style={{
                  position: 'absolute',
                  width: pieceSize,
                  height: pieceSize,
                  top: Math.round(LABEL_SIZE + rowIdx * CELL_SIZE - offset),
                  left: Math.round(LABEL_SIZE + colIdx * CELL_SIZE - offset),
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 3,
                  borderRadius: pieceSize / 2,
                  borderWidth: isSelected ? 3 : 0,
                  borderColor: isSelected ? '#FFD700' : 'transparent',
                  backgroundColor: isSelected ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
                }}
                onPress={() => handleCellPress(rowIdx, colIdx)}>
                {pieceImage && (
                  <Image
                    source={pieceImage}
                    style={{
                      width: pieceSize,
                      height: pieceSize,
                    }}
                    resizeMode="contain"
                  />
                )}
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    width: BOARD_WIDTH,
    height: BOARD_HEIGHT,
    backgroundColor: '#D2A679',
    borderWidth: 3,
    borderColor: '#5D4037',
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: '#3E2723',
  },
  selectedCell: {
    backgroundColor: 'rgba(255, 224, 130, 0.5)',
  },
  label: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    zIndex: 4,
  },
});
