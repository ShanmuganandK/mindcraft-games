/**
 * Data serialization and deserialization utilities
 */

import { 
  UserProfile, 
  GameProgress, 
  GameStats, 
  GameState,
  Achievement 
} from '../types';

/**
 * Serializes a user profile to JSON string
 */
export function serializeUserProfile(profile: UserProfile): string {
  try {
    const serializable = {
      ...profile,
      createdAt: profile.createdAt.toISOString(),
      lastActive: profile.lastActive.toISOString(),
      achievements: profile.achievements.map(achievement => ({
        ...achievement,
        unlockedAt: achievement.unlockedAt?.toISOString()
      })),
      statistics: {
        ...profile.statistics,
        lastPlayDate: profile.statistics.lastPlayDate.toISOString()
      }
    };
    
    return JSON.stringify(serializable);
  } catch (error) {
    throw new Error(`Failed to serialize user profile: ${error}`);
  }
}

/**
 * Deserializes a user profile from JSON string
 */
export function deserializeUserProfile(data: string): UserProfile {
  try {
    const parsed = JSON.parse(data);
    
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      lastActive: new Date(parsed.lastActive),
      achievements: parsed.achievements.map((achievement: any) => ({
        ...achievement,
        unlockedAt: achievement.unlockedAt ? new Date(achievement.unlockedAt) : undefined
      })),
      statistics: {
        ...parsed.statistics,
        lastPlayDate: new Date(parsed.statistics.lastPlayDate)
      }
    };
  } catch (error) {
    throw new Error(`Failed to deserialize user profile: ${error}`);
  }
}

/**
 * Serializes game progress to JSON string
 */
export function serializeGameProgress(progress: GameProgress): string {
  try {
    const serializable = {
      ...progress,
      lastPlayed: progress.lastPlayed.toISOString()
    };
    
    return JSON.stringify(serializable);
  } catch (error) {
    throw new Error(`Failed to serialize game progress: ${error}`);
  }
}

/**
 * Deserializes game progress from JSON string
 */
export function deserializeGameProgress(data: string): GameProgress {
  try {
    const parsed = JSON.parse(data);
    
    return {
      ...parsed,
      lastPlayed: new Date(parsed.lastPlayed)
    };
  } catch (error) {
    throw new Error(`Failed to deserialize game progress: ${error}`);
  }
}

/**
 * Serializes game state to JSON string
 */
export function serializeGameState(state: GameState): string {
  try {
    const serializable = {
      ...state,
      timestamp: state.timestamp.toISOString()
    };
    
    return JSON.stringify(serializable);
  } catch (error) {
    throw new Error(`Failed to serialize game state: ${error}`);
  }
}

/**
 * Deserializes game state from JSON string
 */
export function deserializeGameState(data: string): GameState {
  try {
    const parsed = JSON.parse(data);
    
    return {
      ...parsed,
      timestamp: new Date(parsed.timestamp)
    };
  } catch (error) {
    throw new Error(`Failed to deserialize game state: ${error}`);
  }
}

/**
 * Serializes an array of game progress objects
 */
export function serializeGameProgressArray(progressArray: GameProgress[]): string {
  try {
    const serializable = progressArray.map(progress => ({
      ...progress,
      lastPlayed: progress.lastPlayed.toISOString()
    }));
    
    return JSON.stringify(serializable);
  } catch (error) {
    throw new Error(`Failed to serialize game progress array: ${error}`);
  }
}

/**
 * Deserializes an array of game progress objects
 */
export function deserializeGameProgressArray(data: string): GameProgress[] {
  try {
    const parsed = JSON.parse(data);
    
    if (!Array.isArray(parsed)) {
      throw new Error('Data is not an array');
    }
    
    return parsed.map((progress: any) => ({
      ...progress,
      lastPlayed: new Date(progress.lastPlayed)
    }));
  } catch (error) {
    throw new Error(`Failed to deserialize game progress array: ${error}`);
  }
}

/**
 * Creates a deep copy of an object (useful for state management)
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * Safely parses JSON with error handling
 */
export function safeJsonParse<T>(data: string, fallback: T): T {
  try {
    return JSON.parse(data);
  } catch (error) {
    console.warn('Failed to parse JSON, using fallback:', error);
    return fallback;
  }
}

/**
 * Safely stringifies JSON with error handling
 */
export function safeJsonStringify(data: any, fallback: string = '{}'): string {
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.warn('Failed to stringify JSON, using fallback:', error);
    return fallback;
  }
}

/**
 * Compresses data for storage (simple implementation)
 */
export function compressData(data: string): string {
  // Simple compression - remove extra whitespace
  return data.replace(/\s+/g, ' ').trim();
}

/**
 * Validates that serialized data can be properly deserialized
 */
export function validateSerializedData(data: string): boolean {
  try {
    JSON.parse(data);
    return true;
  } catch {
    return false;
  }
}