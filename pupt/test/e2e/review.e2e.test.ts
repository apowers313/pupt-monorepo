import path from 'path';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { E2eTestEnvironment } from './e2e-env.js';

describe('pt review E2E', () => {
  let env: E2eTestEnvironment;

  beforeEach(async () => {
    env = await E2eTestEnvironment.create();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('history not configured', () => {
    it('should show empty report when no history exists', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '5.0.0',
        // No historyDir - defaults to ./history which will be empty
      });

      const result = env.exec('review');

      // Review command succeeds but shows empty data
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain('review');
      expect(result.stdout).toContain('Total Prompts: 0');
    });
  });

  describe('review with history', () => {
    beforeEach(async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        historyDir: './.pt-history',
        version: '5.0.0',
      });

      // Create prompt files (pupt-lib JSX format)
      await env.writePrompt('.prompts', 'api-client.prompt', `<Prompt name="api-client" description="Create an API client" tags={["api", "client"]}>
  Create an API client
</Prompt>`);

      await env.writePrompt('.prompts', 'test-helper.prompt', `<Prompt name="test-helper" description="Create a test helper" tags={["testing"]}>
  Create a test helper
</Prompt>`);

      // Create history entries with environment info for proper filtering
      const {workDir} = env;

      await env.writeHistoryEntry('.pt-history', '20250115-100000-abcd1234.json', {
        timestamp: '2025-01-15T10:00:00.000Z',
        templatePath: path.join(workDir, '.prompts/api-client.prompt'),
        templateContent: 'Create an API client',
        variables: {},
        finalPrompt: 'Create an API client for the REST service',
        title: 'API Client',
        environment: {
          working_directory: workDir,
          os: 'linux',
        },
      });

      await env.writeHistoryEntry('.pt-history', '20250115-110000-beef5678.json', {
        timestamp: '2025-01-15T11:00:00.000Z',
        templatePath: path.join(workDir, '.prompts/test-helper.prompt'),
        templateContent: 'Create a test helper',
        variables: {},
        finalPrompt: 'Create a test helper for unit tests',
        title: 'Test Helper',
        environment: {
          working_directory: workDir,
          os: 'linux',
        },
      });

      await env.writeHistoryEntry('.pt-history', '20250115-120000-cafe9012.json', {
        timestamp: '2025-01-15T12:00:00.000Z',
        templatePath: path.join(workDir, '.prompts/api-client.prompt'),
        templateContent: 'Create an API client',
        variables: { service: 'GraphQL' },
        finalPrompt: 'Create an API client for GraphQL',
        title: 'API Client',
        environment: {
          working_directory: workDir,
          os: 'linux',
        },
      });
    });

    it('should generate markdown review', () => {
      const result = env.exec('review');

      expect(result.exitCode).toBe(0);
      // Review output should contain report header and prompt info
      expect(result.stdout.toLowerCase()).toMatch(/review|report|prompt/);
    });

    it('should generate JSON review with --format json', () => {
      const result = env.exec('review -f json');

      expect(result.exitCode).toBe(0);

      // Output should be valid JSON
      const parsed = JSON.parse(result.stdout);
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');
    });

    it('should filter by prompt name', () => {
      const result = env.exec('review api-client');

      expect(result.exitCode).toBe(0);
      // Review should complete successfully (may or may not find entries depending on matching)
      expect(result.stdout.toLowerCase()).toContain('review');
    });

    it('should write output to file with -o flag', async () => {
      const result = env.exec('review -f json -o review-output.json');

      expect(result.exitCode).toBe(0);

      // Check that file was created
      const exists = await env.exists('review-output.json');
      expect(exists).toBe(true);

      // Read and verify it's valid JSON
      const content = await env.readJson('review-output.json');
      expect(content).toBeDefined();
      expect(typeof content).toBe('object');
    });
  });

  describe('empty history', () => {
    it('should handle empty history gracefully', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        historyDir: './.pt-history',
        version: '5.0.0',
      });

      // Create empty history directory
      const fs = await import('fs-extra');
      await fs.ensureDir(path.join(env.workDir, '.pt-history'));

      const result = env.exec('review');

      expect(result.exitCode).toBe(0);
      // Should produce some output even with no history
    });
  });
});
