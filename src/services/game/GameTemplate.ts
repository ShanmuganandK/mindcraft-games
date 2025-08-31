/**
 * Game Template - Base template for creating games with dependency injection
 */

import React from 'react';
import { GameProps, GameState, GameStats } from '../../types/game';
import { GameServiceContainer } from './GameServiceContainer';

export interface GameTemplateConfig {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedPlayTime: number;
  minAge: number;
  maxPlayers: number;
  tags: string[];
  version: string;
}

export interface GameContext {
  gameId: string;
  sessionId: string;
  services: GameServiceContainer;
  state: GameState;
  props: GameProps;
}

export abstract class GameTemplate {
  protected config: GameTemplateConfig;
  protected context?: GameContext;
  protected isInitialized = false;
  protected isPaused = false;

  constructor(config: GameTemplateConfig) {
    this.config = config;
  }

  /**
   * Initialize the game with context and services
   */
  async initialize(context: GameContext): Promise<void> {
    this.context = context;
    
    try {
      await this.onInitialize();
      this.isInitialized = true;
    } catch (error) {
      console.error(`Failed to initialize game ${this.config.id}:`, error);
      throw error;
    }
  }

  /**
   * Start the game
   */
  async start(): Promise<void> {
    if (!this.isInitialized || !this.context) {
      throw new Error('Game not initialized');
    }

    try {
      await this.onStart();
    } catch (error) {
      console.error(`Failed to start game ${this.config.id}:`, error);
      throw error;
    }
  }

  /**
   * Pause the game
   */
  async pause(): Promise<void> {
    if (!this.isInitialized || this.isPaused) {
      return;
    }

    try {
      await this.onPause();
      this.isPaused = true;
      
      if (this.context?.props.onPause) {
        this.context.props.onPause();
      }
    } catch (error) {
      console.error(`Failed to pause game ${this.config.id}:`, error);
      throw error;
    }
  }

  /**
   * Resume the game
   */
  async resume(): Promise<void> {
    if (!this.isInitialized || !this.isPaused) {
      return;
    }

    try {
      await this.onResume();
      this.isPaused = false;
    } catch (error) {
      console.error(`Failed to resume game ${this.config.id}:`, error);
      throw error;
    }
  }

  /**
   * End the game
   */
  async end(score: number, stats: GameStats): Promise<void> {
    if (!this.isInitialized || !this.context) {
      return;
    }

    try {
      await this.onEnd(score, stats);
      
      if (this.context.props.onGameEnd) {
        this.context.props.onGameEnd(score, stats);
      }
    } catch (error) {
      console.error(`Failed to end game ${this.config.id}:`, error);
      throw error;
    }
  }

  /**
   * Exit the game
   */
  async exit(): Promise<void> {
    if (!this.context) {
      return;
    }

    try {
      await this.onExit();
      
      if (this.context.props.onExit) {
        this.context.props.onExit();
      }
    } catch (error) {
      console.error(`Failed to exit game ${this.config.id}:`, error);
      throw error;
    }
  }

  /**
   * Update game state
   */
  updateState(stateUpdate: Partial<GameState>): void {
    if (!this.context) {
      return;
    }

    this.context.state = { ...this.context.state, ...stateUpdate };
    this.onStateUpdate(this.context.state);
  }

  /**
   * Get current game state
   */
  getState(): GameState | undefined {
    return this.context?.state;
  }

  /**
   * Get game services
   */
  getServices(): GameServiceContainer | undefined {
    return this.context?.services;
  }

  /**
   * Get game configuration
   */
  getConfig(): GameTemplateConfig {
    return this.config;
  }

  /**
   * Check if game is initialized
   */
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if game is paused
   */
  getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Get React component for rendering
   */
  abstract getComponent(): React.ComponentType<GameProps>;

  /**
   * Serialize game state for persistence
   */
  serializeState(): any {
    if (!this.context?.state) {
      return null;
    }

    return {
      gameId: this.context.state.gameId,
      sessionId: this.context.state.sessionId,
      currentScore: this.context.state.currentScore,
      gameData: this.context.state.gameData,
      timestamp: this.context.state.timestamp.toISOString(),
      isPaused: this.context.state.isPaused,
      canResume: this.context.state.canResume,
    };
  }

