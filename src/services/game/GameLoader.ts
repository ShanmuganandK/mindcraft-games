/**
 * Game Loader - Handles dynamic loading and management of game modules
 */

import { GameModule, GameState, GameLifecycleEvent } from '../../types/game';
import { GameRegistry } from './GameRegistry';
import { GameLifecycleManager } from './GameLifecycleManager';

export interface GameLoaderConfig {
  enableHotReload: boolean;
  maxConcurrentGames: number;
  preloadGames: string[];
  cacheSize: number;
}

export interface LoadedGameModule {
  module: GameModule;
  loadedAt: Date;
  lastAccessed: Date;
  isActive: boolean;
  state?: GameState;
}

export class GameLoader {
  private registry: GameRegistry;
  private lifecycleManager: GameLifecycleManager;
  private loadedGames: Map<string, LoadedGameModule> = new Map();
  private config: GameLoaderConfig;
  private eventListeners: Map<string, ((event: GameLifecycleEvent) => void)[]> = new Map();

  constructor(
    registry: GameRegistry,
    lifecycleManager: GameLifecycleManager,
    config: GameLoaderConfig
  ) {
    this.registry = registry;
    this.lifecycleManager = lifecycleManager;
    this.config = config;
    
    // Set up lifecycle event forwarding
    this.lifecycleManager.on('*', (event) => {
      this.notifyEventListeners(event.type, event);
    });
  }

