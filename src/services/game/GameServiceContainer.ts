/**
 * Game Service Container - Dependency injection container for game services
 */

import { StorageManager } from '../storage/StorageManager';
import { GameAnalyticsTracker } from '../../types/game';

export interface GameServices {
  storage: StorageManager;
  analytics: GameAnalyticsTracker;
  logger: GameLogger;
  config: GameConfig;
}

export interface GameLogger {
  debug: (message: string, context?: any) => void;
  info: (message: string, context?: any) => void;
  warn: (message: string, context?: any) => void;
  error: (message: string, error?: Error, context?: any) => void;
}

export interface GameConfig {
  get: (key: string, defaultValue?: any) => any;
  set: (key: string, value: any) => void;
  has: (key: string) => boolean;
  getAll: () => Record<string, any>;
}

export class GameServiceContainer {
  private services: Map<string, any> = new Map();
  private singletons: Map<string, any> = new Map();
  private factories: Map<string, () => any> = new Map();

  constructor() {
    this.registerDefaultServices();
  }

  /**
   * Register a service instance
   */
  register<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  /**
   * Register a transient service (new instance each time)
   */
  registerTransient<T>(name: string, factory: () => T): void {
    this.services.set(name, factory);
  }

  /**
   * Get a service by name
   */
  get<T>(name: string): T {
    // Check for direct instance
    if (this.services.has(name)) {
      const service = this.services.get(name);
      // If it's a factory function, call it
      if (typeof service === 'function') {
        return service();
      }
      return service;
    }

    // Check for singleton
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Check for singleton factory
    if (this.factories.has(name)) {
      const factory = this.factories.get(name)!;
      const instance = factory();
      this.singletons.set(name, instance);
      return instance;
    }

    throw new Error(`Service not found: ${name}`);
  }

  /**
   * Check if service exists
   */
  has(name: string): boolean {
    return this.services.has(name) || this.singletons.has(name) || this.factories.has(name);
  }

  /**
   * Get storage service
   */
  getStorage(): StorageManager {
    return this.get<StorageManager>('storage');
  }

  /**
   * Get analytics service
   */
  getAnalytics(): GameAnalyticsTracker {
    return this.get<GameAnalyticsTracker>('analytics');
  }

  /**
   * Get logger service
   */
  getLogger(): GameLogger {
    return this.get<GameLogger>('logger');
  }

  /**
   * Get config service
   */
  getConfig(): GameConfig {
    return this.get<GameConfig>('config');
  }

  /**
   * Create a scoped container for a specific game
   */
  createScope(gameId: string): GameServiceContainer {
    const scopedContainer = new GameServiceContainer();
    
    // Copy all services to scoped container
    this.services.forEach((service, name) => {
      scopedContainer.register(name, service);
    });
    
    this.factories.forEach((factory, name) => {
      scopedContainer.registerSingleton(name, factory);
    });

    // Add game-specific services
    scopedContainer.register('gameId', gameId);
    
    return scopedContainer;
  }

  /**
   * Register default services
   */
  private registerDefaultServices(): void {
    // Register default logger
    this.registerSingleton<GameLogger>('logger', () => ({
      debug: (message: string, context?: any) => {
        if (__DEV__) {
          console.debug(`[Game Debug] ${message}`, context);
        }
      },
      info: (message: string, context?: any) => {
        console.info(`[Game Info] ${message}`, context);
      },
      warn: (message: string, context?: any) => {
        console.warn(`[Game Warning] ${message}`, context);
      },
      error: (message: string, error?: Error, context?: any) => {
        console.error(`[Game Error] ${message}`, error, context);
      },
    }));

    // Register default config
    this.registerSingleton<GameConfig>('config', () => {
      const config = new Map<string, any>();
      
      return {
        get: (key: string, defaultValue?: any) => config.get(key) ?? defaultValue,
        set: (key: string, value: any) => config.set(key, value),
        has: (key: string) => config.has(key),
        getAll: () => Object.fromEntries(config.entries()),
      };
    });
  }

  /**
   * Cleanup all services
   */
  async cleanup(): Promise<void> {
    // Cleanup singletons that have cleanup methods
    for (const [name, instance] of this.singletons.entries()) {
      if (instance && typeof instance.cleanup === 'function') {
        try {
          await instance.cleanup();
        } catch (error) {
          console.error(`Error cleaning up service ${name}:`, error);
        }
      }
    }

    // Clear all services
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
  }
}