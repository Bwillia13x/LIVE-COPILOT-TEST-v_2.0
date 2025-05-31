module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true, // Still useful for faster transpilation
        diagnostics: {
          ignoreCodes: ['TS151001']
        },
        babelConfig: true, // Tell ts-jest to use babel.config.js
      }
    ]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Attempt to resolve .js extensions in imports from .ts files
    '^(\\.{1,2}/.+)\\.js$': '$1',
  },
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
};
