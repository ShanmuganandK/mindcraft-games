/**
 * Local Platform Provider - Fallback provider for offline functionality
 * Provides local-only gaming services when platform services are unavailable
 */

import {
  PlatformServiceProvider,
  PlatformServiceConfig,
  PlatformUser,
  AuthenticationResult,
  LeaderboardSubmissionResult,
  AchievementUnlockResult,
  Leaderboard,
  LeaderboardEntry,
  Achievement,
  CloudSaveData,
  SyncResult,
  PlatformCapabilities,
  TimeScope,
  Collection,
  ScoreType,
  SortOrder,
  AchievementRarity,
} from '../../types/platform';
import { StorageManager } from '../storage/StorageManager';

export interface LocalProviderConfig extends PlatformServiceConfig {
  storageManager: StorageManager;
  enableGuestMode: boolean;
  maxLeaderboardEntries: number;
  achievementDefinitions: Achievement[];
}

export class LocalProvider implements PlatformServiceProvider {
  readonly name = 'Local';
  readonly platform = 'universal' as const;
  readonly capabilities: PlatformCapabilities = {
    hasAuthentication: true,
    hasLeaderboards: true,
    hasAchievements: true,
    hasCloudSave: false, // Local storage only
    hasSocialFeatures: false,
    hasRealTimeMultiplayer: false,
    hasTurnBasedMultiplayer: false,
    hasInAppPurchases: false,
  };

  private config?: LocalProviderConfig;
  private storageManager?: StorageManager;
  private isInitialized = false;
  private currentUser: PlatformUser | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  private static readonly STORAGE_KEYS = {
    USER: 'local_platform_user',
    LEADERBOARDS: 'local_leaderboards',
    ACHIEVEMENTS: 'local_achievements',
    PROGRESS: 'local_progress',
  };