  /**
   * Deserialize game state from persistence
   */
  deserializeState(serializedState: any): GameState {
    return {
      gameId: serializedState.gameId,
      sessionId: serializedState.sessionId,
      currentScore: serializedState.currentScore || 0,
      gameData: serializedState.gameData || {},
      timestamp: new Date(serializedState.timestamp),
      isPaused: serializedState.isPaused || false,
      canResume: serializedState.canResume || false,
    };
  }

  // Abstract methods to be implemented by concrete games

  /**
   * Called when the game is being initialized
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Called when the game starts
   */
  protected abstract onStart(): Promise<void>;

  /**
   * Called when the game is paused
   */
  protected abstract onPause(): Promise<void>;

  /**
   * Called when the game is resumed
   */
  protected abstract onResume(): Promise<void>;

  /**
   * Called when the game ends
   */
  protected abstract onEnd(score: number, stats: GameStats): Promise<void>;

  /**
   * Called when the game is exited
   */
  protected abstract onExit(): Promise<void>;

  /**
   * Called when game state is updated
   */
  protected abstract onStateUpdate(state: GameState): void;

  // Optional lifecycle hooks

  /**
   * Called before game initialization
   */
  protected async onBeforeInitialize(): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Called after game initialization
   */
  protected async onAfterInitialize(): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Called when an error occurs
   */
  protected onError(error: Error, context?: any): void {
    console.error(`Game error in ${this.config.id}:`, error, context);
    
    // Report error through analytics if available
    const analytics = this.context?.services.getAnalytics();
    if (analytics) {
      analytics.trackError(error, { gameId: this.config.id, context });
    }
  }

  /**
   * Called to validate game state
   */
  protected validateState(state: GameState): boolean {
    // Basic validation - override in subclasses for game-specific validation
    return (
      state.gameId === this.config.id &&
      typeof state.currentScore === 'number' &&
      state.currentScore >= 0 &&
      state.gameData !== null &&
      typeof state.gameData === 'object'
    );
  }

  /**
   * Called to reset game to initial state
   */
  protected resetToInitialState(): void {
    if (!this.context) {
      return;
    }

    this.context.state = {
      gameId: this.config.id,
      sessionId: this.context.state.sessionId,
      currentScore: 0,
      gameData: {},
      timestamp: new Date(),
      isPaused: false,
      canResume: false,
    };

    this.onStateUpdate(this.context.state);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.onCleanup();
    } catch (error) {
      console.error(`Error during cleanup for game ${this.config.id}:`, error);
    }
    
    this.context = undefined;
    this.isInitialized = false;
    this.isPaused = false;
  }

  /**
   * Called during cleanup - override in subclasses
   */
  protected async onCleanup(): Promise<void> {
    // Override in subclasses if needed
  }
}

/**
 * Factory function to create game templates
 */
export function createGameTemplate<T extends GameTemplate>(
  TemplateClass: new (config: GameTemplateConfig) => T,
  config: GameTemplateConfig
): T {
  return new TemplateClass(config);
}

/**
 * Decorator for game template methods to handle errors
 */
export function handleGameErrors(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor
) {
  const method = descriptor.value;

  descriptor.value = async function (this: GameTemplate, ...args: any[]) {
    try {
      return await method.apply(this, args);
    } catch (error) {
      this.onError(error as Error, { method: propertyName, args });
      throw error;
    }
  };
}

/**
 * Decorator to ensure game is initialized before method execution
 */
export function requiresInitialization(
  target: any,
  propertyName: string,
  descriptor: PropertyDescriptor
) {
  const method = descriptor.value;

  descriptor.value = function (this: GameTemplate, ...args: any[]) {
    if (!this.isInitialized) {
      throw new Error(`Game must be initialized before calling ${propertyName}`);
    }
    return method.apply(this, args);
  };
}