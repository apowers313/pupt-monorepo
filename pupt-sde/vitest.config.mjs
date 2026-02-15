import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.mjs"],
    testTimeout: 10000,
    pool: "forks",
    env: {
      TZ: "UTC",
    },
  },
});
