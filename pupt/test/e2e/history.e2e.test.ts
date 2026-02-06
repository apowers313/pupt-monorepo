import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { E2eTestEnvironment } from './e2e-env.js';

describe('pt history E2E', () => {
  let env: E2eTestEnvironment;

  beforeEach(async () => {
    env = await E2eTestEnvironment.create();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('history not configured', () => {
    it('should error when history is not configured', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '5.0.0',
        // No historyDir
      });

      const result = env.exec('history', { expectError: true });

      expect(result.exitCode).not.toBe(0);
      const output = result.stdout + result.stderr;
      expect(output.toLowerCase()).toMatch(/history|not enabled|not configured/);
    });
  });

  describe('empty history', () => {
    it('should show message when no history entries exist', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        historyDir: './.pt-history',
        version: '5.0.0',
      });

      // Create empty history directory
      const fs = await import('fs-extra');
      const path = await import('path');
      await fs.ensureDir(path.join(env.workDir, '.pt-history'));

      const result = env.exec('history --all-dir');

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain('no history');
    });
  });

  describe('listing history', () => {
    beforeEach(async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        historyDir: './.pt-history',
        version: '5.0.0',
      });

      // Create history entries
      // Filename format: YYYYMMDD-HHMMSS-<8hex>.json (must be valid hex: 0-9, a-f)
      await env.writeHistoryEntry('.pt-history', '20250115-100000-abcd1234.json', {
        timestamp: '2025-01-15T10:00:00.000Z',
        templatePath: 'first.prompt',
        templateContent: 'First prompt',
        variables: {},
        finalPrompt: 'First prompt rendered',
        title: 'First Entry',
      });

      await env.writeHistoryEntry('.pt-history', '20250115-110000-beef5678.json', {
        timestamp: '2025-01-15T11:00:00.000Z',
        templatePath: 'second.prompt',
        templateContent: 'Second prompt',
        variables: { name: 'World' },
        finalPrompt: 'Hello World',
        title: 'Second Entry',
      });

      await env.writeHistoryEntry('.pt-history', '20250115-120000-cafe9012.json', {
        timestamp: '2025-01-15T12:00:00.000Z',
        templatePath: 'third.prompt',
        templateContent: 'Third prompt',
        variables: {},
        finalPrompt: 'Third prompt rendered',
        title: 'Third Entry',
      });
    });

    it('should list history entries', () => {
      const result = env.exec('history --all-dir');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('First Entry');
      expect(result.stdout).toContain('Second Entry');
      expect(result.stdout).toContain('Third Entry');
    });

    it('should respect --limit flag', () => {
      const result = env.exec('history --limit 2 --all-dir');

      expect(result.exitCode).toBe(0);
      // Should show the 2 most recent entries
      expect(result.stdout).toContain('Third Entry');
      expect(result.stdout).toContain('Second Entry');
      // Should not show the oldest entry
      expect(result.stdout).not.toContain('First Entry');
    });

    it('should show entry not found for invalid number', () => {
      const result = env.exec('history 99 --all-dir', { expectError: true });

      const output = result.stdout + result.stderr;
      expect(output.toLowerCase()).toContain('not found');
    });
  });

  describe('viewing specific entry', () => {
    beforeEach(async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        historyDir: './.pt-history',
        version: '5.0.0',
      });

      await env.writeHistoryEntry('.pt-history', '20250115-100000-abcd1234.json', {
        timestamp: '2025-01-15T10:00:00.000Z',
        templatePath: 'test.prompt',
        templateContent: 'Hello {inputs.name}',
        variables: { name: 'World' },
        finalPrompt: 'Hello World',
        title: 'Test Entry',
      });
    });

    it('should show specific entry details', () => {
      const result = env.exec('history 1 --all-dir');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Test Entry');
      expect(result.stdout).toContain('test.prompt');
    });
  });
});
