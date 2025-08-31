/**
 * Unit tests for StorageManager
 */

import { StorageManager, DefaultStorageProviderFactory, StorageConfigPresets } from '../StorageManager';
import { StorageProvider, StorageConfig, ConflictResolution } from '../StorageProvider';

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

// Mock factory
const mockFactory = {
  createProvider: jest.fn(),
  getSupportedProviders: jest.fn(),
  getProviderCapabilities: jest.fn()
};

describe('StorageManager', () => {
  let storageManager: StorageManager;
  let config: StorageConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    storageManager = new StorageManager(mockFactory);
    config = StorageConfigPresets.getDefaultConfig();
    
    mockFactory.createProvider.mockResolvedValue(mockProvider);
    mockProvider.initialize.mockResolvedValue();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await storageManager.initialize(config);

      expect(mockFactory.createProvider).toHaveBeenCalledWith(config);
      expect(mockProvider.initialize).toHaveBeenCalled();
      expect(storageManager.userProfiles).toBeDefined();
      expect(storageManager.gameProgress).toBeDefined();
      expect(storageManager.settings).toBeDefined();
    });

    it('should throw error if initialization fails', async () => {
      mockProvider.initialize.mockRejectedValueOnce(new Error('Init failed'));

      await expect(storageManager.initialize(config)).rejects.toThrow('Failed to initialize storage');
    });
  });

  describe('provider switching', () => {
    beforeEach(async () => {
      await storageManager.initialize(config);
    });

    it('should switch provider without migration', async () => {
      const newConfig = { ...config, provider: 'new-provider' };
      const newProvider = { ...mockProvider, name: 'NewProvider' };
      
      mockFactory.createProvider.mockResolvedValueOnce(newProvider as any);

      await storageManager.switchProvider(newConfig, false);

      expect(mockFactory.createProvider).toHaveBeenCalledWith(newConfig);
      expect(mockProvider.backup).not.toHaveBeenCalled();
    });

    it('should switch provider with migration', async () => {
      const newConfig = { ...config, provider: 'new-provider' };
      const newProvider = { ...mockProvider, name: 'NewProvider' };
      const backupData = { version: '1.0.0', timestamp: new Date(), data: {}, metadata: {} };
      
      mockProvider.backup.mockResolvedValueOnce(backupData as any);
      mockFactory.createProvider.mockResolvedValueOnce(newProvider as any);
      (newProvider as any).restore.mockResolvedValueOnce();

      await storageManager.switchProvider(newConfig, true);

      expect(mockProvider.backup).toHaveBeenCalled();
      expect((newProvider as any).restore).toHaveBeenCalledWith(backupData);
    });
  });

  describe('storage operations', () => {
    beforeEach(async () => {
      await storageManager.initialize(config);
    });

    it('should get storage info', async () => {
      const storageInfo = {
        totalSize: 1000,
        usedSize: 500,
        availableSize: 500,
        itemCount: 10,
        provider: 'MockProvider'
      };
      
      mockProvider.getStorageInfo.mockResolvedValueOnce(storageInfo);

      const result = await storageManager.getStorageInfo();

      expect(result).toEqual(storageInfo);
    });

    it('should perform backup', async () => {
      const backupData = { version: '1.0.0', timestamp: new Date(), data: {}, metadata: {} };
      mockProvider.backup.mockResolvedValueOnce(backupData as any);

      const result = await storageManager.backup();

      expect(result).toEqual(backupData);
    });

    it('should restore from backup', async () => {
      const backupData = { version: '1.0.0', timestamp: new Date(), data: {}, metadata: {} };
      mockProvider.restore.mockResolvedValueOnce();

      await storageManager.restore(backupData);

      expect(mockProvider.restore).toHaveBeenCalledWith(backupData);
    });

    it('should sync if supported', async () => {
      const syncResult = { success: true, syncedKeys: ['key1'], conflicts: [], errors: [] };
      mockProvider.sync = jest.fn().mockResolvedValueOnce(syncResult);

      const result = await storageManager.sync();

      expect(result).toEqual(syncResult);
    });

    it('should throw error if sync not supported', async () => {
      mockProvider.sync = undefined;

      await expect(storageManager.sync()).rejects.toThrow('Current provider does not support sync');
    });

    it('should clear all data', async () => {
      mockProvider.clear.mockResolvedValueOnce();

      await storageManager.clearAll();

      expect(mockProvider.clear).toHaveBeenCalled();
    });
  });

  describe('health check', () => {
    it('should return unhealthy if not initialized', async () => {
      const health = await storageManager.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Storage not initialized');
    });

    it('should return healthy for working storage', async () => {
      await storageManager.initialize(config);
      
      mockProvider.setItem.mockResolvedValueOnce();
      mockProvider.getItem.mockResolvedValueOnce({ timestamp: expect.any(Number) });
      mockProvider.removeItem.mockResolvedValueOnce();
      mockProvider.getStorageInfo.mockResolvedValueOnce({
        totalSize: 1000,
        usedSize: 100,
        availableSize: 900,
        itemCount: 5,
        provider: 'MockProvider'
      });

      const health = await storageManager.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.issues).toHaveLength(0);
    });

    it('should detect high storage usage', async () => {
      await storageManager.initialize(config);
      
      mockProvider.setItem.mockResolvedValueOnce();
      mockProvider.getItem.mockResolvedValueOnce({ timestamp: expect.any(Number) });
      mockProvider.removeItem.mockResolvedValueOnce();
      mockProvider.getStorageInfo.mockResolvedValueOnce({
        totalSize: 1000,
        usedSize: 950, // 95% usage
        availableSize: 50,
        itemCount: 5,
        provider: 'MockProvider'
      });

      const health = await storageManager.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.issues).toContain('Storage usage above 90%');
    });
  });

  describe('configuration and capabilities', () => {
    beforeEach(async () => {
      await storageManager.initialize(config);
    });

    it('should return current config', () => {
      const currentConfig = storageManager.getConfig();
      expect(currentConfig).toEqual(config);
    });

    it('should return provider capabilities', () => {
      const capabilities = storageManager.getCapabilities();
      expect(capabilities).toEqual(mockProvider.capabilities);
    });

    it('should get repository by name', () => {
      const userRepo = storageManager.getRepository('userProfiles');
      expect(userRepo).toBe(storageManager.userProfiles);
    });
  });
});

