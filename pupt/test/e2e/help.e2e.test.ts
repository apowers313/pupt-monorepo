import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { E2eTestEnvironment } from './e2e-env.js';

describe('pt help E2E', () => {
  let env: E2eTestEnvironment;

  beforeEach(async () => {
    env = await E2eTestEnvironment.create();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('general help', () => {
    it('should show general help with pt help', () => {
      const result = env.exec('help');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('run');
      expect(result.stdout).toContain('history');
    });
  });

  describe('command-specific help', () => {
    it('should show help for run command', () => {
      const result = env.exec('help run');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('run');
      expect(result.stdout).toContain('Execute a prompt');
    });

    it('should show help for history command', () => {
      const result = env.exec('help history');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('history');
    });

    it('should show help for config command', () => {
      const result = env.exec('help config');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('config');
    });

    it('should show help for init command', () => {
      const result = env.exec('help init');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('init');
      expect(result.stdout).toContain('Initialize');
    });

    it('should show help for install command', () => {
      const result = env.exec('help install');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('install');
    });

    it('should show help for review command', () => {
      const result = env.exec('help review');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('review');
    });
  });

  describe('unknown command help', () => {
    it('should error on unknown command name', () => {
      const result = env.exec('help nonexistent', { expectError: true });

      expect(result.exitCode).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('Unknown command');
    });
  });
});
