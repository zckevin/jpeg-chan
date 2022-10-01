/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    "/dist/",
    "/out/",
  ],
  globals: {
    "ts-jest": {
      tsConfig: './tsconfig.json',
    }
  },
  transform: {
    "^.+\\.(ts|js)$": "ts-jest",
  },
  testRegex: ".*\.test\.ts$",
};
