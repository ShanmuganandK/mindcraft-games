/**
 * Game Lifecycle Manager - Handles game lifecycle events and hooks
 */

import { GameModule, GameState, GameLifecycleEvent } from '../../types/game';

export type LifecycleHook = (gameId: string, ...args: any[]) => Promise<void> | void;

export interface LifecycleHooks {
  onGameLoaded?: LifecycleHook;
  onGameUnloading?: LifecycleHook;
  onGameUnloaded?: LifecycleHook;
  onGameInitializing?: LifecycleHook;
  onGameInitialized?: LifecycleHook;
  onGameStarting?: LifecycleHook;
  onGameStarted?: LifecycleHook;
  onGamePausing?: LifecycleHook;
  onGamePaused?: LifecycleHook;
  onGameResuming?: LifecycleHook;
  onGameResumed?: LifecycleHook;
  onGameEnding?: LifecycleHook;
  onGameEnded?: LifecycleHook;
  onGameError?: LifecycleHook;
}

export class GameLifecycleManager {
  private hooks: Map<string, LifecycleHook[]> = new Map();
  private eventListeners: Map<string, ((event: GameLifecycleEvent) => void)[]> = new Map();
  private gameStates: Map<string, GameState> = new Map();

  /**
   * Register a lifecycle hook
   */
  registerHook(event: keyof LifecycleHooks, hook: LifecycleHook): void {
    if (!this.hooks.has(event)) {
      this.hooks.set(event, []);
    }
    this.hooks.get(event)!.push(hook);
  }

  /**
   * Unregister a lifecycle hook
   */
  unregisterHook(event: keyof LifecycleHooks, hook: LifecycleHook): void {
    const hooks = this.hooks.get(event);
    if (hooks) {
      const index = hooks.indexOf(hook);
      if (index > -1) {
        hooks.splice(index, 1);
      }
    }
  }

  /**
   * Register multiple hooks at once
   */
  registerHooks(hooks: LifecycleHooks): void {
    Object.entries(hooks).forEach(([event, hook]) => {
      if (hook) {
        this.registerHook(event as keyof LifecycleHooks, hook);
      }
    });
  }

  /**
   * Add event listener
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
   * Game loaded event
   */
  async onGameLoaded(gameId: string, module: GameModule): Promise<void> {
    const event: GameLifecycleEvent = {
      type: 'gameLoaded',
      gameId,
      timestamp: new Date(),
      data: { module },
    };

    await this.executeHooks('onGameLoaded', gameId, module);
    this.emitEvent(event);
  }

  /**
   * Game unloading event
   */
  async onGameUnloading(gameId: string, module: GameModule): Promise<void> {
    const event: GameLifecycleEvent = {
      type: 'gameUnloading',
      gameId,
      timestamp: new Date(),
      data: { module },
    };

    await this.executeHooks('onGameUnloading', gameId, module);
    this.emitEvent(event);
  }

  /**
   * Game unloaded event
   */
  async onGameUnloaded(gameId: string): Promise<void> {
    const event: GameLifecycleEvent = {
      type: 'gameUnloaded',
      gameId,
      timestamp: new Date(),
    };

    // Clean up game state
    this.gameStates.delete(gameId);

    await this.executeHooks('onGameUnloaded', gameId);
    this.emitEvent(event);
  }

  /**
   * Game initializing event
   */
  async onGameInitializing(
    gameId: string, 
    module: GameModule, 
    initialState?: Partial<GameState>
  ): Promise<GameState> {
    // Create initial game state
    const gameState: GameState = {
      gameId,
      sessionId: this.generateSessionId(),
      currentScore: 0,
      gameData: {},
      timestamp: new Date(),
      isPaused: false,
      canResume: false,
      ...initialState,
    };

    this.gameStates.set(gameId, gameState);

    const event: GameLifecycleEvent = {
      type: 'gameInitializing',
      gameId,
      timestamp: new Date(),
      data: { module, gameState },
    };

    await this.executeHooks('onGameInitializing', gameId, module, gameState);
    this.emitEvent(event);

    return gameState;
  }

  /**
   * Game initialized event
   */
  async onGameInitialized(gameId: string, gameState: GameState): Promise<void> {
    const event: GameLifecycleEvent = {
      type: 'gameInitialized',
      gameId,
      timestamp: new Date(),
      data: { gameState },
    };

    await this.executeHooks('onGameInitialized', gameId, gameState);
    this.emitEvent(event);
  }

  /**
   * Game starting event
   */
  async onGameStarting(gameId: string, gameState: GameState): Promise<void> {
    const event: GameLifecycleEvent = {
      type: 'gameStarting',
      gameId,
      timestamp: new Date(),
      data: { gameState },
    };

    await this.executeHooks('onGameStarting', gameId, gameState);
    this.emitEvent(event);
  }

