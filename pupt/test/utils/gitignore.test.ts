import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { addToGitignore } from '../../src/utils/gitignore';

// Mock simple-git
vi.mock('simple-git');

describe('Gitignore Utils', () => {
  let tempDir: string;
  let mockGit: SimpleGit;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-gitignore-test-'));
    process.chdir(tempDir);
    
    // Setup mock git
    mockGit = {
      checkIsRepo: vi.fn(),
      revparse: vi.fn()
    } as any;
    
    vi.mocked(simpleGit).mockReturnValue(mockGit);
  });

  afterEach(async () => {
    process.chdir(path.dirname(tempDir));
    await fs.remove(tempDir);
    vi.restoreAllMocks();
  });

  describe('addToGitignore', () => {
    it('should add entry to existing .gitignore', async () => {
      // Create existing .gitignore
      const gitignorePath = path.join(tempDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n.env\n');

      await addToGitignore('.pthistory');

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('node_modules/');
      expect(content).toContain('.env');
      expect(content).toContain('\n# PUPT\n.pthistory\n');
    });

    it('should create .gitignore if it does not exist', async () => {
      const gitignorePath = path.join(tempDir, '.gitignore');
      expect(await fs.pathExists(gitignorePath)).toBe(false);

      await addToGitignore('.pthistory');

      expect(await fs.pathExists(gitignorePath)).toBe(true);
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toBe('# PUPT\n.pthistory\n');
    });

    it('should not duplicate existing entry', async () => {
      const gitignorePath = path.join(tempDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n.pthistory\n.env\n');

      await addToGitignore('.pthistory');

      const content = await fs.readFile(gitignorePath, 'utf-8');
      // Should only have one .pthistory entry
      const matches = content.match(/\.pthistory/g);
      expect(matches).toHaveLength(1);
    });

    it('should handle multiple entries', async () => {
      const gitignorePath = path.join(tempDir, '.gitignore');
      
      await addToGitignore('.pthistory');
      await addToGitignore('.pt-config.json.backup');

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('.pthistory');
      expect(content).toContain('.pt-config.json.backup');
    });

    it('should add comment header only once', async () => {
      const gitignorePath = path.join(tempDir, '.gitignore');
      
      await addToGitignore('.pthistory');
      await addToGitignore('.git-prompts');

      const content = await fs.readFile(gitignorePath, 'utf-8');
      const commentMatches = content.match(/# PUPT/g);
      expect(commentMatches).toHaveLength(1);
    });

    it('should handle trailing newline correctly', async () => {
      const gitignorePath = path.join(tempDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n.env'); // No trailing newline

      await addToGitignore('.pthistory');

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toBe('node_modules/\n.env\n\n\n# PUPT\n.pthistory\n');
    });

    it('should handle empty .gitignore', async () => {
      const gitignorePath = path.join(tempDir, '.gitignore');
      await fs.writeFile(gitignorePath, '');

      await addToGitignore('.pthistory');

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toBe('# PUPT\n.pthistory\n');
    });

    it('should handle patterns with slashes', async () => {
      await addToGitignore('.git-prompts/');

      const gitignorePath = path.join(tempDir, '.gitignore');
      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toContain('.git-prompts/');
    });

    it('should preserve existing PUPT section', async () => {
      const gitignorePath = path.join(tempDir, '.gitignore');
      await fs.writeFile(gitignorePath, 'node_modules/\n\n# PUPT\n.pthistory\n');

      await addToGitignore('.git-prompts');

      const content = await fs.readFile(gitignorePath, 'utf-8');
      expect(content).toBe('node_modules/\n\n# PUPT\n.pthistory\n.git-prompts\n');
    });
  });

  describe('isGitRepository', () => {
    it('should detect git repository', async () => {
      const { isGitRepository } = await import('../../src/utils/gitignore');
      
      vi.mocked(mockGit.checkIsRepo).mockResolvedValue(true);
      
      const result = await isGitRepository();
      expect(result).toBe(true);
      expect(mockGit.checkIsRepo).toHaveBeenCalled();
    });

    it('should detect non-git directory', async () => {
      const { isGitRepository } = await import('../../src/utils/gitignore');
      
      vi.mocked(mockGit.checkIsRepo).mockResolvedValue(false);
      
      const result = await isGitRepository();
      expect(result).toBe(false);
    });

    it('should handle git command errors', async () => {
      const { isGitRepository } = await import('../../src/utils/gitignore');
      
      vi.mocked(mockGit.checkIsRepo).mockRejectedValue(new Error('git not found'));
      
      const result = await isGitRepository();
      expect(result).toBe(false);
    });
  });
});