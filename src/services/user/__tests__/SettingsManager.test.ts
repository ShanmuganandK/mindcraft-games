/**
 * Unit tests for SettingsManager
 */

import { SettingsManager } from '../SettingsManager';
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

describe('SettingsManager', () => {
  let settingsManager: SettingsManager;

  beforeEach(() => {
    jest.clearAllMocks();
    settingsManager = new SettingsManager(mockStorageManager, {
      preferences: {
        autoSave: true,
        validationEnabled: true,
        syncToCloud: false,
        encryptSensitiveData: false,
      },
      enableVolumeSliders: true,
      enableAdvancedAccessibility: true,
      enableDataExport: true,
    });
  });

  afterEach(() => {
    settingsManager.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);

      await settingsManager.initialize();

      const preferences = settingsManager.getAllPreferences();
      expect(preferences).toBeDefined();
      expect(preferences.soundEnabled).toBe(true);
    });

    it('should emit initialized event', async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      
      const initListener = jest.fn();
      settingsManager.on('initialized', initListener);

      await settingsManager.initialize();

      expect(initListener).toHaveBeenCalled();
    });
  });

  describe('Volume Settings', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await settingsManager.initialize();
    });

    it('should get volume settings', () => {
      const volumeSettings = settingsManager.getVolumeSettings();

      expect(volumeSettings).toHaveProperty('soundVolume');
      expect(volumeSettings).toHaveProperty('musicVolume');
      expect(volumeSettings).toHaveProperty('soundEnabled');
      expect(volumeSettings).toHaveProperty('musicEnabled');
    });

    it('should update volume settings', async () => {
      await settingsManager.updateVolumeSettings({
        soundVolume: 75,
        musicVolume: 50,
      });

      const volumeSettings = settingsManager.getVolumeSettings();
      expect(volumeSettings.soundVolume).toBe(75);
      expect(volumeSettings.musicVolume).toBe(50);
    });

    it('should clamp volume values to valid range', async () => {
      await settingsManager.updateVolumeSettings({
        soundVolume: 150, // Should be clamped to 100
        musicVolume: -10, // Should be clamped to 0
      });

      const volumeSettings = settingsManager.getVolumeSettings();
      expect(volumeSettings.soundVolume).toBe(100);
      expect(volumeSettings.musicVolume).toBe(0);
    });

    it('should toggle sound and music', async () => {
      await settingsManager.updateVolumeSettings({
        soundEnabled: false,
        musicEnabled: false,
      });

      const volumeSettings = settingsManager.getVolumeSettings();
      expect(volumeSettings.soundEnabled).toBe(false);
      expect(volumeSettings.musicEnabled).toBe(false);
    });
  });

  describe('Accessibility Settings', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await settingsManager.initialize();
    });

    it('should get accessibility settings', () => {
      const accessibilitySettings = settingsManager.getAccessibilitySettings();

      expect(accessibilitySettings).toHaveProperty('reducedMotion');
      expect(accessibilitySettings).toHaveProperty('highContrast');
      expect(accessibilitySettings).toHaveProperty('fontSize');
      expect(accessibilitySettings).toHaveProperty('colorBlindSupport');
      expect(accessibilitySettings).toHaveProperty('screenReaderOptimized');
    });

    it('should update accessibility settings', async () => {
      await settingsManager.updateAccessibilitySettings({
        reducedMotion: true,
        highContrast: true,
        fontSize: FontSize.LARGE,
      });

      const accessibilitySettings = settingsManager.getAccessibilitySettings();
      expect(accessibilitySettings.reducedMotion).toBe(true);
      expect(accessibilitySettings.highContrast).toBe(true);
      expect(accessibilitySettings.fontSize).toBe(FontSize.LARGE);
    });
  });

  describe('Notification Settings', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await settingsManager.initialize();
    });

    it('should get notification settings', () => {
      const notificationSettings = settingsManager.getNotificationSettings();

      expect(notificationSettings).toHaveProperty('enabled');
      expect(notificationSettings).toHaveProperty('gameReminders');
      expect(notificationSettings).toHaveProperty('achievementNotifications');
      expect(notificationSettings).toHaveProperty('quietHoursEnabled');
    });

    it('should update notification settings', async () => {
      await settingsManager.updateNotificationSettings({
        enabled: false,
        gameReminders: false,
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
      });

      const notificationSettings = settingsManager.getNotificationSettings();
      expect(notificationSettings.enabled).toBe(false);
      expect(notificationSettings.gameReminders).toBe(false);
      expect(notificationSettings.quietHoursEnabled).toBe(true);
      expect(notificationSettings.quietHoursStart).toBe('23:00');
      expect(notificationSettings.quietHoursEnd).toBe('07:00');
    });

    it('should check if notifications should be shown', () => {
      // Test different notification types
      expect(settingsManager.shouldShowNotification('gameReminder')).toBe(true);
      expect(settingsManager.shouldShowNotification('achievement')).toBe(true);
      expect(settingsManager.shouldShowNotification('newGame')).toBe(true);
    });
  });

  describe('Data Management', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await settingsManager.initialize();
    });

    it('should provide data management options', () => {
      const dataOptions = settingsManager.getDataManagementOptions();

      expect(dataOptions).toHaveProperty('exportUserData');
      expect(dataOptions).toHaveProperty('importUserData');
      expect(dataOptions).toHaveProperty('resetAllData');
      expect(dataOptions).toHaveProperty('resetPreferences');
      expect(dataOptions).toHaveProperty('resetGameProgress');
    });

    it('should export user data', async () => {
      const dataOptions = settingsManager.getDataManagementOptions();
      const exportedData = await dataOptions.exportUserData();

      expect(typeof exportedData).toBe('string');
      
      const parsed = JSON.parse(exportedData);
      expect(parsed).toHaveProperty('preferences');
      expect(parsed).toHaveProperty('exportedAt');
      expect(parsed).toHaveProperty('version');
    });

    it('should import user data', async () => {
      const dataOptions = settingsManager.getDataManagementOptions();
      
      const testData = {
        preferences: {
          preferences: {
            soundEnabled: false,
            musicEnabled: false,
          },
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
        },
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      };

      await dataOptions.importUserData(JSON.stringify(testData));

      // Verify data was imported
      const preferences = settingsManager.getAllPreferences();
      expect(preferences.soundEnabled).toBe(false);
      expect(preferences.musicEnabled).toBe(false);
    });

    it('should reset all data', async () => {
      const dataOptions = settingsManager.getDataManagementOptions();
      const resetListener = jest.fn();
      
      settingsManager.on('allDataReset', resetListener);

      await dataOptions.resetAllData();

      expect(mockStorageManager.clear).toHaveBeenCalled();
      expect(resetListener).toHaveBeenCalled();
    });

    it('should reset preferences only', async () => {
      // Change some preferences first
      await settingsManager.updateVolumeSettings({ soundEnabled: false });

      const dataOptions = settingsManager.getDataManagementOptions();
      const resetListener = jest.fn();
      
      settingsManager.on('preferencesReset', resetListener);

      await dataOptions.resetPreferences();

      // Verify preferences were reset
      const preferences = settingsManager.getAllPreferences();
      expect(preferences.soundEnabled).toBe(true); // Back to default
      expect(resetListener).toHaveBeenCalled();
    });
  });

  describe('Category Reset', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await settingsManager.initialize();
      
      // Make some changes
      await settingsManager.updateVolumeSettings({ soundEnabled: false });
      await settingsManager.updateAccessibilitySettings({ reducedMotion: true });
    });

    it('should reset audio category', async () => {
      await settingsManager.resetCategory('audio');

      const volumeSettings = settingsManager.getVolumeSettings();
      expect(volumeSettings.soundEnabled).toBe(true); // Reset to default
    });

    it('should reset accessibility category', async () => {
      await settingsManager.resetCategory('accessibility');

      const accessibilitySettings = settingsManager.getAccessibilitySettings();
      expect(accessibilitySettings.reducedMotion).toBe(false); // Reset to default
    });

    it('should emit category reset event', async () => {
      const resetListener = jest.fn();
      settingsManager.on('categoryReset', resetListener);

      await settingsManager.resetCategory('audio');

      expect(resetListener).toHaveBeenCalledWith({
        category: 'audio',
        resetAt: expect.any(Date),
      });
    });
  });

  describe('Settings Summary', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await settingsManager.initialize();
    });

    it('should provide settings summary', () => {
      const summary = settingsManager.getSettingsSummary();

      expect(summary).toHaveProperty('audio');
      expect(summary).toHaveProperty('accessibility');
      expect(summary).toHaveProperty('notifications');
      expect(summary).toHaveProperty('privacy');

      expect(summary.audio).toHaveProperty('soundEnabled');
      expect(summary.audio).toHaveProperty('musicEnabled');
      expect(summary.accessibility).toHaveProperty('reducedMotion');
      expect(summary.accessibility).toHaveProperty('fontSize');
    });
  });

  describe('Settings Validation', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await settingsManager.initialize();
    });

    it('should validate valid settings', () => {
      const validation = settingsManager.validateSettings({
        soundVolume: 75,
        musicVolume: 50,
        fontSize: FontSize.LARGE,
      });

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid volume values', () => {
      const validation = settingsManager.validateSettings({
        soundVolume: 150,
        musicVolume: -10,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Sound volume must be between 0 and 100');
      expect(validation.errors).toContain('Music volume must be between 0 and 100');
    });

    it('should reject invalid font size', () => {
      const validation = settingsManager.validateSettings({
        fontSize: 'invalid' as FontSize,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid font size');
    });

    it('should reject invalid quiet hours format', () => {
      const validation = settingsManager.validateSettings({
        notifications: {
          enabled: true,
          gameReminders: true,
          achievementNotifications: true,
          leaderboardUpdates: false,
          newGameAlerts: true,
          quietHours: {
            enabled: true,
            startTime: '25:00', // Invalid
            endTime: '08:70',   // Invalid
          },
        },
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      (mockStorageManager.getItem as jest.Mock).mockResolvedValue(null);
      await settingsManager.initialize();
    });

    it('should add and remove event listeners', () => {
      const listener = jest.fn();

      settingsManager.on('testEvent', listener);
      settingsManager.off('testEvent', listener);

      // Manually emit event to test
      (settingsManager as any).emit('testEvent', { test: true });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should forward preference change events', async () => {
      const changeListener = jest.fn();
      settingsManager.on('settingChanged', changeListener);

      await settingsManager.updateVolumeSettings({ soundEnabled: false });

      expect(changeListener).toHaveBeenCalled();
    });
  });
});