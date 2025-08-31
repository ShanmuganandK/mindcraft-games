/**
 * Home screen with enhanced game selection grid
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  AccessibilityInfo,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MainTabParamList, RootStackParamList } from '../navigation/AppNavigator';
import { GameGrid } from '../components/GameGrid';
import { 
  GameModule, 
  GameCategory, 
  GameDifficulty, 
  ScoreType, 
  SortOrder, 
  ResetPeriod, 
  DeviceOrientation 
} from '../types/game';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  StackNavigationProp<RootStackParamList>
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

// Helper function to create mock games
const createMockGame = (
  id: string,
  title: string,
  description: string,
  category: GameCategory,
  difficulty: GameDifficulty,
  estimatedPlayTime: number,
  isEnabled: boolean = true,
  maxPlayers: number = 1,
  orientations: DeviceOrientation[] = [DeviceOrientation.PORTRAIT]
): GameModule => ({
  id,
  metadata: {
    title,
    description,
    shortDescription: description.substring(0, 50),
    iconUrl: '',
    thumbnailUrl: '',
    category,
    difficulty,
    estimatedPlayTime,
    minAge: 3,
    maxPlayers,
    tags: [category.toLowerCase()],
    accessibility: {
      screenReaderSupport: true,
      colorBlindFriendly: true,
      reducedMotionSupport: true,
      audioAlternatives: false,
      keyboardNavigation: true,
      customControls: false,
      fontScaling: true,
    },
    supportedOrientations: orientations,
  },
  component: null as any,
  achievements: [],
  leaderboardConfig: {
    id: `${id}-leaderboard`,
    name: `${title} Leaderboard`,
    scoreType: ScoreType.HIGHEST,
    sortOrder: SortOrder.DESCENDING,
    resetPeriod: ResetPeriod.NEVER,
    maxEntries: 100,
    isPublic: true,
  },
  isEnabled,
  version: '1.0.0',
});

// Enhanced mock game data with full GameModule structure
const createMockGames = (): GameModule[] => [
  createMockGame(
    'tic-tac-toe',
    'Tic Tac Toe',
    'Classic strategy game for two players',
    GameCategory.STRATEGY,
    GameDifficulty.EASY,
    5,
    true,
    2,
    [DeviceOrientation.PORTRAIT, DeviceOrientation.LANDSCAPE]
  ),
  createMockGame(
    'memory-match',
    'Memory Match',
    'Test your memory with card matching',
    GameCategory.PUZZLE,
    GameDifficulty.MEDIUM,
    10,
    true,
    1,
    [DeviceOrientation.PORTRAIT]
  ),
  createMockGame(
    'snake',
    'Snake',
    'Classic arcade snake game',
    GameCategory.ARCADE,
    GameDifficulty.MEDIUM,
    15,
    true,
    1,
    [DeviceOrientation.PORTRAIT, DeviceOrientation.LANDSCAPE]
  ),
  createMockGame(
    'puzzle',
    'Puzzle Master',
    'Brain teasing puzzle challenges',
    GameCategory.PUZZLE,
    GameDifficulty.HARD,
    20,
    false
  ),
  createMockGame(
    'word-game',
    'Word Challenge',
    'Vocabulary and word puzzle game',
    GameCategory.EDUCATIONAL,
    GameDifficulty.MEDIUM,
    13,
    false
  ),
  createMockGame(
    'math-quiz',
    'Math Quiz',
    'Quick math problem solving',
    GameCategory.EDUCATIONAL,
    GameDifficulty.EASY,
    10,
    false
  ),
  createMockGame(
    'racing-game',
    'Speed Racer',
    'Fast-paced racing action',
    GameCategory.ACTION,
    GameDifficulty.HARD,
    25,
    false,
    1,
    [DeviceOrientation.LANDSCAPE]
  ),
  createMockGame(
    'card-game',
    'Card Master',
    'Classic card game collection',
    GameCategory.CARD,
    GameDifficulty.MEDIUM,
    30,
    false
  ),
];

export function HomeScreen({ navigation }: HomeScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [games, setGames] = useState<GameModule[]>([]);

  useEffect(() => {
    // Initialize games
    setGames(createMockGames());
    
    // Announce screen to screen readers
    AccessibilityInfo.announceForAccessibility('Games screen loaded. Select a game to play.');
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Simulate refresh - in real app, this would reload game data from storage
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh game data
      setGames(createMockGames());
      
      AccessibilityInfo.announceForAccessibility('Games list refreshed');
    } catch (error) {
      console.error('Failed to refresh games:', error);
      AccessibilityInfo.announceForAccessibility('Failed to refresh games');
    } finally {
      setRefreshing(false);
    }
  };

  const handleGameSelect = (game: GameModule) => {
    if (!game.isEnabled) {
      AccessibilityInfo.announceForAccessibility(`${game.metadata.title} is coming soon`);
      return;
    }

    navigation.navigate('Game', {
      gameId: game.id,
      gameName: game.metadata.title,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Choose Your Game
        </Text>
        <Text style={styles.subtitle}>
          Select from our collection of fun games
        </Text>
      </View>

      <GameGrid
        games={games}
        onGameSelect={handleGameSelect}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        accessibilityLabel="Games selection grid"
      />
    </SafeAreaView>
  );
}

// GameTile component is now imported from components

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});