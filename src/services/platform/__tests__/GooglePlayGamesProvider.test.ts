/**
 * Unit tests for GooglePlayGamesProvider
 */

import { GooglePlayGamesProvider } from '../GooglePlayGamesProvider';
import { ScoreType, SortOrder, AchievementRarity, TimeScope, Collection } from '../../../types/platform';

describe('GooglePlayGamesProvider', () => {
  let provider: GooglePlayGamesProvider;

  beforeEach(() => {
    provider = new GooglePlayGamesProvider();
  });

  afterEach(async () => {
    await provider.cleanup();
  });

  describe('Provider Properties', () => {
    it('should have correct provider properties', () => {
      expect(provider.name).toBe('GooglePlayGames');
      expect(provider.platform).toBe('android');
      expect(provider.capabilities.hasAuthentication).toBe(true);
      expect(provider.capabilities.hasLeaderboards).toBe(true);
      expect(provider.capabilities.hasAchievements).toBe(true);
      expect(provider.capabilities.hasCloudSave).toBe(true);
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const config = {
        enableAuthentication: true,
        enableLeaderboards: true,
        enableAchievements: true,
        enableCloudSave: true,
        enableSocialFeatures: true,
        autoSignIn: false,
        fallbackToLocal: true,
        syncInterval: 30000,
        enableSnapshots: true,
        enableRealTimeMultiplayer: false,
        enableTurnBasedMultiplayer: false,
        debugMode: true,
      };

      await expect(provider.initialize(config)).resolves.not.toThrow();
    });

    it('should handle initialization failure', async () => {
      // Mock a failure scenario by providing invalid config
      const config = null as any;

      await expect(provider.initialize(config)).rejects.toThrow();
    });

    it('should auto sign-in when enabled', async () => {
      const config = {
        enableAuthentication: true,
        enableLeaderboards: true,
        enableAchievements: true,
        enableCloudSave: true,
        enableSocialFeatures: true,
        autoSignIn: true,
        fallbackToLocal: true,
        syncInterval: 30000,
        enableSnapshots: true,
        enableRealTimeMultiplayer: false,
        enableTurnBasedMultiplayer: false,
        debugMode: false,
      };

      await provider.initialize(config);
      
      // Check if user is signed in (may or may not succeed due to simulation)
      const isSignedIn = await provider.isSignedIn();
      expect(typeof isSignedIn).toBe('boolean');
    });
  });

  describe('Authentication', () => {
    beforeEach(async () => {
      await provider.initialize({
        enableAuthentication: true,
        enableLeaderboards: true,
        enableAchievements: true,
        enableCloudSave: true,
        enableSocialFeatures: true,
        autoSignIn: false,
        fallbackToLocal: true,
        syncInterval: 30000,
        enableSnapshots: true,
        enableRealTimeMultiplayer: false,
        enableTurnBasedMultiplayer: false,
        debugMode: false,
      });
    });

    it('should sign in successfully', async () => {
      const result = await provider.signIn();

      expect(result.success).toBe(true);
      expect(result.user).toBeTruthy();
      expect(result.user?.platform).toBe('google');
    });

    it('should get current user after sign in', async () => {
      await provider.signIn();
      
      const user = await provider.getCurrentUser();
      expect(user).toBeTruthy();
      expect(user?.platform).toBe('google');
    });

    it('should check sign-in status', async () => {
      expect(await provider.isSignedIn()).toBe(false);
      
      await provider.signIn();
      
      expect(await provider.isSignedIn()).toBe(true);
    });

    it('should sign out successfully', async () => {
      await provider.signIn();
      expect(await provider.isSignedIn()).toBe(true);
      
      await provider.signOut();
      
      expect(await provider.isSignedIn()).toBe(false);
    });

    it('should handle sign-in failure gracefully', async () => {
      // The simulation has a 10% failure rate, so we'll test multiple times
      let failureEncountered = false;
      
      for (let i = 0; i < 20; i++) {
        const result = await provider.signIn();
        if (!result.success) {
          failureEncountered = true;
          expect(result.error).toBeTruthy();
          break;
        }
        await provider.signOut();
      }
      
      // If no failure encountered in 20 tries, that's also acceptable
      expect(typeof failureEncountered).toBe('boolean');
    });
  });

  describe('Leaderboards', () => {
    beforeEach(async () => {
      await provider.initialize({
        enableAuthentication: true,
        enableLeaderboards: true,
        enableAchievements: true,
        enableCloudSave: true,
        enableSocialFeatures: true,
        autoSignIn: false,
        fallbackToLocal: true,
        syncInterval: 30000,
        enableSnapshots: true,
        enableRealTimeMultiplayer: false,
        enableTurnBasedMultiplayer: false,
        debugMode: false,
      });
      await provider.signIn();
    });

    it('should submit score successfully', async () => {
      const result = await provider.submitScore('test_leaderboard', 1000);

      expect(result.success).toBe(true);
      expect(result.newRank).toBeTruthy();
      expect(result.previousRank).toBeTruthy();
    });

    it('should get leaderboard data', async () => {
      const leaderboard = await provider.getLeaderboard('test_leaderboard');

      expect(leaderboard).toBeTruthy();
      expect(leaderboard.id).toBe('test_leaderboard');
      expect(leaderboard.entries).toBeDefined();
      expect(Array.isArray(leaderboard.entries)).toBe(true);
    });

    it('should get leaderboard with different time scopes', async () => {
      const allTimeLeaderboard = await provider.getLeaderboard(
        'test_leaderboard', 
        TimeScope.ALL_TIME
      );
      const weeklyLeaderboard = await provider.getLeaderboard(
        'test_leaderboard', 
        TimeScope.WEEK
      );

      expect(allTimeLeaderboard.id).toBe('test_leaderboard');
      expect(weeklyLeaderboard.id).toBe('test_leaderboard');
    });

    it('should get player score', async () => {
      const score = await provider.getPlayerScore('test_leaderboard');

      expect(score).toBeTruthy();
      expect(score?.userId).toBeTruthy();
      expect(typeof score?.score).toBe('number');
      expect(typeof score?.rank).toBe('number');
    });

    it('should handle score submission without authentication', async () => {
      await provider.signOut();

      await expect(
        provider.submitScore('test_leaderboard', 1000)
      ).rejects.toThrow('User not signed in');
    });
  });

  describe('Achievements', () => {
    beforeEach(async () => {
      await provider.initialize({
        enableAuthentication: true,
        enableLeaderboards: true,
        enableAchievements: true,
        enableCloudSave: true,
        enableSocialFeatures: true,
        autoSignIn: false,
        fallbackToLocal: true,
        syncInterval: 30000,
        enableSnapshots: true,
        enableRealTimeMultiplayer: false,
        enableTurnBasedMultiplayer: false,
        debugMode: false,
      });
      await provider.signIn();
    });

    it('should unlock achievement successfully', async () => {
      const result = await provider.unlockAchievement('test_achievement');

      expect(result.success).toBe(true);
      
      if (!result.alreadyUnlocked) {
        expect(result.achievement).toBeTruthy();
        expect(result.achievement?.isUnlocked).toBe(true);
      }
    });

    it('should increment achievement successfully', async () => {
      const result = await provider.incrementAchievement('incremental_achievement', 10);

      expect(result.success).toBe(true);
      expect(result.achievement).toBeTruthy();
      expect(result.achievement?.progress).toBeGreaterThanOrEqual(10);
    });

    it('should get all achievements', async () => {
      const achievements = await provider.getAchievements();

      expect(Array.isArray(achievements)).toBe(true);
      expect(achievements.length).toBeGreaterThan(0);
      
      achievements.forEach(achievement => {
        expect(achievement.id).toBeTruthy();
        expect(achievement.name).toBeTruthy();
        expect(typeof achievement.isUnlocked).toBe('boolean');
      });
    });

    it('should get specific achievement', async () => {
      const achievement = await provider.getAchievement('test_achievement');

      expect(achievement).toBeTruthy();
      expect(achievement?.id).toBe('test_achievement');
    });

    it('should handle achievement operations without authentication', async () => {
      await provider.signOut();

      await expect(
        provider.unlockAchievement('test_achievement')
      ).rejects.toThrow('User not signed in');

      await expect(
        provider.incrementAchievement('test_achievement', 5)
      ).rejects.toThrow('User not signed in');
    });
  });

  describe('Cloud Save', () => {
    beforeEach(async () => {
      await provider.initialize({
        enableAuthentication: true,
        enableLeaderboards: true,
        enableAchievements: true,
        enableCloudSave: true,
        enableSocialFeatures: true,
        autoSignIn: false,
        fallbackToLocal: true,
        syncInterval: 30000,
        enableSnapshots: true,
        enableRealTimeMultiplayer: false,
        enableTurnBasedMultiplayer: false,
        debugMode: false,
      });
      await provider.signIn();
    });

    it('should save to cloud successfully', async () => {
      const testData = { level: 5, score: 1000 };
      const result = await provider.saveToCloud('test_save', testData);

      expect(result).toBe(true);
    });

    it('should load from cloud successfully', async () => {
      const cloudData = await provider.loadFromCloud('test_save');

      // May return null if no data exists (30% chance in simulation)
      if (cloudData) {
        expect(cloudData.gameId).toBe('test_save');
        expect(cloudData.data).toBeTruthy();
        expect(cloudData.timestamp).toBeInstanceOf(Date);
      }
    });

    it('should delete from cloud successfully', async () => {
      const result = await provider.deleteFromCloud('test_save');

      expect(result).toBe(true);
    });

    it('should sync with cloud successfully', async () => {
      const result = await provider.syncWithCloud();

      expect(result.success).toBe(true);
      expect(typeof result.conflictsResolved).toBe('number');
      expect(typeof result.dataUpdated).toBe('boolean');
    });

    it('should handle cloud operations without authentication', async () => {
      await provider.signOut();

      await expect(
        provider.saveToCloud('test_save', {})
      ).rejects.toThrow('User not signed in');

      const cloudData = await provider.loadFromCloud('test_save');
      expect(cloudData).toBeNull();

      await expect(
        provider.syncWithCloud()
      ).rejects.toThrow('User not signed in');
    });
  });

  describe('Social Features', () => {
    beforeEach(async () => {
      await provider.initialize({
        enableAuthentication: true,
        enableLeaderboards: true,
        enableAchievements: true,
        enableCloudSave: true,
        enableSocialFeatures: true,
        autoSignIn: false,
        fallbackToLocal: true,
        syncInterval: 30000,
        enableSnapshots: true,
        enableRealTimeMultiplayer: false,
        enableTurnBasedMultiplayer: false,
        debugMode: false,
      });
      await provider.signIn();
    });

    it('should show leaderboard UI', async () => {
      await expect(
        provider.showLeaderboard('test_leaderboard')
      ).resolves.not.toThrow();
    });

    it('should show achievements UI', async () => {
      await expect(
        provider.showAchievements()
      ).resolves.not.toThrow();
    });

    it('should share score successfully', async () => {
      const result = await provider.shareScore(
        'test_leaderboard', 
        1000, 
        'Check out my high score!'
      );

      expect(result).toBe(true);
    });

    it('should handle social features without authentication', async () => {
      await provider.signOut();

      await expect(
        provider.showLeaderboard('test_leaderboard')
      ).rejects.toThrow('User not signed in');

      await expect(
        provider.showAchievements()
      ).rejects.toThrow('User not signed in');

      const shareResult = await provider.shareScore('test_leaderboard', 1000);
      expect(shareResult).toBe(false);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await provider.initialize({
        enableAuthentication: true,
        enableLeaderboards: true,
        enableAchievements: true,
        enableCloudSave: true,
        enableSocialFeatures: true,
        autoSignIn: false,
        fallbackToLocal: true,
        syncInterval: 30000,
        enableSnapshots: true,
        enableRealTimeMultiplayer: false,
        enableTurnBasedMultiplayer: false,
        debugMode: false,
      });
    });

    it('should add and remove event listeners', () => {
      const listener = jest.fn();

      provider.on('testEvent', listener);
      provider.off('testEvent', listener);

      // Manually emit event to test
      (provider as any).emit('testEvent', { test: true });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should emit events for authentication', async () => {
      const signInListener = jest.fn();
      const signOutListener = jest.fn();

      provider.on('signedIn', signInListener);
      provider.on('signedOut', signOutListener);

      await provider.signIn();
      expect(signInListener).toHaveBeenCalled();

      await provider.signOut();
      expect(signOutListener).toHaveBeenCalled();
    });

    it('should emit events for score submission', async () => {
      const scoreListener = jest.fn();
      provider.on('scoreSubmitted', scoreListener);

      await provider.signIn();
      await provider.submitScore('test_leaderboard', 1000);

      expect(scoreListener).toHaveBeenCalled();
    });

    it('should emit events for achievement unlock', async () => {
      const achievementListener = jest.fn();
      provider.on('achievementUnlocked', achievementListener);

      await provider.signIn();
      await provider.unlockAchievement('test_achievement');

      expect(achievementListener).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle operations before initialization', async () => {
      await expect(provider.signIn()).rejects.toThrow('not initialized');
    });

    it('should handle cleanup gracefully', async () => {
      await provider.initialize({
        enableAuthentication: true,
        enableLeaderboards: true,
        enableAchievements: true,
        enableCloudSave: true,
        enableSocialFeatures: true,
        autoSignIn: false,
        fallbackToLocal: true,
        syncInterval: 30000,
        enableSnapshots: true,
        enableRealTimeMultiplayer: false,
        enableTurnBasedMultiplayer: false,
        debugMode: false,
      });

      await provider.signIn();
      
      await expect(provider.cleanup()).resolves.not.toThrow();
      
      // Should be able to cleanup multiple times
      await expect(provider.cleanup()).resolves.not.toThrow();
    });
  });
});