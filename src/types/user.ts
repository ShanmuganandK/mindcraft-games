/**
 * User-related type definitions for the Multi-Game Platform
 */

export interface UserProfile {
  id: string;
  displayName?: string;
  platformId?: string; // Google Play or Game Center ID
  preferences: UserPreferences;
  statistics: GlobalStatistics;
  achievements: Achievement[];
  createdAt: Date;
  lastActive: Date;
}

export interface UserPreferences {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number; // 0-1
  musicVolume: number; // 0-1
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: FontSize;
  notifications: NotificationSettings;
  analyticsConsent: boolean;
  privacySettings: PrivacySettings;
}

export interface GlobalStatistics {
  totalGamesPlayed: number;
  totalPlayTime: number; // in seconds
  favoriteGameId?: string;
  averageSessionDuration: number; // in seconds
  achievementsUnlocked: number;
  highestScore: number;
  streakDays: number;
  lastPlayDate: Date;
}

export interface Achievement {
  id: string;
  gameId?: string; // undefined for global achievements
  title: string;
  description: string;
  iconUrl: string;
  unlockedAt?: Date;
  progress: number; // 0-100
  isSecret: boolean;
  platformAchievementId?: string; // For Google Play Games / Game Center
}

export interface NotificationSettings {
  gameReminders: boolean;
  achievementNotifications: boolean;
  leaderboardUpdates: boolean;
  newGameAlerts: boolean;
  dailyRewards: boolean;
}

export interface PrivacySettings {
  shareProgress: boolean;
  showOnLeaderboards: boolean;
  allowFriendRequests: boolean;
  dataCollection: DataCollectionLevel;
}

export enum FontSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large',
}

export enum DataCollectionLevel {
  MINIMAL = 'minimal',
  STANDARD = 'standard',
  FULL = 'full',
}

export interface AccessibilitySettings {
  screenReaderEnabled: boolean;
  highContrastMode: boolean;
  reducedMotion: boolean;
  fontSize: FontSize;
  colorBlindSupport: boolean;
  touchSensitivity: number; // 0.5-2.0 multiplier
  audioDescriptions: boolean;
  vibrationEnabled: boolean;
}