  /**
   * Game started event
   */
  async onGameStarted(gameId: string, gameState: GameState): Promise<void> {
    // Update game state
    gameState.isPaused = false;
    gameState.canResume = true;
    gameState.timestamp = new Date();

    const event: GameLifecycleEvent = {
      type: 'gameStarted',
      gameId,
      timestamp: new Date(),
      data: { gameState },
    };

    await this.executeHooks('onGameStarted', gameId, gameState);
    this.emitEvent(event);
  }

  /**
   * Game pausing event
   */
  async onGamePausing(gameId: string, gameState: GameState): Promise<void> {
    const event: GameLifecycleEvent = {
      type: 'gamePausing',
      gameId,
      timestamp: new Date(),
      data: { gameState },
    };

    await this.executeHooks('onGamePausing', gameId, gameState);
    this.emitEvent(event);
  }

  /**
   * Game paused event
   */
  async onGamePaused(gameId: string, gameState: GameState): Promise<void> {
    // Update game state
    gameState.isPaused = true;
    gameState.timestamp = new Date();

    const event: GameLifecycleEvent = {
      type: 'gamePaused',
      gameId,
      timestamp: new Date(),
      data: { gameState },
    };

    await this.executeHooks('onGamePaused', gameId, gameState);
    this.emitEvent(event);
  }

  /**
   * Game resuming event
   */
  async onGameResuming(gameId: string, gameState: GameState): Promise<void> {
    const event: GameLifecycleEvent = {
      type: 'gameResuming',
      gameId,
      timestamp: new Date(),
      data: { gameState },
    };

    await this.executeHooks('onGameResuming', gameId, gameState);
    this.emitEvent(event);
  }

  /**
   * Game resumed event
   */
  async onGameResumed(gameId: string, gameState: GameState): Promise<void> {
    // Update game state
    gameState.isPaused = false;
    gameState.timestamp = new Date();

    const event: GameLifecycleEvent = {
      type: 'gameResumed',
      gameId,
      timestamp: new Date(),
      data: { gameState },
    };

    await this.executeHooks('onGameResumed', gameId, gameState);
    this.emitEvent(event);
  }

  /**
   * Game ending event
   */
  async onGameEnding(
    gameId: string, 
    gameState: GameState, 
    finalScore: number, 
    stats: any
  ): Promise<void> {
    const event: GameLifecycleEvent = {
      type: 'gameEnding',
      gameId,
      timestamp: new Date(),
      data: { gameState, finalScore, stats },
    };

    await this.executeHooks('onGameEnding', gameId, gameState, finalScore, stats);
    this.emitEvent(event);
  }

  /**
   * Game ended event
   */
  async onGameEnded(gameId: string, finalScore: number, stats: any): Promise<void> {
    const event: GameLifecycleEvent = {
      type: 'gameEnded',
      gameId,
      timestamp: new Date(),
      data: { finalScore, stats },
    };

    await this.executeHooks('onGameEnded', gameId, finalScore, stats);
    this.emitEvent(event);
  }

  /**
   * Game error event
   */
  async onGameError(gameId: string, error: Error, context?: any): Promise<void> {
    const event: GameLifecycleEvent = {
      type: 'gameError',
      gameId,
      timestamp: new Date(),
      data: { error: error.message, context },
    };

    await this.executeHooks('onGameError', gameId, error, context);
    this.emitEvent(event);
  }

  /**
   * Get current game state
   */
  getGameState(gameId: string): GameState | undefined {
    return this.gameStates.get(gameId);
  }

  /**
   * Update game state
   */
  updateGameState(gameId: string, stateUpdate: Partial<GameState>): void {
    const currentState = this.gameStates.get(gameId);
    if (currentState) {
      const updatedState = { ...currentState, ...stateUpdate };
      this.gameStates.set(gameId, updatedState);
    }
  }

  /**
   * Get all active game states
   */
  getAllGameStates(): Map<string, GameState> {
    return new Map(this.gameStates);
  }

  /**
   * Clear game state
   */
  clearGameState(gameId: string): void {
    this.gameStates.delete(gameId);
  }

  /**
   * Execute hooks for a specific event
   */
  private async executeHooks(event: string, ...args: any[]): Promise<void> {
    const hooks = this.hooks.get(event) || [];
    
    for (const hook of hooks) {
      try {
        await hook(...args);
      } catch (error) {
        console.error(`Error executing lifecycle hook ${event}:`, error);
        
        // Emit error event if it's not already an error hook
        if (event !== 'onGameError' && args.length > 0) {
          await this.onGameError(args[0], error as Error, { hook: event });
        }
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: GameLifecycleEvent): void {
    // Emit to specific event listeners
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in lifecycle event listener for ${event.type}:`, error);
      }
    });

    // Emit to wildcard listeners
    const wildcardListeners = this.eventListeners.get('*') || [];
    wildcardListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in wildcard lifecycle event listener:`, error);
      }
    });
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.hooks.clear();
    this.eventListeners.clear();
    this.gameStates.clear();
  }
}