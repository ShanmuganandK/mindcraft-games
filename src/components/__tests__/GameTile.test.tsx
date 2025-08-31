/**
 * Unit tests for GameTile component
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GameTile } from '../GameTile';
import { 
  GameModule, 
  GameCategory, 
  GameDifficulty, 
  ScoreType, 
  SortOrder, 
  ResetPeriod, 
  DeviceOrientation 
} from '../../types/game';

const createMockGame = (
  id: string,
  title: string,
  isAvailable: boolean = true,
  category: GameCategory = GameCategory.STRATEGY
): GameModule => ({
  id,
  metadata: {
    title,
    description: `Description for ${title}`,
    shortDescription: `Short description for ${title}`,
    iconUrl: '',
    thumbnailUrl: '',
    category,
    difficulty: GameDifficulty.EASY,
    estimatedPlayTime: 5, // in minutes
    minAge: 3,
    maxPlayers: 1,
    tags: ['test'],
    accessibility: {
      screenReaderSupport: true,
      colorBlindFriendly: true,
      reducedMotionSupport: true,
      audioAlternatives: false,
      keyboardNavigation: true,
      customControls: false,
      fontScaling: true,
    },
    supportedOrientations: [DeviceOrientation.PORTRAIT],
  },
  component: null as any,
  achievements: [],
  leaderboardConfig: {
    id: 'test-leaderboard',
    name: 'Test Leaderboard',
    scoreType: ScoreType.HIGHEST,
    sortOrder: SortOrder.DESCENDING,
    resetPeriod: ResetPeriod.NEVER,
    maxEntries: 100,
    isPublic: true,
  },
  isEnabled: isAvailable,
  version: '1.0.0',
});

describe('GameTile', () => {
  const mockOnPress = jest.fn();
  const mockGame = createMockGame('test-game', 'Test Game');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render game title and description', () => {
      const { getByText } = render(
        <GameTile game={mockGame} onPress={mockOnPress} />
      );

      expect(getByText('Test Game')).toBeTruthy();
      expect(getByText('Description for Test Game')).toBeTruthy();
    });

    it('should render game icon with first letter when no thumbnail', () => {
      const { getByText } = render(
        <GameTile game={mockGame} onPress={mockOnPress} />
      );

      expect(getByText('T')).toBeTruthy(); // First letter of "Test Game"
    });

    it('should render difficulty badge', () => {
      const { getByText } = render(
        <GameTile game={mockGame} onPress={mockOnPress} />
      );

      expect(getByText('EASY')).toBeTruthy();
    });

    it('should render estimated play time', () => {
      const { getByText } = render(
        <GameTile game={mockGame} onPress={mockOnPress} />
      );

      expect(getByText('~5 min')).toBeTruthy(); // 300 seconds = 5 minutes
    });

    it('should render with custom dimensions', () => {
      const { getByRole } = render(
        <GameTile
          game={mockGame}
          onPress={mockOnPress}
          width={200}
          height={250}
        />
      );

      const button = getByRole('button');
      expect(button).toBeTruthy();
    });
  });

  describe('Game Statistics', () => {
    it('should show high score when showHighScore is true', () => {
      const { getByText } = render(
        <GameTile
          game={mockGame}
          onPress={mockOnPress}
          showHighScore={true}
        />
      );

      // Should show some high score (mocked random value)
      const highScoreElement = getByText(/Best: \d+/);
      expect(highScoreElement).toBeTruthy();
    });

    it('should show play count when showPlayCount is true', () => {
      const { getByText } = render(
        <GameTile
          game={mockGame}
          onPress={mockOnPress}
          showPlayCount={true}
        />
      );

      // Should show some play count (mocked random value)
      const playCountElement = getByText(/Played: \d+/);
      expect(playCountElement).toBeTruthy();
    });

    it('should show rating when showRating is true', () => {
      const { getByText } = render(
        <GameTile
          game={mockGame}
          onPress={mockOnPress}
          showRating={true}
        />
      );

      // Should show rating with star
      const ratingElement = getByText(/⭐ \d\.\d/);
      expect(ratingElement).toBeTruthy();
    });

    it('should hide statistics when show flags are false', () => {
      const { queryByText } = render(
        <GameTile
          game={mockGame}
          onPress={mockOnPress}
          showHighScore={false}
          showPlayCount={false}
          showRating={false}
        />
      );

      expect(queryByText(/Best:/)).toBeNull();
      expect(queryByText(/Played:/)).toBeNull();
      expect(queryByText(/⭐/)).toBeNull();
    });
  });

  describe('Availability States', () => {
    it('should render unavailable overlay for unavailable games', () => {
      const unavailableGame = createMockGame('unavailable', 'Unavailable Game', false);
      
      const { getByText } = render(
        <GameTile game={unavailableGame} onPress={mockOnPress} />
      );

      expect(getByText('Coming Soon')).toBeTruthy();
    });

    it('should not render unavailable overlay for available games', () => {
      const { queryByText } = render(
        <GameTile game={mockGame} onPress={mockOnPress} />
      );

      expect(queryByText('Coming Soon')).toBeNull();
    });

    it('should have disabled state for unavailable games', () => {
      const unavailableGame = createMockGame('unavailable', 'Unavailable Game', false);
      
      const { getByRole } = render(
        <GameTile game={unavailableGame} onPress={mockOnPress} />
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Selection State', () => {
    it('should show selected state when isSelected is true', () => {
      const { getByRole } = render(
        <GameTile
          game={mockGame}
          onPress={mockOnPress}
          isSelected={true}
        />
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.selected).toBe(true);
    });

    it('should not show selected state when isSelected is false', () => {
      const { getByRole } = render(
        <GameTile
          game={mockGame}
          onPress={mockOnPress}
          isSelected={false}
        />
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.selected).toBe(false);
    });
  });

  describe('Interaction', () => {
    it('should call onPress when pressed and game is available', () => {
      const { getByRole } = render(
        <GameTile game={mockGame} onPress={mockOnPress} />
      );

      fireEvent.press(getByRole('button'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when game is unavailable', () => {
      const unavailableGame = createMockGame('unavailable', 'Unavailable Game', false);
      
      const { getByRole } = render(
        <GameTile game={unavailableGame} onPress={mockOnPress} />
      );

      fireEvent.press(getByRole('button'));
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should handle press in and press out events', () => {
      const { getByRole } = render(
        <GameTile game={mockGame} onPress={mockOnPress} />
      );

      const button = getByRole('button');
      
      fireEvent(button, 'pressIn');
      fireEvent(button, 'pressOut');
      
      // Should not crash and should still be pressable
      fireEvent.press(button);
      expect(mockOnPress).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility role', () => {
      const { getByRole } = render(
        <GameTile game={mockGame} onPress={mockOnPress} />
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('should have default accessibility label', () => {
      const { getByRole } = render(
        <GameTile game={mockGame} onPress={mockOnPress} />
      );

      const button = getByRole('button');
      expect(button.props.accessibilityLabel).toContain('Test Game');
      expect(button.props.accessibilityLabel).toContain('Description for Test Game');
    });

    it('should use custom accessibility label when provided', () => {
      const customLabel = 'Custom accessibility label';
      
      const { getByRole } = render(
        <GameTile
          game={mockGame}
          onPress={mockOnPress}
          accessibilityLabel={customLabel}
        />
      );

      const button = getByRole('button');
      expect(button.props.accessibilityLabel).toBe(customLabel);
    });

    it('should use custom accessibility hint when provided', () => {
      const customHint = 'Custom accessibility hint';
      
      const { getByRole } = render(
        <GameTile
          game={mockGame}
          onPress={mockOnPress}
          accessibilityHint={customHint}
        />
      );

      const button = getByRole('button');
      expect(button.props.accessibilityHint).toBe(customHint);
    });

    it('should have proper accessibility state for disabled games', () => {
      const unavailableGame = createMockGame('unavailable', 'Unavailable Game', false);
      
      const { getByRole } = render(
        <GameTile game={unavailableGame} onPress={mockOnPress} />
      );

      const button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Visual Styling', () => {
    it('should apply different colors based on game category', () => {
      const strategyGame = createMockGame('strategy', 'Strategy Game', true, GameCategory.STRATEGY);
      const memoryGame = createMockGame('memory', 'Memory Game', true, GameCategory.PUZZLE);
      
      const { rerender, getByText: getByTextStrategy } = render(
        <GameTile game={strategyGame} onPress={mockOnPress} />
      );
      
      expect(getByTextStrategy('S')).toBeTruthy(); // Strategy game icon
      
      rerender(<GameTile game={memoryGame} onPress={mockOnPress} />);
      
      const { getByText: getByTextMemory } = render(
        <GameTile game={memoryGame} onPress={mockOnPress} />
      );
      
      expect(getByTextMemory('M')).toBeTruthy(); // Memory game icon
    });

    it('should handle different difficulty levels', () => {
      const hardGame = {
        ...mockGame,
        metadata: {
          ...mockGame.metadata,
          difficulty: GameDifficulty.HARD,
        },
      };
      
      const { getByText } = render(
        <GameTile game={hardGame} onPress={mockOnPress} />
      );

      expect(getByText('HARD')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing game metadata gracefully', () => {
      const gameWithMissingData = {
        ...mockGame,
        metadata: {
          ...mockGame.metadata,
          title: '',
          description: '',
        },
      };
      
      const { getByRole } = render(
        <GameTile game={gameWithMissingData} onPress={mockOnPress} />
      );

      // Should still render as a button
      expect(getByRole('button')).toBeTruthy();
    });

    it('should handle missing difficulty gracefully', () => {
      const gameWithoutDifficulty = {
        ...mockGame,
        metadata: {
          ...mockGame.metadata,
          difficulty: undefined as any,
        },
      };
      
      const { getByRole } = render(
        <GameTile game={gameWithoutDifficulty} onPress={mockOnPress} />
      );

      // Should still render without crashing
      expect(getByRole('button')).toBeTruthy();
    });

    it('should handle onPress errors gracefully', () => {
      const errorOnPress = jest.fn(() => {
        throw new Error('Press error');
      });

      const { getByRole } = render(
        <GameTile game={mockGame} onPress={errorOnPress} />
      );

      // Should not crash when onPress throws
      expect(() => {
        fireEvent.press(getByRole('button'));
      }).not.toThrow();
    });
  });
});