  /**
   * Initialize local provider
   */
  async initialize(config: LocalProviderConfig): Promise<void> {
    try {
      this.config = config;
      this.storageManager = config.storageManager;

      // Initialize storage structure
      await this.initializeStorage();

      this.isInitialized = true;
      this.emit('initialized', { provider: this.name });

      // Auto sign-in if guest mode is enabled
      if (config.enableGuestMode && config.autoSignIn) {
        await this.createGuestUser();
      }

    } catch (error) {
      console.error('Failed to initialize local provider:', error);
      throw new Error(`Local provider initialization failed: ${error}`);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.currentUser = null;
    this.eventListeners.clear();
    this.emit('cleanup', { provider: this.name });
  }

  /**
   * Sign in (create local user)
   */
  async signIn(): Promise<AuthenticationResult> {
    if (!this.isInitialized || !this.storageManager) {
      throw new Error('Local provider not initialized');
    }

    try {
      // Try to load existing user
      let user = await this.loadUser();
      
      if (!user) {
        // Create new local user
        user = await this.createLocalUser();
      }
      
      this.currentUser = user;
      this.emit('signedIn', { user });

      return {
        success: true,
        user,
      };

    } catch (error) {
      console.error('Local sign-in failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Local sign-in failed',
      };
    }
  }

  /**
   * Sign out (clear local user)
   */
  async signOut(): Promise<void> {
    const previousUser = this.currentUser;
    this.currentUser = null;
    
    this.emit('signedOut', { previousUser });
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<PlatformUser | null> {
    return this.currentUser;
  }

  /**
   * Check if signed in
   */
  async isSignedIn(): Promise<boolean> {
    return this.currentUser !== null;
  }

  /**
   * Submit score to local leaderboard
   */
  async submitScore(
    leaderboardId: string, 
    score: number, 
    metadata?: any
  ): Promise<LeaderboardSubmissionResult> {
    if (!this.currentUser || !this.storageManager) {
      throw new Error('User not signed in or storage not available');
    }

    try {
      const leaderboards = await this.loadLeaderboards();
      
      if (!leaderboards[leaderboardId]) {
        leaderboards[leaderboardId] = {
          id: leaderboardId,
          name: `Local Leaderboard ${leaderboardId}`,
          scoreType: ScoreType.HIGHEST,
          sortOrder: SortOrder.DESCENDING,
          entries: [],
          totalEntries: 0,
          lastUpdated: new Date(),
        };
      }

      const leaderboard = leaderboards[leaderboardId];
      
      // Find existing entry for user
      const existingEntryIndex = leaderboard.entries.findIndex(
        entry => entry.userId === this.currentUser!.id
      );

      const previousRank = existingEntryIndex >= 0 ? existingEntryIndex + 1 : undefined;
      
      const newEntry: LeaderboardEntry = {
        userId: this.currentUser.id,
        displayName: this.currentUser.displayName,
        score,
        rank: 0, // Will be calculated after sorting
        timestamp: new Date(),
        avatarUrl: this.currentUser.avatarUrl,
        additionalData: metadata,
      };

      // Update or add entry
      if (existingEntryIndex >= 0) {
        // Only update if new score is better
        const existingScore = leaderboard.entries[existingEntryIndex].score;
        const isBetter = leaderboard.scoreType === ScoreType.HIGHEST 
          ? score > existingScore 
          : score < existingScore;
          
        if (isBetter) {
          leaderboard.entries[existingEntryIndex] = newEntry;
        } else {
          return {
            success: true,
            newRank: previousRank,
            previousRank,
          };
        }
      } else {
        leaderboard.entries.push(newEntry);
      }

      // Sort and update ranks
      this.sortLeaderboardEntries(leaderboard);
      
      // Limit entries
      if (leaderboard.entries.length > this.config!.maxLeaderboardEntries) {
        leaderboard.entries = leaderboard.entries.slice(0, this.config!.maxLeaderboardEntries);
      }

      leaderboard.totalEntries = leaderboard.entries.length;
      leaderboard.lastUpdated = new Date();

      // Save updated leaderboards
      await this.saveLeaderboards(leaderboards);

      const newRank = leaderboard.entries.findIndex(
        entry => entry.userId === this.currentUser!.id
      ) + 1;

      this.emit('scoreSubmitted', { leaderboardId, score, newRank, previousRank });

      return {
        success: true,
        newRank,
        previousRank,
      };

    } catch (error) {
      console.error('Failed to submit local score:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Score submission failed',
      };
    }
  }

  /**
   * Get local leaderboard
   */
  async getLeaderboard(
    leaderboardId: string, 
    timeScope: TimeScope = TimeScope.ALL_TIME,
    collection: Collection = Collection.PUBLIC
  ): Promise<Leaderboard> {
    if (!this.storageManager) {
      throw new Error('Storage not available');
    }

    try {
      const leaderboards = await this.loadLeaderboards();
      const leaderboard = leaderboards[leaderboardId];

      if (!leaderboard) {
        // Return empty leaderboard
        return {
          id: leaderboardId,
          name: `Local Leaderboard ${leaderboardId}`,
          scoreType: ScoreType.HIGHEST,
          sortOrder: SortOrder.DESCENDING,
          entries: [],
          totalEntries: 0,
          lastUpdated: new Date(),
        };
      }

      // Filter by time scope if needed
      let filteredEntries = leaderboard.entries;
      if (timeScope !== TimeScope.ALL_TIME) {
        const now = new Date();
        const cutoffDate = new Date();
        
        if (timeScope === TimeScope.TODAY) {
          cutoffDate.setHours(0, 0, 0, 0);
        } else if (timeScope === TimeScope.WEEK) {
          cutoffDate.setDate(now.getDate() - 7);
        }
        
        filteredEntries = leaderboard.entries.filter(
          entry => entry.timestamp >= cutoffDate
        );
      }

      // Find user entry
      const userEntry = this.currentUser 
        ? filteredEntries.find(entry => entry.userId === this.currentUser!.id)
        : undefined;

      return {
        ...leaderboard,
        entries: filteredEntries,
        userEntry,
        totalEntries: filteredEntries.length,
      };

    } catch (error) {
      console.error('Failed to get local leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get player's score
   */
  async getPlayerScore(leaderboardId: string): Promise<LeaderboardEntry | null> {
    if (!this.currentUser) {
      return null;
    }

    try {
      const leaderboard = await this.getLeaderboard(leaderboardId);
      return leaderboard.userEntry || null;
    } catch (error) {
      console.error('Failed to get player score:', error);
      return null;
    }
  }

  /**
   * Unlock local achievement
   */
  async unlockAchievement(achievementId: string): Promise<AchievementUnlockResult> {
    if (!this.currentUser || !this.storageManager) {
      throw new Error('User not signed in or storage not available');
    }

    try {
      const achievements = await this.loadAchievements();
      const achievement = achievements[achievementId];

      if (!achievement) {
        // Find achievement definition
        const definition = this.config?.achievementDefinitions.find(
          def => def.id === achievementId
        );

        if (!definition) {
          return {
            success: false,
            error: 'Achievement not found',
          };
        }

        // Create new achievement
        const newAchievement: Achievement = {
          ...definition,
          isUnlocked: true,
          unlockedAt: new Date(),
        };

        achievements[achievementId] = newAchievement;
        await this.saveAchievements(achievements);

        this.emit('achievementUnlocked', { achievementId, achievement: newAchievement });

        return {
          success: true,
          achievement: newAchievement,
        };
      }

      if (achievement.isUnlocked) {
        return {
          success: true,
          alreadyUnlocked: true,
          achievement,
        };
      }

      // Unlock existing achievement
      achievement.isUnlocked = true;
      achievement.unlockedAt = new Date();
      
      achievements[achievementId] = achievement;
      await this.saveAchievements(achievements);

      this.emit('achievementUnlocked', { achievementId, achievement });

      return {
        success: true,
        achievement,
      };

    } catch (error) {
      console.error('Failed to unlock local achievement:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Achievement unlock failed',
      };
    }
  }

  /**
   * Increment incremental achievement
   */
  async incrementAchievement(achievementId: string, steps: number): Promise<AchievementUnlockResult> {
    if (!this.currentUser || !this.storageManager) {
      throw new Error('User not signed in or storage not available');
    }

    try {
      const achievements = await this.loadAchievements();
      let achievement = achievements[achievementId];

      if (!achievement) {
        // Find achievement definition
        const definition = this.config?.achievementDefinitions.find(
          def => def.id === achievementId
        );

        if (!definition) {
          return {
            success: false,
            error: 'Achievement not found',
          };
        }

        achievement = { ...definition, progress: 0 };
      }

      if (achievement.isUnlocked) {
        return {
          success: true,
          alreadyUnlocked: true,
          achievement,
        };
      }

      // Increment progress
      const currentProgress = achievement.progress || 0;
      const newProgress = Math.min(
        currentProgress + steps, 
        achievement.maxProgress || 100
      );

      achievement.progress = newProgress;

      // Check if unlocked
      if (newProgress >= (achievement.maxProgress || 100)) {
        achievement.isUnlocked = true;
        achievement.unlockedAt = new Date();
      }

      achievements[achievementId] = achievement;
      await this.saveAchievements(achievements);

      this.emit('achievementIncremented', { achievementId, steps, achievement });

      return {
        success: true,
        achievement,
      };

    } catch (error) {
      console.error('Failed to increment local achievement:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Achievement increment failed',
      };
    }
  }

  /**
   * Get all achievements
   */
  async getAchievements(): Promise<Achievement[]> {
    if (!this.storageManager) {
      return [];
    }

    try {
      const achievements = await this.loadAchievements();
      return Object.values(achievements);
    } catch (error) {
      console.error('Failed to get local achievements:', error);
      return [];
    }
  }

  /**
   * Get specific achievement
   */
  async getAchievement(achievementId: string): Promise<Achievement | null> {
    if (!this.storageManager) {
      return null;
    }

    try {
      const achievements = await this.loadAchievements();
      return achievements[achievementId] || null;
    } catch (error) {
      console.error('Failed to get local achievement:', error);
      return null;
    }
  }

  /**
   * Local storage doesn't support cloud save
   */
  async saveToCloud(key: string, data: any): Promise<boolean> {
    return false;
  }

  /**
   * Local storage doesn't support cloud load
   */
  async loadFromCloud(key: string): Promise<CloudSaveData | null> {
    return null;
  }

  /**
   * Local storage doesn't support cloud delete
   */
  async deleteFromCloud(key: string): Promise<boolean> {
    return false;
  }

  /**
   * Local storage doesn't support cloud sync
   */
  async syncWithCloud(): Promise<SyncResult> {
    return {
      success: false,
      conflictsResolved: 0,
      dataUpdated: false,
      error: 'Cloud sync not supported in local mode',
    };
  }

  /**
   * Show local leaderboard (placeholder)
   */
  async showLeaderboard(leaderboardId?: string): Promise<void> {
    console.log(`Local leaderboard view requested: ${leaderboardId || 'all'}`);
    this.emit('leaderboardShown', { leaderboardId });
  }

  /**
   * Show local achievements (placeholder)
   */
  async showAchievements(): Promise<void> {
    console.log('Local achievements view requested');
    this.emit('achievementsShown');
  }

  /**
   * Local sharing (placeholder)
   */
  async shareScore(leaderboardId: string, score: number, message?: string): Promise<boolean> {
    console.log(`Local score sharing: ${score} on ${leaderboardId} with message: ${message}`);
    this.emit('scoreShared', { leaderboardId, score, message });
    return true;
  }

  /**
   * Add event listener
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private methods

  private async initializeStorage(): Promise<void> {
    if (!this.storageManager) return;

    // Initialize storage keys if they don't exist
    const keys = Object.values(LocalProvider.STORAGE_KEYS);
    
    for (const key of keys) {
      const exists = await this.storageManager.hasItem(key);
      if (!exists) {
        await this.storageManager.setItem(key, {});
      }
    }
  }

  private async createGuestUser(): Promise<void> {
    const guestUser: PlatformUser = {
      id: 'local_guest_' + Math.random().toString(36).substr(2, 9),
      displayName: 'Guest Player',
      isAuthenticated: true,
      platform: 'local',
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    await this.saveUser(guestUser);
    this.currentUser = guestUser;
    this.emit('signedIn', { user: guestUser });
  }

  private async createLocalUser(): Promise<PlatformUser> {
    const user: PlatformUser = {
      id: 'local_' + Math.random().toString(36).substr(2, 9),
      displayName: 'Local Player',
      isAuthenticated: true,
      platform: 'local',
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    await this.saveUser(user);
    return user;
  }

  private async loadUser(): Promise<PlatformUser | null> {
    if (!this.storageManager) return null;
    
    try {
      return await this.storageManager.getItem<PlatformUser>(
        LocalProvider.STORAGE_KEYS.USER
      );
    } catch (error) {
      console.error('Failed to load local user:', error);
      return null;
    }
  }

  private async saveUser(user: PlatformUser): Promise<void> {
    if (!this.storageManager) return;
    
    await this.storageManager.setItem(LocalProvider.STORAGE_KEYS.USER, user);
  }

  private async loadLeaderboards(): Promise<Record<string, Leaderboard>> {
    if (!this.storageManager) return {};
    
    try {
      return await this.storageManager.getItem<Record<string, Leaderboard>>(
        LocalProvider.STORAGE_KEYS.LEADERBOARDS
      ) || {};
    } catch (error) {
      console.error('Failed to load local leaderboards:', error);
      return {};
    }
  }

  private async saveLeaderboards(leaderboards: Record<string, Leaderboard>): Promise<void> {
    if (!this.storageManager) return;
    
    await this.storageManager.setItem(LocalProvider.STORAGE_KEYS.LEADERBOARDS, leaderboards);
  }

  private async loadAchievements(): Promise<Record<string, Achievement>> {
    if (!this.storageManager) return {};
    
    try {
      return await this.storageManager.getItem<Record<string, Achievement>>(
        LocalProvider.STORAGE_KEYS.ACHIEVEMENTS
      ) || {};
    } catch (error) {
      console.error('Failed to load local achievements:', error);
      return {};
    }
  }

  private async saveAchievements(achievements: Record<string, Achievement>): Promise<void> {
    if (!this.storageManager) return;
    
    await this.storageManager.setItem(LocalProvider.STORAGE_KEYS.ACHIEVEMENTS, achievements);
  }

  private sortLeaderboardEntries(leaderboard: Leaderboard): void {
    leaderboard.entries.sort((a, b) => {
      if (leaderboard.scoreType === ScoreType.HIGHEST) {
        return leaderboard.sortOrder === SortOrder.DESCENDING 
          ? b.score - a.score 
          : a.score - b.score;
      } else {
        return leaderboard.sortOrder === SortOrder.ASCENDING 
          ? a.score - b.score 
          : b.score - a.score;
      }
    });

    // Update ranks
    leaderboard.entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in local provider event listener for ${event}:`, error);
      }
    });
  }
}