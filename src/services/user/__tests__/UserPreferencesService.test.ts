/**
 * Unit tests for UserPreferencesService
 */

import { UserPreferencesService } from '../UserPreferencesService';
import { StorageManager } from '../../storage/StorageManager';
import { FontSize } from '../../../types/user';

// Mock StorageManager
const mockStorageManager = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  hasItem: jest.fn(),
} as unknown as StorageManager;

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserPreferencesService(mockStorageManager, {
      autoSave: true,
      validationEnabled: true,
      syncToCloud: false,
      encryptSensitiveData: false,
    });
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize with default preferences when no stored data', async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);

      await service.initialize();

      const preferences = service.getPreferences();
      expect(preferences.soundEnabled).toBe(true);
      expect(preferences.musicEnabled).toBe(true);
      expect(preferences.fontSize).toBe(FontSize.MEDIUM);
    });

    it('should load stored preferences on initialization', async () => {
      const storedPreferences = {
        soundEnabled: false,
        musicEnabled: false,
        fontSize: FontSize.LARGE,
      };
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(storedPreferences);

      await service.initialize();

      const preferences = service.getPreferences();
      expect(preferences.soundEnabled).toBe(false);
      expect(preferences.musicEnabled).toBe(false);
      expect(preferences.fontSize).toBe(FontSize.LARGE);
    });

    it('should merge stored preferences with defaults for new fields', async () => {
      const storedPreferences = {
        soundEnabled: false,
        // Missing newer fields should use defaults
      };
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(storedPreferences);

      await service.initialize();

      const preferences = service.getPreferences();
      expect(preferences.soundEnabled).toBe(false); // From stored
      expect(preferences.musicEnabled).toBe(true); // From defaults
    });
  });

  describe('Preference Updates', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await service.initialize();
    });

    it('should update single preference', async () => {
      await service.updatePreference('soundEnabled', false);

      const preferences = service.getPreferences();
      expect(preferences.soundEnabled).toBe(false);
      expect(mockStorageManager.setItem).toHaveBeenCalled();
    });

    it('should update multiple preferences', async () => {
      await service.updatePreferences({
        soundEnabled: false,
        musicEnabled: false,
        fontSize: FontSize.LARGE,
      });

      const preferences = service.getPreferences();
      expect(preferences.soundEnabled).toBe(false);
      expect(preferences.musicEnabled).toBe(false);
      expect(preferences.fontSize).toBe(FontSize.LARGE);
    });

    it('should emit events when preferences change', async () => {
      const changeListener = jest.fn();
      const updateListener = jest.fn();

      service.on('preferenceChanged', changeListener);
      service.on('preferencesUpdated', updateListener);

      await service.updatePreference('soundEnabled', false);

      expect(changeListener).toHaveBeenCalledWith({
        key: 'soundEnabled',
        oldValue: true,
        newValue: false,
      });
      expect(updateListener).toHaveBeenCalled();
    });

    it('should rollback on save error', async () => {
      (mockStorageManager.setItem as jest.Mock).mockRejectedValue(new Error('Save failed'));

      const originalValue = service.getPreference('soundEnabled');

      await expect(service.updatePreference('soundEnabled', false)).rejects.toThrow();

      // Should rollback to original value
      expect(service.getPreference('soundEnabled')).toBe(originalValue);
    });
  });

  describe('Validation', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await service.initialize();
    });

    it('should validate volume ranges', async () => {
      await expect(
        service.updatePreference('soundVolume', 150)
      ).rejects.toThrow('Invalid preferences');

      await expect(
        service.updatePreference('soundVolume', -10)
      ).rejects.toThrow('Invalid preferences');
    });

    it('should validate font size enum', async () => {
      await expect(
        service.updatePreference('fontSize', 'invalid' as FontSize)
      ).rejects.toThrow('Invalid preferences');
    });

    it('should validate quiet hours time format', async () => {
      await expect(
        service.updatePreferences({
          notifications: {
            enabled: true,
            gameReminders: true,
            achievementNotifications: true,
            leaderboardUpdates: false,
            newGameAlerts: true,
            quietHours: {
              enabled: true,
              startTime: '25:00', // Invalid time
              endTime: '08:00',
            },
          },
        })
      ).rejects.toThrow('Invalid preferences');
    });

    it('should allow valid updates', async () => {
      await expect(
        service.updatePreferences({
          soundVolume: 75,
          musicVolume: 50,
          fontSize: FontSize.LARGE,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Reset Functionality', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await service.initialize();
      
      // Make some changes
      await service.updatePreferences({
        soundEnabled: false,
        musicEnabled: false,
        fontSize: FontSize.LARGE,
      });
    });

    it('should reset all preferences to defaults', async () => {
      await service.resetToDefaults();

      const preferences = service.getPreferences();
      expect(preferences.soundEnabled).toBe(true);
      expect(preferences.musicEnabled).toBe(true);
      expect(preferences.fontSize).toBe(FontSize.MEDIUM);
    });

    it('should reset specific category', async () => {
      await service.resetCategory('audio');

      const preferences = service.getPreferences();
      expect(preferences.soundEnabled).toBe(true); // Reset
      expect(preferences.musicEnabled).toBe(true); // Reset
      expect(preferences.fontSize).toBe(FontSize.LARGE); // Not reset
    });

    it('should emit reset events', async () => {
      const resetListener = jest.fn();
      service.on('preferencesReset', resetListener);

      await service.resetToDefaults();

      expect(resetListener).toHaveBeenCalled();
    });
  });

  describe('Accessibility Helpers', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await service.initialize();
    });

    it('should return accessibility preferences', () => {
      const accessibilityPrefs = service.getAccessibilityPreferences();

      expect(accessibilityPrefs).toHaveProperty('reducedMotion');
      expect(accessibilityPrefs).toHaveProperty('highContrast');
      expect(accessibilityPrefs).toHaveProperty('fontSize');
      expect(accessibilityPrefs).toHaveProperty('colorBlindSupport');
      expect(accessibilityPrefs).toHaveProperty('screenReaderOptimized');
    });

    it('should return audio preferences', () => {
      const audioPrefs = service.getAudioPreferences();

      expect(audioPrefs).toHaveProperty('soundEnabled');
      expect(audioPrefs).toHaveProperty('musicEnabled');
      expect(audioPrefs).toHaveProperty('soundVolume');
      expect(audioPrefs).toHaveProperty('musicVolume');
    });

    it('should return notification preferences', () => {
      const notificationPrefs = service.getNotificationPreferences();

      expect(notificationPrefs).toHaveProperty('enabled');
      expect(notificationPrefs).toHaveProperty('gameReminders');
      expect(notificationPrefs).toHaveProperty('quietHours');
    });
  });

  describe('Quiet Hours', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await service.initialize();
    });

    it('should detect quiet hours correctly for same-day period', async () => {
      // Set quiet hours from 12:00 to 14:00
      await service.updatePreferences({
        notifications: {
          enabled: true,
          gameReminders: true,
          achievementNotifications: true,
          leaderboardUpdates: false,
          newGameAlerts: true,
          quietHours: {
            enabled: true,
            startTime: '12:00',
            endTime: '14:00',
          },
        },
      });

      // Mock current time to be 13:00
      const originalDate = Date;
      const mockDate = jest.fn(() => ({
        getHours: () => 13,
        getMinutes: () => 0,
      }));
      global.Date = mockDate as any;

      expect(service.isQuietHoursActive()).toBe(true);

      // Restore original Date
      global.Date = originalDate;
    });

    it('should detect quiet hours correctly for overnight period', async () => {
      // Set quiet hours from 22:00 to 08:00
      await service.updatePreferences({
        notifications: {
          enabled: true,
          gameReminders: true,
          achievementNotifications: true,
          leaderboardUpdates: false,
          newGameAlerts: true,
          quietHours: {
            enabled: true,
            startTime: '22:00',
            endTime: '08:00',
          },
        },
      });

      // Mock current time to be 23:00 (should be quiet)
      const originalDate = Date;
      const mockDate = jest.fn(() => ({
        getHours: () => 23,
        getMinutes: () => 0,
      }));
      global.Date = mockDate as any;

      expect(service.isQuietHoursActive()).toBe(true);

      // Restore original Date
      global.Date = originalDate;
    });

    it('should return false when quiet hours are disabled', async () => {
      await service.updatePreferences({
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
      });

      expect(service.isQuietHoursActive()).toBe(false);
    });
  });

  describe('Import/Export', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await service.initialize();
    });

    it('should export preferences as JSON', () => {
      const exported = service.exportPreferences();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty('preferences');
      expect(parsed).toHaveProperty('exportedAt');
      expect(parsed).toHaveProperty('version');
    });

    it('should import valid preferences', async () => {
      const exportData = {
        preferences: {
          soundEnabled: false,
          musicEnabled: false,
          fontSize: FontSize.LARGE,
        },
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      await service.importPreferences(JSON.stringify(exportData));

      const preferences = service.getPreferences();
      expect(preferences.soundEnabled).toBe(false);
      expect(preferences.musicEnabled).toBe(false);
      expect(preferences.fontSize).toBe(FontSize.LARGE);
    });

    it('should reject invalid import data', async () => {
      await expect(
        service.importPreferences('invalid json')
      ).rejects.toThrow('Failed to import preferences');

      await expect(
        service.importPreferences('{}')
      ).rejects.toThrow('Failed to import preferences');
    });
  });
});