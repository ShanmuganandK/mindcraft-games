/**
 * Platform services type definitions for the Multi-Game Platform
 */

import { UserProfile, Achievement } from './user';
import { LeaderboardEntry } from './game';

export interface PlatformServicesManager {
  initialize(): Promise<void>;
  signIn(): Promise<UserProfile>;
  signOut(): Promise<void>;
  submitScore(gameId: string, score: number): Promise<void>;
  unlockAchievement(achievementId: string): Promise<void>;
  getLeaderboard(gameId: string): Promise<LeaderboardEntry[]>;
  syncProgress(): Promise<void>;
  isSignedIn(): boolean;
  getCurrentUser(): UserProfile | null;
}

export interface PlatformServiceProvider {
  name: string;
  platform: Platform;
  initialize(config: PlatformConfig): Promise<void>;
  authenticate(): Promise<PlatformUser>;
  submitScore(leaderboardId: string, score: number): Promise<void>;
  unlockAchievement(achievementId: string): Promise<void>;
  getLeaderboards(): Promise<PlatformLeaderboard[]>;
  getAchievements(): Promise<PlatformAchievement[]>;
  syncData(data: SyncData): Promise<SyncResult>;
}

export interface PlatformConfig {
  apiKey?: string;
  clientId?: string;
  appId?: string;
  enableCloudSave: boolean;
  enableLeaderboards: boolean;
  enableAchievements: boolean;
  customSettings?: Record<string, any>;
}

export interface PlatformUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  isAuthenticated: boolean;
  platformSpecificData?: Record<string, any>;
}

export interface PlatformLeaderboard {
  id: string;
  name: string;
  entries: LeaderboardEntry[];
  userRank?: number;
  userScore?: number;
}

export interface PlatformAchievement {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  isUnlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

export interface SyncData {
  userProfile: UserProfile;
  gameProgress: Record<string, any>;
  achievements: Achievement[];
  settings: Record<string, any>;
  lastSyncTimestamp: Date;
}

export interface SyncResult {
  success: boolean;
  conflicts?: SyncConflict[];
  mergedData?: SyncData;
  error?: string;
}

export interface SyncConflict {
  key: string;
  localValue: any;
  remoteValue: any;
  resolution: ConflictResolution;
}

export enum Platform {
  GOOGLE_PLAY_GAMES = 'google_play_games',
  GAME_CENTER = 'game_center',
  FACEBOOK_GAMING = 'facebook_gaming',
  CUSTOM = 'custom',
}

export enum ConflictResolution {
  USE_LOCAL = 'use_local',
  USE_REMOTE = 'use_remote',
  MERGE = 'merge',
  MANUAL = 'manual',
}

export interface CloudSaveData {
  userId: string;
  gameId?: string;
  data: Record<string, any>;
  timestamp: Date;
  version: number;
  checksum: string;
}

export interface PlatformError {
  code: string;
  message: string;
  platform: Platform;
  recoverable: boolean;
  retryAfter?: number;
}