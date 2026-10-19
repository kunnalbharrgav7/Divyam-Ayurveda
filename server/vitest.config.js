import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["tests/setup.js"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
