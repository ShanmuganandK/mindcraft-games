/**
 * Unit tests for serialization utilities
 */

import {
  serializeUserProfile,
  deserializeUserProfile,
  serializeGameProgress,
  deserializeGameProgress,
  serializeGameState,
  deserializeGameState,
  deepClone,
  safeJsonParse,
  safeJsonStringify,
  validateSerializedData
} from '../serialization';
import { UserProfile, GameProgress, GameState, FontSize, GameDifficulty } from '../../types';

describe('Serialization Utilities', () => {
  const mockUserProfile: UserProfile = {
    id: 'user123',
    displayName: 'TestUser',
    createdAt: new Date('2023-01-01T00:00:00Z'),
    lastActive: new Date('2023-12-01T00:00:00Z'),
    preferences: {
      soundEnabled: true,
      musicEnabled: false,
      soundVolume: 0.8,
      musicVolume: 0.6,
      reducedMotion: false,
      highContrast: true,
      fontSize: FontSize.MEDIUM,
      analyticsConsent: true,
      notifications: {
        gameReminders: true,
        achievementNotifications: true,
        leaderboardUpdates: false,
        newGameAlerts: true,
        dailyRewards: false
      },
      privacySettings: {
        shareProgress: true,
        showOnLeaderboards: true,
        allowFriendRequests: false,
        dataCollection: 'standard' as any
      }
    },
    statistics: {
      totalGamesPlayed: 10,
      totalPlayTime: 3600,
      favoriteGameId: 'tic-tac-toe',
      averageSessionDuration: 360,
      achievementsUnlocked: 5,
      highestScore: 1000,
      streakDays: 3,
      lastPlayDate: new Date('2023-11-30T00:00:00Z')
    },
    achievements: [
      {
        id: 'first-win',
        title: 'First Victory',
        description: 'Win your first game',
        iconUrl: 'icon.png',
        unlockedAt: new Date('2023-01-02T00:00:00Z'),
        progress: 100,
        isSecret: false
      }
    ]
  };

  const mockGameProgress: GameProgress = {
    gameId: 'tic-tac-toe',
    highScore: 100,
    totalPlays: 5,
    totalTime: 1200,
    averageScore: 80,
    achievements: ['first-win'],
    statistics: {
      gamesCompleted: 4,
      gamesAbandoned: 1,
      averageSessionDuration: 240,
      bestStreak: 3,
      currentStreak: 1,
      difficultyProgression: {
        easy: 2,
        medium: 2,
        hard: 0,
        expert: 0,
        custom: 0
      },
      customStatistics: {}
    },
    lastPlayed: new Date('2023-12-01T00:00:00Z'),
    unlockedFeatures: ['hard-mode']
  };

  const mockGameState: GameState = {
    gameId: 'tic-tac-toe',
    sessionId: 'session123',
    currentScore: 50,
    gameData: {
      board: [['X', 'O', ''], ['', 'X', ''], ['', '', 'O']],
      currentPlayer: 'X',
      moveCount: 5
    },
    timestamp: new Date('2023-12-01T12:00:00Z'),
    isPaused: false,
    canResume: true
  };

  describe('User Profile Serialization', () => {
    it('should serialize and deserialize user profile correctly', () => {
      const serialized = serializeUserProfile(mockUserProfile);
      const deserialized = deserializeUserProfile(serialized);

      expect(deserialized.id).toBe(mockUserProfile.id);
      expect(deserialized.displayName).toBe(mockUserProfile.displayName);
      expect(deserialized.createdAt).toEqual(mockUserProfile.createdAt);
      expect(deserialized.lastActive).toEqual(mockUserProfile.lastActive);
      expect(deserialized.preferences.soundEnabled).toBe(mockUserProfile.preferences.soundEnabled);
      expect(deserialized.statistics.totalGamesPlayed).toBe(mockUserProfile.statistics.totalGamesPlayed);
      expect(deserialized.achievements[0].unlockedAt).toEqual(mockUserProfile.achievements[0].unlockedAt);
    });

    it('should handle user profile without achievements', () => {
      const profileWithoutAchievements = {
        ...mockUserProfile,
        achievements: []
      };

      const serialized = serializeUserProfile(profileWithoutAchievements);
      const deserialized = deserializeUserProfile(serialized);

      expect(deserialized.achievements).toEqual([]);
    });

    it('should throw error for invalid user profile serialization', () => {
      const invalidProfile = {
        ...mockUserProfile,
        createdAt: 'invalid-date'
      } as any;

      expect(() => serializeUserProfile(invalidProfile)).toThrow();
    });

    it('should throw error for invalid JSON deserialization', () => {
      expect(() => deserializeUserProfile('invalid-json')).toThrow();
    });
  });

  describe('Game Progress Serialization', () => {
    it('should serialize and deserialize game progress correctly', () => {
      const serialized = serializeGameProgress(mockGameProgress);
      const deserialized = deserializeGameProgress(serialized);

      expect(deserialized.gameId).toBe(mockGameProgress.gameId);
      expect(deserialized.highScore).toBe(mockGameProgress.highScore);
      expect(deserialized.lastPlayed).toEqual(mockGameProgress.lastPlayed);
      expect(deserialized.achievements).toEqual(mockGameProgress.achievements);
    });

    it('should handle empty achievements array', () => {
      const progressWithoutAchievements = {
        ...mockGameProgress,
        achievements: []
      };

      const serialized = serializeGameProgress(progressWithoutAchievements);
      const deserialized = deserializeGameProgress(serialized);

      expect(deserialized.achievements).toEqual([]);
    });
  });

  describe('Game State Serialization', () => {
    it('should serialize and deserialize game state correctly', () => {
      const serialized = serializeGameState(mockGameState);
      const deserialized = deserializeGameState(serialized);

      expect(deserialized.gameId).toBe(mockGameState.gameId);
      expect(deserialized.sessionId).toBe(mockGameState.sessionId);
      expect(deserialized.currentScore).toBe(mockGameState.currentScore);
      expect(deserialized.timestamp).toEqual(mockGameState.timestamp);
      expect(deserialized.gameData).toEqual(mockGameState.gameData);
    });

    it('should handle complex game data', () => {
      const complexGameState = {
        ...mockGameState,
        gameData: {
          level: 5,
          inventory: ['sword', 'potion'],
          stats: { health: 100, mana: 50 },
          position: { x: 10, y: 20 }
        }
      };

      const serialized = serializeGameState(complexGameState);
      const deserialized = deserializeGameState(serialized);

      expect(deserialized.gameData).toEqual(complexGameState.gameData);
    });
  });

  describe('Deep Clone', () => {
    it('should create deep copy of objects', () => {
      const original = {
        name: 'test',
        nested: { value: 42 },
        array: [1, 2, { inner: 'value' }],
        date: new Date('2023-01-01')
      };

      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.nested).not.toBe(original.nested);
      expect(cloned.array).not.toBe(original.array);
      expect(cloned.date).not.toBe(original.date);
    });

    it('should handle primitive values', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
    });

    it('should handle arrays', () => {
      const original = [1, [2, 3], { value: 4 }];
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[1]).not.toBe(original[1]);
      expect(cloned[2]).not.toBe(original[2]);
    });
  });

  describe('Safe JSON Operations', () => {
    it('should safely parse valid JSON', () => {
      const data = { test: 'value' };
      const json = JSON.stringify(data);
      const parsed = safeJsonParse(json, {});

      expect(parsed).toEqual(data);
    });

    it('should return fallback for invalid JSON', () => {
      const fallback = { error: true };
      const parsed = safeJsonParse('invalid-json', fallback);

      expect(parsed).toEqual(fallback);
    });

    it('should safely stringify objects', () => {
      const data = { test: 'value' };
      const stringified = safeJsonStringify(data);

      expect(stringified).toBe('{"test":"value"}');
    });

    it('should return fallback for unstringifiable objects', () => {
      const circular: any = {};
      circular.self = circular;

      const stringified = safeJsonStringify(circular, '{"error":true}');
      expect(stringified).toBe('{"error":true}');
    });
  });

  describe('Validate Serialized Data', () => {
    it('should validate correct JSON', () => {
      const validJson = '{"test": "value"}';
      expect(validateSerializedData(validJson)).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const invalidJson = '{"test": value}'; // Missing quotes
      expect(validateSerializedData(invalidJson)).toBe(false);
    });

    it('should validate empty objects and arrays', () => {
      expect(validateSerializedData('{}')).toBe(true);
      expect(validateSerializedData('[]')).toBe(true);
    });
  });
});