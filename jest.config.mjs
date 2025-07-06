/** @type {import('jest').Config} */
const config = {
  clearMocks: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.js'],
  testEnvironment: 'node',
  testMatch: [
    '**/tests/{integration,models}/**/*.?(m)[jt]s?(x)',
    '**/?(*.)+(spec|test).?(m)[jt]s?(x)'
  ],
  transform: {}
}

export default config
