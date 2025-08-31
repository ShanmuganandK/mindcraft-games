/**
 * GameTile component with game icons, titles, descriptions, and high scores
 * Supports accessibility features and various display states
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  AccessibilityInfo,
  Animated,
  Pressable,
} from 'react-native';
import { GameModule } from '../types/game';

interface GameTileProps {
  game: GameModule;
  onPress: () => void;
  width?: number;
  height?: number;
  isSelected?: boolean;
  showHighScore?: boolean;
  showPlayCount?: boolean;
  showRating?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

interface GameStats {
  highScore: number;
  playCount: number;
  lastPlayed?: Date;
  averageRating: number;
}

export const GameTile: React.FC<GameTileProps> = ({
  game,
  onPress,
  width = 150,
  height,
  isSelected = false,
  showHighScore = true,
  showPlayCount = true,
  showRating = true,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const [gameStats, setGameStats] = useState<GameStats>({
    highScore: 0,
    playCount: 0,
    averageRating: 4.0,
  });
  
  const [isPressed, setIsPressed] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [opacityAnim] = useState(new Animated.Value(1));

  const calculatedHeight = height || width * 1.2;

  useEffect(() => {
    // Load game statistics (mock data for now)
    // In real implementation, this would fetch from storage
    setGameStats({
      highScore: Math.floor(Math.random() * 10000),
      playCount: Math.floor(Math.random() * 50),
      averageRating: 4.0 + Math.random(),
    });
  }, [game.id]);

  useEffect(() => {
    // Animate selection state
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isSelected ? 1.05 : 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: game.isEnabled ? 1 : 0.6,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isSelected, game.isEnabled]);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.05 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const handlePress = () => {
    if (!game.isEnabled) {
      AccessibilityInfo.announceForAccessibility(
        `${game.metadata.title} is coming soon`
      );
      return;
    }

    // Haptic feedback would go here in real implementation
    onPress();
  };

  const renderGameIcon = () => {
    if (game.metadata.thumbnailUrl) {
      return (
        <Image
          source={{ uri: game.metadata.thumbnailUrl }}
          style={styles.gameImage}
          accessibilityIgnoresInvertColors={true}
        />
      );
    }

    // Fallback to text-based icon
    const iconText = game.metadata.title.charAt(0).toUpperCase();
    const iconColor = getIconColor(game.metadata.category);

    return (
      <View style={[styles.gameIconFallback, { backgroundColor: iconColor }]}>
        <Text style={styles.gameIconText}>{iconText}</Text>
      </View>
    );
  };

  const getIconColor = (category: string): string => {
    const colors: Record<string, string> = {
      Strategy: '#FF6B6B',
      Memory: '#4ECDC4',
      Arcade: '#45B7D1',
      Puzzle: '#96CEB4',
      Action: '#FFEAA7',
      Educational: '#DDA0DD',
    };
    return colors[category] || '#007AFF';
  };

  const renderDifficultyBadge = () => {
    if (!game.metadata.difficulty) return null;

    const difficultyColors: Record<string, string> = {
      easy: '#4CAF50',
      medium: '#FF9800',
      hard: '#F44336',
    };

    return (
      <View style={[
        styles.difficultyBadge,
        { backgroundColor: difficultyColors[game.metadata.difficulty] || '#999' }
      ]}>
        <Text style={styles.difficultyText}>
          {game.metadata.difficulty.toUpperCase()}
        </Text>
      </View>
    );
  };

  const renderStats = () => {
    const stats = [];

    if (showHighScore && gameStats.highScore > 0) {
      stats.push(
        <Text key="highScore" style={styles.statText}>
          Best: {gameStats.highScore.toLocaleString()}
        </Text>
      );
    }

    if (showPlayCount && gameStats.playCount > 0) {
      stats.push(
        <Text key="playCount" style={styles.statText}>
          Played: {gameStats.playCount}
        </Text>
      );
    }

    if (showRating && gameStats.averageRating > 0) {
      stats.push(
        <Text key="rating" style={styles.statText}>
          ⭐ {gameStats.averageRating.toFixed(1)}
        </Text>
      );
    }

    return stats.length > 0 ? (
      <View style={styles.statsContainer}>
        {stats}
      </View>
    ) : null;
  };

  const renderUnavailableOverlay = () => {
    if (game.isEnabled) return null;

    return (
      <View style={styles.unavailableOverlay}>
        <Text style={styles.unavailableText}>Coming Soon</Text>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width,
          height: calculatedHeight,
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
        isSelected && styles.selectedContainer,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!game.isEnabled}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={
          accessibilityLabel ||
          `${game.metadata.title}. ${game.metadata.description}. ${
            showHighScore && gameStats.highScore > 0
              ? `High score: ${gameStats.highScore}.`
              : ''
          } ${
            showPlayCount && gameStats.playCount > 0
              ? `Played ${gameStats.playCount} times.`
              : ''
          } ${
            game.isEnabled ? 'Available to play' : 'Coming soon'
          }`
        }
        accessibilityHint={
          accessibilityHint ||
          (game.isEnabled
            ? 'Double tap to start playing'
            : 'This game is not yet available')
        }
        accessibilityState={{
          disabled: !game.isEnabled,
          selected: isSelected,
        }}
        style={styles.pressable}
      >
        <View style={styles.content}>
          {/* Game Icon/Image */}
          <View style={styles.iconContainer}>
            {renderGameIcon()}
            {renderDifficultyBadge()}
          </View>

          {/* Game Info */}
          <View style={styles.infoContainer}>
            <Text
              style={[
                styles.gameTitle,
                !game.isEnabled && styles.disabledText,
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {game.metadata.title}
            </Text>

            <Text
              style={[
                styles.gameDescription,
                !game.isEnabled && styles.disabledText,
              ]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {game.metadata.description}
            </Text>

            {/* Game Statistics */}
            {renderStats()}

            {/* Estimated Play Time */}
            {game.metadata.estimatedPlayTime && (
              <Text style={styles.playTimeText}>
                ~{Math.round(game.metadata.estimatedPlayTime / 60)} min
              </Text>
            )}
          </View>

          {/* Unavailable Overlay */}
          {renderUnavailableOverlay()}
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  selectedContainer: {
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  pressable: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  gameImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  gameIconFallback: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  difficultyBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
  },
  difficultyText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  infoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 8,
  },
  disabledText: {
    color: '#999999',
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 4,
  },
  statText: {
    fontSize: 9,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 2,
  },
  playTimeText: {
    fontSize: 9,
    color: '#999999',
    fontStyle: 'italic',
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  unavailableText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default GameTile;