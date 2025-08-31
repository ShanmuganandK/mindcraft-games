/**
 * Storage manager for runtime backend selection and configuration
 * Supports multiple providers with fallback strategies
 */

import {
  StorageProvider,
  StorageProviderFactory,
  StorageConfig,
  StorageCapabilities,
  ConflictResolution
} from './StorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { UserProfileRepository, GameProgressRepository, SettingsRepository } from './Repository';

export class StorageManager {
  private provider: StorageProvider | null = null;
  private config: StorageConfig | null = null;
  private repositories: Map<string, any> = new Map();
  private initialized = false;

  // Repository instances
  public userProfiles!: UserProfileRepository;
  public gameProgress!: GameProgressRepository;
  public settings!: SettingsRepository;

  constructor(private factory: StorageProviderFactory) {}

  /**
   * Initialize storage with configuration
   */
  async initialize(config: StorageConfig): Promise<void> {
    try {
      this.config = config;
      this.provider = await this.factory.createProvider(config);
      await this.provider.initialize();

      // Initialize repositories
      this.userProfiles = new UserProfileRepository(this.provider);
      this.gameProgress = new GameProgressRepository(this.provider);
      this.settings = new SettingsRepository(this.provider);

      this.repositories.set('userProfiles', this.userProfiles);
      this.repositories.set('gameProgress', this.gameProgress);
      this.repositories.set('settings', this.settings);

      this.initialized = true;
      console.log(`Storage initialized with provider: ${this.provider.name}`);
    } catch (error) {
      throw new Error(`Failed to initialize storage: ${error}`);
    }
  }

  /**
   * Switch to a different storage provider at runtime
   */
  async switchProvider(newConfig: StorageConfig, migrateData: boolean = true): Promise<void> {
    this.ensureInitialized();

    try {
      let backupData: any = null;

      // Backup current data if migration is requested
      if (migrateData && this.provider) {
        backupData = await this.provider.backup();
      }

      // Initialize new provider
      const newProvider = await this.factory.createProvider(newConfig);
      await newProvider.initialize();

      // Migrate data if backup exists
      if (backupData && newProvider.capabilities.backup) {
        await newProvider.restore(backupData);
      }

      // Update current provider and repositories
      this.provider = newProvider;
      this.config = newConfig;

      // Reinitialize repositories with new provider
      this.userProfiles = new UserProfileRepository(this.provider);
      this.gameProgress = new GameProgressRepository(this.provider);
      this.settings = new SettingsRepository(this.provider);

      console.log(`Switched to provider: ${this.provider.name}`);
    } catch (error) {
      throw new Error(`Failed to switch provider: ${error}`);
    }
  }

  /**
   * Get current storage information
   */
  async getStorageInfo() {
    this.ensureInitialized();
    return await this.provider!.getStorageInfo();
  }

  /**
   * Perform manual backup
   */
  async backup() {
    this.ensureInitialized();
    
    if (!this.provider!.capabilities.backup) {
      throw new Error('Current provider does not support backup');
    }

    return await this.provider!.backup();
  }

  /**
   * Restore from backup
   */
  async restore(backup: any) {
    this.ensureInitialized();
    
    if (!this.provider!.capabilities.backup) {
      throw new Error('Current provider does not support restore');
    }

    await this.provider!.restore(backup);
    
    // Clear repository caches after restore
    this.clearRepositoryCaches();
  }

  /**
   * Sync with remote storage if supported
   */
  async sync() {
    this.ensureInitialized();
    
    if (!this.provider!.sync) {
      throw new Error('Current provider does not support sync');
    }

    return await this.provider!.sync();
  }

  /**
   * Clear all data
   */
  async clearAll() {
    this.ensureInitialized();
    
    await this.provider!.clear();
    this.clearRepositoryCaches();
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): StorageCapabilities | null {
    return this.provider?.capabilities || null;
  }

  /**
   * Get current configuration
   */
  getConfig(): StorageConfig | null {
    return this.config;
  }

