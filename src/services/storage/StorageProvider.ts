/**
 * Abstract storage provider interface for the Multi-Game Platform
 * Supports multiple backends (local, cloud, hybrid) with encryption and migration
 */

export interface StorageProvider {
  /**
   * Initialize the storage provider
   */
  initialize(): Promise<void>;

  /**
   * Store data with optional encryption
   */
  setItem<T>(key: string, value: T, options?: StorageOptions): Promise<void>;

  /**
   * Retrieve data with automatic decryption
   */
  getItem<T>(key: string, defaultValue?: T): Promise<T | null>;

  /**
   * Remove data by key
   */
  removeItem(key: string): Promise<void>;

  /**
   * Clear all data (use with caution)
   */
  clear(): Promise<void>;

  /**
   * Get all keys in storage
   */
  getAllKeys(): Promise<string[]>;

  /**
   * Check if a key exists
   */
  hasItem(key: string): Promise<boolean>;

  /**
   * Get storage size information
   */
  getStorageInfo(): Promise<StorageInfo>;

  /**
   * Batch operations for efficiency
   */
  multiSet(keyValuePairs: Array<[string, any]>, options?: StorageOptions): Promise<void>;
  multiGet(keys: string[]): Promise<Array<[string, any]>>;
  multiRemove(keys: string[]): Promise<void>;

  /**
   * Migration support
   */
  migrate(fromVersion: number, toVersion: number): Promise<void>;

  /**
   * Backup and restore
   */
  backup(): Promise<StorageBackup>;
  restore(backup: StorageBackup): Promise<void>;

  /**
   * Sync with remote storage (if supported)
   */
  sync?(): Promise<SyncResult>;

  /**
   * Provider metadata
   */
  readonly name: string;
  readonly version: string;
  readonly capabilities: StorageCapabilities;
}

export interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  ttl?: number; // Time to live in milliseconds
  priority?: StoragePriority;
  syncToCloud?: boolean;
}

export interface StorageInfo {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  itemCount: number;
  provider: string;
}

export interface StorageCapabilities {
  encryption: boolean;
  compression: boolean;
  cloudSync: boolean;
  migration: boolean;
  backup: boolean;
  ttl: boolean;
  batchOperations: boolean;
}

export interface StorageBackup {
  version: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata: {
    provider: string;
    schemaVersion: number;
    checksum: string;
  };
}

export interface SyncResult {
  success: boolean;
  conflicts?: SyncConflict[];
  syncedKeys: string[];
  errors?: SyncError[];
}

export interface SyncConflict {
  key: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: Date;
  remoteTimestamp: Date;
  resolution?: ConflictResolution;
}

export interface SyncError {
  key: string;
  error: string;
  code: string;
  recoverable: boolean;
}

export enum StoragePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ConflictResolution {
  USE_LOCAL = 'use_local',
  USE_REMOTE = 'use_remote',
  MERGE = 'merge',
  MANUAL = 'manual'
}

export interface StorageConfig {
  provider: string;
  encryption: {
    enabled: boolean;
    algorithm?: string;
    keyDerivation?: string;
  };
  compression: {
    enabled: boolean;
    algorithm?: string;
  };
  migration: {
    enabled: boolean;
    autoMigrate: boolean;
  };
  sync: {
    enabled: boolean;
    interval?: number;
    conflictResolution: ConflictResolution;
  };
  backup: {
    enabled: boolean;
    interval?: number;
    maxBackups?: number;
  };
}

/**
 * Storage provider factory interface
 */
export interface StorageProviderFactory {
  createProvider(config: StorageConfig): Promise<StorageProvider>;
  getSupportedProviders(): string[];
  getProviderCapabilities(providerName: string): StorageCapabilities;
}