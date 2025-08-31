/**
 * Platform Services Manager - Extensible architecture for gaming services
 * Supports multiple providers with graceful degradation and conflict resolution
 */

import {
  PlatformServicesManager as IPlatformServicesManager,
  PlatformServiceProvider,
  PlatformServiceConfig,
  PlatformUser,
  AuthenticationResult,
  LeaderboardSubmissionResult,
  AchievementUnlockResult,
  Leaderboard,
  Achievement,
  SyncResult,
  ConflictResolutionStrategy,
  ServiceDiscoveryConfig,
  PlatformServiceEvent,
} from '../../types/platform';

export interface PlatformServicesManagerConfig {
  primaryProvider?: string;
  fallbackChain: string[];
  enableServiceDiscovery: boolean;
  discoveryConfig: ServiceDiscoveryConfig;
  conflictResolution: ConflictResolutionStrategy[];
  syncInterval: number;
  maxRetries: number;
  enableOfflineMode: boolean;
}

export class PlatformServicesManager implements IPlatformServicesManager {
  private providers: Map<string, PlatformServiceProvider> = new Map();
  private config: PlatformServicesManagerConfig;
  private activeProvider: PlatformServiceProvider | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private syncTimer?: NodeJS.Timeout;
  private isInitialized = false;
  private offlineQueue: Array<{ action: string; args: any[]; resolve: Function; reject: Function }> = [];

  constructor(config: PlatformServicesManagerConfig) {
    this.config = config;
  }

  /**
   * Register a platform service provider
   */
  registerProvider(provider: PlatformServiceProvider): void {
    this.providers.set(provider.name, provider);
    
    // Set up event forwarding
    provider.on?.('*', (event: PlatformServiceEvent) => {
      this.emit('providerEvent', { provider: provider.name, event });
    });

    this.emit('providerRegistered', { provider: provider.name });
  }

  /**
   * Get a specific provider
   */
  getProvider(platform?: string): PlatformServiceProvider | null {
    if (platform) {
      return this.providers.get(platform) || null;
    }
    return this.activeProvider;
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): PlatformServiceProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Initialize the platform services manager
   */
  async initialize(): Promise<void> {
    try {
      // Discover and initialize providers
      await this.discoverProviders();
      
      // Select primary provider
      await this.selectPrimaryProvider();
      
      // Start sync timer if configured
      if (this.config.syncInterval > 0) {
        this.startSyncTimer();
      }

      this.isInitialized = true;
      this.emit('initialized', { 
        activeProvider: this.activeProvider?.name,
        availableProviders: Array.from(this.providers.keys()),
      });

      // Process offline queue
      await this.processOfflineQueue();

    } catch (error) {
      console.error('Failed to initialize platform services manager:', error);
      throw error;
    }
  }

  /**
   * Sign in using the active provider
   */
  async signIn(): Promise<AuthenticationResult> {
    if (!this.activeProvider) {
      return await this.tryFallbackProviders('signIn', []);
    }

    try {
      const result = await this.activeProvider.signIn();
      
      if (result.success) {
        this.emit('signedIn', { provider: this.activeProvider.name, user: result.user });
      }
      
      return result;

    } catch (error) {
      console.error('Sign-in failed with primary provider:', error);
      return await this.tryFallbackProviders('signIn', []);
    }
  }

  /**
   * Sign out from all providers
   */
  async signOut(): Promise<void> {
    const signOutPromises = Array.from(this.providers.values()).map(async provider => {
      try {
        await provider.signOut();
      } catch (error) {
        console.error(`Sign-out failed for provider ${provider.name}:`, error);
      }
    });

    await Promise.allSettled(signOutPromises);
    this.emit('signedOut');
  }

