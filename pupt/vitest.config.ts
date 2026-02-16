import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test'
    },
    exclude: ['test/scripts/**', 'node_modules/**'],
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
      exclude: ['node_modules/', 'test/', 'dist/', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts', 'vitest.config.ts', 'eslint.config.js', 'commitlint.config.js', 'src/cli.ts', 'src/index.ts', 'docs/', 'tmp/', 'scripts/', 'src/scripts/', 'src/commands/init-refactored.ts'],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
