/**
 * Enhanced Settings screen with comprehensive user preferences management
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../navigation/AppNavigator';
import { SettingsManager, VolumeSettings, AccessibilitySettings, NotificationSettings } from '../services/user/SettingsManager';
import { StorageManager } from '../services/storage/StorageManager';
import { LocalStorageProvider } from '../services/storage/LocalStorageProvider';
import { VolumeSlider } from '../components/settings/VolumeSlider';
import { ConfirmationDialog } from '../components/settings/ConfirmationDialog';
import { FontSize } from '../types/user';

type SettingsScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'Settings'>;

interface SettingsScreenProps {
  navigation: SettingsScreenNavigationProp;
}

interface SettingsState {
  volume: VolumeSettings;
  accessibility: AccessibilitySettings;
  notifications: NotificationSettings;
  privacy: {
    analyticsEnabled: boolean;
    crashReportingEnabled: boolean;
    personalizedAds: boolean;
  };
  isLoading: boolean;
}

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const [settings, setSettings] = useState<SettingsState>({
    volume: {
      soundVolume: 80,
      musicVolume: 60,
      soundEnabled: true,
      musicEnabled: true,
    },
    accessibility: {
      reducedMotion: false,
      highContrast: false,
      fontSize: FontSize.MEDIUM,
      colorBlindSupport: false,
      screenReaderOptimized: false,
    },
    notifications: {
      enabled: true,
      gameReminders: true,
      achievementNotifications: true,
      leaderboardUpdates: false,
      newGameAlerts: true,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
    },
    privacy: {
      analyticsEnabled: true,
      crashReportingEnabled: true,
      personalizedAds: true,
    },
    isLoading: true,
  });

  const [settingsManager, setSettingsManager] = useState<SettingsManager | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetType, setResetType] = useState<'all' | 'preferences' | 'progress'>('all');

  useEffect(() => {
    initializeSettingsManager();
  }, []);

  const initializeSettingsManager = async () => {
    try {
      const storageProvider = new LocalStorageProvider({
        encryptionKey: 'settings-key',
        enableEncryption: false,
        enableCompression: false,
      });
      
      const storageManager = new StorageManager(storageProvider);
      await storageManager.initialize();

      const manager = new SettingsManager(storageManager, {
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

      await manager.initialize();
      setSettingsManager(manager);

      // Load current settings
      loadSettings(manager);

      // Listen for setting changes
      manager.on('settingChanged', handleSettingChanged);

      AccessibilityInfo.announceForAccessibility('Settings screen loaded');
    } catch (error) {
      console.error('Failed to initialize settings manager:', error);
      Alert.alert('Error', 'Failed to load settings. Using default values.');
    } finally {
      setSettings(prev => ({ ...prev, isLoading: false }));
    }
  };

  const loadSettings = (manager: SettingsManager) => {
    const volume = manager.getVolumeSettings();
    const accessibility = manager.getAccessibilitySettings();
    const notifications = manager.getNotificationSettings();
    const allPrefs = manager.getAllPreferences();

    setSettings(prev => ({
      ...prev,
      volume,
      accessibility,
      notifications,
      privacy: {
        analyticsEnabled: allPrefs.analyticsEnabled,
        crashReportingEnabled: allPrefs.crashReportingEnabled,
        personalizedAds: allPrefs.personalizedAds,
      },
    }));
  };

  const handleSettingChanged = useCallback((data: any) => {
    // Announce setting change to screen readers
    AccessibilityInfo.announceForAccessibility(
      `${data.key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${
        typeof data.newValue === 'boolean' 
          ? (data.newValue ? 'enabled' : 'disabled') 
          : `set to ${data.newValue}`
      }`
    );
  }, []);

  const updateVolumeSettings = async (updates: Partial<VolumeSettings>) => {
    if (!settingsManager) return;
    
    try {
      await settingsManager.updateVolumeSettings(updates);
      setSettings(prev => ({
        ...prev,
        volume: { ...prev.volume, ...updates },
      }));
    } catch (error) {
      console.error('Failed to update volume settings:', error);
      Alert.alert('Error', 'Failed to save volume settings');
    }
  };

  const updateAccessibilitySettings = async (updates: Partial<AccessibilitySettings>) => {
    if (!settingsManager) return;
    
    try {
      await settingsManager.updateAccessibilitySettings(updates);
      setSettings(prev => ({
        ...prev,
        accessibility: { ...prev.accessibility, ...updates },
      }));
    } catch (error) {
      console.error('Failed to update accessibility settings:', error);
      Alert.alert('Error', 'Failed to save accessibility settings');
    }
  };

  const updateNotificationSettings = async (updates: Partial<NotificationSettings>) => {
    if (!settingsManager) return;
    
    try {
      await settingsManager.updateNotificationSettings(updates);
      setSettings(prev => ({
        ...prev,
        notifications: { ...prev.notifications, ...updates },
      }));
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const updatePrivacySettings = async (key: keyof typeof settings.privacy, value: boolean) => {
    if (!settingsManager) return;
    
    try {
      await settingsManager.updatePreferences({ [key]: value });
      setSettings(prev => ({
        ...prev,
        privacy: { ...prev.privacy, [key]: value },
      }));
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      Alert.alert('Error', 'Failed to save privacy settings');
    }
  };

  const handleResetData = (type: 'all' | 'preferences' | 'progress') => {
    setResetType(type);
    setShowResetDialog(true);
  };

  const confirmReset = async () => {
    if (!settingsManager) return;
    
    try {
      const dataManager = settingsManager.getDataManagementOptions();
      
      switch (resetType) {
        case 'all':
          await dataManager.resetAllData();
          AccessibilityInfo.announceForAccessibility('All data has been reset to defaults');
          Alert.alert('Reset Complete', 'All data has been reset to default values.');
          break;
        
        case 'preferences':
          await dataManager.resetPreferences();
          loadSettings(settingsManager);
          AccessibilityInfo.announceForAccessibility('Preferences have been reset to defaults');
          Alert.alert('Reset Complete', 'Preferences have been reset to default values.');
          break;
        
        case 'progress':
          await dataManager.resetGameProgress();
          AccessibilityInfo.announceForAccessibility('Game progress has been reset');
          Alert.alert('Reset Complete', 'Game progress has been reset.');
          break;
      }
    } catch (error) {
      console.error('Failed to reset data:', error);
      Alert.alert('Error', 'Failed to reset data. Please try again.');
    } finally {
      setShowResetDialog(false);
    }
  };

  const getResetDialogContent = () => {
    switch (resetType) {
      case 'all':
        return {
          title: 'Reset All Data',
          message: 'This will delete all your game progress, scores, and settings. This action cannot be undone.',
        };
      case 'preferences':
        return {
          title: 'Reset Preferences',
          message: 'This will reset all settings to their default values. Your game progress will not be affected.',
        };
      case 'progress':
        return {
          title: 'Reset Game Progress',
          message: 'This will delete all your game scores and progress. Your settings will not be affected.',
        };
      default:
        return { title: '', message: '' };
    }
  };

  if (settings.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const resetDialogContent = getResetDialogContent();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">
            Settings
          </Text>
          <Text style={styles.subtitle}>
            Customize your gaming experience
          </Text>
        </View>

        {/* Audio Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Audio
          </Text>
          
          <SettingRow
            title="Sound Effects"
            description="Play sound effects during games"
            value={settings.volume.soundEnabled}
            onValueChange={(value) => updateVolumeSettings({ soundEnabled: value })}
            accessibilityLabel="Sound effects toggle"
            accessibilityHint="Enable or disable sound effects in games"
          />

          <VolumeSlider
            label="Sound Volume"
            value={settings.volume.soundVolume}
            onValueChange={(value) => updateVolumeSettings({ soundVolume: value })}
            enabled={settings.volume.soundEnabled}
            accessibilityLabel="Sound effects volume"
            accessibilityHint="Adjust the volume level for sound effects"
          />
          
          <SettingRow
            title="Background Music"
            description="Play background music"
            value={settings.volume.musicEnabled}
            onValueChange={(value) => updateVolumeSettings({ musicEnabled: value })}
            accessibilityLabel="Background music toggle"
            accessibilityHint="Enable or disable background music"
          />

          <VolumeSlider
            label="Music Volume"
            value={settings.volume.musicVolume}
            onValueChange={(value) => updateVolumeSettings({ musicVolume: value })}
            enabled={settings.volume.musicEnabled}
            accessibilityLabel="Background music volume"
            accessibilityHint="Adjust the volume level for background music"
          />
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Notifications
          </Text>
          
          <SettingRow
            title="Notifications"
            description="Receive app notifications"
            value={settings.notifications.enabled}
            onValueChange={(value) => updateNotificationSettings({ enabled: value })}
            accessibilityLabel="Notifications toggle"
            accessibilityHint="Enable or disable all notifications"
          />

          <SettingRow
            title="Game Reminders"
            description="Receive notifications to play games"
            value={settings.notifications.gameReminders}
            onValueChange={(value) => updateNotificationSettings({ gameReminders: value })}
            accessibilityLabel="Game reminders toggle"
            accessibilityHint="Enable or disable game reminder notifications"
            disabled={!settings.notifications.enabled}
          />

          <SettingRow
            title="Achievement Notifications"
            description="Get notified when you unlock achievements"
            value={settings.notifications.achievementNotifications}
            onValueChange={(value) => updateNotificationSettings({ achievementNotifications: value })}
            accessibilityLabel="Achievement notifications toggle"
            accessibilityHint="Enable or disable achievement unlock notifications"
            disabled={!settings.notifications.enabled}
          />

          <SettingRow
            title="New Game Alerts"
            description="Be notified when new games are added"
            value={settings.notifications.newGameAlerts}
            onValueChange={(value) => updateNotificationSettings({ newGameAlerts: value })}
            accessibilityLabel="New game alerts toggle"
            accessibilityHint="Enable or disable notifications for new games"
            disabled={!settings.notifications.enabled}
          />
        </View>

        {/* Accessibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Accessibility
          </Text>
          
          <SettingRow
            title="Reduced Motion"
            description="Minimize animations and transitions"
            value={settings.accessibility.reducedMotion}
            onValueChange={(value) => updateAccessibilitySettings({ reducedMotion: value })}
            accessibilityLabel="Reduced motion toggle"
            accessibilityHint="Enable to reduce animations for motion sensitivity"
          />
          
          <SettingRow
            title="High Contrast"
            description="Increase contrast for better visibility"
            value={settings.accessibility.highContrast}
            onValueChange={(value) => updateAccessibilitySettings({ highContrast: value })}
            accessibilityLabel="High contrast toggle"
            accessibilityHint="Enable high contrast mode for better visibility"
          />

          <SettingRow
            title="Colorblind Support"
            description="Enhanced colors for colorblind users"
            value={settings.accessibility.colorBlindSupport}
            onValueChange={(value) => updateAccessibilitySettings({ colorBlindSupport: value })}
            accessibilityLabel="Colorblind support toggle"
            accessibilityHint="Enable colorblind-friendly color schemes"
          />

          <SettingRow
            title="Screen Reader Optimized"
            description="Optimize interface for screen readers"
            value={settings.accessibility.screenReaderOptimized}
            onValueChange={(value) => updateAccessibilitySettings({ screenReaderOptimized: value })}
            accessibilityLabel="Screen reader optimization toggle"
            accessibilityHint="Enable optimizations for screen reader users"
          />
          
          <FontSizeSetting
            currentSize={settings.accessibility.fontSize}
            onSizeChange={(size) => updateAccessibilitySettings({ fontSize: size })}
          />
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Privacy
          </Text>
          
          <SettingRow
            title="Analytics"
            description="Help improve the app by sharing usage data"
            value={settings.privacy.analyticsEnabled}
            onValueChange={(value) => updatePrivacySettings('analyticsEnabled', value)}
            accessibilityLabel="Analytics toggle"
            accessibilityHint="Enable or disable anonymous usage analytics"
          />

          <SettingRow
            title="Crash Reporting"
            description="Automatically report crashes to help fix bugs"
            value={settings.privacy.crashReportingEnabled}
            onValueChange={(value) => updatePrivacySettings('crashReportingEnabled', value)}
            accessibilityLabel="Crash reporting toggle"
            accessibilityHint="Enable or disable automatic crash reporting"
          />

          <SettingRow
            title="Personalized Ads"
            description="Show ads based on your interests"
            value={settings.privacy.personalizedAds}
            onValueChange={(value) => updatePrivacySettings('personalizedAds', value)}
            accessibilityLabel="Personalized ads toggle"
            accessibilityHint="Enable or disable personalized advertisements"
          />
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Data Management
          </Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleResetData('preferences')}
            accessibilityRole="button"
            accessibilityLabel="Reset preferences"
            accessibilityHint="Reset all settings to default values"
          >
            <Text style={styles.actionButtonText}>Reset Preferences</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleResetData('progress')}
            accessibilityRole="button"
            accessibilityLabel="Reset game progress"
            accessibilityHint="Delete all game scores and progress"
          >
            <Text style={styles.actionButtonText}>Reset Game Progress</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => handleResetData('all')}
            accessibilityRole="button"
            accessibilityLabel="Reset all data"
            accessibilityHint="Delete all game progress and reset settings to defaults"
          >
            <Text style={styles.dangerButtonText}>Reset All Data</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            About
          </Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      <ConfirmationDialog
        visible={showResetDialog}
        title={resetDialogContent.title}
        message={resetDialogContent.message}
        confirmText="Reset"
        cancelText="Cancel"
        onConfirm={confirmReset}
        onCancel={() => setShowResetDialog(false)}
        destructive={true}
      />
    </SafeAreaView>
  );
}

interface SettingRowProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  accessibilityHint: string;
  disabled?: boolean;
}

function SettingRow({
  title,
  description,
  value,
  onValueChange,
  accessibilityLabel,
  accessibilityHint,
  disabled = false,
}: SettingRowProps) {
  return (
    <View style={[styles.settingRow, disabled && styles.disabledRow]}>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text style={[styles.settingDescription, disabled && styles.disabledText]}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e0e0e0', true: disabled ? '#ccc' : '#007AFF' }}
        thumbColor={value ? '#ffffff' : '#f4f3f4'}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="switch"
        disabled={disabled}
      />
    </View>
  );
}

interface FontSizeSettingProps {
  currentSize: FontSize;
  onSizeChange: (size: FontSize) => void;
}

function FontSizeSetting({ currentSize, onSizeChange }: FontSizeSettingProps) {
  const sizes: Array<{ key: FontSize; label: string }> = [
    { key: FontSize.SMALL, label: 'Small' },
    { key: FontSize.MEDIUM, label: 'Medium' },
    { key: FontSize.LARGE, label: 'Large' },
    { key: FontSize.EXTRA_LARGE, label: 'Extra Large' },
  ];

  return (
    <View style={styles.fontSizeSetting}>
      <Text style={styles.settingTitle}>Font Size</Text>
      <Text style={styles.settingDescription}>Choose your preferred text size</Text>
      
      <View style={styles.fontSizeOptions}>
        {sizes.map((size) => (
          <TouchableOpacity
            key={size.key}
            style={[
              styles.fontSizeOption,
              currentSize === size.key && styles.fontSizeOptionSelected,
            ]}
            onPress={() => onSizeChange(size.key)}
            accessibilityRole="button"
            accessibilityLabel={`${size.label} font size`}
            accessibilityHint={`Set font size to ${size.label.toLowerCase()}`}
            accessibilityState={{ selected: currentSize === size.key }}
          >
            <Text
              style={[
                styles.fontSizeOptionText,
                currentSize === size.key && styles.fontSizeOptionTextSelected,
              ]}
            >
              {size.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  disabledRow: {
    opacity: 0.6,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
  disabledText: {
    color: '#999999',
  },
  fontSizeSetting: {
    paddingVertical: 8,
  },
  fontSizeOptions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  fontSizeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  fontSizeOptionSelected: {
    backgroundColor: '#007AFF',
  },
  fontSizeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  fontSizeOptionTextSelected: {
    color: '#ffffff',
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  infoValue: {
    fontSize: 16,
    color: '#666666',
  },
});