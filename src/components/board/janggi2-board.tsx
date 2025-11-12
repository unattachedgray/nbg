import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Pressable, Dimensions, Image, ImageSourcePropType} from 'react-native';
import {GameVariant} from '../../types/game';

// Janggi piece images (ladofa/janggi style)
const PIECE_IMAGES: Record<string, ImageSourcePropType> = {
  // Red (Han) pieces
  rk: require('../../assets/janggi2-pieces/rk.png'),
  ra: require('../../assets/janggi2-pieces/ra.png'),
  rr: require('../../assets/janggi2-pieces/rr.png'),
  rh: require('../../assets/janggi2-pieces/rh.png'),
  re: require('../../assets/janggi2-pieces/re.png'),
  rc: require('../../assets/janggi2-pieces/rc.png'),
  rp: require('../../assets/janggi2-pieces/rp.png'),
  // Blue (Cho) pieces
  bk: require('../../assets/janggi2-pieces/bk.png'),
  ba: require('../../assets/janggi2-pieces/ba.png'),
  br: require('../../assets/janggi2-pieces/br.png'),
  bh: require('../../assets/janggi2-pieces/bh.png'),
  be: require('../../assets/janggi2-pieces/be.png'),
  bc: require('../../assets/janggi2-pieces/bc.png'),
  bp: require('../../assets/janggi2-pieces/bp.png'),
};

// Janggi piece symbols (traditional Korean characters) - fallback
const PIECE_SYMBOLS: Record<string, string> = {
  // Red (Han) pieces
  rk: '漢',
  ra: '士',
  rr: '車',
  rh: '馬',
  re: '象',
  rc: '包',
  rp: '卒',
  // Blue (Cho) pieces
  bk: '楚',
  ba: '士',
  br: '車',
  bh: '馬',
  be: '象',
  bc: '包',
  bp: '兵',
};

