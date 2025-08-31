/**
 * Game Registry - Manages game discovery, registration, and metadata
 */

import { GameModule, GameMetadata } from '../../types/game';

export interface GameDefinition {
  id: string;
  metadata: GameMetadata;
  component: React.ComponentType<any>;
  achievements: any[];
  leaderboardConfig: any;
  isEnabled: boolean;
  version: string;
  dependencies?: string[];
  loadPath?: string;
  hotReloadable?: boolean;
}

export interface RegistryConfig {
  enableDynamicDiscovery: boolean;
  gameDirectories: string[];
  allowHotReload: boolean;
  validateGames: boolean;
}

export class GameRegistry {
  private games: Map<string, GameDefinition> = new Map();
  private config: RegistryConfig;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor(config: RegistryConfig) {
    this.config = config;
  }

  /**
   * Initialize the registry
   */
  async initialize(): Promise<void> {
    if (this.config.enableDynamicDiscovery) {
      await this.discoverGames();
    }
    
    this.emit('initialized', { gameCount: this.games.size });
  }

  /**
   * Register a game manually
   */
  registerGame(definition: GameDefinition): void {
    if (this.config.validateGames) {
      this.validateGameDefinition(definition);
    }

    this.games.set(definition.id, definition);
    this.emit('gameRegistered', { gameId: definition.id, definition });
  }

  /**
   * Unregister a game
   */
  unregisterGame(gameId: string): boolean {
    const existed = this.games.delete(gameId);
    if (existed) {
      this.emit('gameUnregistered', { gameId });
    }
    return existed;
  }

  /**
   * Get a game definition by ID
   */
  async getGame(gameId: string): Promise<GameDefinition | null> {
    const definition = this.games.get(gameId);
    return definition || null;
  }

  /**
   * Get all registered games
   */
  getAllGames(): GameDefinition[] {
    return Array.from(this.games.values());
  }

  /**
   * Get enabled games only
   */
  getEnabledGames(): GameDefinition[] {
    return Array.from(this.games.values()).filter(game => game.isEnabled);
  }

  /**
   * Get games by category
   */
  getGamesByCategory(category: string): GameDefinition[] {
    return Array.from(this.games.values())
      .filter(game => game.metadata.category === category);
  }

