import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';

interface GameCooldownTimerProps {
  gameId: number;
  gameSlug: string;
  cooldownSeconds: number;
  onCooldownComplete: () => void;
  textColor: string;
}

const GameCooldownTimer: React.FC<GameCooldownTimerProps> = ({
  gameId,
  gameSlug,
  cooldownSeconds,
  onCooldownComplete,
  textColor
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(Math.floor(cooldownSeconds));

  useEffect(() => {
    setRemainingSeconds(Math.floor(cooldownSeconds));
  }, [cooldownSeconds]);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      onCooldownComplete();
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        const newValue = prev - 1;
        if (newValue <= 0) {
          onCooldownComplete();
          return 0;
        }
        return newValue;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, onCooldownComplete]);

  if (remainingSeconds <= 0) {
    return null;
  }

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = Math.floor(remainingSeconds % 60);
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <Text style={[styles.timerText, { color: textColor }]}>
        ⏱️ {timeDisplay}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default GameCooldownTimer;