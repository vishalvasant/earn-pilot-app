import React, { useRef, useState, useEffect } from 'react';
import { View, Alert, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';

interface UnityGameViewProps {
  gameId: number;
  gameUrl: string;
  onSessionEnd?: (summary: any) => void;
  onPointsEarned?: (points: number) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

export function UnityGameView({
  gameId,
  gameUrl,
  onSessionEnd,
  onPointsEarned,
  onError,
  onClose
}: UnityGameViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [sessionActive, setSessionActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { token } = useAuthStore();
  const { profile, setProfile } = useUserStore();

  // JavaScript to inject into WebView
  const injectedJavaScript = `
    (function() {
      // Set Unity configuration variables
      window.unityAuthToken = "${token}";
      window.unityUserId = ${profile?.id || 0};
      window.unityGameId = ${gameId};
      window.unityApiBaseUrl = "http://127.0.0.1:8000/api";
      
      console.log('[EarnPilot] Unity configuration injected:', {
        userId: window.unityUserId,
        gameId: window.unityGameId,
        hasToken: !!window.unityAuthToken
      });
      
      // Listen for Unity messages
      window.addEventListener('unityMessage', function(event) {
        const { action, data } = event.detail;
        
        console.log('[EarnPilot] Unity message received:', action, data);
        
        // Forward to React Native
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'unity_message',
          action: action,
          data: data
        }));
      });
      
      // Error handling
      window.addEventListener('error', function(event) {
        console.error('[EarnPilot] JavaScript error:', event.error);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'javascript_error',
          message: event.error?.message || 'Unknown error'
        }));
      });
      
      // Notify that initialization is complete
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'webview_ready'
      }));
      
      true; // Return true to indicate script executed successfully
    })();
  `;

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      console.log('[EarnPilot] WebView message:', message);
      
      switch (message.type) {
        case 'webview_ready':
          setLoading(false);
          setError(null);
          break;
          
        case 'unity_message':
          handleUnityMessage(message.action, message.data);
          break;
          
        case 'javascript_error':
          console.error('[EarnPilot] JavaScript error:', message.message);
          setError(`Game error: ${message.message}`);
          break;
          
        default:
          console.log('[EarnPilot] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[EarnPilot] Failed to parse WebView message:', error);
    }
  };

  const handleUnityMessage = (action: string, data: any) => {
    switch (action) {
      case 'sessionStarted':
        setSessionActive(true);
        console.log('[EarnPilot] Unity session started:', data);
        break;
        
      case 'sessionEnded':
        setSessionActive(false);
        console.log('[EarnPilot] Unity session ended:', data);
        
        if (onSessionEnd) {
          try {
            const summary = typeof data === 'string' ? JSON.parse(data) : data;
            onSessionEnd(summary);
            
            // Show session summary
            Alert.alert(
              'Game Completed!',
              `Points Earned: ${summary.points_awarded || 0}\nLevels Completed: ${summary.levels_completed || 0}`,
              [{ text: 'OK' }]
            );
          } catch (e) {
            console.error('[EarnPilot] Failed to parse session summary:', e);
          }
        }
        
        // Refresh user data to get updated points
        // Note: You may need to implement a refresh mechanism
        // updateUser();
        break;
        
      case 'pointsEarned':
        const points = parseInt(data, 10);
        if (points > 0) {
          console.log(`[EarnPilot] Points earned: ${points}`);
          onPointsEarned?.(points);
        }
        break;
        
      case 'error':
        console.error('[EarnPilot] Unity error:', data);
        setError(`Unity error: ${data}`);
        onError?.(data);
        break;
        
      default:
        console.log(`[EarnPilot] Unknown Unity action: ${action}`, data);
    }
  };

  const handleWebViewError = (error: any) => {
    console.error('[EarnPilot] WebView error:', error);
    setLoading(false);
    setError(`Failed to load game: ${error.description || 'Unknown error'}`);
    onError?.(`WebView error: ${error.description || 'Unknown error'}`);
  };

  const handleLoadEnd = () => {
    console.log('[EarnPilot] WebView load completed');
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    webViewRef.current?.reload();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionActive) {
        console.log('[EarnPilot] Component unmounting with active Unity session');
      }
    };
  }, [sessionActive]);

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Game Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading Game...</Text>
        </View>
      )}
      
      {/* Close button */}
      {onClose && !loading && (
        <TouchableOpacity style={styles.closeButtonOverlay} onPress={onClose}>
          <Text style={styles.closeButtonOverlayText}>✕</Text>
        </TouchableOpacity>
      )}
      
      {/* Session indicator */}
      {sessionActive && (
        <View style={styles.sessionIndicator}>
          <Text style={styles.sessionIndicatorText}>🎮 Session Active</Text>
        </View>
      )}
      
      <WebView
        ref={webViewRef}
        source={{ uri: gameUrl }}
        style={styles.webview}
        onMessage={handleMessage}
        onError={handleWebViewError}
        onLoadEnd={handleLoadEnd}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="compatibility"
        onShouldStartLoadWithRequest={() => true}
        originWhitelist={['*']}
        // Performance optimizations for Unity WebGL
        cacheEnabled={false} // Disable cache for development
        incognito={false}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        // Unity-specific settings
        allowsFullscreenVideo={true}
        allowsProtectedMedia={true}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile; rv:81.0) Gecko/81.0 Firefox/81.0"
        // Additional settings for better Unity support
        bounces={false}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1,
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 20,
  },
  errorTitle: {
    color: '#FF6B6B',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#666666',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  closeButtonOverlay: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  closeButtonOverlayText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sessionIndicator: {
    position: 'absolute',
    top: 40,
    left: 20,
    backgroundColor: 'rgba(0, 102, 204, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 2,
  },
  sessionIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});