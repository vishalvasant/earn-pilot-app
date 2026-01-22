import { NativeModules, Platform } from 'react-native';

const { EarnPilotUnity } = NativeModules;

export interface UnityGameConfig {
  authToken?: string; // Optional - can use email instead
  userId: number;
  userEmail?: string; // User email for email-based authentication
  gameId?: number; // Defaults to 5 for Pilot Jump
  apiBaseUrl?: string; // Defaults to local server for testing
}

/**
 * Service to launch Unity games with authentication
 */
export class UnityLauncherService {
  /**
   * Launch Unity game (Pilot Jump) with authentication
   * 
   * @param config Configuration object with authToken, userId, etc.
   * @returns Promise that resolves when game is launched
   */
  static async launchUnityGame(config: UnityGameConfig): Promise<boolean> {
    if (Platform.OS !== 'android') {
      throw new Error('Unity games are only supported on Android');
    }

    if (!EarnPilotUnity) {
      throw new Error('EarnPilotUnity native module is not available');
    }

    try {
      // Use provided API URL or default to local server
      // Android emulator: 10.0.2.2 maps to host's localhost
      // iOS simulator: 127.0.0.1 works directly
      const defaultApiUrl = Platform.OS === 'android' 
        ? 'http://10.0.2.2:8000/api' 
        : 'http://127.0.0.1:8000/api';
      const finalApiBaseUrl = config.apiBaseUrl || defaultApiUrl;

      // Debug log to verify what we are sending from the React Native app
      console.log('[UnityLauncher] LaunchUnityGame config', {
        userId: config.userId,
        userEmail: config.userEmail,
        hasToken: !!config.authToken,
        tokenPrefix: config.authToken ? config.authToken.slice(0, 12) + '...' : null,
        apiBaseUrl: finalApiBaseUrl,
        gameId: config.gameId || 5,
      });

      const result = await EarnPilotUnity.launchUnityGame({
        authToken: config.authToken,
        userId: config.userId,
        userEmail: config.userEmail, // Pass email for email-based authentication
        gameId: config.gameId || 5, // Default to Pilot Jump
        apiBaseUrl: finalApiBaseUrl, // Default for production
      });

      console.log('[UnityLauncher] Game launched successfully');
      return result;
    } catch (error: any) {
      console.error('[UnityLauncher] Failed to launch game:', error);
      throw new Error(`Failed to launch Unity game: ${error.message}`);
    }
  }

  /**
   * Check if Unity game is installed
   * 
   * @returns Promise that resolves to true if game is installed
   */
  static async isUnityGameInstalled(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    if (!EarnPilotUnity) {
      return false;
    }

    try {
      return await EarnPilotUnity.isUnityGameInstalled();
    } catch (error) {
      console.error('[UnityLauncher] Failed to check game installation:', error);
      return false;
    }
  }
}
