import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PuptService } from '../../src/services/pupt-service.js';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

describe('PuptService - npm Package Discovery', () => {
  let tempDir: string;
  let originalPuptDataDir: string | undefined;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pupt-npm-service-test-'));
    originalPuptDataDir = process.env.PUPT_DATA_DIR;
    process.env.PUPT_DATA_DIR = tempDir;
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    if (originalPuptDataDir === undefined) {
      delete process.env.PUPT_DATA_DIR;
    } else {
      process.env.PUPT_DATA_DIR = originalPuptDataDir;
    }
  });

  it('should discover prompts from npm package promptDirs', async () => {
    // Create npm package structure
    const pkgPromptDir = path.join(tempDir, 'packages', 'node_modules', '@acme', 'prompts', 'prompts');
    await fs.ensureDir(pkgPromptDir);
    await fs.writeFile(path.join(pkgPromptDir, 'test.prompt'), `
<Prompt name="npm-prompt" description="From npm">
  <Task>Hello from npm</Task>
</Prompt>
    `);

    const service = new PuptService({
      promptDirs: [],
      libraries: [
        {
          name: '@acme/prompts',
          type: 'npm',
          source: '@acme/prompts',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15T10:30:00.000Z',
          version: '1.0.0',
        },
      ],
    });
    await service.init();

    const prompts = service.getPrompts();
    expect(prompts).toHaveLength(1);
    expect(prompts[0].name).toBe('npm-prompt');
  });

  it('should resolve paths from {dataDir}/packages/node_modules/{name}/{promptDir}', async () => {
    const pkgPromptDir = path.join(tempDir, 'packages', 'node_modules', 'my-pkg', 'src', 'prompts');
    await fs.ensureDir(pkgPromptDir);
    await fs.writeFile(path.join(pkgPromptDir, 'test.prompt'), `
<Prompt name="resolved-npm" description="Resolved">
  <Task>Resolved from npm</Task>
</Prompt>
    `);

    const service = new PuptService({
      promptDirs: [],
      libraries: [
        {
          name: 'my-pkg',
          type: 'npm',
          source: 'my-pkg',
          promptDirs: ['src/prompts'],
          installedAt: '2024-01-15T10:30:00.000Z',
          version: '2.0.0',
        },
      ],
    });
    await service.init();

    const prompt = service.getPrompt('resolved-npm');
    expect(prompt).toBeDefined();

    const promptPath = service.getPromptPath('resolved-npm');
    expect(promptPath).toContain(path.join('packages', 'node_modules', 'my-pkg', 'src', 'prompts'));
  });

  it('should discover prompts from both git and npm libraries', async () => {
    // Create git library
    const gitPromptDir = path.join(tempDir, 'libraries', 'git-lib', 'prompts');
    await fs.ensureDir(gitPromptDir);
    await fs.writeFile(path.join(gitPromptDir, 'git.prompt'), `
<Prompt name="git-prompt" description="From git">
  <Task>Hello from git</Task>
</Prompt>
    `);

    // Create npm package
    const npmPromptDir = path.join(tempDir, 'packages', 'node_modules', 'npm-lib', 'prompts');
    await fs.ensureDir(npmPromptDir);
    await fs.writeFile(path.join(npmPromptDir, 'npm.prompt'), `
<Prompt name="npm-prompt" description="From npm">
  <Task>Hello from npm</Task>
</Prompt>
    `);

    const service = new PuptService({
      promptDirs: [],
      libraries: [
        {
          name: 'git-lib',
          type: 'git',
          source: 'https://github.com/user/git-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15T10:30:00.000Z',
        },
        {
          name: 'npm-lib',
          type: 'npm',
          source: 'npm-lib',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15T10:30:00.000Z',
          version: '1.0.0',
        },
      ],
    });
    await service.init();

    const names = service.getPrompts().map(p => p.name).sort();
    expect(names).toEqual(['git-prompt', 'npm-prompt']);
  });

  it('should skip npm libraries with missing directories', async () => {
    const service = new PuptService({
      promptDirs: [],
      libraries: [
        {
          name: 'missing-npm-pkg',
          type: 'npm',
          source: 'missing-npm-pkg',
          promptDirs: ['prompts'],
          installedAt: '2024-01-15T10:30:00.000Z',
          version: '1.0.0',
        },
      ],
    });
    await service.init();

    expect(service.getPrompts()).toHaveLength(0);
  });
});
