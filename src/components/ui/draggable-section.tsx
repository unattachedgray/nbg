import React, {useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';

interface DraggableSectionProps {
  children: React.ReactNode;
  onPositionChange?: (x: number, y: number) => void;
  initialPosition?: {x: number; y: number};
  style?: ViewStyle;
  sectionId: string;
}

export function DraggableSection({
  children,
  onPositionChange,
  initialPosition = {x: 0, y: 0},
  style,
  sectionId,
}: DraggableSectionProps): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const pan = useRef(new Animated.ValueXY(initialPosition)).current;
  const [layout, setLayout] = useState({width: 0, height: 0});

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
      },
      onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        setIsDragging(false);
        pan.flattenOffset();
        const finalX = (pan.x as any)._value;
        const finalY = (pan.y as any)._value;
        onPositionChange?.(finalX, finalY);
      },
    }),
  ).current;

  const handleLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    setLayout({width, height});
  };

  return (
    <Animated.View
      style={[
        styles.draggableContainer,
        style,
        {
          transform: [{translateX: pan.x}, {translateY: pan.y}],
        },
        isDragging && styles.dragging,
      ]}
      {...panResponder.panHandlers}
      onLayout={handleLayout}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  draggableContainer: {
    cursor: 'grab',
  },
  dragging: {
    cursor: 'grabbing',
    opacity: 0.9,
    zIndex: 1000,
  },
});
