/**
 * Unit tests for LocalStorageProvider
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { LocalStorageProvider } from '../LocalStorageProvider';
import { StorageOptions } from '../StorageProvider';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiSet: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

describe('LocalStorageProvider', () => {
  let provider: LocalStorageProvider;
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
  const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

  beforeEach(async () => {
    jest.clearAllMocks();
    provider = new LocalStorageProvider();
    
    // Mock encryption key retrieval
    mockSecureStore.getItemAsync.mockResolvedValue('test-encryption-key');
    
    await provider.initialize();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      const newProvider = new LocalStorageProvider();
      await expect(newProvider.initialize()).resolves.not.toThrow();
    });

    it('should generate encryption key if none exists', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);
      mockSecureStore.setItemAsync.mockResolvedValueOnce();
      
      const newProvider = new LocalStorageProvider();
      await newProvider.initialize();
      
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'storage_encryption_key',
        expect.any(String)
      );
    });
  });

  describe('basic operations', () => {
    it('should set and get items', async () => {
      const testData = { name: 'test', value: 123 };
      mockAsyncStorage.setItem.mockResolvedValueOnce();
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
        value: testData,
        timestamp: Date.now(),
        compressed: false
      }));

      await provider.setItem('test-key', testData);
      const result = await provider.getItem('test-key');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@MultiGamePlatform:test-key',
        expect.any(String)
      );
      expect(result).toEqual(testData);
    });

    it('should return default value when item not found', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);
      
      const result = await provider.getItem('nonexistent', 'default');
      expect(result).toBe('default');
    });

    it('should remove items', async () => {
      mockAsyncStorage.removeItem.mockResolvedValueOnce();
      mockSecureStore.deleteItemAsync.mockRejectedValueOnce(new Error('Not found'));

      await provider.removeItem('test-key');

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@MultiGamePlatform:test-key');
    });

    it('should check if item exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
        value: 'test',
        timestamp: Date.now(),
        compressed: false
      }));

      const exists = await provider.hasItem('test-key');
      expect(exists).toBe(true);
    });
  });

  describe('encryption', () => {
    it('should use secure storage for encrypted items', async () => {
      const testData = { secret: 'data' };
      const options: StorageOptions = { encrypt: true };
      
      mockSecureStore.setItemAsync.mockResolvedValueOnce();

      await provider.setItem('secret-key', testData, options);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        '@MultiGamePlatform:secret-key',
        expect.any(String)
      );
    });

    it('should retrieve encrypted items from secure storage', async () => {
      const testData = { secret: 'data' };
      mockSecureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify({
        value: testData,
        timestamp: Date.now(),
        compressed: false
      }));

      const result = await provider.getItem('secret-key');
      expect(result).toEqual(testData);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should set TTL metadata', async () => {
      const testData = 'test';
      const options: StorageOptions = { ttl: 5000 }; // 5 seconds
      
      mockAsyncStorage.setItem.mockResolvedValue();

      await provider.setItem('ttl-key', testData, options);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        '@MultiGamePlatform:ttl:ttl-key',
        expect.any(String)
      );
    });

    it('should return null for expired items', async () => {
      // Mock expired TTL
      const expiredTime = (Date.now() - 1000).toString(); // 1 second ago
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(expiredTime) // TTL check
        .mockResolvedValueOnce(null); // Remove item call

      mockAsyncStorage.removeItem.mockResolvedValueOnce();

      const result = await provider.getItem('expired-key');
      expect(result).toBeNull();
    });
  });

  describe('batch operations', () => {
    it('should perform multiSet', async () => {
      const keyValuePairs: Array<[string, any]> = [
        ['key1', 'value1'],
        ['key2', { data: 'value2' }]
      ];
      
      mockAsyncStorage.multiSet.mockResolvedValueOnce();

      await provider.multiSet(keyValuePairs);

      expect(mockAsyncStorage.multiSet).toHaveBeenCalledWith(
        expect.arrayContaining([
          ['@MultiGamePlatform:key1', expect.any(String)],
          ['@MultiGamePlatform:key2', expect.any(String)]
        ])
      );
    });

    it('should perform multiGet', async () => {
      const keys = ['key1', 'key2'];
      mockAsyncStorage.multiGet.mockResolvedValueOnce([
        ['@MultiGamePlatform:key1', JSON.stringify({ value: 'value1', timestamp: Date.now(), compressed: false })],
        ['@MultiGamePlatform:key2', JSON.stringify({ value: 'value2', timestamp: Date.now(), compressed: false })]
      ]);

      const results = await provider.multiGet(keys);

      expect(results).toEqual([
        ['key1', 'value1'],
        ['key2', 'value2']
      ]);
    });

    it('should perform multiRemove', async () => {
      const keys = ['key1', 'key2'];
      mockAsyncStorage.multiRemove.mockResolvedValueOnce();

      await provider.multiRemove(keys);

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        '@MultiGamePlatform:key1',
        '@MultiGamePlatform:key2'
      ]);
    });
  });

  describe('storage info', () => {
    it('should return storage information', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValueOnce([
        '@MultiGamePlatform:key1',
        '@MultiGamePlatform:key2'
      ]);
      mockAsyncStorage.getItem.mockResolvedValue('test data');

      const info = await provider.getStorageInfo();

      expect(info).toEqual({
        totalSize: 100 * 1024 * 1024, // 100MB
        usedSize: expect.any(Number),
        availableSize: expect.any(Number),
        itemCount: 2,
        provider: 'LocalStorageProvider'
      });
    });
  });

  describe('backup and restore', () => {
    it('should create backup', async () => {
      mockAsyncStorage.getAllKeys.mockResolvedValueOnce([
        '@MultiGamePlatform:key1',
        '@MultiGamePlatform:key2'
      ]);
      mockAsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify({ value: 'value1', timestamp: Date.now(), compressed: false }))
        .mockResolvedValueOnce(JSON.stringify({ value: 'value2', timestamp: Date.now(), compressed: false }));

      const backup = await provider.backup();

      expect(backup).toEqual({
        version: '1.0.0',
        timestamp: expect.any(Date),
        data: {
          key1: 'value1',
          key2: 'value2'
        },
        metadata: {
          provider: 'LocalStorageProvider',
          schemaVersion: 1,
          checksum: expect.any(String)
        }
      });
    });

    it('should restore from backup', async () => {
      const backup = {
        version: '1.0.0',
        timestamp: new Date(),
        data: {
          key1: 'value1',
          key2: 'value2'
        },
        metadata: {
          provider: 'LocalStorageProvider',
          schemaVersion: 1,
          checksum: '123456'
        }
      };

      // Mock checksum validation
      jest.spyOn(provider as any, 'calculateChecksum').mockResolvedValue('123456');
      
      mockAsyncStorage.getAllKeys.mockResolvedValueOnce([]);
      mockAsyncStorage.multiSet.mockResolvedValueOnce();

      await provider.restore(backup);

      expect(mockAsyncStorage.multiSet).toHaveBeenCalled();
    });
  });

  describe('migration', () => {
    it('should perform migration', async () => {
      mockAsyncStorage.setItem.mockResolvedValueOnce();

      await provider.migrate(0, 1);

      // Migration should complete without errors
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      const result = await provider.getItem('error-key', 'default');
      expect(result).toBe('default');
    });

    it('should throw error on setItem failure', async () => {
      mockAsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage full'));

      await expect(provider.setItem('key', 'value')).rejects.toThrow('Failed to set item key');
    });
  });

  describe('capabilities', () => {
    it('should report correct capabilities', () => {
      expect(provider.capabilities).toEqual({
        encryption: true,
        compression: true,
        cloudSync: false,
        migration: true,
        backup: true,
        ttl: true,
        batchOperations: true
      });
    });
  });
});