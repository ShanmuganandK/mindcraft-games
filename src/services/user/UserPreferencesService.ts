/**
 * User Preferences Service - Manages user settings and preferences
 */

import { 
  UserPreferences, 
  UserPreferencesUpdate, 
  PreferencesValidationResult,
  PreferencesValidationError,
  FontSize,
  NotificationSettings,
  QuietHours,
} from '../../types/user';
import { StorageManager } from '../storage/StorageManager';

export interface PreferencesServiceConfig {
  autoSave: boolean;
  validationEnabled: boolean;
  syncToCloud: boolean;
  encryptSensitiveData: boolean;
}

export class UserPreferencesService {
  private static readonly PREFERENCES_KEY = 'user_preferences';
  private static readonly DEFAULT_PREFERENCES: UserPreferences = {
    // Audio Settings
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: 80,
    musicVolume: 60,
    
    // Accessibility Settings
    reducedMotion: false,
    highContrast: false,
    fontSize: FontSize.MEDIUM,
    colorBlindSupport: false,
    screenReaderOptimized: false,
    
    // Notification Settings
    notifications: {
      enabled: true,
      gameReminders: true,
      achievementNotifications: true,
      leaderboardUpdates: false,
      newGameAlerts: true,
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
      },
    },
    
    // Game Settings
    autoSave: true,
    confirmExit: true,
    showTutorials: true,
    
