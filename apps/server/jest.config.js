module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  globals: {
    'ts-jest': {
      tsconfig: {
        // Force CommonJS for Jest — tsconfig.base.json uses NodeNext which ts-jest
        // handles correctly only with explicit CJS compilation in test context
        module: 'CommonJS',
        moduleResolution: 'node',
      },
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
  ],
};
