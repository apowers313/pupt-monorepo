import { defineConfig } from 'vitest/config';

// Windows CI can be slow to load large modules like @babel/standalone
// Use a higher timeout for CI environments
const isCI = process.env.CI === 'true';
const testTimeout = isCI ? 30000 : 5000;

export default defineConfig({
  test: {
    testTimeout,
    projects: [
      // Node.js project - runs unit tests in Node environment
      {
        test: {
          name: 'node',
          globals: false,
          environment: 'node',
          include: ['test/**/*.test.ts'],
          exclude: [
            // Browser-specific tests
            'test/**/*.browser.test.ts',
            // Standard excludes
            '**/node_modules/**',
            '**/dist/**',
          ],
          setupFiles: ['./test/setup.ts'],
        },
      },
      // Browser project - runs in real Chromium via Playwright
      {
        test: {
          name: 'browser',
          globals: false,
          include: ['test/**/*.browser.test.ts'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
          ],
          // Note: Browser tests use their own setup due to Node module incompatibility
          browser: {
            enabled: true,
            headless: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/types/**/*'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
