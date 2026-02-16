import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { clearProjectRootCache, findProjectRoot, PROJECT_MARKERS } from '../../src/utils/project-root.js';

describe('Project Root Detection', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temp directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-root-test-'));
    clearProjectRootCache();
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  describe('findProjectRoot', () => {
    it('should find project root with package.json', async () => {
      // Create project structure
      await fs.writeJson(path.join(tempDir, 'package.json'), { name: 'test' });
      const subDir = path.join(tempDir, 'src', 'deep', 'nested');
      await fs.ensureDir(subDir);

      const result = findProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should find project root with .git directory', async () => {
      // Create .git directory
      await fs.ensureDir(path.join(tempDir, '.git'));
      const subDir = path.join(tempDir, 'src');
      await fs.ensureDir(subDir);

      const result = findProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should find project root with Cargo.toml', async () => {
      await fs.writeFile(path.join(tempDir, 'Cargo.toml'), '[package]\nname = "test"');
      const subDir = path.join(tempDir, 'src');
      await fs.ensureDir(subDir);

      const result = findProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should find project root with pyproject.toml', async () => {
      await fs.writeFile(path.join(tempDir, 'pyproject.toml'), '[project]\nname = "test"');
      const subDir = path.join(tempDir, 'src');
      await fs.ensureDir(subDir);

      const result = findProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should find project root with go.mod', async () => {
      await fs.writeFile(path.join(tempDir, 'go.mod'), 'module example.com/test');
      const subDir = path.join(tempDir, 'pkg');
      await fs.ensureDir(subDir);

      const result = findProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should find project root with pom.xml', async () => {
      await fs.writeFile(path.join(tempDir, 'pom.xml'), '<project></project>');
      const subDir = path.join(tempDir, 'src', 'main', 'java');
      await fs.ensureDir(subDir);

      const result = findProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should find project root with Gemfile', async () => {
      await fs.writeFile(path.join(tempDir, 'Gemfile'), 'source "https://rubygems.org"');
      const subDir = path.join(tempDir, 'lib');
      await fs.ensureDir(subDir);

      const result = findProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should find project root with composer.json', async () => {
      await fs.writeJson(path.join(tempDir, 'composer.json'), { name: 'test/project' });
      const subDir = path.join(tempDir, 'src');
      await fs.ensureDir(subDir);

      const result = findProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should find project root with Makefile', async () => {
      await fs.writeFile(path.join(tempDir, 'Makefile'), 'all:\n\techo "hello"');
      const subDir = path.join(tempDir, 'build');
      await fs.ensureDir(subDir);

      const result = findProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should find project root with .csproj file', async () => {
      await fs.writeFile(path.join(tempDir, 'MyProject.csproj'), '<Project></Project>');
      const subDir = path.join(tempDir, 'Controllers');
      await fs.ensureDir(subDir);

      const result = findProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should find project root with .sln file', async () => {
      await fs.writeFile(path.join(tempDir, 'MySolution.sln'), 'Microsoft Visual Studio Solution File');
      const subDir = path.join(tempDir, 'src', 'Project1');
      await fs.ensureDir(subDir);

      const result = findProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should return null when no project marker found', async () => {
      // Create an empty temp directory with no markers
      const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'empty-'));
      const subDir = path.join(emptyDir, 'some', 'deep', 'path');
      await fs.ensureDir(subDir);

      try {
        const result = findProjectRoot(subDir);
        expect(result).toBeNull();
      } finally {
        await fs.remove(emptyDir);
      }
    });

    it('should return the closest project root when nested', async () => {
      // Create outer project
      await fs.writeJson(path.join(tempDir, 'package.json'), { name: 'outer' });

      // Create inner project
      const innerDir = path.join(tempDir, 'packages', 'inner');
      await fs.ensureDir(innerDir);
      await fs.writeJson(path.join(innerDir, 'package.json'), { name: 'inner' });

      const deepDir = path.join(innerDir, 'src');
      await fs.ensureDir(deepDir);

      // Should find the inner project root, not the outer
      const result = findProjectRoot(deepDir);
      expect(result).toBe(innerDir);
    });

    it('should cache results', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), { name: 'test' });
      const subDir = path.join(tempDir, 'src');
      await fs.ensureDir(subDir);

      // First call
      const result1 = findProjectRoot(subDir);
      expect(result1).toBe(tempDir);

      // Second call should return cached result
      const result2 = findProjectRoot(subDir);
      expect(result2).toBe(tempDir);
    });

    it('should clear cache when requested', async () => {
      await fs.writeJson(path.join(tempDir, 'package.json'), { name: 'test' });

      const result1 = findProjectRoot(tempDir);
      expect(result1).toBe(tempDir);

      clearProjectRootCache();

      // Should still work after cache clear
      const result2 = findProjectRoot(tempDir);
      expect(result2).toBe(tempDir);
    });
  });

  describe('git worktree support', () => {
    it('should resolve main worktree root from linked worktree', async () => {
      // Create main repo structure
      const mainRepo = path.join(tempDir, 'main-repo');
      await fs.ensureDir(path.join(mainRepo, '.git', 'worktrees', 'feature-branch'));

      // Create linked worktree
      const worktreeDir = path.join(tempDir, 'worktrees', 'feature-branch');
      await fs.ensureDir(worktreeDir);

      // Create .git file pointing to main repo's worktree dir
      const gitdirPath = path.join(mainRepo, '.git', 'worktrees', 'feature-branch');
      await fs.writeFile(
        path.join(worktreeDir, '.git'),
        `gitdir: ${gitdirPath}`
      );

      const subDir = path.join(worktreeDir, 'src');
      await fs.ensureDir(subDir);

      // Should resolve to main repo, not the worktree
      const result = findProjectRoot(subDir);
      expect(result).toBe(mainRepo);
    });

    it('should return current directory for standard git repo', async () => {
      // Create standard .git directory (not a worktree)
      await fs.ensureDir(path.join(tempDir, '.git'));
      const subDir = path.join(tempDir, 'src');
      await fs.ensureDir(subDir);

      const result = findProjectRoot(subDir);
      expect(result).toBe(tempDir);
    });

    it('should handle malformed .git file gracefully', async () => {
      // Create malformed .git file
      await fs.writeFile(path.join(tempDir, '.git'), 'not a valid gitdir line');

      // Also add a package.json so we can still find a root
      await fs.writeJson(path.join(tempDir, 'package.json'), { name: 'test' });

      const result = findProjectRoot(tempDir);
      expect(result).toBe(tempDir);
    });
  });

  describe('PROJECT_MARKERS', () => {
    it('should contain common project markers', () => {
      expect(PROJECT_MARKERS).toContain('package.json');
      expect(PROJECT_MARKERS).toContain('Cargo.toml');
      expect(PROJECT_MARKERS).toContain('pyproject.toml');
      expect(PROJECT_MARKERS).toContain('go.mod');
      expect(PROJECT_MARKERS).toContain('pom.xml');
      expect(PROJECT_MARKERS).toContain('Gemfile');
      expect(PROJECT_MARKERS).toContain('composer.json');
      expect(PROJECT_MARKERS).toContain('Makefile');
    });

    it('should not contain .git (handled specially)', () => {
      // .git is handled specially for worktree support
      expect(PROJECT_MARKERS).not.toContain('.git');
    });
  });
});
