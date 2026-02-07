import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  listFilesWithCache,
  resolveFilePath,
  expandPath,
} from '../../src/utils/file-utils.js';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

describe('File Utilities - additional coverage', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-utils-cov-test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    vi.restoreAllMocks();
  });

  describe('listFilesWithCache - cache hit path', () => {
    it('should return cached results when called within TTL', async () => {
      await fs.writeFile(path.join(tempDir, 'file.txt'), 'content');

      const result1 = listFilesWithCache(tempDir);
      expect(result1).toHaveLength(1);

      // Add another file, but the cache should still return old results
      await fs.writeFile(path.join(tempDir, 'file2.txt'), 'content');

      const result2 = listFilesWithCache(tempDir);
      // Should be the exact same reference (cache hit)
      expect(result2).toBe(result1);
      expect(result2).toHaveLength(1);
    });

    it('should return different cached results for different options', async () => {
      await fs.writeFile(path.join(tempDir, 'visible.txt'), 'content');
      await fs.writeFile(path.join(tempDir, '.hidden'), 'content');

      const withoutHidden = listFilesWithCache(tempDir, { includeHidden: false });
      const withHidden = listFilesWithCache(tempDir, { includeHidden: true });

      expect(withoutHidden).toHaveLength(1);
      expect(withHidden).toHaveLength(2);
      expect(withoutHidden).not.toBe(withHidden);
    });

    it('should refresh cache after TTL expires', async () => {
      await fs.writeFile(path.join(tempDir, 'original.txt'), 'content');

      const result1 = listFilesWithCache(tempDir);
      expect(result1).toHaveLength(1);

      // Simulate time passing beyond the TTL (5000ms)
      const startTime = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(startTime + 6000);

      // Add a new file
      await fs.writeFile(path.join(tempDir, 'new.txt'), 'content');

      const result2 = listFilesWithCache(tempDir);
      // Cache expired, should get fresh results
      expect(result2).toHaveLength(2);
      expect(result2).not.toBe(result1);
    });
  });

  describe('resolveFilePath', () => {
    it('should return absolute path unchanged', () => {
      const absolutePath = '/absolute/path/to/file.txt';
      const result = resolveFilePath(absolutePath, '/some/base');

      expect(result).toBe(absolutePath);
    });

    it('should resolve relative path against base path', () => {
      const result = resolveFilePath('relative/file.txt', '/base/dir');

      expect(result).toBe(path.resolve('/base/dir', 'relative/file.txt'));
    });

    it('should handle parent directory references', () => {
      const result = resolveFilePath('../sibling/file.txt', '/base/child');

      expect(result).toBe(path.resolve('/base/child', '../sibling/file.txt'));
    });

    it('should handle dot directory reference', () => {
      const result = resolveFilePath('./file.txt', '/base');

      expect(result).toBe(path.resolve('/base', './file.txt'));
    });

    it('should handle just a filename', () => {
      const result = resolveFilePath('file.txt', '/base/dir');

      expect(result).toBe(path.resolve('/base/dir', 'file.txt'));
    });
  });

  describe('expandPath', () => {
    let savedHome: string | undefined;
    let savedUserProfile: string | undefined;

    beforeEach(() => {
      savedHome = process.env.HOME;
      savedUserProfile = process.env.USERPROFILE;
    });

    afterEach(() => {
      if (savedHome !== undefined) {
        process.env.HOME = savedHome;
      } else {
        delete process.env.HOME;
      }
      if (savedUserProfile !== undefined) {
        process.env.USERPROFILE = savedUserProfile;
      } else {
        delete process.env.USERPROFILE;
      }
    });

    it('should expand ~/ to HOME directory', () => {
      process.env.HOME = '/home/testuser';
      const result = expandPath('~/projects/file.txt');

      expect(result).toBe(path.join('/home/testuser', 'projects/file.txt'));
    });

    it('should use USERPROFILE when HOME is not set', () => {
      delete process.env.HOME;
      process.env.USERPROFILE = '/Users/testuser';
      const result = expandPath('~/file.txt');

      expect(result).toBe(path.join('/Users/testuser', 'file.txt'));
    });

    it('should return non-tilde paths unchanged', () => {
      expect(expandPath('/absolute/path')).toBe('/absolute/path');
      expect(expandPath('relative/path')).toBe('relative/path');
      expect(expandPath('.')).toBe('.');
    });

    it('should not expand tilde without slash', () => {
      expect(expandPath('~')).toBe('~');
      expect(expandPath('~file')).toBe('~file');
    });

    it('should handle empty HOME and USERPROFILE gracefully', () => {
      delete process.env.HOME;
      delete process.env.USERPROFILE;
      const result = expandPath('~/file.txt');

      expect(result).toBe(path.join('', 'file.txt'));
    });
  });
});
