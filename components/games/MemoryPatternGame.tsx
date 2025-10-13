import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

interface MemoryPatternGameProps {
  onGameEnd: (points: number) => void;
  onClose: () => void;
}

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];

export default function MemoryPatternGame({ onGameEnd, onClose }: MemoryPatternGameProps) {
  const theme = useTheme();
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'showing' | 'input' | 'correct' | 'wrong' | 'finished'>('showing');
  const [pattern, setPattern] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [showingIndex, setShowingIndex] = useState(0);
  const [animationValue] = useState(new Animated.Value(0));
  const [highlightedTile, setHighlightedTile] = useState<number | null>(null);

  const generatePattern = (length: number): number[] => {
    const newPattern = [];
    for (let i = 0; i < length; i++) {
      newPattern.push(Math.floor(Math.random() * 4)); // 4 different tiles
    }
    return newPattern;
  };

  useEffect(() => {
    if (currentRound < 5) { // 5 rounds
      const patternLength = Math.min(3 + currentRound, 6); // Start with 3, max 6
      const newPattern = generatePattern(patternLength);
      setPattern(newPattern);
      setUserInput([]);
      setShowingIndex(0);
      setGameState('showing');
      setHighlightedTile(null);
    } else {
      setGameState('finished');
      setTimeout(() => onGameEnd(score), 1500);
    }
  }, [currentRound]);

  // Show pattern sequence
  useEffect(() => {
    if (gameState === 'showing' && showingIndex < pattern.length) {
      const timer = setTimeout(() => {
        setHighlightedTile(pattern[showingIndex]);
        
        // Hide highlight after 600ms
        setTimeout(() => {
          setHighlightedTile(null);
          setShowingIndex(showingIndex + 1);
        }, 600);
      }, 800);
      
      return () => clearTimeout(timer);
    } else if (gameState === 'showing' && showingIndex >= pattern.length) {
      // Pattern showing complete, switch to input mode
      setTimeout(() => {
        setGameState('input');
      }, 1000);
    }
  }, [gameState, showingIndex, pattern]);

  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: gameState === 'correct' ? 1 : gameState === 'wrong' ? -1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [gameState]);

  const handleTilePress = (tileIndex: number) => {
    if (gameState !== 'input') return;

    const newUserInput = [...userInput, tileIndex];
    setUserInput(newUserInput);

    // Check if this input is correct
    if (newUserInput[newUserInput.length - 1] !== pattern[newUserInput.length - 1]) {
      // Wrong input
      setGameState('wrong');
      setTimeout(nextRound, 1500);
      return;
    }

    // Check if pattern is complete
    if (newUserInput.length === pattern.length) {
      // Correct complete pattern
      const points = 8 + currentRound * 2; // Base 8 points + difficulty bonus
      setScore(score + points);
      setGameState('correct');
      setTimeout(nextRound, 1500);
    }
  };

  const nextRound = () => {
    setCurrentRound(currentRound + 1);
  };

  const getBackgroundColor = () => {
    if (gameState === 'correct') return '#2ECC71';
    if (gameState === 'wrong') return '#E74C3C';
    return theme.background;
  };

  const getGameStateText = () => {
    switch (gameState) {
      case 'showing': return 'Watch the pattern...';
      case 'input': return 'Repeat the pattern!';
      case 'correct': return 'Perfect! 🎉';
      case 'wrong': return 'Wrong pattern! 😅';
      default: return '';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Memory Pattern</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{score} pts</Text>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.roundText}>Round {currentRound + 1}/5</Text>
          <Text style={styles.patternText}>Pattern: {pattern.length} tiles (Max 6)</Text>
        </View>
      </LinearGradient>

      {gameState === 'finished' ? (
        <View style={styles.gameContent}>
          <Text style={[styles.instructionText, { color: theme.text }]}>
            Game Complete! 🧠
          </Text>
          <Text style={[styles.finalScore, { color: theme.primary }]}>
            Final Score: {score} points
          </Text>
        </View>
      ) : (
        <Animated.View 
          style={[
            styles.gameContent,
            {
              transform: [{
                translateX: animationValue.interpolate({
                  inputRange: [-1, 0, 1],
                  outputRange: [-20, 0, 20],
                })
              }]
            }
          ]}
        >
          <Text style={[styles.instructionText, { color: theme.text }]}>
            {getGameStateText()}
          </Text>

          {gameState === 'input' && (
            <View style={styles.progressIndicator}>
              <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                Progress: {userInput.length}/{pattern.length}
              </Text>
            </View>
          )}
          
          <View style={styles.gridContainer}>
            {COLORS.map((color, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.memoryTile,
                  { 
                    backgroundColor: color,
                    opacity: highlightedTile === index ? 1 : 
                             gameState === 'showing' ? 0.3 : 1,
                    transform: [{ 
                      scale: highlightedTile === index ? 1.1 : 1 
                    }]
                  }
                ]}
                onPress={() => handleTilePress(index)}
                disabled={gameState !== 'input'}
                activeOpacity={0.8}
              >
                <View style={styles.tileInner}>
                  {userInput.includes(index) && userInput.indexOf(index) < userInput.length && (
                    <Text style={styles.tileNumber}>
                      {userInput.indexOf(index) + 1}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {gameState === 'correct' && (
            <Text style={styles.feedbackText}>
              Excellent memory! +{8 + currentRound * 2} points
            </Text>
          )}
          {gameState === 'wrong' && (
            <Text style={[styles.feedbackText, { color: '#E74C3C' }]}>
              Don't worry, try the next pattern!
            </Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  scoreText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  patternText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  gameContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  instructionText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  progressIndicator: {
    alignItems: 'center',
    marginBottom: 20,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    width: 200,
    alignSelf: 'center',
  },
  memoryTile: {
    width: 80,
    height: 80,
    margin: 10,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tileInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  tileNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2ECC71',
  },
  finalScore: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
});