  /**
   * Get current user from active provider
   */
  async getCurrentUser(): Promise<PlatformUser | null> {
    if (!this.activeProvider) {
      return null;
    }

    try {
      return await this.activeProvider.getCurrentUser();
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Submit score with fallback support
   */
  async submitScore(
    leaderboardId: string, 
    score: number, 
    metadata?: any
  ): Promise<LeaderboardSubmissionResult> {
    if (!this.activeProvider) {
      return await this.tryFallbackProviders('submitScore', [leaderboardId, score, metadata]);
    }

    try {
      const result = await this.activeProvider.submitScore(leaderboardId, score, metadata);
      
      if (result.success) {
        this.emit('scoreSubmitted', { 
          provider: this.activeProvider.name, 
          leaderboardId, 
          score, 
          result 
        });
        
        // Sync with other providers in background
        this.syncScoreWithOtherProviders(leaderboardId, score, metadata);
      }
      
      return result;

    } catch (error) {
      console.error('Score submission failed with primary provider:', error);
      return await this.tryFallbackProviders('submitScore', [leaderboardId, score, metadata]);
    }
  }

  /**
   * Get leaderboard with data merging from multiple providers
   */
  async getLeaderboard(leaderboardId: string): Promise<Leaderboard> {
    if (!this.activeProvider) {
      throw new Error('No active provider available');
    }

    try {
      const leaderboard = await this.activeProvider.getLeaderboard(leaderboardId);
      
      // Optionally merge data from other providers
      if (this.config.enableServiceDiscovery) {
        await this.mergeLeaderboardData(leaderboard, leaderboardId);
      }
      
      return leaderboard;

    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      throw error;
    }
  }

  /**
   * Unlock achievement with cross-provider sync
   */
  async unlockAchievement(achievementId: string): Promise<AchievementUnlockResult> {
    if (!this.activeProvider) {
      return await this.tryFallbackProviders('unlockAchievement', [achievementId]);
    }

    try {
      const result = await this.activeProvider.unlockAchievement(achievementId);
      
      if (result.success && !result.alreadyUnlocked) {
        this.emit('achievementUnlocked', { 
          provider: this.activeProvider.name, 
          achievementId, 
          result 
        });
        
        // Sync with other providers in background
        this.syncAchievementWithOtherProviders(achievementId);
      }
      
      return result;

    } catch (error) {
      console.error('Achievement unlock failed with primary provider:', error);
      return await this.tryFallbackProviders('unlockAchievement', [achievementId]);
    }
  }

  /**
   * Get achievements from active provider
   */
  async getAchievements(): Promise<Achievement[]> {
    if (!this.activeProvider) {
      return [];
    }

    try {
      return await this.activeProvider.getAchievements();
    } catch (error) {
      console.error('Failed to get achievements:', error);
      return [];
    }
  }

  /**
   * Save progress with conflict resolution
   */
  async saveProgress(gameId: string, data: any): Promise<boolean> {
    if (!this.activeProvider) {
      // Queue for later if offline
      if (this.config.enableOfflineMode) {
        return new Promise((resolve, reject) => {
          this.offlineQueue.push({
            action: 'saveProgress',
            args: [gameId, data],
            resolve,
            reject,
          });
        });
      }
      return false;
    }

    try {
      const success = await this.activeProvider.saveToCloud(gameId, data);
      
      if (success) {
        this.emit('progressSaved', { provider: this.activeProvider.name, gameId });
      }
      
      return success;

    } catch (error) {
      console.error('Failed to save progress:', error);
      
      // Queue for retry if offline mode enabled
      if (this.config.enableOfflineMode) {
        this.offlineQueue.push({
          action: 'saveProgress',
          args: [gameId, data],
          resolve: () => {},
          reject: () => {},
        });
      }
      
      return false;
    }
  }

  /**
   * Load progress with conflict resolution
   */
  async loadProgress(gameId: string): Promise<any> {
    if (!this.activeProvider) {
      return null;
    }

    try {
      const cloudData = await this.activeProvider.loadFromCloud(gameId);
      
      if (cloudData) {
        // Apply conflict resolution if multiple providers have data
        const resolvedData = await this.resolveDataConflicts(gameId, cloudData);
        return resolvedData?.data || cloudData.data;
      }
      
      return null;

    } catch (error) {
      console.error('Failed to load progress:', error);
      return null;
    }
  }

  /**
   * Sync progress across all providers
   */
  async syncProgress(): Promise<SyncResult> {
    const results: SyncResult[] = [];
    
    for (const provider of this.providers.values()) {
      try {
        if (await provider.isSignedIn()) {
          const result = await provider.syncWithCloud();
          results.push(result);
        }
      } catch (error) {
        console.error(`Sync failed for provider ${provider.name}:`, error);
        results.push({
          success: false,
          conflictsResolved: 0,
          dataUpdated: false,
          error: error instanceof Error ? error.message : 'Sync failed',
        });
      }
    }

    // Aggregate results
    const aggregatedResult: SyncResult = {
      success: results.some(r => r.success),
      conflictsResolved: results.reduce((sum, r) => sum + r.conflictsResolved, 0),
      dataUpdated: results.some(r => r.dataUpdated),
    };

    this.emit('progressSynced', { results, aggregated: aggregatedResult });
    
    return aggregatedResult;
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

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    // Cleanup all providers
    const cleanupPromises = Array.from(this.providers.values()).map(provider => 
      provider.cleanup().catch(error => 
        console.error(`Cleanup failed for provider ${provider.name}:`, error)
      )
    );

    await Promise.allSettled(cleanupPromises);
    
    this.providers.clear();
    this.eventListeners.clear();
    this.activeProvider = null;
    this.isInitialized = false;
  }

  // Private methods

  private async discoverProviders(): Promise<void> {
    if (!this.config.enableServiceDiscovery) {
      return;
    }

    // In a real implementation, this would discover available platform services
    // For now, we'll just initialize registered providers
    const initPromises = Array.from(this.providers.values()).map(async provider => {
      try {
        await provider.initialize({
          enableAuthentication: true,
          enableLeaderboards: true,
          enableAchievements: true,
          enableCloudSave: true,
          enableSocialFeatures: true,
          autoSignIn: false,
          fallbackToLocal: true,
          syncInterval: this.config.syncInterval,
        });
      } catch (error) {
        console.error(`Failed to initialize provider ${provider.name}:`, error);
      }
    });

    await Promise.allSettled(initPromises);
  }

  private async selectPrimaryProvider(): Promise<void> {
    // Try to use configured primary provider
    if (this.config.primaryProvider) {
      const provider = this.providers.get(this.config.primaryProvider);
      if (provider) {
        this.activeProvider = provider;
        return;
      }
    }

    // Fall back to first available provider
    for (const provider of this.providers.values()) {
      try {
        // Test if provider is working
        await provider.getCurrentUser();
        this.activeProvider = provider;
        return;
      } catch (error) {
        console.log(`Provider ${provider.name} not available:`, error);
      }
    }

    console.warn('No working platform service provider found');
  }

  private async tryFallbackProviders(method: string, args: any[]): Promise<any> {
    for (const providerName of this.config.fallbackChain) {
      const provider = this.providers.get(providerName);
      if (provider && provider !== this.activeProvider) {
        try {
          const result = await (provider as any)[method](...args);
          
          // Switch to this provider if successful
          this.activeProvider = provider;
          this.emit('providerSwitched', { 
            newProvider: provider.name, 
            reason: 'fallback_success' 
          });
          
          return result;
        } catch (error) {
          console.error(`Fallback provider ${providerName} failed:`, error);
        }
      }
    }

    throw new Error('All providers failed');
  }

  private async syncScoreWithOtherProviders(
    leaderboardId: string, 
    score: number, 
    metadata?: any
  ): Promise<void> {
    // Background sync with other providers
    const syncPromises = Array.from(this.providers.values())
      .filter(provider => provider !== this.activeProvider)
      .map(async provider => {
        try {
          if (await provider.isSignedIn()) {
            await provider.submitScore(leaderboardId, score, metadata);
          }
        } catch (error) {
          console.log(`Background score sync failed for ${provider.name}:`, error);
        }
      });

    Promise.allSettled(syncPromises);
  }

  private async syncAchievementWithOtherProviders(achievementId: string): Promise<void> {
    // Background sync with other providers
    const syncPromises = Array.from(this.providers.values())
      .filter(provider => provider !== this.activeProvider)
      .map(async provider => {
        try {
          if (await provider.isSignedIn()) {
            await provider.unlockAchievement(achievementId);
          }
        } catch (error) {
          console.log(`Background achievement sync failed for ${provider.name}:`, error);
        }
      });

    Promise.allSettled(syncPromises);
  }

  private async mergeLeaderboardData(
    primaryLeaderboard: Leaderboard, 
    leaderboardId: string
  ): Promise<void> {
    // In a real implementation, this would merge leaderboard data from multiple providers
    // For now, we'll just use the primary provider's data
  }

  private async resolveDataConflicts(gameId: string, cloudData: any): Promise<any> {
    // Apply configured conflict resolution strategies
    for (const strategy of this.config.conflictResolution) {
      try {
        // In a real implementation, this would apply the conflict resolution strategy
        // For now, we'll just return the cloud data
        return cloudData;
      } catch (error) {
        console.error(`Conflict resolution strategy ${strategy.name} failed:`, error);
      }
    }

    return cloudData;
  }

  private startSyncTimer(): void {
    this.syncTimer = setInterval(async () => {
      try {
        await this.syncProgress();
      } catch (error) {
        console.error('Scheduled sync failed:', error);
      }
    }, this.config.syncInterval);
  }

  private async processOfflineQueue(): Promise<void> {
    if (!this.activeProvider || this.offlineQueue.length === 0) {
      return;
    }

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const item of queue) {
      try {
        const result = await (this as any)[item.action](...item.args);
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in platform services event listener for ${event}:`, error);
      }
    });
  }
}