import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Animated = {
    View,
    createAnimatedComponent: (Component: unknown) => Component,
    Text: require('react-native').Text,
  };
  return {
    __esModule: true,
    default: Animated,
    Easing: { bezier: () => ({}) },
    FadeIn: {},
    FadeInDown: {},
    FadeOut: {},
    LinearTransition: {},
    useSharedValue: (value: unknown) => ({ value }),
    useAnimatedStyle: () => ({}),
    withTiming: (value: unknown) => value,
    withSpring: (value: unknown) => value,
    runOnJS: (fn: (...args: unknown[]) => unknown) => fn,
    Extrapolation: { CLAMP: 'clamp' },
    interpolate: () => 0,
  };
});

jest.mock('react-native-worklets', () => ({
  __esModule: true,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => '00000000-0000-4000-8000-000000000001',
}));
