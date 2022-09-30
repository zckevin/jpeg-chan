/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testPathIgnorePatterns: [
    "/dist/",
    "/out/",
  ],
  globals: {
    "ts-jest": {
      // load the correct config for tests
      "tsConfig": './tsconfig.json'
    }
  },
  testRegex: ".*\.test\.ts$",
};
