import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  /** Disable shimmer animation (static placeholder) */
  noShimmer?: boolean;
}

/**
 * Reusable skeleton placeholder with optional shimmer animation.
 * Use for loading states across the app.
 */
export default function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
  noShimmer = false,
}: SkeletonProps) {
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (noShimmer) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [noShimmer, opacityAnim]);

  const layoutStyle: ViewStyle = {
    width: (width ?? '100%') as ViewStyle['width'],
    height: (height ?? 20) as ViewStyle['height'],
    borderRadius,
  };

  return (
    <View style={[styles.base, layoutStyle, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.base,
          { borderRadius, opacity: noShimmer ? 0.4 : opacityAnim },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
});