  /**
   * Search games by criteria
   */
  searchGames(criteria: {
    query?: string;
    category?: string;
    difficulty?: string;
    tags?: string[];
    minAge?: number;
    maxAge?: number;
  }): GameDefinition[] {
    return Array.from(this.games.values()).filter(game => {
      // Text search
      if (criteria.query) {
        const query = criteria.query.toLowerCase();
        const searchText = `${game.metadata.title} ${game.metadata.description} ${game.metadata.tags.join(' ')}`.toLowerCase();
        if (!searchText.includes(query)) {
          return false;
        }
      }

      // Category filter
      if (criteria.category && game.metadata.category !== criteria.category) {
        return false;
      }

      // Difficulty filter
      if (criteria.difficulty && game.metadata.difficulty !== criteria.difficulty) {
        return false;
      }

      // Tags filter
      if (criteria.tags && criteria.tags.length > 0) {
        const hasAllTags = criteria.tags.every(tag => 
          game.metadata.tags.includes(tag)
        );
        if (!hasAllTags) {
          return false;
        }
      }

      // Age range filter
      if (criteria.minAge && game.metadata.minAge < criteria.minAge) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if a game exists
   */
  hasGame(gameId: string): boolean {
    return this.games.has(gameId);
  }

  /**
   * Enable/disable a game
   */
  setGameEnabled(gameId: string, enabled: boolean): boolean {
    const game = this.games.get(gameId);
    if (game) {
      game.isEnabled = enabled;
      this.emit('gameStatusChanged', { gameId, enabled });
      return true;
    }
    return false;
  }

  /**
   * Update game metadata
   */
  updateGameMetadata(gameId: string, metadata: Partial<GameMetadata>): boolean {
    const game = this.games.get(gameId);
    if (game) {
      game.metadata = { ...game.metadata, ...metadata };
      this.emit('gameMetadataUpdated', { gameId, metadata });
      return true;
    }
    return false;
  }

  /**
   * Get game statistics
   */
  getRegistryStats(): {
    totalGames: number;
    enabledGames: number;
    disabledGames: number;
    categoryCounts: Record<string, number>;
    difficultyDistribution: Record<string, number>;
  } {
    const games = Array.from(this.games.values());
    
    const categoryCounts: Record<string, number> = {};
    const difficultyDistribution: Record<string, number> = {};
    
    games.forEach(game => {
      // Count categories
      const category = game.metadata.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      
      // Count difficulties
      const difficulty = game.metadata.difficulty;
      difficultyDistribution[difficulty] = (difficultyDistribution[difficulty] || 0) + 1;
    });

    return {
      totalGames: games.length,
      enabledGames: games.filter(g => g.isEnabled).length,
      disabledGames: games.filter(g => !g.isEnabled).length,
      categoryCounts,
      difficultyDistribution,
    };
  }

  /**
   * Validate game dependencies
   */
  validateDependencies(gameId: string): { valid: boolean; missingDependencies: string[] } {
    const game = this.games.get(gameId);
    if (!game || !game.dependencies) {
      return { valid: true, missingDependencies: [] };
    }

    const missingDependencies = game.dependencies.filter(depId => !this.games.has(depId));
    
    return {
      valid: missingDependencies.length === 0,
      missingDependencies,
    };
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    
    this.games.forEach((game, gameId) => {
      graph[gameId] = game.dependencies || [];
    });
    
    return graph;
  }

  /**
   * Reload game registry (for hot reload)
   */
  async reload(): Promise<void> {
    if (!this.config.allowHotReload) {
      throw new Error('Hot reload is disabled');
    }

    const oldGames = new Map(this.games);
    this.games.clear();
    
    try {
      await this.discoverGames();
      this.emit('registryReloaded', { 
        oldCount: oldGames.size, 
        newCount: this.games.size 
      });
    } catch (error) {
      // Restore old games on error
      this.games = oldGames;
      throw error;
    }
  }

  /**
   * Export registry data
   */
  export(): any {
    return {
      games: Array.from(this.games.entries()).map(([id, definition]) => ({
        id,
        ...definition,
      })),
      config: this.config,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Import registry data
   */
  import(data: any): void {
    if (!data.games || !Array.isArray(data.games)) {
      throw new Error('Invalid registry data format');
    }

    this.games.clear();
    
    data.games.forEach((gameData: any) => {
      const { id, ...definition } = gameData;
      this.games.set(id, definition);
    });

    this.emit('registryImported', { gameCount: this.games.size });
  }

  /**
   * Add event listener
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in registry event listener for ${event}:`, error);
      }
    });
  }

  /**
   * Discover games dynamically
   */
  private async discoverGames(): Promise<void> {
    // In a real implementation, this would scan directories for game modules
    // For now, we'll register some default games
    
    const defaultGames: GameDefinition[] = [
      {
        id: 'tic-tac-toe',
        metadata: {
          title: 'Tic Tac Toe',
          description: 'Classic strategy game for two players',
          shortDescription: 'Classic strategy game',
          iconUrl: '',
          thumbnailUrl: '',
          category: 'strategy',
          difficulty: 'easy',
          estimatedPlayTime: 5,
          minAge: 4,
          maxPlayers: 2,
          tags: ['strategy', 'classic', 'multiplayer'],
          accessibility: {
            screenReaderSupport: true,
            colorBlindFriendly: true,
            reducedMotionSupport: true,
            audioAlternatives: true,
            keyboardNavigation: true,
            customControls: false,
            fontScaling: true,
          },
          supportedOrientations: ['portrait', 'landscape'],
        },
        component: null as any, // Will be loaded dynamically
        achievements: [],
        leaderboardConfig: {
          id: 'tic-tac-toe-leaderboard',
          name: 'Tic Tac Toe Wins',
          scoreType: 'highest',
          sortOrder: 'desc',
          maxEntries: 100,
          isPublic: true,
        },
        isEnabled: true,
        version: '1.0.0',
        hotReloadable: true,
      },
      {
        id: 'memory-match',
        metadata: {
          title: 'Memory Match',
          description: 'Test your memory with card matching',
          shortDescription: 'Card matching memory game',
          iconUrl: '',
          thumbnailUrl: '',
          category: 'puzzle',
          difficulty: 'medium',
          estimatedPlayTime: 10,
          minAge: 4,
          maxPlayers: 1,
          tags: ['memory', 'puzzle', 'cards'],
          accessibility: {
            screenReaderSupport: true,
            colorBlindFriendly: true,
            reducedMotionSupport: true,
            audioAlternatives: true,
            keyboardNavigation: true,
            customControls: false,
            fontScaling: true,
          },
          supportedOrientations: ['portrait'],
        },
        component: null as any,
        achievements: [],
        leaderboardConfig: {
          id: 'memory-match-leaderboard',
          name: 'Memory Match High Scores',
          scoreType: 'highest',
          sortOrder: 'desc',
          maxEntries: 100,
          isPublic: true,
        },
        isEnabled: true,
        version: '1.0.0',
        hotReloadable: true,
      },
      {
        id: 'snake',
        metadata: {
          title: 'Snake',
          description: 'Classic arcade snake game',
          shortDescription: 'Classic arcade game',
          iconUrl: '',
          thumbnailUrl: '',
          category: 'arcade',
          difficulty: 'medium',
          estimatedPlayTime: 15,
          minAge: 6,
          maxPlayers: 1,
          tags: ['arcade', 'classic', 'action'],
          accessibility: {
            screenReaderSupport: true,
            colorBlindFriendly: true,
            reducedMotionSupport: false, // Motion is core to gameplay
            audioAlternatives: true,
            keyboardNavigation: true,
            customControls: true,
            fontScaling: true,
          },
          supportedOrientations: ['portrait', 'landscape'],
        },
        component: null as any,
        achievements: [],
        leaderboardConfig: {
          id: 'snake-leaderboard',
          name: 'Snake High Scores',
          scoreType: 'highest',
          sortOrder: 'desc',
          maxEntries: 100,
          isPublic: true,
        },
        isEnabled: true,
        version: '1.0.0',
        hotReloadable: true,
      },
    ];

    // Register default games
    defaultGames.forEach(game => this.registerGame(game));
  }

  /**
   * Validate game definition
   */
  private validateGameDefinition(definition: GameDefinition): void {
    if (!definition.id) {
      throw new Error('Game definition must have an ID');
    }

    if (!definition.metadata) {
      throw new Error('Game definition must have metadata');
    }

    if (!definition.metadata.title) {
      throw new Error('Game metadata must have a title');
    }

    if (!definition.metadata.category) {
      throw new Error('Game metadata must have a category');
    }

    if (!definition.version) {
      throw new Error('Game definition must have a version');
    }

    // Validate accessibility requirements
    if (!definition.metadata.accessibility) {
      throw new Error('Game metadata must include accessibility information');
    }

    const accessibility = definition.metadata.accessibility;
    if (typeof accessibility.screenReaderSupport !== 'boolean') {
      throw new Error('Game must specify screen reader support');
    }

    if (typeof accessibility.colorBlindFriendly !== 'boolean') {
      throw new Error('Game must specify colorblind friendliness');
    }
  }
}