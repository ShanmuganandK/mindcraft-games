/**
 * Unit tests for GameGrid component
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GameGrid } from '../GameGrid';
import { 
  GameModule, 
  GameCategory, 
  GameDifficulty, 
  ScoreType, 
  SortOrder, 
  ResetPeriod, 
  DeviceOrientation 
} from '../../types/game';

// Mock the GameTile component
jest.mock('../GameTile', () => ({
  GameTile: ({ game, onPress, isSelected }: any) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity
        testID={`game-tile-${game.id}`}
        onPress={onPress}
        accessibilityLabel={`${game.metadata.title} tile`}
      >
        <View>
          <Text>{game.metadata.title}</Text>
          <Text>{isSelected ? 'Selected' : 'Not Selected'}</Text>
        </View>
      </TouchableOpacity>
    );
  },
}));

const createMockGame = (id: string, title: string, isAvailable: boolean = true): GameModule => ({
  id,
  metadata: {
    title,
    description: `Description for ${title}`,
    shortDescription: `Short description for ${title}`,
    iconUrl: '',
    thumbnailUrl: '',
    category: GameCategory.STRATEGY,
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

describe('GameGrid', () => {
  const mockGames = [
    createMockGame('game1', 'Game 1'),
    createMockGame('game2', 'Game 2'),
    createMockGame('game3', 'Game 3'),
    createMockGame('game4', 'Game 4', false),
  ];

  const mockOnGameSelect = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all games', () => {
      const { getByTestId } = render(
        <GameGrid games={mockGames} onGameSelect={mockOnGameSelect} />
      );

      mockGames.forEach(game => {
        expect(getByTestId(`game-tile-${game.id}`)).toBeTruthy();
      });
    });

    it('should render empty state when no games provided', () => {
      const { getByText } = render(
        <GameGrid games={[]} onGameSelect={mockOnGameSelect} />
      );

      expect(getByText('No Games Available')).toBeTruthy();
      expect(getByText('Check back later for new games to play!')).toBeTruthy();
    });

    it('should render with custom accessibility label', () => {
      const customLabel = 'Custom games grid';
      const { getByLabelText } = render(
        <GameGrid
          games={mockGames}
          onGameSelect={mockOnGameSelect}
          accessibilityLabel={customLabel}
        />
      );

      expect(getByLabelText(customLabel)).toBeTruthy();
    });
  });

  describe('Game Selection', () => {
    it('should call onGameSelect when a game is pressed', () => {
      const { getByTestId } = render(
        <GameGrid games={mockGames} onGameSelect={mockOnGameSelect} />
      );

      fireEvent.press(getByTestId('game-tile-game1'));

      expect(mockOnGameSelect).toHaveBeenCalledWith(mockGames[0]);
    });

    it('should handle multiple game selections', () => {
      const { getByTestId } = render(
        <GameGrid games={mockGames} onGameSelect={mockOnGameSelect} />
      );

      fireEvent.press(getByTestId('game-tile-game1'));
      fireEvent.press(getByTestId('game-tile-game2'));

      expect(mockOnGameSelect).toHaveBeenCalledTimes(2);
      expect(mockOnGameSelect).toHaveBeenNthCalledWith(1, mockGames[0]);
      expect(mockOnGameSelect).toHaveBeenNthCalledWith(2, mockGames[1]);
    });
  });

  describe('Refresh Functionality', () => {
    it('should show refresh control when onRefresh is provided', () => {
      const { getByLabelText } = render(
        <GameGrid
          games={mockGames}
          onGameSelect={mockOnGameSelect}
          onRefresh={mockOnRefresh}
        />
      );

      expect(getByLabelText('Pull to refresh games')).toBeTruthy();
    });

    it('should not show refresh control when onRefresh is not provided', () => {
      const { queryByLabelText } = render(
        <GameGrid games={mockGames} onGameSelect={mockOnGameSelect} />
      );

      expect(queryByLabelText('Pull to refresh games')).toBeNull();
    });

    it('should call onRefresh when refresh is triggered', async () => {
      mockOnRefresh.mockResolvedValue(undefined);

      const { getByLabelText } = render(
        <GameGrid
          games={mockGames}
          onGameSelect={mockOnGameSelect}
          onRefresh={mockOnRefresh}
        />
      );

      const refreshControl = getByLabelText('Pull to refresh games');
      fireEvent(refreshControl, 'refresh');

      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalled();
      });
    });
  });

  describe('Layout and Responsiveness', () => {
    it('should handle layout changes', () => {
      const { getByTestId } = render(
        <GameGrid games={mockGames} onGameSelect={mockOnGameSelect} />
      );

      // Simulate layout change
      const gridContainer = getByTestId('game-tile-game1').parent?.parent?.parent;
      if (gridContainer) {
        fireEvent(gridContainer, 'layout', {
          nativeEvent: {
            layout: { width: 400, height: 600 },
          },
        });
      }

      // Grid should still render games after layout change
      expect(getByTestId('game-tile-game1')).toBeTruthy();
    });

    it('should support custom number of columns', () => {
      const { getByTestId } = render(
        <GameGrid
          games={mockGames}
          onGameSelect={mockOnGameSelect}
          numColumns={3}
        />
      );

      // Should still render all games regardless of column count
      mockGames.forEach(game => {
        expect(getByTestId(`game-tile-${game.id}`)).toBeTruthy();
      });
    });

    it('should support custom spacing', () => {
      const { getByTestId } = render(
        <GameGrid
          games={mockGames}
          onGameSelect={mockOnGameSelect}
          spacing={24}
        />
      );

      // Should render games with custom spacing
      expect(getByTestId('game-tile-game1')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility role', () => {
      const { getByRole } = render(
        <GameGrid games={mockGames} onGameSelect={mockOnGameSelect} />
      );

      expect(getByRole('grid')).toBeTruthy();
    });

    it('should support keyboard navigation', () => {
      const { getByTestId } = render(
        <GameGrid games={mockGames} onGameSelect={mockOnGameSelect} />
      );

      const grid = getByTestId('game-tile-game1').parent?.parent?.parent;
      
      if (grid) {
        // Test arrow key navigation
        fireEvent(grid, 'keyPress', {
          nativeEvent: { key: 'ArrowRight' },
        });

        fireEvent(grid, 'keyPress', {
          nativeEvent: { key: 'ArrowDown' },
        });

        fireEvent(grid, 'keyPress', {
          nativeEvent: { key: 'Enter' },
        });
      }

      // Should handle keyboard events without crashing
      expect(getByTestId('game-tile-game1')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle large number of games', () => {
      const manyGames = Array.from({ length: 50 }, (_, i) =>
        createMockGame(`game${i}`, `Game ${i}`)
      );

      const { getByTestId } = render(
        <GameGrid games={manyGames} onGameSelect={mockOnGameSelect} />
      );

      // Should render first few games (due to virtualization)
      expect(getByTestId('game-tile-game0')).toBeTruthy();
    });

    it('should support lazy loading with getItemLayout', () => {
      const { getByTestId } = render(
        <GameGrid games={mockGames} onGameSelect={mockOnGameSelect} />
      );

      // Should render without issues when getItemLayout is used
      expect(getByTestId('game-tile-game1')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle games with missing metadata gracefully', () => {
      const gamesWithMissingData = [
        {
          ...mockGames[0],
          metadata: {
            ...mockGames[0].metadata,
            title: '',
          },
        },
      ];

      const { getByTestId } = render(
        <GameGrid games={gamesWithMissingData} onGameSelect={mockOnGameSelect} />
      );

      expect(getByTestId('game-tile-game1')).toBeTruthy();
    });

    it('should handle onGameSelect errors gracefully', () => {
      const errorOnGameSelect = jest.fn(() => {
        throw new Error('Selection error');
      });

      const { getByTestId } = render(
        <GameGrid games={mockGames} onGameSelect={errorOnGameSelect} />
      );

      // Should not crash when onGameSelect throws
      expect(() => {
        fireEvent.press(getByTestId('game-tile-game1'));
      }).not.toThrow();
    });
  });
});