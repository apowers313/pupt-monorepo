import { execSync } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('History Integration', () => {
  const testDir = path.join(os.tmpdir(), 'pt-history-integration-test');
  const promptsDir = path.join(testDir, '.prompts');
  const historyDir = path.join(testDir, '.pthistory');
  const cliPath = path.join(process.cwd(), 'dist/cli.js');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    await fs.ensureDir(promptsDir);
    await fs.ensureDir(historyDir);
    process.chdir(testDir);

    // Create config with history enabled
    const config = {
      promptDirs: ['./.prompts'],
      historyDir: './.pthistory',
      version: '2.0.0'
    };
    await fs.writeJson('.pt-config.json', config);

    // Create a simple prompt
    const promptContent = `---
title: Test Prompt
---
Hello, world!`;
    await fs.writeFile(path.join(promptsDir, 'test.md'), promptContent);
  });

  afterEach(async () => {
    process.chdir('/');
    await fs.remove(testDir);
  });

  it('should save prompt execution to history', async () => {
    // We can't test interactive CLI directly, but we can verify the structure
    const historyManager = await import('../../src/history/history-manager.js');
    const manager = new historyManager.HistoryManager(historyDir);

    // Simulate what the CLI does
    await manager.savePrompt({
      templatePath: path.join(promptsDir, 'test.md'),
      templateContent: 'Hello, world!',
      variables: new Map(),
      finalPrompt: 'Hello, world!',
      title: 'Test Prompt'
    });

    // Check history was saved
    const files = await fs.readdir(historyDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^\d{8}-\d{6}-[a-f0-9]{8}\.json$/);

    // Check content
    const entry = await fs.readJson(path.join(historyDir, files[0]));
    expect(entry.title).toBe('Test Prompt');
    expect(entry.finalPrompt).toBe('Hello, world!');
  });

  it('should handle missing history directory', async () => {
    // Remove history dir
    await fs.remove(historyDir);

    const historyManager = await import('../../src/history/history-manager.js');
    const manager = new historyManager.HistoryManager(historyDir);

    // Should create directory
    await manager.savePrompt({
      templatePath: path.join(promptsDir, 'test.md'),
      templateContent: 'Hello, world!',
      variables: new Map(),
      finalPrompt: 'Hello, world!',
      title: 'Test Prompt'
    });

    expect(await fs.pathExists(historyDir)).toBe(true);
  });
});