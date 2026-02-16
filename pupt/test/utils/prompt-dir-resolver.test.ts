import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearProjectRootCache } from '../../src/utils/project-root.js';
import { findLocalPromptsDir } from '../../src/utils/prompt-dir-resolver.js';

describe('prompt-dir-resolver', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    clearProjectRootCache();
    // Use realpathSync to resolve symlinks (e.g., /var -> /private/var on macOS)
    tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-dir-resolver-')));
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

});
