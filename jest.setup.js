/* global jest */
require('react-native-gesture-handler/jestSetup');

jest.mock('react-native-reanimated', () => require('react-native-reanimated/lib/module/mock'));
jest.mock('react-native-worklets', () => require('./__tests__/workletsMock'));
jest.mock('@shopify/flash-list', () => require('./__tests__/flashListMock'));
