const nextJest = require('next/jest')

const createJestConfig = async () => {
  const nextConfig = await nextJest({
    dir: './',
  })

  return nextConfig({
    coverageProvider: 'v8',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    collectCoverageFrom: [
      'components/**/*.{js,jsx,ts,tsx}',
      'app/**/*.{js,jsx,ts,tsx}',
      '!**/*.d.ts',
      '!**/*.stories.{js,jsx,ts,tsx}',
      '!**/__tests__/**',
      '!**/__mocks__/**',
    ],
    coveragePathIgnorePatterns: [
      '/node_modules/',
      '/.next/',
    ],
    coverageThreshold: {
      global: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },
    testMatch: [
      '<rootDir>/__tests__/**/*.{js,jsx,ts,tsx}',
      '<rootDir>/**/*.{spec,test}.{js,jsx,ts,tsx}',
    ],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/$1',
    },
  })
}

module.exports = createJestConfig()