    // Privacy Settings
    analyticsEnabled: true,
    crashReportingEnabled: true,
    personalizedAds: true,
  };

  private storageManager: StorageManager;
  private config: PreferencesServiceConfig;
  private currentPreferences: UserPreferences;
  private eventListeners: Map<string, Function[]> = new Map();
  private saveTimeout?: NodeJS.Timeout;

  constructor(storageManager: StorageManager, config: PreferencesServiceConfig) {
    this.storageManager = storageManager;
    this.config = config;
    this.currentPreferences = { ...UserPreferencesService.DEFAULT_PREFERENCES };
  }

  /**
   * Initialize the preferences service
   */
  async initialize(): Promise<void> {
    try {
      await this.loadPreferences();
      this.emit('initialized', this.currentPreferences);
    } catch (error) {
      console.error('Failed to initialize preferences service:', error);
      // Use default preferences on error
      this.currentPreferences = { ...UserPreferencesService.DEFAULT_PREFERENCES };
      throw error;
    }
  }

  /**
   * Get current user preferences
   */
  getPreferences(): UserPreferences {
    return { ...this.currentPreferences };
  }

  /**
   * Get a specific preference value
   */
  getPreference<K extends keyof UserPreferences>(key: K): UserPreferences[K] {
    return this.currentPreferences[key];
  }

  /**
   * Update user preferences
   */
  async updatePreferences(updates: UserPreferencesUpdate): Promise<void> {
    // Validate updates if validation is enabled
    if (this.config.validationEnabled) {
      const validation = this.validatePreferences(updates);
      if (!validation.isValid) {
        throw new Error(`Invalid preferences: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    // Apply updates
    const previousPreferences = { ...this.currentPreferences };
    this.currentPreferences = { ...this.currentPreferences, ...updates };

    try {
      // Save preferences
      if (this.config.autoSave) {
        await this.savePreferences();
      }

      // Emit change events
      Object.keys(updates).forEach(key => {
        const typedKey = key as keyof UserPreferences;
        if (previousPreferences[typedKey] !== this.currentPreferences[typedKey]) {
          this.emit('preferenceChanged', {
            key: typedKey,
            oldValue: previousPreferences[typedKey],
            newValue: this.currentPreferences[typedKey],
          });
        }
      });

      this.emit('preferencesUpdated', {
        previous: previousPreferences,
        current: this.currentPreferences,
        updates,
      });

    } catch (error) {
      // Rollback on save error
      this.currentPreferences = previousPreferences;
      throw error;
    }
  }

  /**
   * Update a single preference
   */
  async updatePreference<K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ): Promise<void> {
    await this.updatePreferences({ [key]: value } as UserPreferencesUpdate);
  }

  /**
   * Reset preferences to defaults
   */
  async resetToDefaults(): Promise<void> {
    const previousPreferences = { ...this.currentPreferences };
    this.currentPreferences = { ...UserPreferencesService.DEFAULT_PREFERENCES };

    try {
      await this.savePreferences();
      
      this.emit('preferencesReset', {
        previous: previousPreferences,
        current: this.currentPreferences,
      });
    } catch (error) {
      // Rollback on save error
      this.currentPreferences = previousPreferences;
      throw error;
    }
  }

  /**
   * Reset specific preference category
   */
  async resetCategory(category: 'audio' | 'accessibility' | 'notifications' | 'game' | 'privacy'): Promise<void> {
    const defaults = UserPreferencesService.DEFAULT_PREFERENCES;
    const updates: UserPreferencesUpdate = {};

    switch (category) {
      case 'audio':
        updates.soundEnabled = defaults.soundEnabled;
        updates.musicEnabled = defaults.musicEnabled;
        updates.soundVolume = defaults.soundVolume;
        updates.musicVolume = defaults.musicVolume;
        break;
      
      case 'accessibility':
        updates.reducedMotion = defaults.reducedMotion;
        updates.highContrast = defaults.highContrast;
        updates.fontSize = defaults.fontSize;
        updates.colorBlindSupport = defaults.colorBlindSupport;
        updates.screenReaderOptimized = defaults.screenReaderOptimized;
        break;
      
      case 'notifications':
        updates.notifications = { ...defaults.notifications };
        break;
      
      case 'game':
        updates.autoSave = defaults.autoSave;
        updates.confirmExit = defaults.confirmExit;
        updates.showTutorials = defaults.showTutorials;
        break;
      
      case 'privacy':
        updates.analyticsEnabled = defaults.analyticsEnabled;
        updates.crashReportingEnabled = defaults.crashReportingEnabled;
        updates.personalizedAds = defaults.personalizedAds;
        break;
    }

    await this.updatePreferences(updates);
  }

  /**
   * Export preferences for backup
   */
  exportPreferences(): string {
    return JSON.stringify({
      preferences: this.currentPreferences,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    }, null, 2);
  }

  /**
   * Import preferences from backup
   */
  async importPreferences(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data);
      
      if (!parsed.preferences) {
        throw new Error('Invalid preferences data format');
      }

      // Validate imported preferences
      const validation = this.validatePreferences(parsed.preferences);
      if (!validation.isValid) {
        throw new Error(`Invalid imported preferences: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Apply imported preferences
      await this.updatePreferences(parsed.preferences);
      
      this.emit('preferencesImported', {
        importedAt: new Date(),
        source: parsed,
      });

    } catch (error) {
      console.error('Failed to import preferences:', error);
      throw new Error('Failed to import preferences: Invalid data format');
    }
  }

  /**
   * Get preferences for accessibility
   */
  getAccessibilityPreferences() {
    return {
      reducedMotion: this.currentPreferences.reducedMotion,
      highContrast: this.currentPreferences.highContrast,
      fontSize: this.currentPreferences.fontSize,
      colorBlindSupport: this.currentPreferences.colorBlindSupport,
      screenReaderOptimized: this.currentPreferences.screenReaderOptimized,
      soundEnabled: this.currentPreferences.soundEnabled,
    };
  }

  /**
   * Get audio preferences
   */
  getAudioPreferences() {
    return {
      soundEnabled: this.currentPreferences.soundEnabled,
      musicEnabled: this.currentPreferences.musicEnabled,
      soundVolume: this.currentPreferences.soundVolume,
      musicVolume: this.currentPreferences.musicVolume,
    };
  }

  /**
   * Get notification preferences
   */
  getNotificationPreferences(): NotificationSettings {
    return { ...this.currentPreferences.notifications };
  }

  /**
   * Check if quiet hours are active
   */
  isQuietHoursActive(): boolean {
    const { notifications } = this.currentPreferences;
    
    if (!notifications.enabled || !notifications.quietHours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { startTime, endTime } = notifications.quietHours;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }
    
    // Handle same-day quiet hours (e.g., 12:00 to 14:00)
    return currentTime >= startTime && currentTime <= endTime;
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
   * Save preferences with debouncing
   */
  private async savePreferences(): Promise<void> {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Debounce saves to avoid excessive storage operations
    return new Promise((resolve, reject) => {
      this.saveTimeout = setTimeout(async () => {
        try {
          await this.storageManager.setItem(
            UserPreferencesService.PREFERENCES_KEY,
            this.currentPreferences
          );
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 300); // 300ms debounce
    });
  }

  /**
   * Load preferences from storage
   */
  private async loadPreferences(): Promise<void> {
    try {
      const stored = await this.storageManager.getItem<UserPreferences>(
        UserPreferencesService.PREFERENCES_KEY
      );

      if (stored) {
        // Merge with defaults to handle new preference fields
        this.currentPreferences = {
          ...UserPreferencesService.DEFAULT_PREFERENCES,
          ...stored,
          // Ensure nested objects are properly merged
          notifications: {
            ...UserPreferencesService.DEFAULT_PREFERENCES.notifications,
            ...stored.notifications,
            quietHours: {
              ...UserPreferencesService.DEFAULT_PREFERENCES.notifications.quietHours,
              ...stored.notifications?.quietHours,
            },
          },
        };
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
      // Use defaults on error
      this.currentPreferences = { ...UserPreferencesService.DEFAULT_PREFERENCES };
    }
  }

  /**
   * Validate preferences
   */
  private validatePreferences(preferences: Partial<UserPreferences>): PreferencesValidationResult {
    const errors: PreferencesValidationError[] = [];

    // Validate volume ranges
    if (preferences.soundVolume !== undefined) {
      if (preferences.soundVolume < 0 || preferences.soundVolume > 100) {
        errors.push({
          field: 'soundVolume',
          message: 'Sound volume must be between 0 and 100',
          code: 'INVALID_RANGE',
        });
      }
    }

    if (preferences.musicVolume !== undefined) {
      if (preferences.musicVolume < 0 || preferences.musicVolume > 100) {
        errors.push({
          field: 'musicVolume',
          message: 'Music volume must be between 0 and 100',
          code: 'INVALID_RANGE',
        });
      }
    }

    // Validate font size
    if (preferences.fontSize !== undefined) {
      if (!Object.values(FontSize).includes(preferences.fontSize)) {
        errors.push({
          field: 'fontSize',
          message: 'Invalid font size value',
          code: 'INVALID_ENUM',
        });
      }
    }

    // Validate quiet hours format
    if (preferences.notifications?.quietHours) {
      const { startTime, endTime } = preferences.notifications.quietHours;
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (startTime && !timeRegex.test(startTime)) {
        errors.push({
          field: 'notifications',
          message: 'Invalid quiet hours start time format (use HH:MM)',
          code: 'INVALID_TIME_FORMAT',
        });
      }
      
      if (endTime && !timeRegex.test(endTime)) {
        errors.push({
          field: 'notifications',
          message: 'Invalid quiet hours end time format (use HH:MM)',
          code: 'INVALID_TIME_FORMAT',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in preferences event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.eventListeners.clear();
  }
}