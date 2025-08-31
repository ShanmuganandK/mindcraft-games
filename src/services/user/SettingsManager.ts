/**
 * Settings Manager - Coordinates all settings and preferences functionality
 */

import { UserPreferencesService, PreferencesServiceConfig } from './UserPreferencesService';
import { StorageManager } from '../storage/StorageManager';
import { UserPreferences, UserPreferencesUpdate, FontSize } from '../../types/user';

export interface SettingsManagerConfig {
  preferences: PreferencesServiceConfig;
  enableVolumeSliders: boolean;
  enableAdvancedAccessibility: boolean;
  enableDataExport: boolean;
}

export interface VolumeSettings {
  soundVolume: number;
  musicVolume: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: FontSize;
  colorBlindSupport: boolean;
  screenReaderOptimized: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  gameReminders: boolean;
  achievementNotifications: boolean;
  leaderboardUpdates: boolean;
  newGameAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface DataManagementOptions {
  exportUserData: () => Promise<string>;
  importUserData: (data: string) => Promise<void>;
  resetAllData: () => Promise<void>;
  resetPreferences: () => Promise<void>;
  resetGameProgress: () => Promise<void>;
}

export class SettingsManager {
  private preferencesService: UserPreferencesService;
  private storageManager: StorageManager;
  private config: SettingsManagerConfig;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(storageManager: StorageManager, config: SettingsManagerConfig) {
    this.storageManager = storageManager;
    this.config = config;
    this.preferencesService = new UserPreferencesService(storageManager, config.preferences);
    
    // Forward preference events
    this.preferencesService.on('preferenceChanged', (data) => {
      this.emit('settingChanged', data);
    });
    
    this.preferencesService.on('preferencesUpdated', (data) => {
      this.emit('settingsUpdated', data);
    });
  }

  /**
   * Initialize the settings manager
   */
  async initialize(): Promise<void> {
    await this.preferencesService.initialize();
    this.emit('initialized');
  }

  /**
   * Get all current preferences
   */
  getAllPreferences(): UserPreferences {
    return this.preferencesService.getPreferences();
  }

  /**
   * Update multiple preferences at once
   */
  async updatePreferences(updates: UserPreferencesUpdate): Promise<void> {
    await this.preferencesService.updatePreferences(updates);
  }

  /**
   * Get volume settings
   */
  getVolumeSettings(): VolumeSettings {
    const prefs = this.preferencesService.getAudioPreferences();
    return {
      soundVolume: prefs.soundVolume,
      musicVolume: prefs.musicVolume,
      soundEnabled: prefs.soundEnabled,
      musicEnabled: prefs.musicEnabled,
    };
  }

  /**
   * Update volume settings
   */
  async updateVolumeSettings(settings: Partial<VolumeSettings>): Promise<void> {
    const updates: UserPreferencesUpdate = {};
    
    if (settings.soundVolume !== undefined) {
      updates.soundVolume = Math.max(0, Math.min(100, settings.soundVolume));
    }
    
    if (settings.musicVolume !== undefined) {
      updates.musicVolume = Math.max(0, Math.min(100, settings.musicVolume));
    }
    
    if (settings.soundEnabled !== undefined) {
      updates.soundEnabled = settings.soundEnabled;
    }
    
    if (settings.musicEnabled !== undefined) {
      updates.musicEnabled = settings.musicEnabled;
    }

    await this.preferencesService.updatePreferences(updates);
  }

  /**
   * Get accessibility settings
   */
  getAccessibilitySettings(): AccessibilitySettings {
    const prefs = this.preferencesService.getAccessibilityPreferences();
    return {
      reducedMotion: prefs.reducedMotion,
      highContrast: prefs.highContrast,
      fontSize: prefs.fontSize,
      colorBlindSupport: prefs.colorBlindSupport,
      screenReaderOptimized: prefs.screenReaderOptimized,
    };
  }

  /**
   * Update accessibility settings
   */
  async updateAccessibilitySettings(settings: Partial<AccessibilitySettings>): Promise<void> {
    const updates: UserPreferencesUpdate = {};
    
    Object.keys(settings).forEach(key => {
      const typedKey = key as keyof AccessibilitySettings;
      if (settings[typedKey] !== undefined) {
        (updates as any)[typedKey] = settings[typedKey];
      }
    });

    await this.preferencesService.updatePreferences(updates);
  }

  /**
   * Get notification settings
   */
  getNotificationSettings(): NotificationSettings {
    const prefs = this.preferencesService.getNotificationPreferences();
    return {
      enabled: prefs.enabled,
      gameReminders: prefs.gameReminders,
      achievementNotifications: prefs.achievementNotifications,
      leaderboardUpdates: prefs.leaderboardUpdates,
      newGameAlerts: prefs.newGameAlerts,
      quietHoursEnabled: prefs.quietHours.enabled,
      quietHoursStart: prefs.quietHours.startTime,
      quietHoursEnd: prefs.quietHours.endTime,
    };
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
    const currentNotifications = this.preferencesService.getNotificationPreferences();
    
    const updatedNotifications = {
      ...currentNotifications,
      enabled: settings.enabled ?? currentNotifications.enabled,
      gameReminders: settings.gameReminders ?? currentNotifications.gameReminders,
      achievementNotifications: settings.achievementNotifications ?? currentNotifications.achievementNotifications,
      leaderboardUpdates: settings.leaderboardUpdates ?? currentNotifications.leaderboardUpdates,
      newGameAlerts: settings.newGameAlerts ?? currentNotifications.newGameAlerts,
      quietHours: {
        ...currentNotifications.quietHours,
        enabled: settings.quietHoursEnabled ?? currentNotifications.quietHours.enabled,
        startTime: settings.quietHoursStart ?? currentNotifications.quietHours.startTime,
        endTime: settings.quietHoursEnd ?? currentNotifications.quietHours.endTime,
      },
    };

    await this.preferencesService.updatePreferences({
      notifications: updatedNotifications,
    });
  }

