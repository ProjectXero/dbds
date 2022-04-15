/** @type {import('ts-jest').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/__fixtures__/', '/dist/'],
  globalSetup: '<rootDir>/jest.setup.ts',
  globalTeardown: '<rootDir>/jest.teardown.ts',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/testing/**',
    '!**/__tests__/**',
    '!**/node_modules/**',
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },
}