  /**
   * Load a game module by ID
   */
  async loadGame(gameId: string): Promise<GameModule> {
    try {
      // Check if already loaded
      const loaded = this.loadedGames.get(gameId);
      if (loaded) {
        loaded.lastAccessed = new Date();
        return loaded.module;
      }

      // Check cache size and cleanup if needed
      await this.cleanupCache();

      // Get game definition from registry
      const gameDefinition = await this.registry.getGame(gameId);
      if (!gameDefinition) {
        throw new Error(`Game not found: ${gameId}`);
      }

      // Load the game module
      const module = await this.loadGameModule(gameDefinition);
      
      // Store in cache
      const loadedModule: LoadedGameModule = {
        module,
        loadedAt: new Date(),
        lastAccessed: new Date(),
        isActive: false,
      };
      
      this.loadedGames.set(gameId, loadedModule);

      // Notify lifecycle manager
      await this.lifecycleManager.onGameLoaded(gameId, module);

      return module;
    } catch (error) {
      console.error(`Failed to load game ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Unload a game module
   */
  async unloadGame(gameId: string): Promise<void> {
    const loaded = this.loadedGames.get(gameId);
    if (!loaded) {
      return;
    }

    try {
      // Notify lifecycle manager
      await this.lifecycleManager.onGameUnloading(gameId, loaded.module);

      // Remove from cache
      this.loadedGames.delete(gameId);

      // Notify lifecycle manager
      await this.lifecycleManager.onGameUnloaded(gameId);
    } catch (error) {
      console.error(`Failed to unload game ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Initialize a loaded game for play
   */
  async initializeGame(gameId: string, initialState?: Partial<GameState>): Promise<GameState> {
    const loaded = this.loadedGames.get(gameId);
    if (!loaded) {
      throw new Error(`Game not loaded: ${gameId}`);
    }

    try {
      loaded.isActive = true;
      loaded.lastAccessed = new Date();

      // Initialize game state
      const gameState = await this.lifecycleManager.onGameInitializing(
        gameId, 
        loaded.module, 
        initialState
      );

      loaded.state = gameState;

      // Notify initialization complete
      await this.lifecycleManager.onGameInitialized(gameId, gameState);

      return gameState;
    } catch (error) {
      console.error(`Failed to initialize game ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Start a game session
   */
  async startGame(gameId: string): Promise<void> {
    const loaded = this.loadedGames.get(gameId);
    if (!loaded || !loaded.state) {
      throw new Error(`Game not initialized: ${gameId}`);
    }

    try {
      await this.lifecycleManager.onGameStarting(gameId, loaded.state);
      await this.lifecycleManager.onGameStarted(gameId, loaded.state);
    } catch (error) {
      console.error(`Failed to start game ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Pause a game session
   */
  async pauseGame(gameId: string): Promise<void> {
    const loaded = this.loadedGames.get(gameId);
    if (!loaded || !loaded.state) {
      throw new Error(`Game not active: ${gameId}`);
    }

    try {
      await this.lifecycleManager.onGamePausing(gameId, loaded.state);
      await this.lifecycleManager.onGamePaused(gameId, loaded.state);
    } catch (error) {
      console.error(`Failed to pause game ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Resume a paused game
   */
  async resumeGame(gameId: string): Promise<void> {
    const loaded = this.loadedGames.get(gameId);
    if (!loaded || !loaded.state) {
      throw new Error(`Game not active: ${gameId}`);
    }

    try {
      await this.lifecycleManager.onGameResuming(gameId, loaded.state);
      await this.lifecycleManager.onGameResumed(gameId, loaded.state);
    } catch (error) {
      console.error(`Failed to resume game ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * End a game session
   */
  async endGame(gameId: string, finalScore: number, stats: any): Promise<void> {
    const loaded = this.loadedGames.get(gameId);
    if (!loaded || !loaded.state) {
      throw new Error(`Game not active: ${gameId}`);
    }

    try {
      await this.lifecycleManager.onGameEnding(gameId, loaded.state, finalScore, stats);
      
      loaded.isActive = false;
      loaded.state = undefined;
      
      await this.lifecycleManager.onGameEnded(gameId, finalScore, stats);
    } catch (error) {
      console.error(`Failed to end game ${gameId}:`, error);
      throw error;
    }
  }

  /**
   * Get current game state
   */
  getGameState(gameId: string): GameState | undefined {
    const loaded = this.loadedGames.get(gameId);
    return loaded?.state;
  }

  /**
   * Update game state
   */
  updateGameState(gameId: string, stateUpdate: Partial<GameState>): void {
    const loaded = this.loadedGames.get(gameId);
    if (loaded && loaded.state) {
      loaded.state = { ...loaded.state, ...stateUpdate };
      loaded.lastAccessed = new Date();
    }
  }

  /**
   * Check if a game is loaded
   */
  isGameLoaded(gameId: string): boolean {
    return this.loadedGames.has(gameId);
  }

  /**
   * Check if a game is active
   */
  isGameActive(gameId: string): boolean {
    const loaded = this.loadedGames.get(gameId);
    return loaded?.isActive ?? false;
  }

  /**
   * Get list of loaded games
   */
  getLoadedGames(): string[] {
    return Array.from(this.loadedGames.keys());
  }

  /**
   * Get list of active games
   */
  getActiveGames(): string[] {
    return Array.from(this.loadedGames.entries())
      .filter(([_, loaded]) => loaded.isActive)
      .map(([gameId]) => gameId);
  }

  /**
   * Preload specified games
   */
  async preloadGames(): Promise<void> {
    const preloadPromises = this.config.preloadGames.map(gameId => 
      this.loadGame(gameId).catch(error => 
        console.warn(`Failed to preload game ${gameId}:`, error)
      )
    );
    
    await Promise.allSettled(preloadPromises);
  }

  /**
   * Add event listener for game lifecycle events
   */
  on(eventType: string, listener: (event: GameLifecycleEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(eventType: string, listener: (event: GameLifecycleEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Hot reload a game module (development only)
   */
  async hotReloadGame(gameId: string): Promise<void> {
    if (!this.config.enableHotReload) {
      throw new Error('Hot reload is disabled');
    }

    const wasActive = this.isGameActive(gameId);
    const currentState = this.getGameState(gameId);

    // Unload current version
    await this.unloadGame(gameId);

    // Reload from registry
    const newModule = await this.loadGame(gameId);

    // Restore state if game was active
    if (wasActive && currentState) {
      await this.initializeGame(gameId, currentState);
    }

    console.log(`Hot reloaded game: ${gameId}`);
  }

  /**
   * Clean up cache based on LRU policy
   */
  private async cleanupCache(): Promise<void> {
    if (this.loadedGames.size < this.config.cacheSize) {
      return;
    }

    // Sort by last accessed time (oldest first)
    const sortedGames = Array.from(this.loadedGames.entries())
      .filter(([_, loaded]) => !loaded.isActive) // Don't unload active games
      .sort(([_, a], [__, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

    // Unload oldest games until we're under the cache size
    const gamesToUnload = sortedGames.slice(0, sortedGames.length - this.config.cacheSize + 1);
    
    for (const [gameId] of gamesToUnload) {
      await this.unloadGame(gameId);
    }
  }

  /**
   * Load game module from definition
   */
  private async loadGameModule(gameDefinition: any): Promise<GameModule> {
    // In a real implementation, this would dynamically import the game module
    // For now, we'll simulate the loading process
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Create game module from definition
    const module: GameModule = {
      id: gameDefinition.id,
      metadata: gameDefinition.metadata,
      component: gameDefinition.component,
      achievements: gameDefinition.achievements || [],
      leaderboardConfig: gameDefinition.leaderboardConfig,
      isEnabled: gameDefinition.isEnabled ?? true,
      version: gameDefinition.version || '1.0.0',
    };

    return module;
  }

  /**
   * Notify event listeners
   */
  private notifyEventListeners(eventType: string, event: GameLifecycleEvent): void {
    // Notify specific event listeners
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in event listener for ${eventType}:`, error);
      }
    });

    // Notify wildcard listeners
    const wildcardListeners = this.eventListeners.get('*') || [];
    wildcardListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in wildcard event listener:`, error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Unload all games
    const gameIds = Array.from(this.loadedGames.keys());
    for (const gameId of gameIds) {
      await this.unloadGame(gameId);
    }

    // Clear event listeners
    this.eventListeners.clear();
  }
}