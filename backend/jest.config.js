module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/config/database.js',
    '!src/models/index.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};
