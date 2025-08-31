/**
 * Unit tests for PlatformServicesManager
 */

import { PlatformServicesManager } from '../PlatformServicesManager';
import { GooglePlayGamesProvider } from '../GooglePlayGamesProvider';
import { GameCenterProvider } from '../GameCenterProvider';
import { LocalProvider } from '../LocalProvider';
import { StorageManager } from '../../storage/StorageManager';
import { ScoreType, SortOrder, AchievementRarity } from '../../../types/platform';

// Mock storage manager
const mockStorageManager = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  hasItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
} as unknown as StorageManager;

describe('PlatformServicesManager', () => {
  let manager: PlatformServicesManager;
  let googleProvider: GooglePlayGamesProvider;
  let gameCenterProvider: GameCenterProvider;
  let localProvider: LocalProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    
    manager = new PlatformServicesManager({
      primaryProvider: 'GooglePlayGames',
      fallbackChain: ['GameCenter', 'Local'],
      enableServiceDiscovery: true,
      discoveryConfig: {
        enableAutoDiscovery: true,
        discoveryInterval: 5000,
        maxRetries: 3,
        fallbackChain: ['GooglePlayGames', 'GameCenter', 'Local'],
      },
      conflictResolution: [],
      syncInterval: 30000,
      maxRetries: 3,
      enableOfflineMode: true,
    });

    googleProvider = new GooglePlayGamesProvider();
    gameCenterProvider = new GameCenterProvider();
    localProvider = new LocalProvider();

    // Mock storage for local provider
    (mockStorageManager.hasItem as jest.Mock).mockResolvedValue(false);
    (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
    (mockStorageManager.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await manager.cleanup();
  });

  describe('Provider Registration', () => {
    it('should register providers', () => {
      manager.registerProvider(googleProvider);
      manager.registerProvider(gameCenterProvider);
      manager.registerProvider(localProvider);

      const providers = manager.getAvailableProviders();
      expect(providers).toHaveLength(3);
      expect(providers.map(p => p.name)).toContain('GooglePlayGames');
      expect(providers.map(p => p.name)).toContain('GameCenter');
      expect(providers.map(p => p.name)).toContain('Local');
    });

    it('should get specific provider', () => {
      manager.registerProvider(googleProvider);
      
      const provider = manager.getProvider('GooglePlayGames');
      expect(provider).toBe(googleProvider);
    });

    it('should return null for non-existent provider', () => {
      const provider = manager.getProvider('NonExistent');
      expect(provider).toBeNull();
    });
  });

  describe('Initialization', () => {
    beforeEach(() => {
      manager.registerProvider(googleProvider);
      manager.registerProvider(localProvider);
    });

    it('should initialize successfully', async () => {
      const initListener = jest.fn();
      manager.on('initialized', initListener);

      await manager.initialize();

      expect(initListener).toHaveBeenCalled();
    });

    it('should select primary provider', async () => {
      await manager.initialize();

      const activeProvider = manager.getProvider();
      expect(activeProvider).toBeTruthy();
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      manager.registerProvider(localProvider);
      await manager.initialize();
    });

    it('should sign in successfully', async () => {
      const result = await manager.signIn();

      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
    });

    it('should get current user', async () => {
      await manager.signIn();
      
      const user = await manager.getCurrentUser();
      expect(user).toBeTruthy();
      expect(user?.platform).toBe('local');
    });

    it('should sign out successfully', async () => {
      await manager.signIn();
      await manager.signOut();
      
      const user = await manager.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('Leaderboards', () => {
    beforeEach(async () => {
      manager.registerProvider(localProvider);
      await manager.initialize();
      await manager.signIn();
    });

    it('should submit score successfully', async () => {
      const result = await manager.submitScore('test_leaderboard', 1000);

      expect(result.success).toBe(true);
      expect(result.newRank).toBeTruthy();
    });

    it('should get leaderboard data', async () => {
      // Submit a score first
      await manager.submitScore('test_leaderboard', 1000);
      
      const leaderboard = await manager.getLeaderboard('test_leaderboard');

      expect(leaderboard).toBeTruthy();
      expect(leaderboard.id).toBe('test_leaderboard');
      expect(leaderboard.entries).toBeDefined();
    });

    it('should handle multiple score submissions', async () => {
      await manager.submitScore('test_leaderboard', 1000);
      await manager.submitScore('test_leaderboard', 1500);
      
      const leaderboard = await manager.getLeaderboard('test_leaderboard');
      const userEntry = leaderboard.userEntry;
      
      expect(userEntry?.score).toBe(1500);
    });
  });

  describe('Achievements', () => {
    beforeEach(async () => {
      manager.registerProvider(localProvider);
      await manager.initialize();
      await manager.signIn();
    });

    it('should unlock achievement successfully', async () => {
      const result = await manager.unlockAchievement('test_achievement');

      expect(result.success).toBe(true);
    });

    it('should get achievements list', async () => {
      await manager.unlockAchievement('test_achievement');
      
      const achievements = await manager.getAchievements();

      expect(Array.isArray(achievements)).toBe(true);
    });

    it('should handle already unlocked achievement', async () => {
      // Unlock first time
      await manager.unlockAchievement('test_achievement');
      
      // Try to unlock again
      const result = await manager.unlockAchievement('test_achievement');
      
      expect(result.success).toBe(true);
      expect(result.alreadyUnlocked).toBe(true);
    });
  });

  describe('Progress Management', () => {
    beforeEach(async () => {
      manager.registerProvider(localProvider);
      await manager.initialize();
      await manager.signIn();
    });

    it('should save progress', async () => {
      const gameData = { level: 5, score: 1000 };
      const result = await manager.saveProgress('test_game', gameData);

      // Local provider doesn't support cloud save, so this should return false
      expect(result).toBe(false);
    });

    it('should load progress', async () => {
      const result = await manager.loadProgress('test_game');

      // Local provider doesn't support cloud load, so this should return null
      expect(result).toBeNull();
    });

    it('should sync progress', async () => {
      const result = await manager.syncProgress();

      expect(result).toBeTruthy();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Fallback Mechanism', () => {
    it('should fallback to next provider on failure', async () => {
      // Create a failing provider
      const failingProvider = {
        name: 'FailingProvider',
        platform: 'test' as const,
        capabilities: {
          hasAuthentication: true,
          hasLeaderboards: true,
          hasAchievements: true,
          hasCloudSave: false,
          hasSocialFeatures: false,
          hasRealTimeMultiplayer: false,
          hasTurnBasedMultiplayer: false,
          hasInAppPurchases: false,
        },
        initialize: jest.fn().mockResolvedValue(undefined),
        cleanup: jest.fn().mockResolvedValue(undefined),
        signIn: jest.fn().mockRejectedValue(new Error('Sign-in failed')),
        signOut: jest.fn().mockResolvedValue(undefined),
        getCurrentUser: jest.fn().mockResolvedValue(null),
        isSignedIn: jest.fn().mockResolvedValue(false),
        submitScore: jest.fn().mockRejectedValue(new Error('Submit failed')),
        getLeaderboard: jest.fn().mockRejectedValue(new Error('Get failed')),
        getPlayerScore: jest.fn().mockResolvedValue(null),
        unlockAchievement: jest.fn().mockRejectedValue(new Error('Unlock failed')),
        incrementAchievement: jest.fn().mockRejectedValue(new Error('Increment failed')),
        getAchievements: jest.fn().mockResolvedValue([]),
        getAchievement: jest.fn().mockResolvedValue(null),
        saveToCloud: jest.fn().mockResolvedValue(false),
        loadFromCloud: jest.fn().mockResolvedValue(null),
        deleteFromCloud: jest.fn().mockResolvedValue(false),
        syncWithCloud: jest.fn().mockResolvedValue({
          success: false,
          conflictsResolved: 0,
          dataUpdated: false,
        }),
        showLeaderboard: jest.fn().mockResolvedValue(undefined),
        showAchievements: jest.fn().mockResolvedValue(undefined),
        shareScore: jest.fn().mockResolvedValue(false),
        on: jest.fn(),
        off: jest.fn(),
      };

      const managerWithFallback = new PlatformServicesManager({
        primaryProvider: 'FailingProvider',
        fallbackChain: ['Local'],
        enableServiceDiscovery: true,
        discoveryConfig: {
          enableAutoDiscovery: false,
          discoveryInterval: 5000,
          maxRetries: 1,
          fallbackChain: ['FailingProvider', 'Local'],
        },
        conflictResolution: [],
        syncInterval: 0,
        maxRetries: 1,
        enableOfflineMode: true,
      });

      managerWithFallback.registerProvider(failingProvider);
      managerWithFallback.registerProvider(localProvider);

      await managerWithFallback.initialize();

      // This should fallback to local provider
      const result = await managerWithFallback.signIn();
      expect(result.success).toBe(true);

      await managerWithFallback.cleanup();
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      manager.registerProvider(localProvider);
      await manager.initialize();
    });

    it('should emit events for provider actions', async () => {
      const signInListener = jest.fn();
      manager.on('signedIn', signInListener);

      await manager.signIn();

      expect(signInListener).toHaveBeenCalled();
    });

    it('should emit events for score submission', async () => {
      const scoreListener = jest.fn();
      manager.on('scoreSubmitted', scoreListener);

      await manager.signIn();
      await manager.submitScore('test_leaderboard', 1000);

      expect(scoreListener).toHaveBeenCalled();
    });

    it('should remove event listeners', () => {
      const listener = jest.fn();
      
      manager.on('testEvent', listener);
      manager.off('testEvent', listener);

      // Manually emit event to test
      (manager as any).emit('testEvent', {});

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Offline Mode', () => {
    it('should queue actions when offline', async () => {
      // Don't register any providers to simulate offline
      await manager.initialize();

      // This should be queued
      const savePromise = manager.saveProgress('test_game', { level: 1 });

      // Register provider and initialize
      manager.registerProvider(localProvider);
      
      // The queued action should be processed (though local provider doesn't support cloud save)
      const result = await savePromise;
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all providers', async () => {
      const cleanupSpy = jest.spyOn(localProvider, 'cleanup');
      
      manager.registerProvider(localProvider);
      await manager.initialize();
      await manager.cleanup();

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should clear all resources', async () => {
      manager.registerProvider(localProvider);
      await manager.initialize();
      
      const providers = manager.getAvailableProviders();
      expect(providers.length).toBeGreaterThan(0);
      
      await manager.cleanup();
      
      const providersAfterCleanup = manager.getAvailableProviders();
      expect(providersAfterCleanup).toHaveLength(0);
    });
  });
});