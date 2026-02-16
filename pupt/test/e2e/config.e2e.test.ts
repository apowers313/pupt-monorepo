import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { E2eTestEnvironment } from './e2e-env.js';

describe('pt config E2E', () => {
  let env: E2eTestEnvironment;

  beforeEach(async () => {
    env = await E2eTestEnvironment.create();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('pt config (show)', () => {
    it('should show config when config file exists', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
      });

      const result = env.exec('config');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Prompt Directories:');
      expect(result.stdout).toContain('.prompts');
      expect(result.stdout).toContain('Config file:');
    });

    it('should show defaults when no config file exists', () => {
      const result = env.exec('config');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No config file found');
    });

    it('should show history directory when configured', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        historyDir: './.pt-history',
        version: '8.0.0',
      });

      const result = env.exec('config');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('History Directory:');
      expect(result.stdout).toContain('.pt-history');
    });

    it('should show annotation directory when configured', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        historyDir: './.pt-history',
        annotationDir: './.pt-annotations',
        version: '8.0.0',
      });

      const result = env.exec('config');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Annotation Directory:');
      expect(result.stdout).toContain('.pt-annotations');
    });

    it('should show default command when configured', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        defaultCmd: 'claude',
        defaultCmdArgs: ['--model', 'opus'],
        version: '8.0.0',
      });

      const result = env.exec('config');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Default Command:');
      expect(result.stdout).toContain('claude');
    });

    it('should show autoRun status', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        autoRun: true,
        version: '8.0.0',
      });

      const result = env.exec('config');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Auto Run:');
      expect(result.stdout).toContain('enabled');
    });

    it('should produce same output with --show flag', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
      });

      const result1 = env.exec('config');
      const result2 = env.exec('config --show');

      expect(result1.stdout).toBe(result2.stdout);
    });
  });
});
