import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { E2eTestEnvironment } from './e2e-env.js';

describe('E2E Environment Isolation', () => {
  let env: E2eTestEnvironment;

  beforeEach(async () => {
    env = await E2eTestEnvironment.create();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  it('should not find host config files when sandbox has no config', () => {
    // Run pt config with NO config file in the sandbox
    // This proves cosmiconfig did not traverse to find the host's real config
    const result = env.exec('config');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No config file found');
  });

  it('should use config file from sandbox when present', async () => {
    await env.writeConfig({
      promptDirs: ['./.test-prompts'],
      version: '5.0.0',
    });

    const result = env.exec('config');

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('.test-prompts');
    expect(result.stdout).toContain('Config file:');
  });

  it('should resolve ~ paths to the fake home directory', async () => {
    await env.writeConfig({
      promptDirs: ['~/.pt/prompts'],
      version: '5.0.0',
    });

    const result = env.exec('config');

    expect(result.exitCode).toBe(0);
    // The output should contain the fake home path, not the real home
    expect(result.stdout).toContain(env.homeDir);
  });

  it('should use isolated working directory', async () => {
    await env.writeConfig({
      promptDirs: ['./.prompts'],
      version: '5.0.0',
    });

    const result = env.exec('config');

    expect(result.exitCode).toBe(0);
    // Config file path should be inside the sandbox
    expect(result.stdout).toContain(env.workDir);
  });

  it('should have separate environments for each test instance', async () => {
    const env2 = await E2eTestEnvironment.create();

    try {
      // Write config to first env
      await env.writeConfig({
        promptDirs: ['./first-env-prompts'],
        version: '5.0.0',
      });

      // Second env should NOT see first env's config
      const result = env2.exec('config');
      expect(result.stdout).toContain('No config file found');
      expect(result.stdout).not.toContain('first-env-prompts');
    } finally {
      await env2.cleanup();
    }
  });
});
