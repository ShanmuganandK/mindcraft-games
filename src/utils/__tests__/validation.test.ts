/**
 * Unit tests for validation utilities
 */

import {
  validateUserProfile,
  validateUserPreferences,
  validateGameProgress,
  validateGameStats,
  validateGameSettings,
  validateScore,
  validateGameId,
  validateUserId,
  sanitizeString,
  validateDisplayName
} from '../validation';
import { FontSize, GameDifficulty } from '../../types';

describe('Validation Utilities', () => {
  describe('validateUserProfile', () => {
    it('should validate a complete user profile', () => {
      const validProfile = {
        id: 'user123',
        displayName: 'TestUser',
        createdAt: new Date(),
        lastActive: new Date(),
        preferences: {
          soundEnabled: true,
          musicEnabled: true,
          soundVolume: 0.8,
          musicVolume: 0.6,
          reducedMotion: false,
          highContrast: false,
          fontSize: FontSize.MEDIUM,
          analyticsConsent: true,
          notifications: {},
          privacySettings: {}
        },
        statistics: {
          totalGamesPlayed: 10,
          totalPlayTime: 3600,
          averageSessionDuration: 360,
          achievementsUnlocked: 5,
          highestScore: 1000,
          streakDays: 3,
          lastPlayDate: new Date()
        },
        achievements: []
      };

      expect(validateUserProfile(validProfile)).toBe(true);
    });

    it('should reject profile without required id', () => {
      const invalidProfile = {
        createdAt: new Date(),
        lastActive: new Date()
      };

      expect(validateUserProfile(invalidProfile)).toBe(false);
    });

    it('should reject profile with invalid dates', () => {
      const invalidProfile = {
        id: 'user123',
        createdAt: 'invalid-date',
        lastActive: new Date()
      };

      expect(validateUserProfile(invalidProfile)).toBe(false);
    });

    it('should reject null or undefined input', () => {
      expect(validateUserProfile(null)).toBe(false);
      expect(validateUserProfile(undefined)).toBe(false);
    });
  });

  describe('validateUserPreferences', () => {
    it('should validate complete preferences', () => {
      const validPreferences = {
        soundEnabled: true,
        musicEnabled: false,
        soundVolume: 0.5,
        musicVolume: 0.3,
        reducedMotion: true,
        highContrast: false,
        fontSize: FontSize.LARGE,
        analyticsConsent: true,
        notifications: {},
        privacySettings: {}
      };

      expect(validateUserPreferences(validPreferences)).toBe(true);
    });

    it('should reject preferences with invalid volume values', () => {
      const invalidPreferences = {
        soundEnabled: true,
        musicEnabled: true,
        soundVolume: 1.5, // Invalid: > 1
        musicVolume: 0.5,
        reducedMotion: false,
        highContrast: false,
        fontSize: FontSize.MEDIUM,
        analyticsConsent: true,
        notifications: {},
        privacySettings: {}
      };

      expect(validateUserPreferences(invalidPreferences)).toBe(false);
    });

    it('should reject preferences with invalid font size', () => {
      const invalidPreferences = {
        soundEnabled: true,
        musicEnabled: true,
        soundVolume: 0.5,
        musicVolume: 0.5,
        reducedMotion: false,
        highContrast: false,
        fontSize: 'invalid-size',
        analyticsConsent: true,
        notifications: {},
        privacySettings: {}
      };

      expect(validateUserPreferences(invalidPreferences)).toBe(false);
    });
  });

  describe('validateGameProgress', () => {
    it('should validate complete game progress', () => {
      const validProgress = {
        gameId: 'tic-tac-toe',
        highScore: 100,
        totalPlays: 5,
        totalTime: 1200,
        averageScore: 80,
        achievements: ['first-win', 'perfect-game'],
        statistics: {
          gamesCompleted: 4,
          gamesAbandoned: 1,
          averageSessionDuration: 240,
          bestStreak: 3,
          currentStreak: 1,
          difficultyProgression: {},
          customStatistics: {}
        },
        lastPlayed: new Date()
      };

      expect(validateGameProgress(validProgress)).toBe(true);
    });

    it('should reject progress with negative values', () => {
      const invalidProgress = {
        gameId: 'tic-tac-toe',
        highScore: -10, // Invalid: negative
        totalPlays: 5,
        totalTime: 1200,
        averageScore: 80,
        achievements: [],
        lastPlayed: new Date()
      };

      expect(validateGameProgress(invalidProgress)).toBe(false);
    });

    it('should reject progress without gameId', () => {
      const invalidProgress = {
        highScore: 100,
        totalPlays: 5,
        totalTime: 1200,
        averageScore: 80,
        achievements: [],
        lastPlayed: new Date()
      };

      expect(validateGameProgress(invalidProgress)).toBe(false);
    });
  });

  describe('validateGameStats', () => {
    it('should validate complete game stats', () => {
      const validStats = {
        duration: 120,
        moves: 25,
        accuracy: 85,
        powerUpsUsed: 2,
        hintsUsed: 1,
        perfectMoves: 10,
        customStats: {
          specialMoves: 3,
          bonusPoints: 50
        }
      };

      expect(validateGameStats(validStats)).toBe(true);
    });

    it('should reject stats with negative duration', () => {
      const invalidStats = {
        duration: -10, // Invalid: negative
        moves: 25
      };

      expect(validateGameStats(invalidStats)).toBe(false);
    });

    it('should reject stats with invalid accuracy', () => {
      const invalidStats = {
        duration: 120,
        accuracy: 150 // Invalid: > 100
      };

      expect(validateGameStats(invalidStats)).toBe(false);
    });
  });

  describe('validateScore', () => {
    it('should validate positive numbers', () => {
      expect(validateScore(100)).toBe(true);
      expect(validateScore(0)).toBe(true);
      expect(validateScore(99.5)).toBe(true);
    });

    it('should reject negative numbers', () => {
      expect(validateScore(-10)).toBe(false);
    });

    it('should reject non-numbers', () => {
      expect(validateScore('100')).toBe(false);
      expect(validateScore(null)).toBe(false);
      expect(validateScore(undefined)).toBe(false);
      expect(validateScore(NaN)).toBe(false);
      expect(validateScore(Infinity)).toBe(false);
    });
  });

  describe('validateGameId', () => {
    it('should validate proper game IDs', () => {
      expect(validateGameId('tic-tac-toe')).toBe(true);
      expect(validateGameId('memory_match')).toBe(true);
      expect(validateGameId('snake123')).toBe(true);
    });

    it('should reject invalid game IDs', () => {
      expect(validateGameId('')).toBe(false);
      expect(validateGameId('game with spaces')).toBe(false);
      expect(validateGameId('game@special')).toBe(false);
      expect(validateGameId(123)).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
    });

    it('should remove quotes', () => {
      expect(sanitizeString('Hello "World"')).toBe('Hello World');
      expect(sanitizeString("Hello 'World'")).toBe('Hello World');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  Hello World  ')).toBe('Hello World');
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(150);
      expect(sanitizeString(longString)).toHaveLength(100);
    });

    it('should handle non-strings', () => {
      expect(sanitizeString(123 as any)).toBe('');
      expect(sanitizeString(null as any)).toBe('');
    });
  });

  describe('validateDisplayName', () => {
    it('should validate proper display names', () => {
      expect(validateDisplayName('Player1')).toBe('Player1');
      expect(validateDisplayName('Cool Gamer')).toBe('Cool Gamer');
      expect(validateDisplayName('User123')).toBe('User123');
    });

    it('should reject invalid display names', () => {
      expect(validateDisplayName('')).toBe(null);
      expect(validateDisplayName('a'.repeat(25))).toBe(null); // Too long
      expect(validateDisplayName('Player@123')).toBe(null); // Special characters
      expect(validateDisplayName('<script>')).toBe('script'); // HTML tags removed, but result is valid
      expect(validateDisplayName('<>')).toBe(null); // Only HTML tags, becomes empty after sanitization
      expect(validateDisplayName(123)).toBe(null); // Not a string
    });

    it('should sanitize and validate', () => {
      expect(validateDisplayName('  Player1  ')).toBe('Player1');
    });
  });
});