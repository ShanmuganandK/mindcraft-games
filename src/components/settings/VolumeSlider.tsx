/**
 * Volume Slider Component - Accessible volume control with visual feedback
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  State,
} from 'react-native';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

interface VolumeSliderProps {
  label: string;
  value: number; // 0-100
  onValueChange: (value: number) => void;
  enabled?: boolean;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  showValueLabel?: boolean;
  color?: string;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  label,
  value,
  onValueChange,
  enabled = true,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  accessibilityLabel,
  accessibilityHint,
  showValueLabel = true,
  color = '#007AFF',
}) => {
  const [sliderWidth, setSliderWidth] = useState(0);
  const translateX = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // Calculate initial position based on value
  React.useEffect(() => {
    if (sliderWidth > 0) {
      const normalizedValue = (value - minimumValue) / (maximumValue - minimumValue);
      translateX.value = normalizedValue * sliderWidth;
    }
  }, [value, sliderWidth, minimumValue, maximumValue]);

  const updateValue = useCallback((newValue: number) => {
    const clampedValue = Math.max(minimumValue, Math.min(maximumValue, newValue));
    const steppedValue = Math.round(clampedValue / step) * step;
    onValueChange(steppedValue);
  }, [onValueChange, minimumValue, maximumValue, step]);

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      isDragging.value = true;
    },
    onActive: (event) => {
      if (!enabled) return;
      
      const newTranslateX = Math.max(0, Math.min(sliderWidth, event.absoluteX - 20)); // 20 is padding
      translateX.value = newTranslateX;
      
      const normalizedValue = newTranslateX / sliderWidth;
      const newValue = minimumValue + normalizedValue * (maximumValue - minimumValue);
      
      runOnJS(updateValue)(newValue);
    },
    onEnd: () => {
      isDragging.value = false;
    },
  });

  const thumbStyle = useAnimatedStyle(() => {
    const scale = isDragging.value ? 1.2 : 1;
    
    return {
      transform: [
        { translateX: translateX.value },
        { scale },
      ],
    };
  });

  const trackFillStyle = useAnimatedStyle(() => {
    return {
      width: translateX.value,
    };
  });

  const handleSliderLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    setSliderWidth(width - 40); // Account for thumb size
  };

  const normalizedValue = (value - minimumValue) / (maximumValue - minimumValue);
  const percentage = Math.round(normalizedValue * 100);

  return (
    <View style={[styles.container, !enabled && styles.disabled]}>
      <View style={styles.header}>
        <Text style={[styles.label, !enabled && styles.disabledText]}>
          {label}
        </Text>
        {showValueLabel && (
          <Text style={[styles.valueLabel, !enabled && styles.disabledText]}>
            {percentage}%
          </Text>
        )}
      </View>
      
      <View
        style={styles.sliderContainer}
        onLayout={handleSliderLayout}
        accessible={true}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel || `${label} volume slider`}
        accessibilityHint={accessibilityHint || `Current value is ${percentage}%. Swipe up or down to adjust.`}
        accessibilityValue={{
          min: minimumValue,
          max: maximumValue,
          now: value,
          text: `${percentage}%`,
        }}
      >
        <View style={[styles.track, !enabled && styles.disabledTrack]}>
          <Animated.View
            style={[
              styles.trackFill,
              { backgroundColor: enabled ? color : '#ccc' },
              trackFillStyle,
            ]}
          />
        </View>
        
        <PanGestureHandler onGestureEvent={gestureHandler} enabled={enabled}>
          <Animated.View
            style={[
              styles.thumb,
              { backgroundColor: enabled ? color : '#ccc' },
              thumbStyle,
            ]}
          />
        </PanGestureHandler>
        
        {/* Volume level indicators */}
        <View style={styles.indicators}>
          {[0, 25, 50, 75, 100].map((level) => (
            <View
              key={level}
              style={[
                styles.indicator,
                {
                  left: `${level}%`,
                  backgroundColor: percentage >= level ? color : '#e0e0e0',
                },
                !enabled && styles.disabledIndicator,
              ]}
            />
          ))}
        </View>
      </View>
      
      {/* Accessibility increment/decrement buttons */}
      <View style={styles.accessibilityControls}>
        <Text style={styles.accessibilityHint}>
          Swipe up to increase, down to decrease
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  disabled: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  valueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    minWidth: 40,
    textAlign: 'right',
  },
  disabledText: {
    color: '#999',
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  track: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  disabledTrack: {
    backgroundColor: '#f0f0f0',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  indicators: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    width: 2,
    height: 8,
    borderRadius: 1,
    marginLeft: -1, // Center the indicator
  },
  disabledIndicator: {
    backgroundColor: '#f0f0f0',
  },
  accessibilityControls: {
    marginTop: 8,
    alignItems: 'center',
  },
  accessibilityHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});