interface Janggi2BoardProps {
  variant?: GameVariant;
  onMove?: (from: string, to: string) => void;
  fen?: string;
  suggestedMove?: string;
  legalMoves?: string[]; // Legal moves from engine
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
  variant = 'janggi',
  onMove,
  fen,
  suggestedMove,
  legalMoves = [],
}: Janggi2BoardProps): React.JSX.Element {
  // Parse FEN to piece array with {x, y, pieceKey, symbol, color}
  const parseFEN = (fenString: string) => {
    const [boardPart] = fenString.split(' ');
    const ranks = boardPart.split('/');

    if (ranks.length !== 10) {
      console.error('Invalid FEN - expected 10 ranks, got', ranks.length);
      return [];
    }

    const pieces: Array<{x: number; y: number; pieceKey: string; symbol: string; color: string}> = [];

    for (let rank = 0; rank < 10; rank++) {
      const rankData = ranks[rank];
      if (!rankData) continue;

      let file = 0;
      for (let i = 0; i < rankData.length; i++) {
        const char = rankData[i];

        if (char >= '1' && char <= '9') {
          file += parseInt(char);
        } else {
          const color = char === char.toUpperCase() ? 'red' : 'blue';
          let pieceType = char.toLowerCase();

          // Map FEN notation to piece types
          if (pieceType === 'n') pieceType = 'h';
          if (pieceType === 'b') pieceType = 'e';

          const pieceKey = (color === 'red' ? 'r' : 'b') + pieceType;
          const symbol = PIECE_SYMBOLS[pieceKey] || '?';

          pieces.push({x: file, y: rank, pieceKey, symbol, color});
          file++;
        }
      }
    }

    return pieces;
  };

  const [pieces, setPieces] = useState(() => {
    if (fen) return parseFEN(fen);
    return [];
  });
  const [selectedSquare, setSelectedSquare] = useState<{x: number; y: number} | null>(null);

  // Parse suggested move to highlight (format: file+rank+file+rank, e.g., "e1e2" or "e10e9")
  const suggestedFromTo = React.useMemo(() => {
    if (!suggestedMove || suggestedMove.length < 4) return null;

    // Find where second file starts (first letter after first file)
    let rankSplitIdx = 1;
    while (rankSplitIdx < suggestedMove.length && (suggestedMove[rankSplitIdx] < 'a' || suggestedMove[rankSplitIdx] > 'i')) {
      rankSplitIdx++;
    }

    const fromFile = suggestedMove.charCodeAt(0) - 'a'.charCodeAt(0);
    const fromRank = parseInt(suggestedMove.substring(1, rankSplitIdx), 10);
    const toFile = suggestedMove.charCodeAt(rankSplitIdx) - 'a'.charCodeAt(0);
    const toRank = parseInt(suggestedMove.substring(rankSplitIdx + 1), 10);

    return {
      from: {
        x: fromFile,
        y: 10 - fromRank  // Engine uses ranks 1-10, convert to visual y
      },
      to: {
        x: toFile,
        y: 10 - toRank  // Engine uses ranks 1-10, convert to visual y
      }
    };
  }, [suggestedMove]);

  // Update pieces when FEN changes
  useEffect(() => {
    if (fen) {
      setPieces(parseFEN(fen));
    }
  }, [fen]);

  const getSquareNotation = (x: number, y: number): string => {
    const files = 'abcdefghi';
    // Janggi engine uses ranks 1-10 (not 0-9!)
    // Visual y=0 is top (blue, engine rank 10), y=9 is bottom (red, engine rank 1)
    // Conversion: engine rank = 10 - visual y
    const rank = 10 - y;
    return `${files[x]}${rank}`;
  };

  const handleCellPress = (x: number, y: number) => {
    const clickedPiece = pieces.find(p => p.x === x && p.y === y);
    const notation = getSquareNotation(x, y);

    // Get current turn from FEN
    const currentTurn = fen?.split(' ')[1] || 'w';
    const currentPlayer = currentTurn === 'w' ? 'red' : 'blue';

    if (selectedSquare) {
      // Check if clicking the same square (deselect)
      if (selectedSquare.x === x && selectedSquare.y === y) {
        setSelectedSquare(null);
        return;
      }

      // Try to make a move
      const fromNotation = getSquareNotation(selectedSquare.x, selectedSquare.y);
      const toNotation = getSquareNotation(x, y);

      onMove?.(fromNotation, toNotation);
      setSelectedSquare(null);
    } else if (clickedPiece) {
      // Check if piece belongs to current player
      if (clickedPiece.color !== currentPlayer) {
        console.log(`Not your turn (current: ${currentPlayer}, clicked: ${clickedPiece.color})`);
        return;
      }
      // Select piece
      setSelectedSquare({x, y});
    }
  };

  const isInPalace = (x: number, y: number): boolean => {
    // Blue palace: visual y 0-2 (top), files 3-5 (D-F in 9x10)
    // Red palace: visual y 7-9 (bottom), files 3-5
    return (
      (y >= 0 && y <= 2 && x >= 3 && x <= 5) ||
      (y >= 7 && y <= 9 && x >= 3 && x <= 5)
    );
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
          {Array.from({length: BOARD_ROWS}).map((_, y) =>
            Array.from({length: BOARD_COLS}).map((_, x) => {
              const isSelected = selectedSquare?.x === x && selectedSquare?.y === y;
              const isSuggestedFrom = suggestedFromTo?.from.x === x && suggestedFromTo?.from.y === y;
              const isSuggestedTo = suggestedFromTo?.to.x === x && suggestedFromTo?.to.y === y;

              return (
                <Pressable
                  key={`int-${x}-${y}`}
                  style={{
                    position: 'absolute',
                    width: CELL_SIZE * 0.4,
                    height: CELL_SIZE * 0.4,
                    top: y * CELL_SIZE - (CELL_SIZE * 0.2),
                    left: x * CELL_SIZE - (CELL_SIZE * 0.2),
                    backgroundColor: isSelected
                      ? 'rgba(255, 224, 130, 0.6)'
                      : isSuggestedFrom
                      ? 'rgba(79, 195, 247, 0.5)'  // Blue for suggested from
                      : isSuggestedTo
                      ? 'rgba(129, 199, 132, 0.5)'  // Green for suggested to
                      : 'transparent',
                    borderRadius: 1000,
                    borderWidth: (isSuggestedFrom || isSuggestedTo) ? 2 : 0,
                    borderColor: isSuggestedFrom ? '#2196F3' : isSuggestedTo ? '#4CAF50' : 'transparent',
                  }}
                  onPress={() => handleCellPress(x, y)}
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

        {/* Draw pieces on intersections */}
        {pieces.map((piece, i) => {
          const pieceSize = CELL_SIZE * 0.75;
          const offset = pieceSize / 2;
          const pieceImage = PIECE_IMAGES[piece.pieceKey];
          const isSelected = selectedSquare?.x === piece.x && selectedSquare?.y === piece.y;

          return (
            <Pressable
              key={`piece-${i}`}
              style={{
                position: 'absolute',
                width: pieceSize,
                height: pieceSize,
                top: Math.round(LABEL_SIZE + piece.y * CELL_SIZE - offset),
                left: Math.round(LABEL_SIZE + piece.x * CELL_SIZE - offset),
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 3,
                borderRadius: pieceSize / 2,
                borderWidth: isSelected ? 3 : 0,
                borderColor: isSelected ? '#FFD700' : 'transparent',
                backgroundColor: isSelected ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
              }}
              onPress={() => handleCellPress(piece.x, piece.y)}>
              {pieceImage ? (
                <Image
                  source={pieceImage}
                  style={{
                    width: pieceSize,
                    height: pieceSize,
                  }}
                  resizeMode="contain"
                />
              ) : (
                // Fallback to text symbol if image not found
                <View
                  style={{
                    width: pieceSize,
                    height: pieceSize,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#FFF',
                    borderRadius: pieceSize / 2,
                    borderWidth: 2,
                    borderColor: piece.color === 'red' ? '#D32F2F' : '#1976D2',
                  }}>
                  <Text style={{
                    fontSize: pieceSize * 0.6,
                    fontWeight: 'bold',
                    color: piece.color === 'red' ? '#D32F2F' : '#1976D2',
                  }}>
                    {piece.symbol}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
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