describe('DefaultStorageProviderFactory', () => {
  let factory: DefaultStorageProviderFactory;

  beforeEach(() => {
    factory = new DefaultStorageProviderFactory();
  });

  it('should create local storage provider', async () => {
    const config: StorageConfig = {
      provider: 'local',
      encryption: { enabled: true },
      compression: { enabled: true },
      migration: { enabled: true, autoMigrate: true },
      sync: { enabled: false, conflictResolution: ConflictResolution.USE_LOCAL },
      backup: { enabled: true }
    };

    const provider = await factory.createProvider(config);

    expect(provider.name).toBe('LocalStorageProvider');
  });

  it('should throw error for unsupported provider', async () => {
    const config: StorageConfig = {
      provider: 'unsupported',
      encryption: { enabled: false },
      compression: { enabled: false },
      migration: { enabled: false, autoMigrate: false },
      sync: { enabled: false, conflictResolution: ConflictResolution.USE_LOCAL },
      backup: { enabled: false }
    };

    await expect(factory.createProvider(config)).rejects.toThrow('Unsupported storage provider');
  });

  it('should return supported providers', () => {
    const providers = factory.getSupportedProviders();
    expect(providers).toContain('local');
  });

  it('should return provider capabilities', () => {
    const capabilities = factory.getProviderCapabilities('local');
    expect(capabilities.encryption).toBe(true);
    expect(capabilities.backup).toBe(true);
  });
});

describe('StorageConfigPresets', () => {
  it('should provide default config', () => {
    const config = StorageConfigPresets.getDefaultConfig();
    
    expect(config.provider).toBe('local');
    expect(config.encryption.enabled).toBe(true);
    expect(config.compression.enabled).toBe(true);
  });

  it('should provide performance config', () => {
    const config = StorageConfigPresets.getPerformanceConfig();
    
    expect(config.encryption.enabled).toBe(false);
    expect(config.compression.enabled).toBe(false);
  });

  it('should provide secure config', () => {
    const config = StorageConfigPresets.getSecureConfig();
    
    expect(config.encryption.enabled).toBe(true);
    expect(config.backup.enabled).toBe(true);
  });
});