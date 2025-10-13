import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

interface ImageSimilarityGameProps {
  onGameEnd: (points: number) => void;
  onClose: () => void;
}

interface ImageOption {
  id: string;
  emoji: string;
  category: string;
}

const IMAGE_SETS = [
  {
    target: { emoji: '🐱', category: 'Cat' },
    options: [
      { id: '1', emoji: '🐱', category: 'Cat' },
      { id: '2', emoji: '🐶', category: 'Dog' },
      { id: '3', emoji: '🐰', category: 'Rabbit' },
      { id: '4', emoji: '🐻', category: 'Bear' },
    ]
  },
  {
    target: { emoji: '🚗', category: 'Car' },
    options: [
      { id: '1', emoji: '🚲', category: 'Bicycle' },
      { id: '2', emoji: '🚗', category: 'Car' },
      { id: '3', emoji: '🚌', category: 'Bus' },
      { id: '4', emoji: '✈️', category: 'Airplane' },
    ]
  },
  {
    target: { emoji: '🍎', category: 'Apple' },
    options: [
      { id: '1', emoji: '🍌', category: 'Banana' },
      { id: '2', emoji: '🍊', category: 'Orange' },
      { id: '3', emoji: '🍎', category: 'Apple' },
      { id: '4', emoji: '🍇', category: 'Grapes' },
    ]
  },
];

export default function ImageSimilarityGame({ onGameEnd, onClose }: ImageSimilarityGameProps) {
  const theme = useTheme();
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong' | 'finished'>('playing');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [animationValue] = useState(new Animated.Value(0));
  const [timeLeft, setTimeLeft] = useState(8);
  const [gameImages, setGameImages] = useState(IMAGE_SETS[0]);

  useEffect(() => {
    if (currentRound < IMAGE_SETS.length) {
      setGameImages(IMAGE_SETS[currentRound]);
      setTimeLeft(8);
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

  const handleImageSelect = (optionId: string) => {
    if (gameState !== 'playing') return;

    setSelectedOption(optionId);
    const isCorrect = gameImages.options.find(opt => opt.id === optionId)?.emoji === gameImages.target.emoji;
    
    if (isCorrect) {
      setScore(score + 15);
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
          <Text style={styles.title}>Image Match</Text>
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
            Find the matching image:
          </Text>
          
          <View style={styles.targetImageContainer}>
            <View style={[styles.targetImageBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={styles.targetEmoji}>{gameImages.target.emoji}</Text>
            </View>
            <Text style={[styles.targetImageName, { color: theme.text }]}>
              {gameImages.target.category}
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            {gameImages.options.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.imageOption,
                  selectedOption === option.id && styles.selectedOption,
                  { 
                    backgroundColor: theme.card,
                    borderColor: selectedOption === option.id ? theme.primary : theme.border 
                  }
                ]}
                onPress={() => handleImageSelect(option.id)}
                disabled={gameState !== 'playing'}
              >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <Text style={[styles.optionText, { color: theme.text }]}>
                  {option.category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {gameState === 'correct' && (
            <Text style={styles.feedbackText}>Perfect! +15 points</Text>
          )}
          {gameState === 'wrong' && (
            <Text style={[styles.feedbackText, { color: '#E74C3C' }]}>
              Oops! Try again next round
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
  targetImageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  targetImageBox: {
    width: 100,
    height: 100,
    borderRadius: 20,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  targetEmoji: {
    fontSize: 50,
  },
  targetImageName: {
    fontSize: 18,
    fontWeight: '600',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  imageOption: {
    alignItems: 'center',
    padding: 15,
    margin: 8,
    borderRadius: 15,
    borderWidth: 2,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedOption: {
    transform: [{ scale: 1.05 }],
  },
  optionEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
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