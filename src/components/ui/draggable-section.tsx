import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  ViewStyle,
  LayoutChangeEvent,
  Dimensions,
} from 'react-native';

interface DraggableSectionProps {
  children: React.ReactNode;
  onPositionChange?: (x: number, y: number) => void;
  initialPosition?: {x: number; y: number};
  style?: ViewStyle;
  sectionId: string;
  gridSize?: number;
}

const GRID_SIZE = 20; // Snap to 20px grid

export function DraggableSection({
  children,
  onPositionChange,
  initialPosition = {x: 0, y: 0},
  style,
  sectionId,
  gridSize = GRID_SIZE,
}: DraggableSectionProps): React.JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const pan = useRef(new Animated.ValueXY(initialPosition)).current;
  const [layout, setLayout] = useState({width: 0, height: 0});
  const [containerSize, setContainerSize] = useState(Dimensions.get('window'));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({window}) => {
      setContainerSize(window);
    });
    return () => subscription?.remove();
  }, []);

  // Recalculate position when container size changes to keep sections in bounds
  useEffect(() => {
    if (layout.width === 0 || layout.height === 0) return;

    const currentX = (pan.x as any)._value;
    const currentY = (pan.y as any)._value;

    const {x: finalX, y: finalY} = clampPosition(currentX, currentY);

    // Always ensure section is visible when window resizes
    // This prevents sections from disappearing off-screen
    const isOutOfBounds = currentX !== finalX || currentY !== finalY;

    if (isOutOfBounds) {
      Animated.spring(pan, {
        toValue: {x: finalX, y: finalY},
        useNativeDriver: false,
        friction: 8,
        tension: 35,
      }).start();

      onPositionChange?.(finalX, finalY);
    }
  }, [containerSize, layout]);

  const snapToGrid = (value: number) => {
    return Math.round(value / gridSize) * gridSize;
  };

  const clampPosition = (x: number, y: number) => {
    // Calculate available space with minimal margins
    const marginX = 16; // Small margin on sides
    const marginY = 16; // Small margin on top/bottom

    const maxX = Math.max(0, containerSize.width - layout.width - marginX);
    const maxY = Math.max(0, containerSize.height - layout.height - marginY);

    // Snap first, then clamp
    const snappedX = snapToGrid(x);
    const snappedY = snapToGrid(y);

    // Ensure at least part of section is visible
    // Allow negative values but ensure section doesn't completely disappear
    const minVisibleX = -(layout.width - 100); // Keep at least 100px visible
    const minVisibleY = 0; // Don't allow negative Y (would go under header)

    const clampedX = Math.max(minVisibleX, Math.min(snappedX, maxX));
    const clampedY = Math.max(minVisibleY, Math.min(snappedY, maxY));

    return {
      x: clampedX,
      y: clampedY,
      fitsHorizontally: snappedX >= 0 && snappedX <= maxX,
      fitsVertically: snappedY >= 0 && snappedY <= maxY,
    };
  };

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

        const rawX = (pan.x as any)._value;
        const rawY = (pan.y as any)._value;

        const {x: finalX, y: finalY, fitsHorizontally, fitsVertically} = clampPosition(rawX, rawY);

        // Provide visual feedback if section doesn't fit
        const fits = fitsHorizontally && fitsVertically;

        // Animate to snapped/clamped position with appropriate tension
        Animated.spring(pan, {
          toValue: {x: finalX, y: finalY},
          useNativeDriver: false,
          friction: fits ? 7 : 10, // More friction if forced to clamp
          tension: fits ? 40 : 50, // More tension for "snap back" feel
        }).start();

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
