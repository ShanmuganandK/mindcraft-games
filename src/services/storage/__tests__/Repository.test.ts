/**
 * Unit tests for Repository classes
 */

import { UserProfileRepository, GameProgressRepository, SettingsRepository } from '../Repository';
import { StorageProvider } from '../StorageProvider';
import { UserProfile, GameProgress, FontSize, GameDifficulty } from '../../../types';

// Mock storage provider
const mockStorageProvider: jest.Mocked<StorageProvider> = {
  name: 'MockProvider',
  version: '1.0.0',
  capabilities: {
    encryption: true,
    compression: true,
    cloudSync: false,
    migration: true,
    backup: true,
    ttl: true,
    batchOperations: true
  },
  initialize: jest.fn(),
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  hasItem: jest.fn(),
  getStorageInfo: jest.fn(),
  multiSet: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
  migrate: jest.fn(),
  backup: jest.fn(),
  restore: jest.fn()
};

describe('UserProfileRepository', () => {
  let repository: UserProfileRepository;
  let mockProfile: UserProfile;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new UserProfileRepository(mockStorageProvider);
    
    mockProfile = {
      id: 'user123',
      displayName: 'TestUser',
      createdAt: new Date('2023-01-01'),
      lastActive: new Date('2023-12-01'),
      preferences: {
        soundEnabled: true,
        musicEnabled: true,
        soundVolume: 0.8,
        musicVolume: 0.6,
        reducedMotion: false,
        highContrast: false,
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
        averageSessionDuration: 360,
        achievementsUnlocked: 5,
        highestScore: 1000,
        streakDays: 3,
        lastPlayDate: new Date('2023-11-30')
      },
      achievements: []
    };
  });

  describe('basic operations', () => {
    it('should save user profile', async () => {
      mockStorageProvider.setItem.mockResolvedValueOnce();

      await repository.save(mockProfile);

      expect(mockStorageProvider.setItem).toHaveBeenCalledWith(
        'user_profile:user123',
        mockProfile,
        { encrypt: true, compress: true }
      );
    });

    it('should find user profile by id', async () => {
      mockStorageProvider.getItem.mockResolvedValueOnce(mockProfile);

      const result = await repository.findById('user123');

      expect(result).toEqual(mockProfile);
      expect(mockStorageProvider.getItem).toHaveBeenCalledWith('user_profile:user123');
    });

    it('should return null for non-existent user', async () => {
      mockStorageProvider.getItem.mockResolvedValueOnce(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should update user profile', async () => {
      mockStorageProvider.getItem.mockResolvedValueOnce(mockProfile);
      mockStorageProvider.setItem.mockResolvedValueOnce();

      const updates = { displayName: 'UpdatedUser' };
      await repository.update('user123', updates);

      expect(mockStorageProvider.setItem).toHaveBeenCalledWith(
        'user_profile:user123',
        { ...mockProfile, ...updates },
        { encrypt: true, compress: true }
      );
    });

    it('should delete user profile', async () => {
      mockStorageProvider.removeItem.mockResolvedValueOnce();

      await repository.delete('user123');

      expect(mockStorageProvider.removeItem).toHaveBeenCalledWith('user_profile:user123');
    });
  });

  describe('validation', () => {
    it('should reject invalid user profile', async () => {
      const invalidProfile = { id: 'test' }; // Missing required fields

      await expect(repository.save(invalidProfile as any)).rejects.toThrow('Invalid entity data');
    });
  });

  describe('caching', () => {
    it('should cache retrieved profiles', async () => {
      mockStorageProvider.getItem.mockResolvedValueOnce(mockProfile);

      // First call
      const result1 = await repository.findById('user123');
      // Second call should use cache
      const result2 = await repository.findById('user123');

      expect(result1).toEqual(mockProfile);
      expect(result2).toEqual(mockProfile);
      expect(mockStorageProvider.getItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('special methods', () => {
    it('should get current user', async () => {
      mockStorageProvider.getAllKeys.mockResolvedValueOnce(['user_profile:user123']);
      mockStorageProvider.getItem.mockResolvedValueOnce(mockProfile);

      const currentUser = await repository.getCurrentUser();

      expect(currentUser).toEqual(mockProfile);
    });

    it('should update last active timestamp', async () => {
      mockStorageProvider.getItem.mockResolvedValueOnce(mockProfile);
      mockStorageProvider.setItem.mockResolvedValueOnce();

      await repository.updateLastActive('user123');

      expect(mockStorageProvider.setItem).toHaveBeenCalledWith(
        'user_profile:user123',
        expect.objectContaining({
          ...mockProfile,
          lastActive: expect.any(Date)
        }),
        { encrypt: true, compress: true }
      );
    });
  });
});

describe('GameProgressRepository', () => {
  let repository: GameProgressRepository;
  let mockProgress: GameProgress;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new GameProgressRepository(mockStorageProvider);
    
    mockProgress = {
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
          [GameDifficulty.EASY]: 2,
          [GameDifficulty.MEDIUM]: 2,
          [GameDifficulty.HARD]: 0,
          [GameDifficulty.EXPERT]: 0,
          [GameDifficulty.CUSTOM]: 0
        },
        customStatistics: {}
      },
      lastPlayed: new Date('2023-12-01'),
      unlockedFeatures: ['hard-mode']
    };
  });

  describe('basic operations', () => {
    it('should save game progress', async () => {
      mockStorageProvider.setItem.mockResolvedValueOnce();

      await repository.save(mockProgress);

      expect(mockStorageProvider.setItem).toHaveBeenCalledWith(
        'game_progress:tic-tac-toe',
        mockProgress,
        { encrypt: false, compress: true }
      );
    });

    it('should find progress by game id', async () => {
      mockStorageProvider.getItem.mockResolvedValueOnce(mockProgress);

      const result = await repository.findByGameId('tic-tac-toe');

      expect(result).toEqual(mockProgress);
    });
  });

  describe('score updates', () => {
    it('should update existing progress with new score', async () => {
      mockStorageProvider.getItem.mockResolvedValueOnce(mockProgress);
      mockStorageProvider.setItem.mockResolvedValueOnce();

      await repository.updateScore('tic-tac-toe', 120);

      expect(mockStorageProvider.setItem).toHaveBeenCalledWith(
        'game_progress:tic-tac-toe',
        expect.objectContaining({
          gameId: 'tic-tac-toe',
          highScore: 120, // Updated high score
          totalPlays: 6, // Incremented
          averageScore: expect.any(Number),
          lastPlayed: expect.any(Date)
        }),
        { encrypt: false, compress: true }
      );
    });

    it('should create new progress for new game', async () => {
      mockStorageProvider.getItem.mockResolvedValueOnce(null);
      mockStorageProvider.setItem.mockResolvedValueOnce();

      await repository.updateScore('new-game', 50);

      expect(mockStorageProvider.setItem).toHaveBeenCalledWith(
        'game_progress:new-game',
        expect.objectContaining({
          gameId: 'new-game',
          highScore: 50,
          totalPlays: 1,
          averageScore: 50
        }),
        { encrypt: false, compress: true }
      );
    });
  });

  describe('top scores', () => {
    it('should get top scores', async () => {
      const allProgress = [
        { ...mockProgress, gameId: 'game1', highScore: 100 },
        { ...mockProgress, gameId: 'game2', highScore: 200 },
        { ...mockProgress, gameId: 'game3', highScore: 150 }
      ];

      mockStorageProvider.getAllKeys.mockResolvedValueOnce([
        'game_progress:game1',
        'game_progress:game2',
        'game_progress:game3'
      ]);
      
      // Mock findById calls
      jest.spyOn(repository, 'findById')
        .mockResolvedValueOnce(allProgress[0])
        .mockResolvedValueOnce(allProgress[1])
        .mockResolvedValueOnce(allProgress[2]);

      const topScores = await repository.getTopScores(2);

      expect(topScores).toEqual([
        { gameId: 'game2', score: 200 },
        { gameId: 'game3', score: 150 }
      ]);
    });
  });
});

describe('SettingsRepository', () => {
  let repository: SettingsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new SettingsRepository(mockStorageProvider);
  });

  describe('settings operations', () => {
    it('should set setting', async () => {
      mockStorageProvider.setItem.mockResolvedValueOnce();

      await repository.setSetting('theme', 'dark');

      expect(mockStorageProvider.setItem).toHaveBeenCalledWith(
        'settings:theme',
        { key: 'theme', value: 'dark' },
        { encrypt: false, compress: true }
      );
    });

    it('should get setting', async () => {
      mockStorageProvider.getItem.mockResolvedValueOnce({ key: 'theme', value: 'dark' });

      const result = await repository.getSetting('theme');

      expect(result).toBe('dark');
    });

    it('should return default value when setting not found', async () => {
      mockStorageProvider.getItem.mockResolvedValueOnce(null);

      const result = await repository.getSetting('nonexistent', 'default');

      expect(result).toBe('default');
    });

    it('should remove setting', async () => {
      mockStorageProvider.removeItem.mockResolvedValueOnce();

      await repository.removeSetting('theme');

      expect(mockStorageProvider.removeItem).toHaveBeenCalledWith('settings:theme');
    });
  });
});