/**
 * Data migration framework with schema versioning and cloud migration support
 */

import { StorageProvider } from './StorageProvider';

export interface Migration {
  version: number;
  description: string;
  up: (storage: StorageProvider) => Promise<void>;
  down?: (storage: StorageProvider) => Promise<void>;
}

export interface MigrationStatus {
  currentVersion: number;
  targetVersion: number;
  appliedMigrations: number[];
  pendingMigrations: Migration[];
  lastMigrationDate?: Date;
}

export class MigrationManager {
  private migrations: Map<number, Migration> = new Map();
  private readonly metadataKey = 'migration_metadata';

  constructor(private storage: StorageProvider) {}

  /**
   * Register a migration
   */
  registerMigration(migration: Migration): void {
    if (this.migrations.has(migration.version)) {
      throw new Error(`Migration version ${migration.version} already registered`);
    }
    
    this.migrations.set(migration.version, migration);
  }

  /**
   * Register multiple migrations
   */
  registerMigrations(migrations: Migration[]): void {
    for (const migration of migrations) {
      this.registerMigration(migration);
    }
  }

  /**
   * Get current migration status
   */
  async getStatus(): Promise<MigrationStatus> {
    const metadata = await this.getMigrationMetadata();
    const currentVersion = metadata.currentVersion || 0;
    const targetVersion = this.getLatestVersion();
    const appliedMigrations = metadata.appliedMigrations || [];
    
    const pendingMigrations = Array.from(this.migrations.values())
      .filter(migration => migration.version > currentVersion)
      .sort((a, b) => a.version - b.version);

    return {
      currentVersion,
      targetVersion,
      appliedMigrations,
      pendingMigrations,
      lastMigrationDate: metadata.lastMigrationDate
    };
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<MigrationResult> {
    const status = await this.getStatus();
    
    if (status.pendingMigrations.length === 0) {
      return {
        success: true,
        migrationsApplied: [],
        fromVersion: status.currentVersion,
        toVersion: status.currentVersion,
        message: 'No migrations to apply'
      };
    }

    const result: MigrationResult = {
      success: false,
      migrationsApplied: [],
      fromVersion: status.currentVersion,
      toVersion: status.currentVersion,
      errors: []
    };

    try {
      console.log(`Starting migration from version ${status.currentVersion} to ${status.targetVersion}`);
      
      for (const migration of status.pendingMigrations) {
        try {
          console.log(`Applying migration ${migration.version}: ${migration.description}`);
          
          await migration.up(this.storage);
          
          result.migrationsApplied.push(migration.version);
          result.toVersion = migration.version;
          
          // Update metadata after each successful migration
          await this.updateMigrationMetadata(migration.version);
          
          console.log(`Migration ${migration.version} applied successfully`);
        } catch (error) {
          const errorMsg = `Migration ${migration.version} failed: ${error}`;
          console.error(errorMsg);
          result.errors?.push(errorMsg);
          
          // Stop on first error
          break;
        }
      }

      result.success = result.errors?.length === 0;
      result.message = result.success 
        ? `Successfully applied ${result.migrationsApplied.length} migrations`
        : `Migration failed after applying ${result.migrationsApplied.length} migrations`;

      return result;
    } catch (error) {
      result.errors?.push(`Migration process failed: ${error}`);
      result.message = 'Migration process encountered an unexpected error';
      return result;
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollback(targetVersion: number): Promise<MigrationResult> {
    const status = await this.getStatus();
    
    if (targetVersion >= status.currentVersion) {
      return {
        success: false,
        migrationsApplied: [],
        fromVersion: status.currentVersion,
        toVersion: status.currentVersion,
        message: 'Target version must be lower than current version',
        errors: ['Invalid target version']
      };
    }

    const result: MigrationResult = {
      success: false,
      migrationsApplied: [],
      fromVersion: status.currentVersion,
      toVersion: status.currentVersion,
      errors: []
    };

    try {
      console.log(`Starting rollback from version ${status.currentVersion} to ${targetVersion}`);
      
      // Get migrations to rollback (in reverse order)
      const migrationsToRollback = Array.from(this.migrations.values())
        .filter(migration => migration.version > targetVersion && migration.version <= status.currentVersion)
        .sort((a, b) => b.version - a.version); // Descending order

      for (const migration of migrationsToRollback) {
        if (!migration.down) {
          const errorMsg = `Migration ${migration.version} does not support rollback`;
          console.error(errorMsg);
          result.errors?.push(errorMsg);
          break;
        }

        try {
          console.log(`Rolling back migration ${migration.version}: ${migration.description}`);
          
          await migration.down(this.storage);
          
          result.migrationsApplied.push(migration.version);
          result.toVersion = targetVersion;
          
          // Update metadata after each successful rollback
          await this.updateMigrationMetadata(targetVersion, migration.version);
          
          console.log(`Migration ${migration.version} rolled back successfully`);
        } catch (error) {
          const errorMsg = `Rollback of migration ${migration.version} failed: ${error}`;
          console.error(errorMsg);
          result.errors?.push(errorMsg);
          break;
        }
      }

      result.success = result.errors?.length === 0;
      result.message = result.success 
        ? `Successfully rolled back ${result.migrationsApplied.length} migrations`
        : `Rollback failed after processing ${result.migrationsApplied.length} migrations`;

      return result;
    } catch (error) {
      result.errors?.push(`Rollback process failed: ${error}`);
      result.message = 'Rollback process encountered an unexpected error';
      return result;
    }
  }

  /**
   * Check if migrations are needed
   */
  async needsMigration(): Promise<boolean> {
    const status = await this.getStatus();
    return status.pendingMigrations.length > 0;
  }

  /**
   * Get migration history
   */
  async getHistory(): Promise<MigrationHistoryEntry[]> {
    const metadata = await this.getMigrationMetadata();
    return metadata.history || [];
  }

  /**
   * Reset migration state (dangerous - use with caution)
   */
  async reset(): Promise<void> {
    await this.storage.removeItem(this.metadataKey);
    console.log('Migration state reset');
  }

  // Private helper methods

  private getLatestVersion(): number {
    if (this.migrations.size === 0) return 0;
    return Math.max(...Array.from(this.migrations.keys()));
  }

  private async getMigrationMetadata(): Promise<MigrationMetadata> {
    try {
      const metadata = await this.storage.getItem<MigrationMetadata>(this.metadataKey);
      return metadata || {
        currentVersion: 0,
        appliedMigrations: [],
        history: []
      };
    } catch {
      return {
        currentVersion: 0,
        appliedMigrations: [],
        history: []
      };
    }
  }

  private async updateMigrationMetadata(newVersion: number, rolledBackVersion?: number): Promise<void> {
    const metadata = await this.getMigrationMetadata();
    
    if (rolledBackVersion) {
      // Rollback case
      metadata.currentVersion = newVersion;
      metadata.appliedMigrations = metadata.appliedMigrations.filter(v => v !== rolledBackVersion);
      metadata.history.push({
        version: rolledBackVersion,
        action: 'rollback',
        timestamp: new Date(),
        targetVersion: newVersion
      });
    } else {
      // Migration case
      metadata.currentVersion = newVersion;
      if (!metadata.appliedMigrations.includes(newVersion)) {
        metadata.appliedMigrations.push(newVersion);
      }
      metadata.history.push({
        version: newVersion,
        action: 'migrate',
        timestamp: new Date()
      });
    }
    
    metadata.lastMigrationDate = new Date();
    
    await this.storage.setItem(this.metadataKey, metadata);
  }
}

/**
 * Predefined migrations for the multi-game platform
 */
export class PlatformMigrations {
  static getAllMigrations(): Migration[] {
    return [
      {
        version: 1,
        description: 'Initial schema setup',
        up: async (storage: StorageProvider) => {
          // Set up initial metadata structure
          await storage.setItem('schema_version', 1);
          console.log('Initial schema setup completed');
        },
        down: async (storage: StorageProvider) => {
          await storage.removeItem('schema_version');
        }
      },
      
      {
        version: 2,
        description: 'Add user preferences structure',
        up: async (storage: StorageProvider) => {
          // Migrate existing user profiles to include new preference fields
          const keys = await storage.getAllKeys();
          const userKeys = keys.filter(key => key.startsWith('user_profile:'));
          
          for (const key of userKeys) {
            const profile = await storage.getItem(key) as any;
            if (profile && !profile.preferences) {
              profile.preferences = {
                soundEnabled: true,
                musicEnabled: true,
                soundVolume: 0.8,
                musicVolume: 0.6,
                reducedMotion: false,
                highContrast: false,
                fontSize: 'medium',
                analyticsConsent: true,
                notifications: {
                  gameReminders: true,
                  achievementNotifications: true,
                  leaderboardUpdates: false,
                  newGameAlerts: true,
                  dailyRewards: false
                },
                privacySettings: {
                  shareProgress: true,
                  showOnLeaderboards: true,
                  allowFriendRequests: false,
                  dataCollection: 'standard'
                }
              };
              await storage.setItem(key, profile);
            }
          }
        },
        down: async (storage: StorageProvider) => {
          // Remove preferences from user profiles
          const keys = await storage.getAllKeys();
          const userKeys = keys.filter(key => key.startsWith('user_profile:'));
          
          for (const key of userKeys) {
            const profile = await storage.getItem(key) as any;
            if (profile && profile.preferences) {
              delete profile.preferences;
              await storage.setItem(key, profile);
            }
          }
        }
      },

      {
        version: 3,
        description: 'Add game statistics structure',
        up: async (storage: StorageProvider) => {
          // Migrate existing game progress to include detailed statistics
          const keys = await storage.getAllKeys();
          const progressKeys = keys.filter(key => key.startsWith('game_progress:'));
          
          for (const key of progressKeys) {
            const progress = await storage.getItem(key) as any;
            if (progress && !progress.statistics) {
              progress.statistics = {
                gamesCompleted: progress.totalPlays || 0,
                gamesAbandoned: 0,
                averageSessionDuration: 0,
                bestStreak: 1,
                currentStreak: 1,
                difficultyProgression: {
                  easy: 0,
                  medium: 0,
                  hard: 0,
                  expert: 0,
                  custom: 0
                },
                customStatistics: {}
              };
              await storage.setItem(key, progress);
            }
          }
        },
        down: async (storage: StorageProvider) => {
          // Remove statistics from game progress
          const keys = await storage.getAllKeys();
          const progressKeys = keys.filter(key => key.startsWith('game_progress:'));
          
          for (const key of progressKeys) {
            const progress = await storage.getItem(key) as any;
            if (progress && progress.statistics) {
              delete progress.statistics;
              await storage.setItem(key, progress);
            }
          }
        }
      }
    ];
  }
}

// Interfaces

interface MigrationMetadata {
  currentVersion: number;
  appliedMigrations: number[];
  lastMigrationDate?: Date;
  history: MigrationHistoryEntry[];
}

interface MigrationHistoryEntry {
  version: number;
  action: 'migrate' | 'rollback';
  timestamp: Date;
  targetVersion?: number;
}

export interface MigrationResult {
  success: boolean;
  migrationsApplied: number[];
  fromVersion: number;
  toVersion: number;
  message?: string;
  errors?: string[];
}