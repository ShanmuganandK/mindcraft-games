/**
 * Advertisement-related type definitions for the Multi-Game Platform
 */

export interface AdManager {
  initializeAds(): Promise<void>;
  showBannerAd(position: AdPosition): void;
  showInterstitialAd(): Promise<boolean>;
  showRewardedAd(): Promise<AdReward>;
  hideBannerAd(): void;
  isAdReady(adType: AdType): boolean;
  setAdFrequency(frequency: AdFrequency): void;
}

export interface AdProvider {
  name: string;
  initialize(config: AdProviderConfig): Promise<void>;
  loadBannerAd(adUnitId: string, position: AdPosition): Promise<void>;
  loadInterstitialAd(adUnitId: string): Promise<void>;
  loadRewardedAd(adUnitId: string): Promise<void>;
  showBannerAd(): void;
  showInterstitialAd(): Promise<boolean>;
  showRewardedAd(): Promise<AdReward>;
  hideBannerAd(): void;
  isAdReady(adType: AdType): boolean;
}

export interface AdProviderConfig {
  appId: string;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  rewardedAdUnitId: string;
  testMode: boolean;
  targeting?: AdTargeting;
  customSettings?: Record<string, any>;
}

export interface AdConfiguration {
  providers: AdProviderConfig[];
  frequency: AdFrequency;
  targeting: AdTargeting;
  fallbackStrategy: FallbackStrategy;
  analytics: AdAnalyticsConfig;
}

export interface AdFrequency {
  interstitialCooldown: number; // seconds
  maxInterstitialsPerSession: number;
  bannerRefreshRate: number; // seconds
  rewardedAdCooldown: number; // seconds
  respectUserPreferences: boolean;
}

export interface AdTargeting {
  age?: number;
  gender?: Gender;
  interests?: string[];
  location?: Location;
  gamePreferences?: string[];
  spendingTier?: string;
  customTargeting?: Record<string, string>;
}

export interface AdReward {
  type: RewardType;
  amount: number;
  currency?: string;
  itemId?: string;
  success: boolean;
  error?: string;
}

export interface AdInteractionEvent {
  adType: AdType;
  adProvider: string;
  adUnitId: string;
  event: AdEventType;
  timestamp: Date;
  revenue?: number;
  errorCode?: string;
  errorMessage?: string;
  placement: string;
  sessionId: string;
}

export interface AdAnalyticsConfig {
  trackImpressions: boolean;
  trackClicks: boolean;
  trackRevenue: boolean;
  trackErrors: boolean;
  customEvents?: string[];
}

export interface Location {
  country: string;
  region?: string;
  city?: string;
}

export enum AdType {
  BANNER = 'banner',
  INTERSTITIAL = 'interstitial',
  REWARDED = 'rewarded',
  NATIVE = 'native',
}

export enum AdPosition {
  TOP = 'top',
  BOTTOM = 'bottom',
  CENTER = 'center',
  CUSTOM = 'custom',
}

export enum AdEventType {
  LOADED = 'loaded',
  FAILED_TO_LOAD = 'failed_to_load',
  SHOWN = 'shown',
  CLICKED = 'clicked',
  CLOSED = 'closed',
  REWARDED = 'rewarded',
  IMPRESSION = 'impression',
}

export enum RewardType {
  COINS = 'coins',
  GEMS = 'gems',
  LIVES = 'lives',
  HINTS = 'hints',
  POWER_UPS = 'power_ups',
  UNLOCK_CONTENT = 'unlock_content',
  CUSTOM = 'custom',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum FallbackStrategy {
  NEXT_PROVIDER = 'next_provider',
  SKIP_AD = 'skip_ad',
  RETRY_CURRENT = 'retry_current',
  SHOW_PLACEHOLDER = 'show_placeholder',
}

export interface AdPlacement {
  id: string;
  name: string;
  adType: AdType;
  position?: AdPosition;
  triggers: AdTrigger[];
  frequency: AdFrequency;
  targeting?: AdTargeting;
}

export interface AdTrigger {
  event: string;
  conditions?: Record<string, any>;
  cooldown?: number;
  maxPerSession?: number;
}

export interface AdMetrics {
  impressions: number;
  clicks: number;
  revenue: number;
  fillRate: number;
  ctr: number; // Click-through rate
  ecpm: number; // Effective cost per mille
  conversionRate?: number;
}