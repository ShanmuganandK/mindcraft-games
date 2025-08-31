/**
 * Storage service exports for the Multi-Game Platform
 */

// Core interfaces and types
export * from './StorageProvider';

// Provider implementations
export * from './LocalStorageProvider';

// Repository pattern
export * from './Repository';

// Storage management
export * from './StorageManager';

// Migration framework
export * from './MigrationManager';

// Convenience exports
export {
  StorageManager,
  DefaultStorageProviderFactory,
  StorageConfigPresets
} from './StorageManager';

export {
  MigrationManager,
  PlatformMigrations
} from './MigrationManager';

export {
  UserProfileRepository,
  GameProgressRepository,
  SettingsRepository
} from './Repository';