import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test'
    },
    setupFiles: ['./test/setup.ts'],
    teardownTimeout: 10000,
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 1,
        execArgv: ['--expose-gc', '--max-old-space-size=8192']
      }
    },
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'test/', 'dist/', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts', 'vitest.config.ts', 'eslint.config.js', 'src/cli.ts', 'src/index.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});