  /**
   * Check if storage is healthy
   */
  async healthCheck(): Promise<StorageHealthStatus> {
    if (!this.initialized || !this.provider) {
      return {
        healthy: false,
        issues: ['Storage not initialized'],
        provider: 'none'
      };
    }

    const issues: string[] = [];

    try {
      // Test basic operations
      const testKey = '__health_check__';
      const testValue = { timestamp: Date.now() };

      await this.provider.setItem(testKey, testValue);
      const retrieved = await this.provider.getItem(testKey);
      await this.provider.removeItem(testKey);

      if (!retrieved || (retrieved as any).timestamp !== testValue.timestamp) {
        issues.push('Basic read/write operations failed');
      }

      // Check storage space
      const info = await this.provider.getStorageInfo();
      const usagePercent = (info.usedSize / info.totalSize) * 100;
      
      if (usagePercent > 90) {
        issues.push('Storage usage above 90%');
      } else if (usagePercent > 75) {
        issues.push('Storage usage above 75%');
      }

      return {
        healthy: issues.length === 0,
        issues,
        provider: this.provider.name,
        storageInfo: info
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [`Health check failed: ${error}`],
        provider: this.provider.name
      };
    }
  }

  /**
   * Get repository by name
   */
  getRepository<T>(name: string): T | null {
    return this.repositories.get(name) || null;
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.provider) {
      throw new Error('StorageManager not initialized. Call initialize() first.');
    }
  }

  private clearRepositoryCaches(): void {
    // Clear caches in all repositories
    for (const repo of this.repositories.values()) {
      if (repo.cache) {
        repo.cache.clear();
      }
    }
  }
}

/**
 * Default storage provider factory
 */
export class DefaultStorageProviderFactory implements StorageProviderFactory {
  async createProvider(config: StorageConfig): Promise<StorageProvider> {
    switch (config.provider) {
      case 'local':
        return new LocalStorageProvider();
      
      // Future providers can be added here
      // case 'cloud':
      //   return new CloudStorageProvider(config);
      // case 'hybrid':
      //   return new HybridStorageProvider(config);
      
      default:
        throw new Error(`Unsupported storage provider: ${config.provider}`);
    }
  }

  getSupportedProviders(): string[] {
    return ['local'];
  }

  getProviderCapabilities(providerName: string): StorageCapabilities {
    switch (providerName) {
      case 'local':
        return {
          encryption: true,
          compression: true,
          cloudSync: false,
          migration: true,
          backup: true,
          ttl: true,
          batchOperations: true
        };
      
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }
  }
}

/**
 * Storage configuration presets
 */
export class StorageConfigPresets {
  static getDefaultConfig(): StorageConfig {
    return {
      provider: 'local',
      encryption: {
        enabled: true,
        algorithm: 'AES-256',
        keyDerivation: 'PBKDF2'
      },
      compression: {
        enabled: true,
        algorithm: 'gzip'
      },
      migration: {
        enabled: true,
        autoMigrate: true
      },
      sync: {
        enabled: false,
        interval: 5 * 60 * 1000, // 5 minutes
        conflictResolution: ConflictResolution.USE_LOCAL
      },
      backup: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000, // 24 hours
        maxBackups: 7
      }
    };
  }

  static getPerformanceConfig(): StorageConfig {
    return {
      ...this.getDefaultConfig(),
      encryption: {
        enabled: false
      },
      compression: {
        enabled: false
      }
    };
  }

  static getSecureConfig(): StorageConfig {
    return {
      ...this.getDefaultConfig(),
      encryption: {
        enabled: true,
        algorithm: 'AES-256',
        keyDerivation: 'PBKDF2'
      },
      backup: {
        enabled: true,
        interval: 12 * 60 * 60 * 1000, // 12 hours
        maxBackups: 14
      }
    };
  }
}

export interface StorageHealthStatus {
  healthy: boolean;
  issues: string[];
  provider: string;
  storageInfo?: any;
}