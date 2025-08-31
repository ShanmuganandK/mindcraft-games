/**
 * Game screen for playing individual games
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  AccessibilityInfo,
  BackHandler,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type GameScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Game'>;
type GameScreenRouteProp = RouteProp<RootStackParamList, 'Game'>;

interface GameScreenProps {
  navigation: GameScreenNavigationProp;
  route: GameScreenRouteProp;
}

export function GameScreen({ navigation, route }: GameScreenProps) {
  const { gameId, gameName } = route.params;
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'paused' | 'ended'>('loading');
  const [score, setScore] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    // Announce game screen to screen readers
    AccessibilityInfo.announceForAccessibility(`${gameName} game loaded. Game is starting.`);
    
    // Simulate game loading
    const loadTimer = setTimeout(() => {
      setGameState('playing');
      AccessibilityInfo.announceForAccessibility('Game started. Good luck!');
    }, 1500);

    // Handle hardware back button on Android
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      clearTimeout(loadTimer);
      backHandler.remove();
    };
  }, [gameName]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (gameState === 'playing') {
      timer = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState]);

  const handleBackPress = (): boolean => {
    if (gameState === 'playing') {
      handlePauseGame();
      return true; // Prevent default back action
    }
    return false; // Allow default back action
  };

  const handlePauseGame = () => {
    if (gameState === 'playing') {
      setGameState('paused');
      AccessibilityInfo.announceForAccessibility('Game paused');
      
      Alert.alert(
        'Game Paused',
        'What would you like to do?',
        [
          {
            text: 'Resume',
            onPress: () => {
              setGameState('playing');
              AccessibilityInfo.announceForAccessibility('Game resumed');
            },
          },
          {
            text: 'Quit Game',
            style: 'destructive',
            onPress: () => {
              AccessibilityInfo.announceForAccessibility('Returning to games menu');
              navigation.goBack();
            },
          },
        ],
        { cancelable: false }
      );
    }
  };

  const handleEndGame = () => {
    setGameState('ended');
    AccessibilityInfo.announceForAccessibility(
      `Game ended. Your final score is ${score} points. Time played: ${formatTime(timeElapsed)}`
    );
    
    Alert.alert(
      'Game Over!',
      `Your score: ${score} points\nTime: ${formatTime(timeElapsed)}`,
      [
        {
          text: 'Play Again',
          onPress: () => {
            setScore(0);
            setTimeElapsed(0);
            setGameState('playing');
            AccessibilityInfo.announceForAccessibility('New game started');
          },
        },
        {
          text: 'Back to Games',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderGameContent = () => {
    switch (gameState) {
      case 'loading':
        return (
          <View style={styles.centerContent}>
            <Text style={styles.loadingText} accessibilityRole="text">
              Loading {gameName}...
            </Text>
          </View>
        );

      case 'playing':
      case 'paused':
        return (
          <View style={styles.gameArea}>
            <View style={styles.gameStats}>
              <Text style={styles.statText} accessibilityLabel={`Score: ${score} points`}>
                Score: {score}
              </Text>
              <Text style={styles.statText} accessibilityLabel={`Time: ${formatTime(timeElapsed)}`}>
                Time: {formatTime(timeElapsed)}
              </Text>
            </View>

            {/* Mock game content - will be replaced with actual game components */}
            <View style={styles.mockGameArea}>
              <Text style={styles.mockGameText}>
                {gameName} Game Area
              </Text>
              <Text style={styles.mockGameSubtext}>
                This is where the {gameName} game will be rendered
              </Text>
              
              {gameState === 'playing' && (
                <TouchableOpacity
                  style={styles.mockActionButton}
                  onPress={() => setScore(prev => prev + 10)}
                  accessibilityRole="button"
                  accessibilityLabel="Make a move"
                  accessibilityHint="Tap to score points in the game"
                >
                  <Text style={styles.mockActionButtonText}>Make Move (+10)</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.gameControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handlePauseGame}
                accessibilityRole="button"
                accessibilityLabel="Pause game"
                accessibilityHint="Pause the current game"
              >
                <Text style={styles.controlButtonText}>Pause</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.controlButton, styles.endButton]}
                onPress={handleEndGame}
                accessibilityRole="button"
                accessibilityLabel="End game"
                accessibilityHint="End the current game and see results"
              >
                <Text style={styles.controlButtonText}>End Game</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {renderGameContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666666',
  },
  gameArea: {
    flex: 1,
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  mockGameArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mockGameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  mockGameSubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
  },
  mockActionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  mockActionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  gameControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  endButton: {
    backgroundColor: '#ff6b6b',
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});