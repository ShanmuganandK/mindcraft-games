/**
 * Repository pattern implementation for data access layer
 * Provides abstraction over storage providers with caching and validation
 */

import { StorageProvider } from './StorageProvider';
import { validateUserProfile, validateGameProgress } from '../../utils/validation';
import { UserProfile, GameProgress } from '../../types';

export interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  update(id: string, entity: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

export abstract class BaseRepository<T> implements Repository<T> {
  protected cache = new Map<string, { data: T; timestamp: number }>();
  protected readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(
    protected storage: StorageProvider,
    protected keyPrefix: string
  ) {}

  async findById(id: string): Promise<T | null> {
    // Check cache first
    const cached = this.getCachedItem(id);
    if (cached) return cached;

    try {
      const key = this.getKey(id);
      const entity = await this.storage.getItem<T>(key);
      
      if (entity && this.validateEntity(entity)) {
        this.setCachedItem(id, entity);
        return entity;
      }
      
      return null;
    } catch (error) {
      console.warn(`Failed to find entity by id ${id}:`, error);
      return null;
    }
  }

  async findAll(): Promise<T[]> {
    try {
      const keys = await this.storage.getAllKeys();
      const entityKeys = keys.filter(key => key.startsWith(this.keyPrefix));
      
      const entities: T[] = [];
      
      for (const key of entityKeys) {
        const id = key.replace(this.keyPrefix, '');
        const entity = await this.findById(id);
        if (entity) {
          entities.push(entity);
        }
      }
      
      return entities;
    } catch (error) {
      console.warn('Failed to find all entities:', error);
      return [];
    }
  }

  async save(entity: T): Promise<void> {
    if (!this.validateEntity(entity)) {
      throw new Error('Invalid entity data');
    }

    try {
      const id = this.getEntityId(entity);
      const key = this.getKey(id);
      
      await this.storage.setItem(key, entity, {
        encrypt: this.shouldEncrypt(),
        compress: true
      });
      
      this.setCachedItem(id, entity);
    } catch (error) {
      throw new Error(`Failed to save entity: ${error}`);
    }
  }

  async update(id: string, updates: Partial<T>): Promise<void> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error(`Entity with id ${id} not found`);
      }

      const updated = { ...existing, ...updates };
      
      if (!this.validateEntity(updated)) {
        throw new Error('Invalid updated entity data');
      }

      await this.save(updated);
    } catch (error) {
      throw new Error(`Failed to update entity: ${error}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const key = this.getKey(id);
      await this.storage.removeItem(key);
      this.cache.delete(id);
    } catch (error) {
      throw new Error(`Failed to delete entity: ${error}`);
    }
  }

  async exists(id: string): Promise<boolean> {
    try {
      const entity = await this.findById(id);
      return entity !== null;
    } catch {
      return false;
    }
  }

  async count(): Promise<number> {
    try {
      const entities = await this.findAll();
      return entities.length;
    } catch {
      return 0;
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.storage.getAllKeys();
      const entityKeys = keys.filter(key => key.startsWith(this.keyPrefix));
      
      if (entityKeys.length > 0) {
        await this.storage.multiRemove(entityKeys);
      }
      
      this.cache.clear();
    } catch (error) {
      throw new Error(`Failed to clear repository: ${error}`);
    }
  }

  // Protected methods to be implemented by subclasses
  protected abstract getEntityId(entity: T): string;
  protected abstract validateEntity(entity: T): boolean;
  protected abstract shouldEncrypt(): boolean;

  // Private helper methods
  private getKey(id: string): string {
    return `${this.keyPrefix}${id}`;
  }

  private getCachedItem(id: string): T | null {
    const cached = this.cache.get(id);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
    if (isExpired) {
      this.cache.delete(id);
      return null;
    }

    return cached.data;
  }

  private setCachedItem(id: string, data: T): void {
    this.cache.set(id, {
      data,
      timestamp: Date.now()
    });
  }
}

/**
 * User profile repository
 */
export class UserProfileRepository extends BaseRepository<UserProfile> {
  constructor(storage: StorageProvider) {
    super(storage, 'user_profile:');
  }

  protected getEntityId(entity: UserProfile): string {
    return entity.id;
  }

  protected validateEntity(entity: UserProfile): boolean {
    return validateUserProfile(entity);
  }

  protected shouldEncrypt(): boolean {
    return true; // User profiles contain sensitive data
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const users = await this.findAll();
      return users.find(user => user.lastActive) || users[0] || null;
    } catch {
      return null;
    }
  }

  async updateLastActive(userId: string): Promise<void> {
    await this.update(userId, { lastActive: new Date() } as Partial<UserProfile>);
  }
}

/**
 * Game progress repository
 */
export class GameProgressRepository extends BaseRepository<GameProgress> {
  constructor(storage: StorageProvider) {
    super(storage, 'game_progress:');
  }

  protected getEntityId(entity: GameProgress): string {
    return entity.gameId;
  }

  protected validateEntity(entity: GameProgress): boolean {
    return validateGameProgress(entity);
  }

  protected shouldEncrypt(): boolean {
    return false; // Game progress is not sensitive
  }

  async findByGameId(gameId: string): Promise<GameProgress | null> {
    return this.findById(gameId);
  }

  async updateScore(gameId: string, score: number): Promise<void> {
    const existing = await this.findById(gameId);
    
    if (existing) {
      const updates: Partial<GameProgress> = {
        highScore: Math.max(existing.highScore, score),
        totalPlays: existing.totalPlays + 1,
        lastPlayed: new Date()
      };
      
      // Update average score
      const totalScore = (existing.averageScore * existing.totalPlays) + score;
      updates.averageScore = totalScore / updates.totalPlays!;
      
      await this.update(gameId, updates);
    } else {
      // Create new progress record
      const newProgress: GameProgress = {
        gameId,
        highScore: score,
        totalPlays: 1,
        totalTime: 0,
        averageScore: score,
        achievements: [],
        statistics: {
          gamesCompleted: 1,
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
        },
        lastPlayed: new Date(),
        unlockedFeatures: []
      };
      
      await this.save(newProgress);
    }
  }

  async getTopScores(limit: number = 10): Promise<Array<{ gameId: string; score: number }>> {
    try {
      const allProgress = await this.findAll();
      return allProgress
        .map(progress => ({ gameId: progress.gameId, score: progress.highScore }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch {
      return [];
    }
  }
}

/**
 * Generic settings repository
 */
export class SettingsRepository extends BaseRepository<Record<string, any>> {
  constructor(storage: StorageProvider) {
    super(storage, 'settings:');
  }

  protected getEntityId(entity: Record<string, any>): string {
    return entity.key || 'default';
  }

  protected validateEntity(entity: Record<string, any>): boolean {
    return typeof entity === 'object' && entity !== null;
  }

  protected shouldEncrypt(): boolean {
    return false;
  }

  async getSetting<T>(key: string, defaultValue?: T): Promise<T | null> {
    const setting = await this.findById(key);
    return setting?.value ?? defaultValue ?? null;
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    await this.save({ key, value });
  }

  async removeSetting(key: string): Promise<void> {
    await this.delete(key);
  }
}