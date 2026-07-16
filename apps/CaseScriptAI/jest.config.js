module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  watchman: false,
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/'],
};
