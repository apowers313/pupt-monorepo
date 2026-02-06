import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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
        version: '5.0.0',
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
        version: '5.0.0',
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
        version: '5.0.0',
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
        version: '5.0.0',
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
        version: '5.0.0',
      });

      const result = env.exec('config');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Auto Run:');
      expect(result.stdout).toContain('enabled');
    });

    it('should produce same output with --show flag', async () => {
      await env.writeConfig({
        promptDirs: ['./.prompts'],
        version: '5.0.0',
      });

      const result1 = env.exec('config');
      const result2 = env.exec('config --show');

      expect(result1.stdout).toBe(result2.stdout);
    });
  });

  describe('pt config --fix-paths', () => {
    let envWithGit: E2eTestEnvironment;

    beforeEach(async () => {
      envWithGit = await E2eTestEnvironment.create({ initGit: true });
    });

    afterEach(async () => {
      await envWithGit.cleanup();
    });

    it('should convert absolute paths to portable format', async () => {
      // Write config with absolute path pointing into workDir
      const absolutePromptDir = `${envWithGit.workDir}/prompts`;
      await envWithGit.writeConfig({
        promptDirs: [absolutePromptDir],
        version: '5.0.0',
      });

      const result = envWithGit.exec('config --fix-paths');

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Config paths updated');

      // Read back the config and verify it uses ${projectRoot}
      const config = (await envWithGit.readJson('.pt-config.json')) as { promptDirs: string[] };
      expect(config.promptDirs[0]).toContain('${projectRoot}');
      expect(config.promptDirs[0]).not.toContain(envWithGit.workDir);
    });

    it('should error when no config file exists', () => {
      const result = envWithGit.exec('config --fix-paths', { expectError: true });

      expect(result.exitCode).not.toBe(0);
      expect(result.stdout + result.stderr).toContain('No config file found');
    });
  });
});
