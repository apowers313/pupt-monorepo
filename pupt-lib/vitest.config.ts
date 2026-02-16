import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Windows CI can be slow to load large modules like @babel/standalone
// Use a higher timeout for CI environments
const isCI = process.env.CI === 'true';
const testTimeout = isCI ? 30000 : 5000;
const noThresholds = process.env.VITEST_COVERAGE_NO_THRESHOLDS === 'true';

// Self-referencing aliases so components/ can import from 'pupt-lib'
const selfRefAlias = {
  'pupt-lib/jsx-runtime': resolve(__dirname, 'src/jsx-runtime/index.ts'),
  'pupt-lib': resolve(__dirname, 'src/index.ts'),
};

export default defineConfig({
  resolve: {
    alias: selfRefAlias,
  },
  test: {
    testTimeout,
    // Retry failed tests to handle transient CI failures
    retry: isCI ? 2 : 0,
    projects: [
      // Node.js project - runs unit tests in Node environment
      {
        resolve: {
          alias: selfRefAlias,
        },
        test: {
          name: 'node',
          globals: false,
          environment: 'node',
          testTimeout,
          retry: isCI ? 2 : 0,
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
        resolve: {
          alias: selfRefAlias,
        },
        test: {
          name: 'browser',
          globals: false,
          testTimeout,
          retry: isCI ? 2 : 0,
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
      include: ['src/**/*.ts', 'components/**/*.tsx'],
      exclude: ['src/**/*.d.ts', 'src/types/**/*'],
      thresholds: noThresholds ? undefined : {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
