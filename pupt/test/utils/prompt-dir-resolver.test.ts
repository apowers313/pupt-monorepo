import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { resolvePromptDirs, findLocalPromptsDir } from '../../src/utils/prompt-dir-resolver.js';
import { clearProjectRootCache } from '../../src/utils/project-root.js';

describe('prompt-dir-resolver', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    clearProjectRootCache();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-dir-resolver-'));
    originalCwd = process.cwd();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('findLocalPromptsDir', () => {
    it('should return .prompts/ path when it exists at project root', async () => {
      // Create a project marker and .prompts dir
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.mkdirSync(path.join(tempDir, '.prompts'));

      const result = await findLocalPromptsDir(tempDir);
      expect(result).toBe(path.join(tempDir, '.prompts'));
    });

    it('should return null when .prompts/ does not exist', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');

      const result = await findLocalPromptsDir(tempDir);
      expect(result).toBeNull();
    });

    it('should return null when no project root is found', async () => {
      // Use a temporary directory with no project markers
      const isolatedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-project-'));
      try {
        const result = await findLocalPromptsDir(isolatedDir);
        expect(result).toBeNull();
      } finally {
        fs.rmSync(isolatedDir, { recursive: true, force: true });
      }
    });

    it('should return null when .prompts is a file not a directory', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.writeFileSync(path.join(tempDir, '.prompts'), 'not a directory');

      const result = await findLocalPromptsDir(tempDir);
      expect(result).toBeNull();
    });

    it('should use cwd when no startDir provided', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.mkdirSync(path.join(tempDir, '.prompts'));
      process.chdir(tempDir);

      const result = await findLocalPromptsDir();
      expect(result).toBe(path.join(tempDir, '.prompts'));
    });

    it('should find .prompts/ from a subdirectory', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.mkdirSync(path.join(tempDir, '.prompts'));
      const subDir = path.join(tempDir, 'src', 'components');
      fs.mkdirSync(subDir, { recursive: true });

      const result = await findLocalPromptsDir(subDir);
      expect(result).toBe(path.join(tempDir, '.prompts'));
    });
  });

  describe('resolvePromptDirs', () => {
    it('should return config dirs when no CLI dirs or local .prompts/', async () => {
      const result = await resolvePromptDirs({
        configPromptDirs: ['/global/prompts'],
        startDir: tempDir,
      });
      expect(result).toEqual([path.resolve('/global/prompts')]);
    });

    it('should put CLI dirs first', async () => {
      const result = await resolvePromptDirs({
        configPromptDirs: ['/global/prompts'],
        cliPromptDirs: ['/cli/dir1', '/cli/dir2'],
        startDir: tempDir,
      });
      expect(result[0]).toBe(path.resolve('/cli/dir1'));
      expect(result[1]).toBe(path.resolve('/cli/dir2'));
      expect(result[2]).toBe(path.resolve('/global/prompts'));
    });

    it('should include local .prompts/ when it exists', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.mkdirSync(path.join(tempDir, '.prompts'));
      process.chdir(tempDir);

      const result = await resolvePromptDirs({
        configPromptDirs: ['/global/prompts'],
      });
      expect(result).toContain(path.join(tempDir, '.prompts'));
      // Local should come before global
      const localIdx = result.indexOf(path.join(tempDir, '.prompts'));
      const globalIdx = result.indexOf(path.resolve('/global/prompts'));
      expect(localIdx).toBeLessThan(globalIdx);
    });

    it('should deduplicate when config already lists the local path', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.mkdirSync(path.join(tempDir, '.prompts'));
      const localDir = path.join(tempDir, '.prompts');

      const result = await resolvePromptDirs({
        configPromptDirs: [localDir, '/global/prompts'],
        startDir: tempDir,
      });

      // localDir should appear exactly once
      const count = result.filter(d => d === localDir).length;
      expect(count).toBe(1);
    });

    it('should resolve relative CLI paths to absolute', async () => {
      process.chdir(tempDir);
      const result = await resolvePromptDirs({
        configPromptDirs: [],
        cliPromptDirs: ['./my-prompts', '../other-prompts'],
        startDir: tempDir,
      });

      expect(path.isAbsolute(result[0])).toBe(true);
      expect(path.isAbsolute(result[1])).toBe(true);
      expect(result[0]).toBe(path.resolve(tempDir, './my-prompts'));
      expect(result[1]).toBe(path.resolve(tempDir, '../other-prompts'));
    });

    it('should work with empty config promptDirs', async () => {
      const result = await resolvePromptDirs({
        configPromptDirs: [],
        startDir: tempDir,
      });
      expect(result).toEqual([]);
    });

    it('should not add local .prompts/ when it does not exist', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      // no .prompts/ directory

      const result = await resolvePromptDirs({
        configPromptDirs: ['/global/prompts'],
        startDir: tempDir,
      });
      expect(result).toEqual([path.resolve('/global/prompts')]);
    });

    it('should order: CLI > local > global', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.mkdirSync(path.join(tempDir, '.prompts'));

      const result = await resolvePromptDirs({
        configPromptDirs: ['/global/prompts'],
        cliPromptDirs: ['/cli/prompts'],
        startDir: tempDir,
      });

      expect(result[0]).toBe(path.resolve('/cli/prompts'));
      expect(result[1]).toBe(path.join(tempDir, '.prompts'));
      expect(result[2]).toBe(path.resolve('/global/prompts'));
    });

    it('should deduplicate CLI dir that matches local .prompts/', async () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');
      fs.mkdirSync(path.join(tempDir, '.prompts'));
      const localDir = path.join(tempDir, '.prompts');

      const result = await resolvePromptDirs({
        configPromptDirs: ['/global/prompts'],
        cliPromptDirs: [localDir],
        startDir: tempDir,
      });

      const count = result.filter(d => d === localDir).length;
      expect(count).toBe(1);
      expect(result.length).toBe(2); // localDir + /global/prompts
    });
  });
});