  /**
   * Check if notifications should be shown (respects quiet hours)
   */
  shouldShowNotification(type: 'gameReminder' | 'achievement' | 'leaderboard' | 'newGame'): boolean {
    const settings = this.getNotificationSettings();
    
    if (!settings.enabled) {
      return false;
    }

    if (this.preferencesService.isQuietHoursActive()) {
      return false;
    }

    switch (type) {
      case 'gameReminder':
        return settings.gameReminders;
      case 'achievement':
        return settings.achievementNotifications;
      case 'leaderboard':
        return settings.leaderboardUpdates;
      case 'newGame':
        return settings.newGameAlerts;
      default:
        return false;
    }
  }

  /**
   * Get data management options
   */
  getDataManagementOptions(): DataManagementOptions {
    return {
      exportUserData: async () => {
        const preferences = this.preferencesService.exportPreferences();
        
        // In a full implementation, this would also export game progress,
        // achievements, and other user data
        const userData = {
          preferences: JSON.parse(preferences),
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
        };
        
        return JSON.stringify(userData, null, 2);
      },

      importUserData: async (data: string) => {
        try {
          const parsed = JSON.parse(data);
          
          if (parsed.preferences) {
            await this.preferencesService.importPreferences(
              JSON.stringify(parsed.preferences)
            );
          }
          
          // In a full implementation, this would also import game progress
          this.emit('dataImported', { importedAt: new Date() });
          
        } catch (error) {
          throw new Error('Invalid user data format');
        }
      },

      resetAllData: async () => {
        // Reset preferences
        await this.preferencesService.resetToDefaults();
        
        // In a full implementation, this would also reset:
        // - Game progress
        // - Achievements
        // - Statistics
        // - User profile data
        
        // Clear all storage except essential app data
        await this.storageManager.clear();
        
        this.emit('allDataReset', { resetAt: new Date() });
      },

      resetPreferences: async () => {
        await this.preferencesService.resetToDefaults();
        this.emit('preferencesReset', { resetAt: new Date() });
      },

      resetGameProgress: async () => {
        // In a full implementation, this would reset all game progress
        // For now, we'll just emit an event
        this.emit('gameProgressReset', { resetAt: new Date() });
      },
    };
  }

  /**
   * Reset specific settings category
   */
  async resetCategory(category: 'audio' | 'accessibility' | 'notifications' | 'game' | 'privacy'): Promise<void> {
    await this.preferencesService.resetCategory(category);
    this.emit('categoryReset', { category, resetAt: new Date() });
  }

  /**
   * Get settings summary for display
   */
  getSettingsSummary(): {
    audio: { soundEnabled: boolean; musicEnabled: boolean };
    accessibility: { reducedMotion: boolean; highContrast: boolean; fontSize: FontSize };
    notifications: { enabled: boolean; quietHoursActive: boolean };
    privacy: { analyticsEnabled: boolean; personalizedAds: boolean };
  } {
    const prefs = this.preferencesService.getPreferences();
    
    return {
      audio: {
        soundEnabled: prefs.soundEnabled,
        musicEnabled: prefs.musicEnabled,
      },
      accessibility: {
        reducedMotion: prefs.reducedMotion,
        highContrast: prefs.highContrast,
        fontSize: prefs.fontSize,
      },
      notifications: {
        enabled: prefs.notifications.enabled,
        quietHoursActive: this.preferencesService.isQuietHoursActive(),
      },
      privacy: {
        analyticsEnabled: prefs.analyticsEnabled,
        personalizedAds: prefs.personalizedAds,
      },
    };
  }

  /**
   * Validate settings before applying
   */
  validateSettings(settings: Partial<UserPreferences>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate volume ranges
    if (settings.soundVolume !== undefined && (settings.soundVolume < 0 || settings.soundVolume > 100)) {
      errors.push('Sound volume must be between 0 and 100');
    }

    if (settings.musicVolume !== undefined && (settings.musicVolume < 0 || settings.musicVolume > 100)) {
      errors.push('Music volume must be between 0 and 100');
    }

    // Validate font size
    if (settings.fontSize !== undefined && !Object.values(FontSize).includes(settings.fontSize)) {
      errors.push('Invalid font size');
    }

    // Validate quiet hours
    if (settings.notifications?.quietHours) {
      const { startTime, endTime } = settings.notifications.quietHours;
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (startTime && !timeRegex.test(startTime)) {
        errors.push('Invalid quiet hours start time format');
      }
      
      if (endTime && !timeRegex.test(endTime)) {
        errors.push('Invalid quiet hours end time format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
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
   * Emit event to listeners
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in settings event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.preferencesService.cleanup();
    this.eventListeners.clear();
  }
}