/**
 * Unit tests for MigrationManager
 */

import { MigrationManager, PlatformMigrations, Migration } from '../MigrationManager';
import { StorageProvider } from '../StorageProvider';

// Mock storage provider
const mockProvider: jest.Mocked<StorageProvider> = {
  name: 'MockProvider',
  version: '1.0.0',
  capabilities: {
    encryption: true,
    compression: true,
    cloudSync: false,
    migration: true,
    backup: true,
    ttl: true,
    batchOperations: true
  },
  initialize: jest.fn(),
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  hasItem: jest.fn(),
  getStorageInfo: jest.fn(),
  multiSet: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
  migrate: jest.fn(),
  backup: jest.fn(),
  restore: jest.fn()
};

describe('MigrationManager', () => {
  let migrationManager: MigrationManager;
  let testMigrations: Migration[];

  beforeEach(() => {
    jest.clearAllMocks();
    migrationManager = new MigrationManager(mockProvider);
    
    testMigrations = [
      {
        version: 1,
        description: 'Initial setup',
        up: jest.fn().mockResolvedValue(undefined),
        down: jest.fn().mockResolvedValue(undefined)
      },
      {
        version: 2,
        description: 'Add user preferences',
        up: jest.fn().mockResolvedValue(undefined),
        down: jest.fn().mockResolvedValue(undefined)
      },
      {
        version: 3,
        description: 'Add game statistics',
        up: jest.fn().mockResolvedValue(undefined),
        down: jest.fn().mockResolvedValue(undefined)
      }
    ];
  });

  describe('migration registration', () => {
    it('should register single migration', () => {
      expect(() => migrationManager.registerMigration(testMigrations[0])).not.toThrow();
    });

    it('should register multiple migrations', () => {
      expect(() => migrationManager.registerMigrations(testMigrations)).not.toThrow();
    });

    it('should throw error for duplicate version', () => {
      migrationManager.registerMigration(testMigrations[0]);
      
      expect(() => migrationManager.registerMigration(testMigrations[0])).toThrow(
        'Migration version 1 already registered'
      );
    });
  });

  describe('migration status', () => {
    beforeEach(() => {
      migrationManager.registerMigrations(testMigrations);
    });

    it('should return status with no applied migrations', async () => {
      mockProvider.getItem.mockResolvedValueOnce(null);

      const status = await migrationManager.getStatus();

      expect(status).toEqual({
        currentVersion: 0,
        targetVersion: 3,
        appliedMigrations: [],
        pendingMigrations: testMigrations,
        lastMigrationDate: undefined
      });
    });

    it('should return status with some applied migrations', async () => {
      const metadata = {
        currentVersion: 1,
        appliedMigrations: [1],
        lastMigrationDate: new Date('2023-01-01'),
        history: []
      };
      
      mockProvider.getItem.mockResolvedValueOnce(metadata);

      const status = await migrationManager.getStatus();

      expect(status.currentVersion).toBe(1);
      expect(status.pendingMigrations).toHaveLength(2);
      expect(status.pendingMigrations[0].version).toBe(2);
    });
  });

  describe('migration execution', () => {
    beforeEach(() => {
      migrationManager.registerMigrations(testMigrations);
    });

    it('should run all pending migrations successfully', async () => {
      mockProvider.getItem.mockResolvedValueOnce(null); // No existing metadata
      mockProvider.setItem.mockResolvedValue();

      const result = await migrationManager.migrate();

      expect(result.success).toBe(true);
      expect(result.migrationsApplied).toEqual([1, 2, 3]);
      expect(result.fromVersion).toBe(0);
      expect(result.toVersion).toBe(3);
      
      // Verify all migrations were called
      expect(testMigrations[0].up).toHaveBeenCalledWith(mockProvider);
      expect(testMigrations[1].up).toHaveBeenCalledWith(mockProvider);
      expect(testMigrations[2].up).toHaveBeenCalledWith(mockProvider);
    });

    it('should return success when no migrations needed', async () => {
      const metadata = {
        currentVersion: 3,
        appliedMigrations: [1, 2, 3],
        history: []
      };
      
      mockProvider.getItem.mockResolvedValueOnce(metadata);

      const result = await migrationManager.migrate();

      expect(result.success).toBe(true);
      expect(result.migrationsApplied).toEqual([]);
      expect(result.message).toBe('No migrations to apply');
    });

    it('should stop on migration failure', async () => {
      mockProvider.getItem.mockResolvedValueOnce(null);
      mockProvider.setItem.mockResolvedValue();
      
      // Make second migration fail
      (testMigrations[1].up as jest.Mock).mockRejectedValueOnce(new Error('Migration failed'));

      const result = await migrationManager.migrate();

      expect(result.success).toBe(false);
      expect(result.migrationsApplied).toEqual([1]); // Only first migration applied
      expect(result.errors).toContain('Migration 2 failed: Error: Migration failed');
      
      // Third migration should not be called
      expect(testMigrations[2].up).not.toHaveBeenCalled();
    });
  });

  describe('rollback', () => {
    beforeEach(() => {
      migrationManager.registerMigrations(testMigrations);
    });

    it('should rollback to target version', async () => {
      const metadata = {
        currentVersion: 3,
        appliedMigrations: [1, 2, 3],
        history: []
      };
      
      mockProvider.getItem.mockResolvedValueOnce(metadata);
      mockProvider.setItem.mockResolvedValue();

      const result = await migrationManager.rollback(1);

      expect(result.success).toBe(true);
      expect(result.migrationsApplied).toEqual([3, 2]); // Rolled back in reverse order
      expect(result.toVersion).toBe(1);
      
      // Verify rollback methods were called
      expect(testMigrations[1].down).toHaveBeenCalledWith(mockProvider);
    });

    it('should fail rollback for migration without down method', async () => {
      // Create a migration without down method for this test
      const migrationWithoutDown = {
        version: 4,
        description: 'Migration without rollback',
        up: jest.fn().mockResolvedValue(undefined)
        // No down method
      };
      
      migrationManager.registerMigration(migrationWithoutDown);
      
      const metadata = {
        currentVersion: 4,
        appliedMigrations: [1, 2, 3, 4],
        history: []
      };
      
      mockProvider.getItem.mockResolvedValueOnce(metadata);

      const result = await migrationManager.rollback(0);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Migration 4 does not support rollback');
    });

    it('should reject invalid target version', async () => {
      const metadata = {
        currentVersion: 2,
        appliedMigrations: [1, 2],
        history: []
      };
      
      mockProvider.getItem.mockResolvedValueOnce(metadata);

      const result = await migrationManager.rollback(3);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Target version must be lower than current version');
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      migrationManager.registerMigrations(testMigrations);
    });

    it('should check if migrations are needed', async () => {
      mockProvider.getItem.mockResolvedValueOnce(null);

      const needsMigration = await migrationManager.needsMigration();

      expect(needsMigration).toBe(true);
    });

    it('should return migration history', async () => {
      const metadata = {
        currentVersion: 2,
        appliedMigrations: [1, 2],
        history: [
          { version: 1, action: 'migrate' as const, timestamp: new Date('2023-01-01') },
          { version: 2, action: 'migrate' as const, timestamp: new Date('2023-01-02') }
        ]
      };
      
      mockProvider.getItem.mockResolvedValueOnce(metadata);

      const history = await migrationManager.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].version).toBe(1);
      expect(history[0].action).toBe('migrate');
    });

    it('should reset migration state', async () => {
      mockProvider.removeItem.mockResolvedValueOnce();

      await migrationManager.reset();

      expect(mockProvider.removeItem).toHaveBeenCalledWith('migration_metadata');
    });
  });
});

