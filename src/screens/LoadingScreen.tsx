/**
 * Loading screen for app initialization
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type LoadingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Loading'>;

interface LoadingScreenProps {
  navigation: LoadingScreenNavigationProp;
}

export function LoadingScreen({ navigation }: LoadingScreenProps) {
  const [loadingText, setLoadingText] = useState('Initializing...');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Simulate app initialization steps
      const steps = [
        { text: 'Loading game data...', duration: 800 },
        { text: 'Setting up storage...', duration: 600 },
        { text: 'Preparing games...', duration: 700 },
        { text: 'Almost ready...', duration: 500 },
      ];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        setLoadingText(step.text);
        setProgress((i + 1) / steps.length);
        
        // Announce progress to screen readers
        AccessibilityInfo.announceForAccessibility(
          `${step.text} ${Math.round(((i + 1) / steps.length) * 100)}% complete`
        );
        
        await new Promise(resolve => setTimeout(resolve, step.duration));
      }

      // Navigate to main app
      navigation.replace('Main');
    } catch (error) {
      console.error('App initialization failed:', error);
      setLoadingText('Failed to load. Please restart the app.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Multi-Game Platform
        </Text>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color="#007AFF"
            accessibilityLabel="Loading indicator"
          />
          
          <Text
            style={styles.loadingText}
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
          >
            {loadingText}
          </Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progress * 100}%` }]}
                accessibilityLabel={`Loading progress: ${Math.round(progress * 100)}%`}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 48,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
});