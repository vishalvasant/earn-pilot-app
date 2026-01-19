import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '../../hooks/useTheme';

interface MathQuizGameProps {
  onGameEnd: (points: number) => void;
  onClose: () => void;
}

interface MathProblem {
  question: string;
  answer: number;
  options: number[];
}

const generateMathProblem = (difficulty: number): MathProblem => {
  const operations = ['+', '-', '*'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let a: number, b: number, answer: number;
  
  switch (operation) {
    case '+':
      a = Math.floor(Math.random() * (10 + difficulty * 5)) + 1;
      b = Math.floor(Math.random() * (10 + difficulty * 5)) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * (15 + difficulty * 10)) + 10;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case '*':
      a = Math.floor(Math.random() * (5 + difficulty * 2)) + 1;
      b = Math.floor(Math.random() * (5 + difficulty * 2)) + 1;
      answer = a * b;
      break;
    default:
      a = 1; b = 1; answer = 2;
  }

  const question = `${a} ${operation} ${b}`;
  
  // Generate wrong options
  const wrongOptions: number[] = [];
  for (let i = 0; i < 3; i++) {
    let wrongAnswer;
    do {
      const variance = Math.floor(Math.random() * 10) + 1;
      wrongAnswer = answer + (Math.random() > 0.5 ? variance : -variance);
    } while (wrongAnswer === answer || wrongAnswer < 0 || wrongOptions.includes(wrongAnswer));
    wrongOptions.push(wrongAnswer);
  }

  const options = [answer, ...wrongOptions].sort(() => Math.random() - 0.5);

  return { question, answer, options };
};

export default function MathQuizGame({ onGameEnd, onClose }: MathQuizGameProps) {
  const theme = useTheme();
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'correct' | 'wrong' | 'finished'>('playing');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [animationValue] = useState(new Animated.Value(0));
  const [timeLeft, setTimeLeft] = useState(15);
  const [currentProblem, setCurrentProblem] = useState<MathProblem>(generateMathProblem(0));
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (currentRound < 5) { // 5 rounds for math game
      const difficulty = Math.floor(currentRound / 2); // Increase difficulty every 2 rounds
      setCurrentProblem(generateMathProblem(difficulty));
      setTimeLeft(15);
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
      setStreak(0);
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

  const handleAnswerSelect = (selectedAnswer: number) => {
    if (gameState !== 'playing') return;

    setSelectedOption(selectedAnswer);
    const isCorrect = selectedAnswer === currentProblem.answer;
    
    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      // Base points + streak bonus
      const points = 5 + (newStreak > 1 ? Math.min(newStreak - 1, 5) : 0);
      setScore(score + points);
      setGameState('correct');
    } else {
      setStreak(0);
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

  const getDifficultyText = () => {
    const difficulty = Math.floor(currentRound / 2);
    switch (difficulty) {
      case 0: return 'Easy';
      case 1: return 'Medium';
      case 2: return 'Hard';
      default: return 'Expert';
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
          <Text style={styles.title}>Math Quiz</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreText}>{score} pts</Text>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.roundText}>Round {currentRound + 1}/5</Text>
          <Text style={styles.difficultyText}>{getDifficultyText()}</Text>
          <Text style={styles.timerText}>⏱️ {timeLeft}s</Text>
        </View>
        {streak > 1 && (
          <View style={styles.streakContainer}>
            <Text style={styles.streakText}>🔥 {streak} Streak!</Text>
          </View>
        )}
      </LinearGradient>

      {gameState === 'finished' ? (
        <View style={styles.gameContent}>
          <Text style={[styles.instructionText, { color: theme.text }]}>
            Quiz Complete! 🎉
          </Text>
          <Text style={[styles.finalScore, { color: theme.primary }]}>
            Final Score: {score} points
          </Text>
          <Text style={[styles.finalStats, { color: theme.textSecondary }]}>
            Best Streak: {Math.max(streak, 0)}
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
            Solve the math problem:
          </Text>
          
          <View style={styles.problemContainer}>
            <Text style={[styles.problemText, { color: theme.text }]}>
              {currentProblem.question} = ?
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            {currentProblem.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.answerOption,
                  selectedOption === option && styles.selectedOption,
                  { 
                    backgroundColor: theme.card,
                    borderColor: selectedOption === option ? theme.primary : theme.border 
                  }
                ]}
                onPress={() => handleAnswerSelect(option)}
                disabled={gameState !== 'playing'}
              >
                <Text style={[styles.answerText, { color: theme.text }]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {gameState === 'correct' && (
            <Text style={styles.feedbackText}>
              Correct! +{5 + (streak > 1 ? Math.min(streak - 1, 5) : 0)} points
              {streak > 1 && ' (Streak bonus!)'}
            </Text>
          )}
          {gameState === 'wrong' && (
            <Text style={[styles.feedbackText, { color: '#E74C3C' }]}>
              Wrong! Answer was {currentProblem.answer}
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
    marginBottom: 10,
  },
  roundText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  difficultyText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  streakContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  streakText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
  problemContainer: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    padding: 20,
    borderRadius: 16,
  },
  problemText: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  answerOption: {
    width: '45%',
    alignItems: 'center',
    padding: 20,
    margin: 8,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  selectedOption: {
    transform: [{ scale: 1.05 }],
  },
  answerText: {
    fontSize: 24,
    fontWeight: 'bold',
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
  finalStats: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
});