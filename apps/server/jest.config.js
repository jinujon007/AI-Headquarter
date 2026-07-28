module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // The e2e suite makes real HTTP requests; undici's keep-alive sockets hold the
  // event loop open for a few seconds after the run. Everything is asserted and
  // awaited before teardown — forceExit only skips that idle socket wait.
  forceExit: true,
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
