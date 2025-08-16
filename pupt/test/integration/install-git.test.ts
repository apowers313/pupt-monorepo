import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import { installCommand } from '../../src/commands/install.js';
import simpleGit from 'simple-git';

// Mock simple-git
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    clone: vi.fn(),
    checkIsRepo: vi.fn(),
    init: vi.fn(),
    add: vi.fn(),
    commit: vi.fn()
  }))
}));

// Mock execa for npm tests
vi.mock('execa', () => ({
  execa: vi.fn()
}));

describe('Git Installation - Integration Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
  });

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-test-'));
    process.chdir(testDir);

    // Initialize a basic pt config
    await fs.writeFile('.ptrc.json', JSON.stringify({
      promptDirs: ['./prompts'],
      gitPromptDir: '.git-prompts',
      version: '3.0.0'
    }, null, 2));
  });

  afterEach(async () => {
    // Change back to original directory
    process.chdir(originalCwd);
    
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Full Git Installation Flow', () => {
    it('should clone repository and update configuration', { timeout: 10000 }, async () => {
      const mockGit = {
        clone: vi.fn().mockImplementation(async (url: string, dir: string) => {
          // Simulate git clone by creating the expected directories
          await fs.mkdir(dir, { recursive: true });
          const promptsDir = path.join(dir, 'prompts');
          await fs.mkdir(promptsDir, { recursive: true });
          await fs.writeFile(
            path.join(promptsDir, 'test-prompt.md'),
            '---\ntitle: Test Prompt\n---\nTest content'
          );
        }),
        checkIsRepo: vi.fn().mockResolvedValue(false)
      };
      
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      
      // Install from a mock repository URL
      await installCommand('https://github.com/user/mock-repo');
      
      // Verify git clone was called correctly
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/mock-repo',
        path.join('.git-prompts', 'mock-repo'),
        ['--depth', '1']
      );
      
      // Check config was updated
      const config = JSON.parse(await fs.readFile('.ptrc.json', 'utf-8'));
      expect(config.promptDirs).toContain(path.join('.git-prompts', 'mock-repo', 'prompts'));
    });

    it('should handle installation in git repository with .gitignore update', { timeout: 10000 }, async () => {
      // Create initial .gitignore
      await fs.writeFile('.gitignore', 'node_modules/\n*.log\n');
      
      const mockGit = {
        clone: vi.fn().mockImplementation(async (url: string, dir: string) => {
          await fs.mkdir(dir, { recursive: true });
          const promptsDir = path.join(dir, 'prompts');
          await fs.mkdir(promptsDir, { recursive: true });
        }),
        checkIsRepo: vi.fn().mockResolvedValue(true) // We're in a git repo
      };
      
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      
      // Install
      await installCommand('https://github.com/user/mock-repo-gitignore');
      
      // Check .gitignore was updated
      const gitignoreContent = await fs.readFile('.gitignore', 'utf-8');
      expect(gitignoreContent).toContain('.git-prompts');
      expect(gitignoreContent).toContain('# Prompt Tool');
      
      // Verify original content is preserved
      expect(gitignoreContent).toContain('node_modules/');
      expect(gitignoreContent).toContain('*.log');
    });

    it('should not duplicate .gitignore entries', { timeout: 10000 }, async () => {
      // Create .gitignore with existing entry
      await fs.writeFile('.gitignore', '.git-prompts/\nnode_modules/\n');
      
      const mockGit = {
        clone: vi.fn().mockImplementation(async (url: string, dir: string) => {
          await fs.mkdir(dir, { recursive: true });
          const promptsDir = path.join(dir, 'prompts');
          await fs.mkdir(promptsDir, { recursive: true });
        }),
        checkIsRepo: vi.fn().mockResolvedValue(true)
      };
      
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      
      // Install
      await installCommand('https://github.com/user/mock-repo-dup');
      
      // Check .gitignore wasn't duplicated
      const gitignoreContent = await fs.readFile('.gitignore', 'utf-8');
      const matches = gitignoreContent.match(/\.git-prompts\//g);
      expect(matches?.length).toBe(1);
    });

    it('should handle missing prompts directory gracefully', { timeout: 10000 }, async () => {
      const mockGit = {
        clone: vi.fn().mockImplementation(async (url: string, dir: string) => {
          // Create repo without prompts directory
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(path.join(dir, 'README.md'), '# Test Repo');
        }),
        checkIsRepo: vi.fn().mockResolvedValue(false)
      };
      
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      
      // Install should succeed
      await installCommand('https://github.com/user/mock-repo-no-prompts');
      
      // Config should be updated with the path even if it doesn't exist yet
      const config = JSON.parse(await fs.readFile('.ptrc.json', 'utf-8'));
      expect(config.promptDirs).toContain(path.join('.git-prompts', 'mock-repo-no-prompts', 'prompts'));
    });

    it('should not duplicate prompt directories in config', { timeout: 10000 }, async () => {
      const mockGit = {
        clone: vi.fn().mockImplementation(async (url: string, dir: string) => {
          await fs.mkdir(dir, { recursive: true });
          const promptsDir = path.join(dir, 'prompts');
          await fs.mkdir(promptsDir, { recursive: true });
        }),
        checkIsRepo: vi.fn().mockResolvedValue(false)
      };
      
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      
      // Install twice
      await installCommand('https://github.com/user/mock-repo-duplicate');
      await installCommand('https://github.com/user/mock-repo-duplicate');
      
      // Check config doesn't have duplicates
      const config = JSON.parse(await fs.readFile('.ptrc.json', 'utf-8'));
      const promptPath = path.join('.git-prompts', 'mock-repo-duplicate', 'prompts');
      const occurrences = config.promptDirs.filter((dir: string) => dir === promptPath).length;
      expect(occurrences).toBe(1);
    });

    it('should reject non-git URLs with helpful error', async () => {
      // Create package.json so npm detection works properly
      await fs.writeFile('package.json', JSON.stringify({
        name: 'test-project',
        version: '1.0.0'
      }, null, 2));
      
      // Mock execa to simulate npm install failure for invalid packages
      const execaMock = await import('execa');
      vi.mocked(execaMock.execa).mockRejectedValue(new Error('npm ERR! 404 Not Found'));
      
      await expect(installCommand('https://example.com')).rejects.toThrow('Invalid installation source');
      await expect(installCommand('ftp://example.com/repo')).rejects.toThrow('Invalid installation source');
      
      // This one will try npm install and fail
      await expect(installCommand('not-a-url')).rejects.toThrow('Failed to install npm package');
    });

    it('should handle custom gitPromptDir from config', { timeout: 10000 }, async () => {
      // Update config with custom directory
      await fs.writeFile('.ptrc.json', JSON.stringify({
        promptDirs: ['./prompts'],
        gitPromptDir: '.custom-git-prompts',
        version: '3.0.0'
      }, null, 2));
      
      const mockGit = {
        clone: vi.fn().mockImplementation(async (url: string, dir: string) => {
          await fs.mkdir(dir, { recursive: true });
          const promptsDir = path.join(dir, 'prompts');
          await fs.mkdir(promptsDir, { recursive: true });
        }),
        checkIsRepo: vi.fn().mockResolvedValue(false)
      };
      
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      
      // Install
      await installCommand('https://github.com/user/mock-repo-custom');
      
      // Check custom directory was used
      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/mock-repo-custom',
        path.join('.custom-git-prompts', 'mock-repo-custom'),
        ['--depth', '1']
      );
      
      // Check config uses custom path
      const config = JSON.parse(await fs.readFile('.ptrc.json', 'utf-8'));
      expect(config.promptDirs).toContain(path.join('.custom-git-prompts', 'mock-repo-custom', 'prompts'));
    });
  });
});