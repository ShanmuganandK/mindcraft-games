/**
 * Platform gaming services type definitions
 */

export interface PlatformUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  isAuthenticated: boolean;
  platform: 'google' | 'apple' | 'local';
  email?: string;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  rank: number;
  timestamp: Date;
  avatarUrl?: string;
  additionalData?: Record<string, any>;
}

export interface Leaderboard {
  id: string;
  name: string;
  description?: string;
  scoreType: ScoreType;
  sortOrder: SortOrder;
  entries: LeaderboardEntry[];
  userEntry?: LeaderboardEntry;
  totalEntries: number;
  lastUpdated: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  unlockedIconUrl?: string;
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress?: number; // 0-100 for incremental achievements
  maxProgress?: number;
  points: number;
  rarity: AchievementRarity;
  isHidden: boolean;
  category?: string;
}

export interface PlatformServiceConfig {
  enableAuthentication: boolean;
  enableLeaderboards: boolean;
  enableAchievements: boolean;
  enableCloudSave: boolean;
  enableSocialFeatures: boolean;
  autoSignIn: boolean;
  fallbackToLocal: boolean;
  syncInterval: number; // in milliseconds
}

export interface AuthenticationResult {
  success: boolean;
  user?: PlatformUser;
  error?: string;
  cancelled?: boolean;
}

export interface LeaderboardSubmissionResult {
  success: boolean;
  newRank?: number;
  previousRank?: number;
  error?: string;
}

export interface AchievementUnlockResult {
  success: boolean;
  achievement?: Achievement;
  error?: string;
  alreadyUnlocked?: boolean;
}

export interface CloudSaveData {
  gameId: string;
  data: any;
  timestamp: Date;
  version: number;
  checksum: string;
}

export interface SyncResult {
  success: boolean;
  conflictsResolved: number;
  dataUpdated: boolean;
  error?: string;
}

export interface PlatformCapabilities {
  hasAuthentication: boolean;
  hasLeaderboards: boolean;
  hasAchievements: boolean;
  hasCloudSave: boolean;
  hasSocialFeatures: boolean;
  hasRealTimeMultiplayer: boolean;
  hasTurnBasedMultiplayer: boolean;
  hasInAppPurchases: boolean;
}

export interface PlatformServiceProvider {
  readonly name: string;
  readonly platform: 'android' | 'ios' | 'web' | 'universal';
  readonly capabilities: PlatformCapabilities;
  
  // Lifecycle
  initialize(config: PlatformServiceConfig): Promise<void>;
  cleanup(): Promise<void>;
  
  // Authentication
  signIn(): Promise<AuthenticationResult>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<PlatformUser | null>;
  isSignedIn(): Promise<boolean>;
  
  // Leaderboards
  submitScore(leaderboardId: string, score: number, metadata?: any): Promise<LeaderboardSubmissionResult>;
  getLeaderboard(leaderboardId: string, timeScope?: TimeScope, collection?: Collection): Promise<Leaderboard>;
  getPlayerScore(leaderboardId: string): Promise<LeaderboardEntry | null>;
  
  // Achievements
  unlockAchievement(achievementId: string): Promise<AchievementUnlockResult>;
  incrementAchievement(achievementId: string, steps: number): Promise<AchievementUnlockResult>;
  getAchievements(): Promise<Achievement[]>;
  getAchievement(achievementId: string): Promise<Achievement | null>;
  
  // Cloud Save
  saveToCloud(key: string, data: any): Promise<boolean>;
  loadFromCloud(key: string): Promise<CloudSaveData | null>;
  deleteFromCloud(key: string): Promise<boolean>;
  syncWithCloud(): Promise<SyncResult>;
  
  // Social Features
  showLeaderboard(leaderboardId?: string): Promise<void>;
  showAchievements(): Promise<void>;
  shareScore(leaderboardId: string, score: number, message?: string): Promise<boolean>;
}

export interface PlatformServicesManager {
  // Service Management
  registerProvider(provider: PlatformServiceProvider): void;
  getProvider(platform?: string): PlatformServiceProvider | null;
  getAvailableProviders(): PlatformServiceProvider[];
  
  // Unified Interface
  initialize(): Promise<void>;
  signIn(): Promise<AuthenticationResult>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<PlatformUser | null>;
  
  // Leaderboards
  submitScore(leaderboardId: string, score: number, metadata?: any): Promise<LeaderboardSubmissionResult>;
  getLeaderboard(leaderboardId: string): Promise<Leaderboard>;
  
  // Achievements
  unlockAchievement(achievementId: string): Promise<AchievementUnlockResult>;
  getAchievements(): Promise<Achievement[]>;
  
  // Cloud Save
  saveProgress(gameId: string, data: any): Promise<boolean>;
  loadProgress(gameId: string): Promise<any>;
  syncProgress(): Promise<SyncResult>;
  
  // Events
  on(event: string, listener: Function): void;
  off(event: string, listener: Function): void;
}

export enum ScoreType {
  HIGHEST = 'highest',
  LOWEST = 'lowest',
  TIME_BASED = 'time_based',
  COMPLETION_RATE = 'completion_rate',
}

export enum SortOrder {
  ASCENDING = 'asc',
  DESCENDING = 'desc',
}

export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export enum TimeScope {
  TODAY = 'today',
  WEEK = 'week',
  ALL_TIME = 'all_time',
}

export enum Collection {
  PUBLIC = 'public',
  FRIENDS = 'friends',
}

export interface PlatformServiceEvent {
  type: string;
  platform: string;
  data?: any;
  timestamp: Date;
}

export interface ConflictResolutionStrategy {
  name: string;
  resolve(localData: any, cloudData: any): any;
}

export interface ServiceDiscoveryConfig {
  enableAutoDiscovery: boolean;
  discoveryInterval: number;
  maxRetries: number;
  fallbackChain: string[];
}