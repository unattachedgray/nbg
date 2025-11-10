import React from 'react';
import {Image, StyleSheet} from 'react-native';

interface JanggiPieceProps {
  piece: string; // e.g., 'ra', 'bk', 'rc'
  size: number;
}

// Map Janggi piece codes to SVG file paths
// Pieces: k=king, a=advisor, r=chariot, h=horse, e=elephant, c=cannon, p=pawn
// Colors: r=red (Han), b=blue (Cho)
const PIECE_ASSETS: Record<string, any> = {
  // Red (Han) pieces
  rk: require('../../assets/janggi-pieces/rk.svg'),
  ra: require('../../assets/janggi-pieces/ra.svg'),
  rr: require('../../assets/janggi-pieces/rr.svg'),
  rh: require('../../assets/janggi-pieces/rh.svg'),
  re: require('../../assets/janggi-pieces/re.svg'),
  rc: require('../../assets/janggi-pieces/rc.svg'),
  rp: require('../../assets/janggi-pieces/rp.svg'),
  // Blue (Cho) pieces
  bk: require('../../assets/janggi-pieces/bk.svg'),
  ba: require('../../assets/janggi-pieces/ba.svg'),
  br: require('../../assets/janggi-pieces/br.svg'),
  bh: require('../../assets/janggi-pieces/bh.svg'),
  be: require('../../assets/janggi-pieces/be.svg'),
  bc: require('../../assets/janggi-pieces/bc.svg'),
  bp: require('../../assets/janggi-pieces/bp.svg'),
};

export function JanggiPiece({piece, size}: JanggiPieceProps): React.JSX.Element {
  const asset = PIECE_ASSETS[piece];

  if (!asset) {
    console.warn(`No asset found for Janggi piece: ${piece}`);
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
