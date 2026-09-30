/* global jest */
require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('@shopify/flash-list', () => require('./__tests__/flashListMock'));
