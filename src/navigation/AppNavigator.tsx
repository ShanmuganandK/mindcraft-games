/**
 * Main app navigation structure for the Multi-Game Platform
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';

// Import screens (will be created)
import { HomeScreen } from '../screens/HomeScreen';
import { GameScreen } from '../screens/GameScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LoadingScreen } from '../screens/LoadingScreen';

// Navigation types
export type RootStackParamList = {
  Loading: undefined;
  Main: undefined;
  Game: { gameId: string; gameName: string };
};

export type MainTabParamList = {
  Home: undefined;
  Settings: undefined;
};

const RootStack = createStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

/**
 * Main tab navigator for the app
 */
function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarAccessibilityLabel: 'Main navigation',
      }}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Games',
          tabBarAccessibilityLabel: 'Games tab',
          tabBarAccessibilityHint: 'Navigate to games selection screen',
        }}
      />
      <MainTab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarAccessibilityLabel: 'Settings tab',
          tabBarAccessibilityHint: 'Navigate to settings screen',
        }}
      />
    </MainTab.Navigator>
  );
}

/**
 * Root stack navigator
 */
export function AppNavigator() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <RootStack.Navigator
        initialRouteName="Loading"
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      >
        <RootStack.Screen
          name="Loading"
          component={LoadingScreen}
          options={{
            animationEnabled: false,
          }}
        />
        <RootStack.Screen
          name="Main"
          component={MainTabNavigator}
          options={{
            gestureEnabled: false,
          }}
        />
        <RootStack.Screen
          name="Game"
          component={GameScreen}
          options={({ route }) => ({
            title: route.params.gameName,
            headerShown: true,
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerBackTitle: 'Games',
            headerAccessibilityLabel: `${route.params.gameName} game screen`,
            gestureEnabled: true,
            cardStyleInterpolator: ({ current, layouts }) => {
              return {
                cardStyle: {
                  transform: [
                    {
                      translateY: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.height, 0],
                      }),
                    },
                  ],
                },
              };
            },
          })}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}