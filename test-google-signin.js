/**
 * Google Sign-In Diagnostic Test Script
 * Run this to test all aspects of Google Sign-In integration
 */

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { APP_CONFIG } from './config/app';

class GoogleSignInTest {
  constructor() {
    this.testResults = {
      configuration: false,
      firebaseInit: false,
      googleSignIn: false,
      firebaseAuth: false,
      backendAuth: false,
    };
  }

  // Test 1: Configuration Check
  async testConfiguration() {
    console.log('🔍 Testing Configuration...');
    
    try {
      console.log('📋 Current Configuration:');
      console.log(`  - Web Client ID: ${APP_CONFIG.GOOGLE_WEB_CLIENT_ID}`);
      console.log(`  - Firebase Project: ${APP_CONFIG.FIREBASE_PROJECT_ID}`);
      console.log(`  - API Base URL: ${APP_CONFIG.API_BASE_URL}`);
      
      // Check if Web Client ID is properly formatted
      const webClientIdPattern = /^\d+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/;
      if (!webClientIdPattern.test(APP_CONFIG.GOOGLE_WEB_CLIENT_ID)) {
        throw new Error('Invalid Web Client ID format');
      }
      
      console.log('✅ Configuration is valid');
      this.testResults.configuration = true;
    } catch (error) {
      console.log('❌ Configuration failed:', error.message);
    }
  }

  // Test 2: Firebase Initialization
  async testFirebaseInit() {
    console.log('\n🔥 Testing Firebase Initialization...');
    
    try {
      const app = auth().app;
      console.log(`  - Firebase App Name: ${app.name}`);
      console.log(`  - Firebase Project ID: ${app.options.projectId}`);
      
      // Check if Firebase is properly initialized
      if (!app.options.projectId) {
        throw new Error('Firebase not properly initialized');
      }
      
      console.log('✅ Firebase initialization successful');
      this.testResults.firebaseInit = true;
    } catch (error) {
      console.log('❌ Firebase initialization failed:', error.message);
    }
  }

  // Test 3: GoogleSignin Configuration
  async testGoogleSigninConfig() {
    console.log('\n🔧 Testing GoogleSignin Configuration...');
    
    try {
      await GoogleSignin.configure({
        webClientId: APP_CONFIG.GOOGLE_WEB_CLIENT_ID,
      });
      
      // Check if GoogleSignin is properly configured
      const isConfigured = await GoogleSignin.hasPlayServices();
      console.log(`  - Google Play Services available: ${isConfigured}`);
      
      console.log('✅ GoogleSignin configuration successful');
    } catch (error) {
      console.log('❌ GoogleSignin configuration failed:', error.message);
    }
  }

  // Test 4: Google Sign-In Flow
  async testGoogleSignIn() {
    console.log('\n🔐 Testing Google Sign-In Flow...');
    
    try {
      // Sign out first to ensure clean state
      await GoogleSignin.signOut();
      
      console.log('  - Initiating Google Sign-In...');
      const result = await GoogleSignin.signIn();
      
      console.log(`  - User signed in: ${result.user.name}`);
      console.log(`  - Email: ${result.user.email}`);
      console.log(`  - ID Token present: ${!!result.idToken}`);
      
      if (!result.idToken) {
        throw new Error('No ID token received from Google');
      }
      
      console.log('✅ Google Sign-In successful');
      this.testResults.googleSignIn = true;
      return result;
    } catch (error) {
      console.log('❌ Google Sign-In failed:', error.message);
      console.log('   Troubleshooting steps:');
      console.log('   1. Check Firebase Console → Authentication → Sign-in method → Google (Enabled?)');
      console.log('   2. Verify SHA-1 fingerprint is added to Firebase project');
      console.log('   3. Ensure google-services.json has OAuth client entries');
      throw error;
    }
  }

  // Test 5: Firebase Authentication
  async testFirebaseAuth(googleResult) {
    console.log('\n🔥 Testing Firebase Authentication...');
    
    try {
      if (!googleResult?.idToken) {
        throw new Error('No Google ID token available for Firebase auth');
      }
      
      console.log('  - Creating Firebase credential...');
      const credential = auth.GoogleAuthProvider.credential(googleResult.idToken);
      
      console.log('  - Signing in to Firebase...');
      const userCredential = await auth().signInWithCredential(credential);
      
      console.log(`  - Firebase User ID: ${userCredential.user.uid}`);
      console.log(`  - Firebase User Email: ${userCredential.user.email}`);
      
      const firebaseToken = await userCredential.user.getIdToken();
      console.log(`  - Firebase Token Length: ${firebaseToken.length}`);
      
      console.log('✅ Firebase Authentication successful');
      this.testResults.firebaseAuth = true;
      return firebaseToken;
    } catch (error) {
      console.log('❌ Firebase Authentication failed:', error.message);
      throw error;
    }
  }

  // Test 6: Backend Authentication
  async testBackendAuth(firebaseToken) {
    console.log('\n🌐 Testing Backend Authentication...');
    
    try {
      if (!firebaseToken) {
        throw new Error('No Firebase token available for backend auth');
      }
      
      console.log(`  - Sending request to: ${APP_CONFIG.API_BASE_URL}/api/auth/google-signin`);
      
      const response = await fetch(`${APP_CONFIG.API_BASE_URL}/api/auth/google-signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          firebase_token: firebaseToken,
          app_identifier: APP_CONFIG.APP_IDENTIFIER,
          fcm_token: '',
          device_type: 'Android',
        }),
      });
      
      console.log(`  - Response Status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend responded with ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log(`  - Backend Response Success: ${data.success}`);
      
      if (data.success && data.data) {
        console.log(`  - JWT Token Length: ${data.data.token?.length || 0}`);
        console.log(`  - User ID: ${data.data.user?.id}`);
        console.log(`  - User Name: ${data.data.user?.name}`);
      }
      
      console.log('✅ Backend Authentication successful');
      this.testResults.backendAuth = true;
      return data;
    } catch (error) {
      console.log('❌ Backend Authentication failed:', error.message);
      console.log('   Check if backend server is running and accessible');
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Google Sign-In Diagnostic Tests\n');
    console.log('=' .repeat(50));
    
    await this.testConfiguration();
    await this.testFirebaseInit();
    await this.testGoogleSigninConfig();
    
    try {
      const googleResult = await this.testGoogleSignIn();
      const firebaseToken = await this.testFirebaseAuth(googleResult);
      await this.testBackendAuth(firebaseToken);
    } catch (error) {
      console.log('\n⚠️  Tests stopped due to critical failure');
    }
    
    this.printSummary();
  }

  // Print test summary
  printSummary() {
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(50));
    
    Object.entries(this.testResults).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status} - ${testName}`);
    });
    
    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(Boolean).length;
    
    console.log(`\n🎯 Results: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Google Sign-In should work perfectly.');
    } else {
      console.log('🔧 Some tests failed. Check the error messages above for troubleshooting.');
    }
  }
}

// Export test function for manual running
export const runGoogleSignInDiagnostics = async () => {
  const tester = new GoogleSignInTest();
  await tester.runAllTests();
};

// For direct execution
if (require.main === module) {
  runGoogleSignInDiagnostics();
}