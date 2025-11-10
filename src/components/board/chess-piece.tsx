import React from 'react';
import {Image, StyleSheet} from 'react-native';

interface ChessPieceProps {
  type: string; // 'p', 'n', 'b', 'r', 'q', 'k'
  color: 'w' | 'b';
  size: number;
}

// Map piece types to SVG file paths
const PIECE_ASSETS: Record<string, any> = {
  wK: require('../../assets/chess-pieces/wK.svg'),
  wQ: require('../../assets/chess-pieces/wQ.svg'),
  wR: require('../../assets/chess-pieces/wR.svg'),
  wB: require('../../assets/chess-pieces/wB.svg'),
  wN: require('../../assets/chess-pieces/wN.svg'),
  wP: require('../../assets/chess-pieces/wP.svg'),
  bK: require('../../assets/chess-pieces/bK.svg'),
  bQ: require('../../assets/chess-pieces/bQ.svg'),
  bR: require('../../assets/chess-pieces/bR.svg'),
  bB: require('../../assets/chess-pieces/bB.svg'),
  bN: require('../../assets/chess-pieces/bN.svg'),
  bP: require('../../assets/chess-pieces/bP.svg'),
};

export function ChessPiece({type, color, size}: ChessPieceProps): React.JSX.Element {
  const pieceKey = `${color}${type.toUpperCase()}`;
  const asset = PIECE_ASSETS[pieceKey];

  if (!asset) {
    console.warn(`No asset found for piece: ${pieceKey}`);
    return <></>;
  }

  return (
    <Image
      source={asset}
      style={[
        styles.piece,
        {
          width: size,
          height: size,
        },
      ]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  piece: {
    // Drop shadow for better visibility
    shadowColor: '#000',
    shadowOffset: {width: 1, height: 1},
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});
