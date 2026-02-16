import os from 'node:os';
import path from 'node:path';

import type { ResolvedModuleEntry } from '@pupt/lib';
import fs from 'fs-extra';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { PuptService } from '../../src/services/pupt-service.js';

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
      modules: [
        {
          name: '@acme/prompts',
          type: 'local',
          source: path.join(tempDir, 'packages', 'node_modules', '@acme', 'prompts'),
          promptDirs: ['prompts'],
          version: '1.0.0',
        } satisfies ResolvedModuleEntry,
      ],
    });
    await service.init();

    const prompts = service.getPrompts();
    expect(prompts).toHaveLength(1);
    expect(prompts[0].name).toBe('npm-prompt');
  });

  it('should resolve paths from npm package structure', async () => {
    const pkgPromptDir = path.join(tempDir, 'packages', 'node_modules', 'my-pkg', 'src', 'prompts');
    await fs.ensureDir(pkgPromptDir);
    await fs.writeFile(path.join(pkgPromptDir, 'test.prompt'), `
<Prompt name="resolved-npm" description="Resolved">
  <Task>Resolved from npm</Task>
</Prompt>
    `);

    const service = new PuptService({
      modules: [
        {
          name: 'my-pkg',
          type: 'local',
          source: path.join(tempDir, 'packages', 'node_modules', 'my-pkg'),
          promptDirs: ['src/prompts'],
          version: '2.0.0',
        } satisfies ResolvedModuleEntry,
      ],
    });
    await service.init();

    const prompt = service.getPrompt('resolved-npm');
    expect(prompt).toBeDefined();
    expect(prompt!.name).toBe('resolved-npm');
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
      modules: [
        {
          name: 'git-lib',
          type: 'local',
          source: path.join(tempDir, 'libraries', 'git-lib'),
          promptDirs: ['prompts'],
        } satisfies ResolvedModuleEntry,
        {
          name: 'npm-lib',
          type: 'local',
          source: path.join(tempDir, 'packages', 'node_modules', 'npm-lib'),
          promptDirs: ['prompts'],
          version: '1.0.0',
        } satisfies ResolvedModuleEntry,
      ],
    });
    await service.init();

    const names = service.getPrompts().map(p => p.name).sort();
    expect(names).toEqual(['git-prompt', 'npm-prompt']);
  });

  it('should skip npm libraries with missing directories', async () => {
    const service = new PuptService({
      modules: [
        {
          name: 'missing-npm-pkg',
          type: 'local',
          source: path.join(tempDir, 'packages', 'node_modules', 'missing-npm-pkg'),
          promptDirs: ['prompts'],
          version: '1.0.0',
        } satisfies ResolvedModuleEntry,
      ],
    });
    await service.init();

    expect(service.getPrompts()).toHaveLength(0);
  });
});
