module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@react-native-community/netinfo$': '<rootDir>/src/__tests__/mocks/netinfo.ts',
    '^react-native-executorch-expo-resource-fetcher$':
      '<rootDir>/src/__tests__/mocks/executorch-resource-fetcher.ts',
  },
  watchman: false,
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/', '/__tests__/mocks/'],
};
