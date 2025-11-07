import { useState, useCallback, useRef } from 'react';
import { api } from '../services/api';

interface GameCooldown {
  gameId: number;
  gameSlug: string;
  remainingSeconds: number;
  lastChecked: number;
}

export const useGameCooldowns = () => {
  const [cooldowns, setCooldowns] = useState<Record<string, GameCooldown>>({});
  const [lastChecked, setLastChecked] = useState<Record<string, number>>({});
  const cooldownsRef = useRef<Record<string, GameCooldown>>({});
  const lastCheckedRef = useRef<Record<string, number>>({});

  const checkGameCooldown = useCallback(async (gameId: number, gameSlug: string): Promise<number> => {
    // Avoid checking too frequently (cache for 10 seconds)
    const now = Date.now();
    const lastCheck = lastCheckedRef.current[gameSlug] || 0;
    
    if (now - lastCheck < 10000) { // 10 seconds cache
      const existing = cooldownsRef.current[gameSlug];
      if (existing) {
        const elapsed = Math.floor((now - existing.lastChecked) / 1000);
        return Math.max(0, existing.remainingSeconds - elapsed);
      }
    }

    try {
      const userResponse = await api.get('/profile');
      const userId = userResponse.data.user.id;

      const response = await api.post(`/games/${gameId}/can-play`, { user_id: userId });
      
      // Update last checked time
      lastCheckedRef.current = { ...lastCheckedRef.current, [gameSlug]: now };
      setLastChecked(lastCheckedRef.current);
      
      if (response.data.success && response.data.can_play) {
        return 0; // No cooldown
      } else {
        const remainingSeconds = response.data.cooldown_seconds_remaining || 0;
        return Math.max(0, remainingSeconds);
      }
    } catch (error: any) {
      console.warn('Error checking game cooldown:', error);
      return 0; // Default to no cooldown if error
    }
  }, []);

  const setCooldown = useCallback((gameId: number, gameSlug: string, seconds: number) => {
    if (seconds <= 0) {
      // Remove from refs
      const updatedCooldowns = { ...cooldownsRef.current };
      delete updatedCooldowns[gameSlug];
      cooldownsRef.current = updatedCooldowns;
      setCooldowns(updatedCooldowns);
      
      const updatedLastChecked = { ...lastCheckedRef.current };
      delete updatedLastChecked[gameSlug];
      lastCheckedRef.current = updatedLastChecked;
      setLastChecked(updatedLastChecked);
    } else {
      const now = Date.now();
      const cooldownData = {
        gameId,
        gameSlug,
        remainingSeconds: seconds,
        lastChecked: now,
      };
      
      // Update refs
      cooldownsRef.current = { ...cooldownsRef.current, [gameSlug]: cooldownData };
      lastCheckedRef.current = { ...lastCheckedRef.current, [gameSlug]: now };
      
      // Update state
      setCooldowns(cooldownsRef.current);
      setLastChecked(lastCheckedRef.current);
    }
  }, []);

  const removeCooldown = useCallback((gameSlug: string) => {
    // Remove from refs
    const updatedCooldowns = { ...cooldownsRef.current };
    delete updatedCooldowns[gameSlug];
    cooldownsRef.current = updatedCooldowns;
    setCooldowns(updatedCooldowns);
    
    const updatedLastChecked = { ...lastCheckedRef.current };
    delete updatedLastChecked[gameSlug];
    lastCheckedRef.current = updatedLastChecked;
    setLastChecked(updatedLastChecked);
  }, []);

  const getCooldown = useCallback((gameSlug: string): GameCooldown | null => {
    return cooldownsRef.current[gameSlug] || null;
  }, []);

  return {
    cooldowns,
    checkGameCooldown,
    setCooldown,
    removeCooldown,
    getCooldown,
  };
};