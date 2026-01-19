import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

interface ColorMatchGameProps {
  onGameEnd: (points: number) => void;
  onClose: () => void;
}

interface ColorOption {
  id: string;
  color: string;
  name: string;
}

const COLOR_SETS = [
  {
    target: { color: '#FF6B6B', name: 'Red' },
    options: [
      { id: '1', color: '#FF6B6B', name: 'Red' },
      { id: '2', color: '#4ECDC4', name: 'Teal' },
      { id: '3', color: '#45B7D1', name: 'Blue' },
      { id: '4', color: '#96CEB4', name: 'Green' },
    ]
  },
  {
    target: { color: '#9B59B6', name: 'Purple' },
    options: [
      { id: '1', color: '#E74C3C', name: 'Red' },
      { id: '2', color: '#9B59B6', name: 'Purple' },
      { id: '3', color: '#F39C12', name: 'Orange' },
      { id: '4', color: '#2ECC71', name: 'Green' },
    ]
  },
  {
    target: { color: '#F1C40F', name: 'Yellow' },
    options: [
      { id: '1', color: '#3498DB', name: 'Blue' },
      { id: '2', color: '#E67E22', name: 'Orange' },
      { id: '3', color: '#F1C40F', name: 'Yellow' },
      { id: '4', color: '#1ABC9C', name: 'Turquoise' },
    ]
  },
];

export default function ColorMatchGame({ onGameEnd, onClose }: ColorMatchGameProps) {
  const theme = useTheme();
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong' | 'finished'>('playing');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [animationValue] = useState(new Animated.Value(0));
  const [timeLeft, setTimeLeft] = useState(10);
  const [gameColors, setGameColors] = useState(COLOR_SETS[0]);

  useEffect(() => {
    if (currentRound < COLOR_SETS.length) {
      setGameColors(COLOR_SETS[currentRound]);
      setTimeLeft(10);
      setSelectedOption(null);
      setGameState('playing');
    } else {
      setGameState('finished');
      setTimeout(() => onGameEnd(score), 1500);
    }
  }, [currentRound]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameState === 'playing') {
      setGameState('wrong');
      setTimeout(nextRound, 1500);
    }
  }, [timeLeft, gameState]);

  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: gameState === 'correct' ? 1 : gameState === 'wrong' ? -1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [gameState]);

  const handleColorSelect = (optionId: string) => {
    if (gameState !== 'playing') return;

    setSelectedOption(optionId);
    const isCorrect = gameColors.options.find(opt => opt.id === optionId)?.color === gameColors.target.color;
    
    if (isCorrect) {
      setScore(score + 10);
      setGameState('correct');
    } else {
      setGameState('wrong');
    }

    setTimeout(nextRound, 1500);
  };

  const nextRound = () => {
    setCurrentRound(currentRound + 1);
  };

  const getBackgroundColor = () => {
    if (gameState === 'correct') return '#2ECC71';
    if (gameState === 'wrong') return '#E74C3C';
    return theme.background;
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
          <Text style={styles.title}>Color Match</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{score} pts</Text>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.roundText}>Round {currentRound + 1}/3</Text>
          <Text style={styles.timerText}>⏱️ {timeLeft}s</Text>
        </View>
      </LinearGradient>

      {gameState === 'finished' ? (
        <View style={styles.gameContent}>
          <Text style={[styles.instructionText, { color: theme.text }]}>
            Game Complete! 🎉
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
            Find the color that matches:
          </Text>
          
          <View style={styles.targetColorContainer}>
            <View 
              style={[
                styles.targetColor, 
                { backgroundColor: gameColors.target.color }
              ]} 
            />
            <Text style={[styles.targetColorName, { color: theme.text }]}>
              {gameColors.target.name}
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            {gameColors.options.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.colorOption,
                  selectedOption === option.id && styles.selectedOption,
                  { borderColor: theme.border }
                ]}
                onPress={() => handleColorSelect(option.id)}
                disabled={gameState !== 'playing'}
              >
                <View 
                  style={[
                    styles.colorCircle, 
                    { backgroundColor: option.color }
                  ]} 
                />
                <Text style={[styles.optionText, { color: theme.text }]}>
                  {option.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {gameState === 'correct' && (
            <Text style={styles.feedbackText}>Correct! +10 points</Text>
          )}
          {gameState === 'wrong' && (
            <Text style={[styles.feedbackText, { color: '#E74C3C' }]}>
              Wrong! Try again next round
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
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 30,
  },
  targetColorContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  targetColor: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  targetColorName: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  colorOption: {
    alignItems: 'center',
    padding: 15,
    margin: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 100,
  },
  selectedOption: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
  },
  colorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
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