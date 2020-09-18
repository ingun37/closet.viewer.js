module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    "^@bg(.*)$": "<rootDir>/src/lib/clo/background$1",
  },
  transform: {
    "\\.(jpg|jpeg|png)$": "<rootDir>/__mocks__/image2DataURL.js",
  },
};