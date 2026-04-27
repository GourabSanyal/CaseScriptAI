import type { Config } from "jest";

const config: Config = {
  preset: "jest-expo",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts", "<rootDir>/tests/**/*.test.tsx"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.ts"],
  clearMocks: true,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/**",
    "!src/**/index.ts",
  ],
  coverageDirectory: "<rootDir>/tests/coverage",
};

export default config;
