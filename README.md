# Multi-Game Platform

A React Native Expo application that provides users with access to multiple simple games within a single app, featuring platform gaming services integration and monetization through advertisements.

## Project Structure

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen components for navigation
├── games/          # Game modules and templates
├── services/       # Platform services (storage, ads, gaming services)
├── utils/          # Utility functions and helpers
├── types/          # TypeScript type definitions
└── hooks/          # Custom React hooks
```

## Development Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser
- `npm test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking

## Key Features

- **Extensible Architecture**: Modular design for easy game addition
- **Platform Integration**: Google Play Games Services & Game Center
- **Accessibility**: WCAG 2.1 AA compliance
- **Monetization**: Strategic ad placement with AdMob
- **Cross-Platform**: React Native with Expo for iOS and Android

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm start`
3. Follow the Expo CLI instructions to run on your preferred platform

## Technology Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation
- **Storage**: AsyncStorage + Expo SecureStore
- **Testing**: Jest
- **Linting**: ESLint + Prettier
