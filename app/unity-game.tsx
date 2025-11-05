import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { UnityGameView } from '../components/UnityGameView';
import { useRouter } from 'expo-router';

export default function UnityGameScreen() {
  const router = useRouter();
  const [gameUrl] = useState('http://localhost:3000'); // Local Unity WebGL build

  const handleSessionEnd = (summary: any) => {
    console.log('Unity game session ended:', summary);
    
    // Show results and navigate back
    Alert.alert(
      'Game Completed! 🎉',
      `Great job! You earned ${summary.points_awarded || 0} points!
      
Levels Completed: ${summary.levels_completed || 0}
Score: ${summary.score_earned || 0}
Duration: ${Math.round((summary.duration || 0) / 60)} minutes`,
      [
        {
          text: 'Play Again',
          onPress: () => {
            // Reload the game
            setGameKey(prev => prev + 1);
          }
        },
        {
          text: 'Back to Home',
          onPress: () => router.back()
        }
      ]
    );
  };

  const handlePointsEarned = (points: number) => {
    console.log(`Earned ${points} points during gameplay!`);
    // You could show a toast notification here
  };

  const handleError = (error: string) => {
    console.error('Unity game error:', error);
    Alert.alert(
      'Game Error',
      'There was an issue with the game. Please try again.',
      [
        { text: 'Retry', onPress: () => setGameKey(prev => prev + 1) },
        { text: 'Go Back', onPress: () => router.back() }
      ]
    );
  };

  const handleClose = () => {
    Alert.alert(
      'Close Game?',
      'Are you sure you want to close the game? Your progress may be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Close', onPress: () => router.back() }
      ]
    );
  };

  // Key to force WebView reload
  const [gameKey, setGameKey] = useState(0);

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Helix Jump',
          headerShown: false, // Hide header for fullscreen game
        }} 
      />
      
      <UnityGameView
        key={gameKey}
        gameId={1}
        gameUrl={gameUrl}
        onSessionEnd={handleSessionEnd}
        onPointsEarned={handlePointsEarned}
        onError={handleError}
        onClose={handleClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});