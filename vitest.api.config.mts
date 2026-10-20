import { defineConfig } from "vitest/config";

import config from "./vitest.config.mts";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  ...config,
  test: {
    ...config.test,
    include: ["tests/api/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    fileParallelism: false,
  },
});
