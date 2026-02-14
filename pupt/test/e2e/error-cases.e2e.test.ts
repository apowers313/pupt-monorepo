import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { E2eTestEnvironment } from './e2e-env.js';

describe('pt error cases E2E', () => {
  let env: E2eTestEnvironment;

  beforeEach(async () => {
    env = await E2eTestEnvironment.create();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('unknown commands', () => {
    it('should suggest similar commands for typos', () => {
      const result = env.exec('rnu', { expectError: true });

      expect(result.exitCode).not.toBe(0);
      // Should suggest 'run' as it's close to 'rnu'
      const output = result.stdout + result.stderr;
      expect(output).toContain('run');
    });

    it('should handle completely unknown commands', () => {
      const result = env.exec('zzzzz', { expectError: true });

      expect(result.exitCode).not.toBe(0);
    });

    it('should suggest init for ini typo', () => {
      const result = env.exec('ini', { expectError: true });

      expect(result.exitCode).not.toBe(0);
      const output = result.stdout + result.stderr;
      expect(output).toContain('init');
    });

    it('should suggest history for histry typo', () => {
      const result = env.exec('histry', { expectError: true });

      expect(result.exitCode).not.toBe(0);
      const output = result.stdout + result.stderr;
      expect(output).toContain('history');
    });
  });

  describe('invalid config', () => {
    it('should handle malformed JSON config gracefully', async () => {
      // Write invalid JSON directly to the config file in configDir
      const fs = await import('fs-extra');
      const path = await import('path');
      await fs.ensureDir(env.configDir);
      await fs.writeFile(
        path.join(env.configDir, 'config.json'),
        '{ invalid json }'
      );

      const result = env.exec('config', { expectError: true });

      expect(result.exitCode).not.toBe(0);
    });

    it('should handle config with invalid schema', async () => {
      // Write config with invalid types to configDir
      const fs = await import('fs-extra');
      const path = await import('path');
      await fs.ensureDir(env.configDir);
      await fs.writeJson(path.join(env.configDir, 'config.json'), {
        promptDirs: 123, // Should be array
        version: '8.0.0',
      });

      const result = env.exec('config', { expectError: true });

      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('missing resources', () => {
    it('should handle missing prompt directory gracefully', async () => {
      await env.writeConfig({
        promptDirs: ['./nonexistent-prompts'],
        version: '8.0.0',
      });

      // Config should show the directory as not existing
      const result = env.exec('config');

      expect(result.exitCode).toBe(0);
      // The config display shows a checkmark or X for existing directories
      // A missing directory should show up in the output
      expect(result.stdout).toContain('nonexistent-prompts');
    });

    it('should error when running with nonexistent prompt', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '8.0.0',
      });
      // Create a valid prompt, but search for a different name
      await env.writePrompt('.prompts', 'exists.prompt', `<Prompt name="exists">
  I exist
</Prompt>`);

      const result = env.exec('run cat -p nonexistent --no-interactive', { expectError: true });

      expect(result.exitCode).not.toBe(0);
    });
  });
});