describe('PlatformMigrations', () => {
  it('should provide all platform migrations', () => {
    const migrations = PlatformMigrations.getAllMigrations();

    expect(migrations).toHaveLength(3);
    expect(migrations[0].version).toBe(1);
    expect(migrations[0].description).toBe('Initial schema setup');
    expect(migrations[1].version).toBe(2);
    expect(migrations[1].description).toBe('Add user preferences structure');
    expect(migrations[2].version).toBe(3);
    expect(migrations[2].description).toBe('Add game statistics structure');
  });

  describe('migration 1 - initial setup', () => {
    it('should set schema version', async () => {
      const mockStorage = {
        setItem: jest.fn().mockResolvedValue(undefined)
      } as any;

      const migration = PlatformMigrations.getAllMigrations()[0];
      await migration.up(mockStorage);

      expect(mockStorage.setItem).toHaveBeenCalledWith('schema_version', 1);
    });

    it('should rollback schema version', async () => {
      const mockStorage = {
        removeItem: jest.fn().mockResolvedValue(undefined)
      } as any;

      const migration = PlatformMigrations.getAllMigrations()[0];
      await migration.down!(mockStorage);

      expect(mockStorage.removeItem).toHaveBeenCalledWith('schema_version');
    });
  });

  describe('migration 2 - user preferences', () => {
    it('should add preferences to existing user profiles', async () => {
      const existingProfile = {
        id: 'user123',
        displayName: 'Test User'
      };

      const mockStorage = {
        getAllKeys: jest.fn().mockResolvedValue(['user_profile:user123']),
        getItem: jest.fn().mockResolvedValue(existingProfile),
        setItem: jest.fn().mockResolvedValue(undefined)
      } as any;

      const migration = PlatformMigrations.getAllMigrations()[1];
      await migration.up(mockStorage);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'user_profile:user123',
        expect.objectContaining({
          ...existingProfile,
          preferences: expect.objectContaining({
            soundEnabled: true,
            musicEnabled: true,
            soundVolume: 0.8,
            musicVolume: 0.6
          })
        })
      );
    });
  });

  describe('migration 3 - game statistics', () => {
    it('should add statistics to existing game progress', async () => {
      const existingProgress = {
        gameId: 'tic-tac-toe',
        highScore: 100,
        totalPlays: 5
      };

      const mockStorage = {
        getAllKeys: jest.fn().mockResolvedValue(['game_progress:tic-tac-toe']),
        getItem: jest.fn().mockResolvedValue(existingProgress),
        setItem: jest.fn().mockResolvedValue(undefined)
      } as any;

      const migration = PlatformMigrations.getAllMigrations()[2];
      await migration.up(mockStorage);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        'game_progress:tic-tac-toe',
        expect.objectContaining({
          ...existingProgress,
          statistics: expect.objectContaining({
            gamesCompleted: 5,
            gamesAbandoned: 0,
            averageSessionDuration: 0,
            bestStreak: 1,
            currentStreak: 1
          })
        })
      );
    });
  });
});