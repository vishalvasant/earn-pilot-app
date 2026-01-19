import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Animated, StyleSheet, Dimensions, Text, Easing } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

const mascot = require('../assets/images/NewPilot.png');
const { width, height } = Dimensions.get('window');

// Animated reward icon component for splash screen
function SplashRewardIcon({ icon, mascotCenter }: { icon: string; mascotCenter: { left: number; top: number } }) {
  const [target, setTarget] = useState({ left: mascotCenter.left, top: mascotCenter.top });
  const travelAnim = useRef(new Animated.Value(0)).current;
  
  const generateRandomTarget = React.useCallback(() => {
    // Generate random angle in radians (0 to 2π)
    const angle = Math.random() * 2 * Math.PI;
    // Random distance from mascot center (100 to 200 pixels for full screen)
    const distance = 100 + Math.random() * 100;
    
    // Calculate target position using polar coordinates
    const targetLeft = mascotCenter.left + Math.cos(angle) * distance;
    const targetTop = mascotCenter.top + Math.sin(angle) * distance;
    
    // Ensure the target stays within screen bounds
    const clampedLeft = Math.max(20, Math.min(width - 50, targetLeft));
    const clampedTop = Math.max(100, Math.min(height - 100, targetTop));
    
    return {
      left: clampedLeft,
      top: clampedTop,
    };
  }, [mascotCenter]);
  
  useEffect(() => {
    const animateLoop = () => {
      // Generate new random target for each cycle
      const newTarget = generateRandomTarget();
      setTarget(newTarget);
      
      Animated.sequence([
        Animated.timing(travelAnim, {
          toValue: 1,
          duration: 2500 + Math.random() * 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(travelAnim, {
          toValue: 0,
          duration: 2500 + Math.random() * 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Start next cycle with new random direction
        animateLoop();
      });
    };
    
    animateLoop();
  }, [travelAnim, generateRandomTarget]);
  
  const scaleRange = 1 + Math.random() * 0.2;
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: mascotCenter.left,
        top: mascotCenter.top,
        zIndex: 5,
        transform: [
          { translateX: travelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, target.left - mascotCenter.left] }) },
          { translateY: travelAnim.interpolate({ inputRange: [0, 1], outputRange: [0, target.top - mascotCenter.top] }) },
          { scale: travelAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, scaleRange, 1] }) },
        ],
      }}
    >
      <Text style={{
        fontSize: 32,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
      }}>{icon}</Text>
    </Animated.View>
  );
}

export default function SplashScreen() {
  const mascotScale = useRef(new Animated.Value(0.8)).current;
  const mascotOpacity = useRef(new Animated.Value(0)).current;
  const starTranslate = useRef(new Animated.Value(0)).current;

  // Center point for splash screen (center of screen)
  const mascotCenter = { left: width / 2 - 20, top: height / 2 - 20 };

  useEffect(() => {
    Animated.sequence([
      Animated.timing(mascotOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(mascotScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(starTranslate, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={["#0a0f14", "#1a1f2e", "#0e1635", "#1a237e"]}
      style={styles.container}
    >
      {/* Animated reward icons around center */}
      {['🪙','🎁','🎮','💎','🎫','🏆','💰','🎉','🎲','🎯'].map((icon, idx) => (
        <SplashRewardIcon
          key={idx}
          icon={icon}
          mascotCenter={mascotCenter}
        />
      ))}

      <Animated.View
        style={{
          opacity: mascotOpacity,
          transform: [{ scale: mascotScale }],
          zIndex: 10,
          position: 'relative',
        }}
      >
        <Image source={mascot} style={styles.mascot} resizeMode="contain" />
      </Animated.View>
      {/* Animated galaxy particle dots */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 40 }).map((_, i) => {
          // Animate each dot with a unique phase for floating effect
          const anim = useRef(new Animated.Value(0)).current;
          useEffect(() => {
            Animated.loop(
              Animated.sequence([
                Animated.timing(anim, {
                  toValue: 1,
                  duration: 3500 + i * 50,
                  useNativeDriver: true,
                }),
                Animated.timing(anim, {
                  toValue: 0,
                  duration: 3500 + i * 50,
                  useNativeDriver: true,
                }),
              ])
            ).start();
          }, []);
          // Galaxy color palette
          const colors = [
            '#6a82fb', '#fc5c7d', '#43cea2', '#185a9d', '#f7971e', '#00c6ff', '#f953c6', '#b6fbff', '#1c1c3c', '#2c5364'
          ];
          const color = colors[i % colors.length];
          const size = 3 + (i % 4);
          const left = Math.random() * (width - 20);
          const top = Math.random() * (height - 40);
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left,
                top,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: 0.7,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 12 + (i % 8)],
                    }),
                  },
                ],
              }}
            />
          );
        })}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  mascot: {
    width: width * 0.5,
    height: height * 0.3,
    marginBottom: 40,
  },
  stars: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
});
