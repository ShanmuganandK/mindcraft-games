/**
 * GameGrid component with dynamic layout that supports expansion beyond 3x3
 * Provides scrolling support and accessibility features
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  RefreshControl,
  AccessibilityInfo,
  FlatList,
  LayoutChangeEvent,
} from 'react-native';
import { GameTile } from './GameTile';
import { GameModule } from '../types/game';

interface GameGridProps {
  games: GameModule[];
  onGameSelect: (game: GameModule) => void;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  numColumns?: number;
  maxColumns?: number;
  minTileWidth?: number;
  spacing?: number;
  accessibilityLabel?: string;
}

interface GridLayout {
  numColumns: number;
  tileWidth: number;
  spacing: number;
  containerWidth: number;
}

export const GameGrid: React.FC<GameGridProps> = ({
  games,
  onGameSelect,
  onRefresh,
  refreshing = false,
  numColumns,
  maxColumns = 4,
  minTileWidth = 150,
  spacing = 16,
  accessibilityLabel = 'Games grid',
}) => {
  const [layout, setLayout] = useState<GridLayout>({
    numColumns: numColumns || 2,
    tileWidth: 150,
    spacing,
    containerWidth: Dimensions.get('window').width,
  });

  const [selectedGameIndex, setSelectedGameIndex] = useState<number>(-1);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      calculateLayout(window.width);
    });

    return () => subscription?.remove();
  }, []);

  const calculateLayout = useCallback((containerWidth: number) => {
    const availableWidth = containerWidth - (spacing * 2); // Account for container padding
    
    let calculatedColumns = numColumns || 2;
    
    if (!numColumns) {
      // Calculate optimal number of columns based on screen width and minimum tile width
      calculatedColumns = Math.floor(availableWidth / (minTileWidth + spacing));
      calculatedColumns = Math.max(1, Math.min(calculatedColumns, maxColumns));
    }
    
    // Calculate tile width based on number of columns
    const totalSpacing = spacing * (calculatedColumns - 1);
    const calculatedTileWidth = (availableWidth - totalSpacing) / calculatedColumns;
    
    setLayout({
      numColumns: calculatedColumns,
      tileWidth: Math.max(calculatedTileWidth, minTileWidth),
      spacing,
      containerWidth,
    });
  }, [numColumns, maxColumns, minTileWidth, spacing]);

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    calculateLayout(width);
  };

  const handleGamePress = useCallback((game: GameModule, index: number) => {
    setSelectedGameIndex(index);
    
    // Announce selection to screen readers
    AccessibilityInfo.announceForAccessibility(
      `Selected ${game.metadata.title}. ${game.metadata.description}`
    );
    
    onGameSelect(game);
  }, [onGameSelect]);

  const handleKeyboardNavigation = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (games.length === 0) return;
    
    let newIndex = selectedGameIndex;
    
    switch (direction) {
      case 'left':
        newIndex = Math.max(0, selectedGameIndex - 1);
        break;
      case 'right':
        newIndex = Math.min(games.length - 1, selectedGameIndex + 1);
        break;
      case 'up':
        newIndex = Math.max(0, selectedGameIndex - layout.numColumns);
        break;
      case 'down':
        newIndex = Math.min(games.length - 1, selectedGameIndex + layout.numColumns);
        break;
    }
    
    if (newIndex !== selectedGameIndex) {
      setSelectedGameIndex(newIndex);
      const game = games[newIndex];
      AccessibilityInfo.announceForAccessibility(
        `Focused on ${game.metadata.title}. ${game.metadata.description}`
      );
    }
  }, [selectedGameIndex, games, layout.numColumns]);

  const renderGameTile = ({ item: game, index }: { item: GameModule; index: number }) => {
    return (
      <View style={[styles.tileContainer, { width: layout.tileWidth }]}>
        <GameTile
          game={game}
          onPress={() => handleGamePress(game, index)}
          width={layout.tileWidth}
          isSelected={index === selectedGameIndex}
          accessibilityLabel={`${game.metadata.title}. ${game.metadata.description}. ${
            game.isEnabled ? 'Available to play' : 'Coming soon'
          }`}
          accessibilityHint={
            game.isEnabled
              ? 'Double tap to start playing'
              : 'This game is not yet available'
          }
        />
      </View>
    );
  };

  const getItemLayout = (_: any, index: number) => {
    const row = Math.floor(index / layout.numColumns);
    const tileHeight = 200; // Approximate tile height
    const rowSpacing = 16;
    
    return {
      length: tileHeight,
      offset: row * (tileHeight + rowSpacing),
      index,
    };
  };

  const keyExtractor = (item: GameModule) => item.id;

  if (games.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>No Games Available</Text>
          <Text style={styles.emptyDescription}>
            Check back later for new games to play!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View 
      style={styles.container} 
      onLayout={handleContainerLayout}
      accessible={false} // Let FlatList handle accessibility
    >
      <FlatList
        data={games}
        renderItem={renderGameTile}
        keyExtractor={keyExtractor}
        numColumns={layout.numColumns}
        key={`${layout.numColumns}-${layout.tileWidth}`} // Force re-render when layout changes
        contentContainerStyle={[
          styles.gridContent,
          { paddingHorizontal: spacing }
        ]}
        columnWrapperStyle={layout.numColumns > 1 ? styles.row : undefined}
        showsVerticalScrollIndicator={true}
        scrollIndicatorInsets={{ right: 1 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#007AFF"
              accessibilityLabel="Pull to refresh games"
            />
          ) : undefined
        }
        accessibilityLabel={accessibilityLabel}
        getItemLayout={getItemLayout}
        initialNumToRender={layout.numColumns * 3} // Render 3 rows initially
        maxToRenderPerBatch={layout.numColumns * 2} // Render 2 rows per batch
        windowSize={10}
        removeClippedSubviews={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridContent: {
    paddingVertical: 16,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  tileContainer: {
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default GameGrid;