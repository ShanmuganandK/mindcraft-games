/**
 * Local storage provider implementation using AsyncStorage
 * Supports encryption, compression, and data migration
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  StorageProvider,
  StorageOptions,
  StorageInfo,
  StorageCapabilities,
  StorageBackup,
  SyncResult,
  StoragePriority,
  ConflictResolution
} from './StorageProvider';

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'LocalStorageProvider';
  readonly version = '1.0.0';
  readonly capabilities: StorageCapabilities = {
    encryption: true,
    compression: true,
    cloudSync: false,
    migration: true,
    backup: true,
    ttl: true,
    batchOperations: true
  };

  private initialized = false;
  private encryptionKey?: string;
  private readonly keyPrefix = '@MultiGamePlatform:';
  private readonly metadataKey = '@MultiGamePlatform:metadata';
  private readonly schemaVersion = 1;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize encryption key
      await this.initializeEncryption();
      
      // Check and perform migrations if needed
      await this.checkAndMigrate();
      
      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize LocalStorageProvider: ${error}`);
    }
  }

  async setItem<T>(key: string, value: T, options: StorageOptions = {}): Promise<void> {
    this.ensureInitialized();
    
    try {
      const fullKey = this.getFullKey(key);
      const serializedValue = await this.serializeValue(value, options);
      
      if (options.encrypt && this.encryptionKey) {
        await SecureStore.setItemAsync(fullKey, serializedValue);
      } else {
        await AsyncStorage.setItem(fullKey, serializedValue);
      }

      // Set TTL metadata if specified
      if (options.ttl) {
        await this.setTTL(key, options.ttl);
      }
    } catch (error) {
      throw new Error(`Failed to set item ${key}: ${error}`);
    }
  }

  async getItem<T>(key: string, defaultValue?: T): Promise<T | null> {
    this.ensureInitialized();
    
    try {
      const fullKey = this.getFullKey(key);
      
      // Check TTL first
      if (await this.isExpired(key)) {
        await this.removeItem(key);
        return defaultValue || null;
      }

      let serializedValue: string | null;
      
      // Try secure storage first, then regular storage
      try {
        serializedValue = await SecureStore.getItemAsync(fullKey);
      } catch {
        serializedValue = await AsyncStorage.getItem(fullKey);
      }

      if (serializedValue === null) {
        return defaultValue || null;
      }

      return await this.deserializeValue<T>(serializedValue);
    } catch (error) {
      console.warn(`Failed to get item ${key}:`, error);
      return defaultValue || null;
    }
  }

  async removeItem(key: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      const fullKey = this.getFullKey(key);
      
      // Remove from both storages to be safe
      try {
        await SecureStore.deleteItemAsync(fullKey);
      } catch {
        // Item might not be in secure storage
      }
      
      await AsyncStorage.removeItem(fullKey);
      
      // Remove TTL metadata
      await this.removeTTL(key);
    } catch (error) {
      throw new Error(`Failed to remove item ${key}: ${error}`);
    }
  }

  async clear(): Promise<void> {
    this.ensureInitialized();
    
    try {
      const keys = await this.getAllKeys();
      await this.multiRemove(keys);
    } catch (error) {
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }

  async getAllKeys(): Promise<string[]> {
    this.ensureInitialized();
    
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      return allKeys
        .filter(key => key.startsWith(this.keyPrefix))
        .map(key => key.replace(this.keyPrefix, ''))
        .filter(key => !key.startsWith('ttl:') && key !== 'metadata');
    } catch (error) {
      throw new Error(`Failed to get all keys: ${error}`);
    }
  }

  async hasItem(key: string): Promise<boolean> {
    this.ensureInitialized();
    
    try {
      const value = await this.getItem(key);
      return value !== null;
    } catch {
      return false;
    }
  }

  async getStorageInfo(): Promise<StorageInfo> {
    this.ensureInitialized();
    
    try {
      const keys = await this.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(this.getFullKey(key));
          if (value) {
            totalSize += new Blob([value]).size;
          }
        } catch {
          // Skip failed items
        }
      }

      return {
        totalSize: 100 * 1024 * 1024, // 100MB limit
        usedSize: totalSize,
        availableSize: (100 * 1024 * 1024) - totalSize,
        itemCount: keys.length,
        provider: this.name
      };
    } catch (error) {
      throw new Error(`Failed to get storage info: ${error}`);
    }
  }

  async multiSet(keyValuePairs: Array<[string, any]>, options: StorageOptions = {}): Promise<void> {
    this.ensureInitialized();
    
    try {
      const serializedPairs: Array<[string, string]> = [];
      
      for (const [key, value] of keyValuePairs) {
        const fullKey = this.getFullKey(key);
        const serializedValue = await this.serializeValue(value, options);
        serializedPairs.push([fullKey, serializedValue]);
      }

      if (options.encrypt && this.encryptionKey) {
        // Secure storage doesn't support multiSet, so set individually
        for (const [key, value] of serializedPairs) {
          await SecureStore.setItemAsync(key, value);
        }
      } else {
        await AsyncStorage.multiSet(serializedPairs);
      }
    } catch (error) {
      throw new Error(`Failed to multi set: ${error}`);
    }
  }

  async multiGet(keys: string[]): Promise<Array<[string, any]>> {
    this.ensureInitialized();
    
    try {
      const fullKeys = keys.map(key => this.getFullKey(key));
      const results = await AsyncStorage.multiGet(fullKeys);
      
      const deserializedResults: Array<[string, any]> = [];
      
      for (let i = 0; i < results.length; i++) {
        const [fullKey, serializedValue] = results[i];
        const originalKey = keys[i];
        
        if (serializedValue !== null) {
          try {
            const value = await this.deserializeValue(serializedValue);
            deserializedResults.push([originalKey, value]);
          } catch {
            deserializedResults.push([originalKey, null]);
          }
        } else {
          deserializedResults.push([originalKey, null]);
        }
      }
      
      return deserializedResults;
    } catch (error) {
      throw new Error(`Failed to multi get: ${error}`);
    }
  }

  async multiRemove(keys: string[]): Promise<void> {
    this.ensureInitialized();
    
    try {
      const fullKeys = keys.map(key => this.getFullKey(key));
      await AsyncStorage.multiRemove(fullKeys);
      
      // Remove TTL metadata for all keys
      for (const key of keys) {
        await this.removeTTL(key);
      }
    } catch (error) {
      throw new Error(`Failed to multi remove: ${error}`);
    }
  }

  async migrate(fromVersion: number, toVersion: number): Promise<void> {
    this.ensureInitialized();
    
    try {
      console.log(`Migrating storage from version ${fromVersion} to ${toVersion}`);
      
      // Add migration logic here based on version differences
      if (fromVersion < 1 && toVersion >= 1) {
        // Example migration: add new metadata structure
        await this.setMetadata({ schemaVersion: toVersion, migratedAt: new Date() });
      }
      
      console.log('Storage migration completed successfully');
    } catch (error) {
      throw new Error(`Failed to migrate storage: ${error}`);
    }
  }

  async backup(): Promise<StorageBackup> {
    this.ensureInitialized();
    
    try {
      const keys = await this.getAllKeys();
      const data: Record<string, any> = {};
      
      for (const key of keys) {
        const value = await this.getItem(key);
        if (value !== null) {
          data[key] = value;
        }
      }
      
      const backup: StorageBackup = {
        version: this.version,
        timestamp: new Date(),
        data,
        metadata: {
          provider: this.name,
          schemaVersion: this.schemaVersion,
          checksum: await this.calculateChecksum(data)
        }
      };
      
      return backup;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  async restore(backup: StorageBackup): Promise<void> {
    this.ensureInitialized();
    
    try {
      // Validate backup
      const calculatedChecksum = await this.calculateChecksum(backup.data);
      if (calculatedChecksum !== backup.metadata.checksum) {
        throw new Error('Backup checksum validation failed');
      }
      
      // Clear existing data
      await this.clear();
      
      // Restore data
      const keyValuePairs: Array<[string, any]> = Object.entries(backup.data);
      await this.multiSet(keyValuePairs);
      
      console.log('Storage restored successfully from backup');
    } catch (error) {
      throw new Error(`Failed to restore backup: ${error}`);
    }
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('LocalStorageProvider not initialized. Call initialize() first.');
    }
  }

  private getFullKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private async initializeEncryption(): Promise<void> {
    try {
      // Try to get existing encryption key
      this.encryptionKey = (await SecureStore.getItemAsync('storage_encryption_key')) || undefined;
      
      if (!this.encryptionKey) {
        // Generate new encryption key
        this.encryptionKey = this.generateEncryptionKey();
        await SecureStore.setItemAsync('storage_encryption_key', this.encryptionKey);
      }
    } catch (error) {
      console.warn('Failed to initialize encryption:', error);
      // Continue without encryption
    }
  }

  private generateEncryptionKey(): string {
    // Simple key generation - in production, use proper crypto
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  private async serializeValue(value: any, options: StorageOptions): Promise<string> {
    try {
      let serialized = JSON.stringify({
        value,
        timestamp: Date.now(),
        compressed: options.compress || false
      });

      if (options.compress) {
        // Simple compression - in production, use proper compression library
        serialized = this.compress(serialized);
      }

      return serialized;
    } catch (error) {
      throw new Error(`Failed to serialize value: ${error}`);
    }
  }

  private async deserializeValue<T>(serializedValue: string): Promise<T> {
    try {
      let parsed: any;
      
      // Try to decompress if needed
      try {
        const decompressed = this.decompress(serializedValue);
        parsed = JSON.parse(decompressed);
      } catch {
        parsed = JSON.parse(serializedValue);
      }

      return parsed.value || parsed;
    } catch (error) {
      throw new Error(`Failed to deserialize value: ${error}`);
    }
  }

  private compress(data: string): string {
    // Simple compression placeholder - use proper compression in production
    return data;
  }

  private decompress(data: string): string {
    // Simple decompression placeholder - use proper decompression in production
    return data;
  }

  private async setTTL(key: string, ttl: number): Promise<void> {
    const expiryTime = Date.now() + ttl;
    await AsyncStorage.setItem(this.getFullKey(`ttl:${key}`), expiryTime.toString());
  }

  private async removeTTL(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getFullKey(`ttl:${key}`));
    } catch {
      // TTL might not exist
    }
  }

  private async isExpired(key: string): Promise<boolean> {
    try {
      const expiryTimeStr = await AsyncStorage.getItem(this.getFullKey(`ttl:${key}`));
      if (!expiryTimeStr) return false;
      
      const expiryTime = parseInt(expiryTimeStr, 10);
      return Date.now() > expiryTime;
    } catch {
      return false;
    }
  }

  private async checkAndMigrate(): Promise<void> {
    try {
      const metadata = await this.getMetadata();
      const currentVersion = metadata?.schemaVersion || 0;
      
      if (currentVersion < this.schemaVersion) {
        await this.migrate(currentVersion, this.schemaVersion);
      }
    } catch (error) {
      console.warn('Migration check failed:', error);
    }
  }

  private async getMetadata(): Promise<any> {
    try {
      const metadata = await AsyncStorage.getItem(this.metadataKey);
      return metadata ? JSON.parse(metadata) : null;
    } catch {
      return null;
    }
  }

  private async setMetadata(metadata: any): Promise<void> {
    await AsyncStorage.setItem(this.metadataKey, JSON.stringify(metadata));
  }

  private async calculateChecksum(data: any): Promise<string> {
    // Simple checksum - use proper hashing in production
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }
}