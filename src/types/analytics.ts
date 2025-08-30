/**
 * Analytics-related type definitions for the Multi-Game Platform
 */

import { AdType } from './ads';

export interface AnalyticsManager {
  initialize(): Promise<void>;
  trackEvent(event: AnalyticsEvent): void;
  trackScreen(screenName: string, properties?: Record<string, any>): void;
  trackGameplay(gameId: string, metrics: GameplayMetrics): void;
  trackUserAction(action: UserAction, context?: Record<string, any>): void;
  trackPerformance(metrics: PerformanceMetrics): void;
  setUserProperties(properties: UserProperties): void;
  flush(): Promise<void>;
}

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
  category?: EventCategory;
}

export interface GameplayMetrics {
  gameId: string;
  sessionDuration: number;
  score: number;
  completed: boolean;
  difficulty?: string;
  achievements?: string[];
  userActions?: UserAction[];
  performanceData?: GamePerformanceData;
}

export interface PerformanceMetrics {
  screenLoadTime: number;
  memoryUsage: number;
  frameRate: number;
  batteryLevel?: number;
  networkLatency?: number;
  crashReports?: CrashReport[];
}

export interface UserAnalytics {
  userId: string;
  sessionId: string;
  deviceInfo: DeviceInfo;
  appVersion: string;
  installDate: Date;
  lastActiveDate: Date;
  totalSessions: number;
  totalPlayTime: number;
  favoriteGames: string[];
  userSegment: UserSegment;
}

export interface SessionAnalytics {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  screensVisited: string[];
  gamesPlayed: GameSession[];
  adsViewed: AdInteraction[];
  crashes: CrashReport[];
  performanceMetrics: PerformanceSnapshot[];
  userActions: UserAction[];
}

export interface GameSession {
  gameId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  score: number;
  completed: boolean;
  difficulty: string;
  achievements: string[];
  userActions: UserAction[];
  performanceData: GamePerformanceData;
}

export interface UserAction {
  type: UserActionType;
  target: string;
  timestamp: Date;
  context?: Record<string, any>;
  screenName?: string;
  gameId?: string;
}

export interface AdInteraction {
  adType: AdType;
  adProvider: string;
  adUnitId: string;
  timestamp: Date;
  duration?: number;
  clicked: boolean;
  revenue?: number;
  placement: string;
  sessionId: string;
}

export interface CrashReport {
  crashId: string;
  timestamp: Date;
  errorMessage: string;
  stackTrace: string;
  deviceInfo: DeviceInfo;
  appVersion: string;
  gameId?: string;
  screenName?: string;
  userActions: UserAction[]; // Actions leading to crash
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  osVersion: string;
  deviceModel: string;
  screenResolution: string;
  memoryTotal: number;
  storageAvailable: number;
  networkType: NetworkType;
  locale: string;
  timezone: string;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  memoryUsage: number;
  cpuUsage: number;
  frameRate: number;
  batteryLevel: number;
  networkLatency: number;
  screenName: string;
  gameId?: string;
}

export interface GamePerformanceData {
  averageFrameRate: number;
  memoryPeakUsage: number;
  loadTime: number;
  inputLatency: number;
  renderTime: number;
  audioLatency?: number;
}

export interface UserProperties {
  userId?: string;
  userSegment?: UserSegment;
  installDate?: Date;
  totalSessions?: number;
  favoriteGame?: string;
  spendingTier?: SpendingTier;
  engagementLevel?: EngagementLevel;
  customProperties?: Record<string, string | number | boolean>;
}

export enum EventCategory {
  USER_INTERACTION = 'user_interaction',
  GAMEPLAY = 'gameplay',
  MONETIZATION = 'monetization',
  PERFORMANCE = 'performance',
  ERROR = 'error',
  NAVIGATION = 'navigation',
  ACHIEVEMENT = 'achievement',
}

export enum UserActionType {
  TAP = 'tap',
  SWIPE = 'swipe',
  NAVIGATION = 'navigation',
  PURCHASE = 'purchase',
  SHARE = 'share',
  SETTINGS_CHANGE = 'settings_change',
  GAME_ACTION = 'game_action',
  AD_INTERACTION = 'ad_interaction',
}

// AdType is imported from ads.ts to avoid duplication

export enum NetworkType {
  WIFI = 'wifi',
  CELLULAR = 'cellular',
  ETHERNET = 'ethernet',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
}

export enum UserSegment {
  NEW_USER = 'new_user',
  CASUAL_PLAYER = 'casual_player',
  REGULAR_PLAYER = 'regular_player',
  POWER_USER = 'power_user',
  CHURNED_USER = 'churned_user',
  VIP_USER = 'vip_user',
}

export enum SpendingTier {
  NON_SPENDER = 'non_spender',
  LOW_SPENDER = 'low_spender',
  MEDIUM_SPENDER = 'medium_spender',
  HIGH_SPENDER = 'high_spender',
  WHALE = 'whale',
}

export enum EngagementLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

export interface AnalyticsProvider {
  name: string;
  initialize(config: Record<string, any>): Promise<void>;
  trackEvent(event: AnalyticsEvent): void;
  trackScreen(screenName: string, properties?: Record<string, any>): void;
  setUserProperties(properties: UserProperties): void;
  flush(): Promise<void>;
}