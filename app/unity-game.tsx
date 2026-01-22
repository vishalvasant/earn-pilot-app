import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { UnityGameView } from '../components/UnityGameView';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { useUserStore } from '../stores/userStore';

export default function UnityGameScreen() {
  const navigation = useNavigation();
  const { setProfile } = useUserStore();
  const [gameUrl] = useState('http://localhost:3000'); // Local Unity WebGL build

  const refreshUserProfile = async () => {
    try {
      const response = await api.get('/profile');
      setProfile(response.data.user);
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  const handleSessionEnd = async (summary: any) => {
    console.log('Unity game session ended:', summary);
    
    // Refresh user profile to get updated energy points
    await refreshUserProfile();
    
    // Show results and navigate back
    Alert.alert(
      'Game Completed! 🎉',
      `Great job! You earned ${summary.points_awarded || 0} energy points!
      
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
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handlePointsEarned = async (points: number) => {
    console.log(`Earned ${points} energy points during gameplay!`);
    // Refresh user profile to show updated energy points
    await refreshUserProfile();
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