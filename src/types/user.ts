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
  // Audio Settings
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number; // 0-100
  musicVolume: number; // 0-100
  
  // Accessibility Settings
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: FontSize;
  colorBlindSupport: boolean;
  screenReaderOptimized: boolean;
  
  // Notification Settings
  notifications: NotificationSettings;
  
  // Game Settings
  autoSave: boolean;
  confirmExit: boolean;
  showTutorials: boolean;
  
  // Privacy Settings
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  personalizedAds: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  gameReminders: boolean;
  achievementNotifications: boolean;
  leaderboardUpdates: boolean;
  newGameAlerts: boolean;
  quietHours: QuietHours;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export interface GlobalStatistics {
  totalGamesPlayed: number;
  totalPlayTime: number; // in seconds
  averageSessionDuration: number; // in seconds
  favoriteGameId?: string;
  totalAchievements: number;
  currentStreak: number;
  longestStreak: number;
  gamesCompleted: number;
  perfectScores: number;
}

export interface Achievement {
  id: string;
  gameId?: string; // undefined for global achievements
  title: string;
  description: string;
  iconUrl: string;
  unlockedAt: Date;
  rarity: AchievementRarity;
  points: number;
}

export interface AccessibilitySettings {
  screenReaderSupport: boolean;
  colorBlindFriendly: boolean;
  reducedMotionSupport: boolean;
  audioAlternatives: boolean;
  keyboardNavigation: boolean;
  customControls: boolean;
  fontScaling: boolean;
  highContrast: boolean;
  voiceCommands: boolean;
  hapticFeedback: boolean;
}

export enum FontSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large',
}

export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export interface UserSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  gamesPlayed: string[];
  achievementsUnlocked: string[];
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  osVersion: string;
  deviceModel: string;
  appVersion: string;
  screenSize: {
    width: number;
    height: number;
  };
  locale: string;
  timezone: string;
}

export interface UserProgress {
  userId: string;
  gameProgresses: Map<string, GameProgress>;
  globalStatistics: GlobalStatistics;
  lastSyncedAt: Date;
  version: number; // for conflict resolution
}

export interface GameProgress {
  gameId: string;
  highScore: number;
  totalPlays: number;
  totalTime: number; // in seconds
  averageScore: number;
  achievements: string[]; // achievement IDs
  statistics: GameStatistics;
  lastPlayed: Date;
  currentLevel?: number;
  unlockedFeatures: string[];
  personalBest: PersonalBest;
}

export interface GameStatistics {
  gamesCompleted: number;
  gamesAbandoned: number;
  averageSessionDuration: number;
  bestStreak: number;
  currentStreak: number;
  difficultyProgression: Record<string, number>;
  customStatistics: Record<string, number>;
}

export interface PersonalBest {
  score: number;
  achievedAt: Date;
  gameMode?: string;
  difficulty?: string;
  metadata?: Record<string, any>;
}

export interface UserPreferencesUpdate {
  [K in keyof UserPreferences]?: UserPreferences[K];
}

export interface PreferencesValidationResult {
  isValid: boolean;
  errors: PreferencesValidationError[];
}

export interface PreferencesValidationError {
  field: keyof UserPreferences;
  message: string;
  code: string;
}