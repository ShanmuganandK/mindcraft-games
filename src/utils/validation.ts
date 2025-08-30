/**
 * Data validation utilities for the Multi-Game Platform
 */

import { 
  UserProfile, 
  UserPreferences, 
  GameProgress, 
  GameStats, 
  GameSettings,
  FontSize,
  DataCollectionLevel,
  GameDifficulty 
} from '../types';

/**
 * Validates a user profile object
 */
export function validateUserProfile(profile: any): profile is UserProfile {
  if (!profile || typeof profile !== 'object') {
    return false;
  }

  // Required fields
  if (!profile.id || typeof profile.id !== 'string') {
    return false;
  }

  if (!profile.createdAt || !(profile.createdAt instanceof Date)) {
    return false;
  }

  if (!profile.lastActive || !(profile.lastActive instanceof Date)) {
    return false;
  }

  // Validate preferences if present
  if (profile.preferences && !validateUserPreferences(profile.preferences)) {
    return false;
  }

  // Validate achievements array if present
  if (profile.achievements && !Array.isArray(profile.achievements)) {
    return false;
  }

  return true;
}

/**
 * Validates user preferences object
 */
export function validateUserPreferences(preferences: any): preferences is UserPreferences {
  if (!preferences || typeof preferences !== 'object') {
    return false;
  }

  // Boolean validations
  const booleanFields = ['soundEnabled', 'musicEnabled', 'reducedMotion', 'highContrast', 'analyticsConsent'];
  for (const field of booleanFields) {
    if (typeof preferences[field] !== 'boolean') {
      return false;
    }
  }

  // Volume validations (0-1 range)
  if (typeof preferences.soundVolume !== 'number' || 
      preferences.soundVolume < 0 || 
      preferences.soundVolume > 1) {
    return false;
  }

  if (typeof preferences.musicVolume !== 'number' || 
      preferences.musicVolume < 0 || 
      preferences.musicVolume > 1) {
    return false;
  }

  // Font size validation
  if (!Object.values(FontSize).includes(preferences.fontSize)) {
    return false;
  }

  return true;
}

/**
 * Validates game progress object
 */
export function validateGameProgress(progress: any): progress is GameProgress {
  if (!progress || typeof progress !== 'object') {
    return false;
  }

  // Required string field
  if (!progress.gameId || typeof progress.gameId !== 'string') {
    return false;
  }

  // Required number fields
  const numberFields = ['highScore', 'totalPlays', 'totalTime', 'averageScore'];
  for (const field of numberFields) {
    if (typeof progress[field] !== 'number' || progress[field] < 0) {
      return false;
    }
  }

  // Date validation
  if (!progress.lastPlayed || !(progress.lastPlayed instanceof Date)) {
    return false;
  }

  // Achievements array validation
  if (!Array.isArray(progress.achievements)) {
    return false;
  }

  return true;
}

/**
 * Validates game statistics object
 */
export function validateGameStats(stats: any): stats is GameStats {
  if (!stats || typeof stats !== 'object') {
    return false;
  }

  // Duration is required and must be positive
  if (typeof stats.duration !== 'number' || stats.duration < 0) {
    return false;
  }

  // Optional number fields validation
  const optionalNumberFields = ['moves', 'accuracy', 'powerUpsUsed', 'hintsUsed', 'perfectMoves'];
  for (const field of optionalNumberFields) {
    if (stats[field] !== undefined && (typeof stats[field] !== 'number' || stats[field] < 0)) {
      return false;
    }
  }

  // Accuracy should be 0-100 if present
  if (stats.accuracy !== undefined && (stats.accuracy < 0 || stats.accuracy > 100)) {
    return false;
  }

  return true;
}

/**
 * Validates game settings object
 */
export function validateGameSettings(settings: any): settings is GameSettings {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  // Difficulty validation
  if (!Object.values(GameDifficulty).includes(settings.difficulty)) {
    return false;
  }

  // Boolean validations
  const booleanFields = ['soundEnabled', 'musicEnabled', 'vibrationEnabled'];
  for (const field of booleanFields) {
    if (typeof settings[field] !== 'boolean') {
      return false;
    }
  }

  // Volume validations (0-1 range)
  if (typeof settings.soundVolume !== 'number' || 
      settings.soundVolume < 0 || 
      settings.soundVolume > 1) {
    return false;
  }

  if (typeof settings.musicVolume !== 'number' || 
      settings.musicVolume < 0 || 
      settings.musicVolume > 1) {
    return false;
  }

  return true;
}

/**
 * Validates that a score is a valid number
 */
export function validateScore(score: any): score is number {
  return typeof score === 'number' && !isNaN(score) && isFinite(score) && score >= 0;
}

/**
 * Validates that a game ID is valid
 */
export function validateGameId(gameId: any): gameId is string {
  return typeof gameId === 'string' && gameId.length > 0 && /^[a-zA-Z0-9-_]+$/.test(gameId);
}

/**
 * Validates that a user ID is valid
 */
export function validateUserId(userId: any): userId is string {
  return typeof userId === 'string' && userId.length > 0;
}

/**
 * Sanitizes user input to prevent XSS and other attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Validates and sanitizes display name
 */
export function validateDisplayName(name: any): string | null {
  if (typeof name !== 'string') {
    return null;
  }

  const sanitized = sanitizeString(name);
  
  // Must be 1-20 characters, alphanumeric and spaces only
  if (sanitized.length === 0 || sanitized.length > 20) {
    return null;
  }

  if (!/^[a-zA-Z0-9\s]+$/.test(sanitized)) {
    return null;
  }

  return sanitized;
}