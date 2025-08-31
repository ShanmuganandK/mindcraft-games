// Mock React Native components for testing
const React = require('react');

const mockComponent = (name) => {
  const Component = React.forwardRef((props, ref) => {
    return React.createElement(name, { ...props, ref });
  });
  Component.displayName = name;
  return Component;
};

const View = mockComponent('View');
const Text = mockComponent('Text');
const TouchableOpacity = mockComponent('TouchableOpacity');
const Pressable = mockComponent('Pressable');
const ScrollView = mockComponent('ScrollView');
const FlatList = mockComponent('FlatList');
const Image = mockComponent('Image');
const SafeAreaView = mockComponent('SafeAreaView');
const RefreshControl = mockComponent('RefreshControl');

const StyleSheet = {
  create: (styles) => styles,
};

const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 667 })),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
};

const AccessibilityInfo = {
  announceForAccessibility: jest.fn(),
};

const Animated = {
  View: mockComponent('Animated.View'),
  Value: jest.fn(() => ({
    setValue: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
  timing: jest.fn(() => ({
    start: jest.fn(),
  })),
  spring: jest.fn(() => ({
    start: jest.fn(),
  })),
  parallel: jest.fn(() => ({
    start: jest.fn(),
  })),
};

module.exports = {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  FlatList,
  Image,
  SafeAreaView,
  RefreshControl,
  StyleSheet,
  Dimensions,
  AccessibilityInfo,
  Animated,
};