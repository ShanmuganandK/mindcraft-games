/**
 * Game-related type definitions for the Multi-Game Platform
 */

import { Achievement, AccessibilitySettings } from './user';

export interface GameModule {
  id: string;
  metadata: GameMetadata;
  component: React.ComponentType<GameProps>;
  achievements: Achievement[];
  leaderboardConfig: LeaderboardConfig;
  isEnabled: boolean;
  version: string;
}

export interface GameMetadata {
  title: string;
  description: string;
  shortDescription: string;
  iconUrl: string;
  thumbnailUrl: string;
  category: GameCategory;
  difficulty: GameDifficulty;
  estimatedPlayTime: number; // in minutes
  minAge: number;
  maxPlayers: number;
  tags: string[];
  accessibility: AccessibilityFeatures;
  supportedOrientations: DeviceOrientation[];
}

export interface GameProps {
  onGameEnd: (score: number, stats: GameStats) => void;
  onPause: () => void;
  onExit: () => void;
  userSettings: GameSettings;
  accessibility: AccessibilitySettings;
  analytics: GameAnalyticsTracker;
}

export interface GameSettings {
  difficulty: GameDifficulty;
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  vibrationEnabled: boolean;
  customSettings: Record<string, any>; // Game-specific settings
}

export interface GameStats {
  duration: number; // in seconds
  moves?: number;
  accuracy?: number; // 0-100
  powerUpsUsed?: number;
  hintsUsed?: number;
  perfectMoves?: number;
  customStats: Record<string, number | string | boolean>;
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
}

export interface GameStatistics {
  gamesCompleted: number;
  gamesAbandoned: number;
  averageSessionDuration: number;
  bestStreak: number;
  currentStreak: number;
  difficultyProgression: Record<GameDifficulty, number>;
  customStatistics: Record<string, number>;
}

export interface LeaderboardConfig {
  id: string;
  name: string;
  scoreType: ScoreType;
  sortOrder: SortOrder;
  resetPeriod?: ResetPeriod;
  maxEntries: number;
  isPublic: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  rank: number;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

export interface AccessibilityFeatures {
  screenReaderSupport: boolean;
  colorBlindFriendly: boolean;
  reducedMotionSupport: boolean;
  audioAlternatives: boolean;
  keyboardNavigation: boolean;
  customControls: boolean;
  fontScaling: boolean;
}

export interface GameAnalyticsTracker {
  trackGameStart: () => void;
  trackGameEnd: (score: number, completed: boolean) => void;
  trackUserAction: (action: string, context?: Record<string, any>) => void;
  trackAchievement: (achievementId: string) => void;
  trackError: (error: Error, context?: Record<string, any>) => void;
}

export enum GameCategory {
  PUZZLE = 'puzzle',
  ACTION = 'action',
  STRATEGY = 'strategy',
  CASUAL = 'casual',
  EDUCATIONAL = 'educational',
  ARCADE = 'arcade',
  CARD = 'card',
  WORD = 'word',
}

export enum GameDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
  CUSTOM = 'custom',
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

export enum ResetPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  NEVER = 'never',
}

export enum DeviceOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
  BOTH = 'both',
}

export interface GameState {
  gameId: string;
  sessionId: string;
  currentScore: number;
  gameData: Record<string, any>; // Serializable game state
  timestamp: Date;
  isPaused: boolean;
  canResume: boolean;
}

export interface GameLifecycleEvent {
  type: 'gameLoaded' | 'gameUnloading' | 'gameUnloaded' | 'gameInitializing' | 'gameInitialized' | 
        'gameStarting' | 'gameStarted' | 'gamePausing' | 'gamePaused' | 'gameResuming' | 
        'gameResumed' | 'gameEnding' | 'gameEnded' | 'gameError';
  gameId: string;
  timestamp: Date;
  data?: any;
}

export interface AccessibilityPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  initialize: (context: AccessibilityContext) => Promise<void>;
  cleanup: () => Promise<void>;
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
}

export interface AccessibilityContext {
  gameId: string;
  settings: AccessibilitySettings;
  services: any; // Will be properly typed when services are available
}

export interface GamePlugin {
  id: string;
  name: string;
  version: string;
  type: 'accessibility' | 'analytics' | 'storage' | 'ui' | 'gameplay';
  initialize: (context: GamePluginContext) => Promise<void>;
  cleanup: () => Promise<void>;
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
}

export interface GamePluginContext {
  gameId: string;
  services: any; // Will be properly typed when services are available
  config: Record<string, any>;
}