import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import fs2 from 'fs-extra';
import { logger } from '../../src/utils/logger.js';

// Mock simple-git before importing install commands
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    clone: vi.fn(),
    checkIsRepo: vi.fn()
  }))
}));

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
  $: vi.fn()
}));

// Mock cosmiconfig
vi.mock('cosmiconfig', () => ({
  cosmiconfig: vi.fn(() => ({
    load: vi.fn(),
    search: vi.fn()
  }))
}));

// Now import after mocking
import {
  installFromGit,
  installFromNpm,
  installCommand,
  isNpmPackage,
  extractRepoName,
  detectPackageManager,
} from '../../src/commands/install.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import simpleGit from 'simple-git';
import { cosmiconfig } from 'cosmiconfig';

vi.mock('node:fs/promises');
vi.mock('../../src/config/config-manager.js', async (importOriginal) => {
  const original = await importOriginal() as typeof import('../../src/config/config-manager.js');
  return {
    ...original,
    ConfigManager: {
      ...original.ConfigManager,
      load: vi.fn(),
      contractPaths: original.ConfigManager.contractPaths
    }
  };
});
vi.mock('fs-extra');
vi.mock('../../src/utils/logger.js');

describe('Install Command - Coverage Improvements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(logger.log).mockImplementation(() => {});
    vi.mocked(logger.warn).mockImplementation(() => {});
    vi.mocked(logger.error).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('installCommand', () => {
    it('should throw when source is empty', async () => {
      await expect(installCommand('')).rejects.toThrow(
        'Please provide a git URL or npm package name to install from'
      );
    });

    it('should route npm packages to installFromNpm', async () => {
      // Mock: package.json exists, npm install works
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('{}');
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '3.0.0'
      } as any);
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);
      const { execa } = await import('execa');
      vi.mocked(execa as any).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      // Should not throw
      await installFromNpm('some-package');

      expect(vi.mocked(execa as any)).toHaveBeenCalled();
    });

    it('should route git URLs to installFromGit', async () => {
      const mockGit = {
        clone: vi.fn().mockResolvedValue(undefined),
        checkIsRepo: vi.fn().mockResolvedValue(false)
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        gitPromptDir: '.git-prompts',
        version: '3.0.0'
      } as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);

      await installCommand('https://github.com/user/repo');

      expect(mockGit.clone).toHaveBeenCalled();
    });

    it('should provide helpful error for invalid source', async () => {
      await expect(installCommand('not-a-valid-anything!!!')).rejects.toThrow(
        'Invalid installation source'
      );
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('neither a valid git URL nor an npm package name')
      );
    });

    it('should propagate non-URL errors from installFromGit', async () => {
      const mockGit = {
        clone: vi.fn().mockRejectedValue(new Error('Network error')),
        checkIsRepo: vi.fn().mockResolvedValue(false)
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit as any);
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        gitPromptDir: '.git-prompts',
        version: '3.0.0'
      } as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await expect(installCommand('https://github.com/user/repo')).rejects.toThrow(
        'Failed to clone repository'
      );
    });
  });

  describe('installFromNpm - full flow', () => {
    let mockExeca: any;

    beforeEach(async () => {
      const execaMod = await import('execa');
      mockExeca = execaMod.execa as any;
      vi.mocked(mockExeca).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        version: '3.0.0'
      } as any);
    });

    it('should reject invalid package names', async () => {
      await expect(installFromNpm('')).rejects.toThrow('Package name cannot be empty');
    });

    it('should require package.json to exist', async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      await expect(installFromNpm('valid-package')).rejects.toThrow(
        'NPM package installation requires a package.json file'
      );
    });

    it('should handle execa failure gracefully', async () => {
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath) === 'package.json') return undefined;
        throw new Error('ENOENT');
      });
      vi.mocked(mockExeca).mockRejectedValue(new Error('Command not found'));

      await expect(installFromNpm('my-package')).rejects.toThrow(
        'Failed to install package with npm'
      );
    });

    it('should load installed package config with promptDirs', async () => {
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath) === 'package.json') return undefined;
        throw new Error('ENOENT');
      });
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);

      // Mock cosmiconfig to return promptDirs from the installed package
      const mockExplorer = {
        load: vi.fn().mockImplementation(async (configPath: string) => {
          if (configPath.includes('node_modules/my-pkg/.pt-config.json')) {
            return {
              config: {
                promptDirs: ['prompts', 'extra-prompts']
              }
            };
          }
          return null;
        }),
        search: vi.fn()
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      await installFromNpm('my-pkg');

      expect(vi.mocked(fs2.writeJson)).toHaveBeenCalledWith(
        expect.stringContaining('.pt-config.json'),
        expect.objectContaining({
          promptDirs: expect.arrayContaining([
            path.join('node_modules', 'my-pkg', 'prompts'),
            path.join('node_modules', 'my-pkg', 'extra-prompts')
          ])
        }),
        { spaces: 2 }
      );
    });

    it('should skip already-configured prompt dirs from installed package', async () => {
      const existingPath = path.join('node_modules', 'my-pkg', 'prompts');
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts', existingPath],
        version: '3.0.0'
      } as any);

      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath) === 'package.json') return undefined;
        throw new Error('ENOENT');
      });

      const mockExplorer = {
        load: vi.fn().mockImplementation(async (configPath: string) => {
          if (configPath.includes('.pt-config.json')) {
            return {
              config: {
                promptDirs: ['prompts']
              }
            };
          }
          return null;
        }),
        search: vi.fn()
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      await installFromNpm('my-pkg');

      // Should log "already configured"
      expect(vi.mocked(logger.log)).toHaveBeenCalledWith(
        expect.stringContaining('already configured')
      );
      // Should NOT write config
      expect(vi.mocked(fs2.writeJson)).not.toHaveBeenCalled();
    });

    it('should fall back to package.json promptDir field when no config', async () => {
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath) === 'package.json') return undefined;
        throw new Error('ENOENT');
      });
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);

      // cosmiconfig returns null (no config found in installed package)
      const mockExplorer = {
        load: vi.fn().mockResolvedValue(null),
        search: vi.fn()
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      // package.json has a custom promptDir
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        if (String(filePath).includes(path.join('node_modules', 'my-pkg', 'package.json'))) {
          return JSON.stringify({ name: 'my-pkg', promptDir: 'custom-dir' });
        }
        return '{}';
      });

      await installFromNpm('my-pkg');

      expect(vi.mocked(fs2.writeJson)).toHaveBeenCalledWith(
        expect.stringContaining('.pt-config.json'),
        expect.objectContaining({
          promptDirs: expect.arrayContaining([
            path.join('node_modules', 'my-pkg', 'custom-dir')
          ])
        }),
        { spaces: 2 }
      );
    });

    it('should use default "prompts" dir when package.json has no promptDir', async () => {
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath) === 'package.json') return undefined;
        throw new Error('ENOENT');
      });
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);

      const mockExplorer = {
        load: vi.fn().mockResolvedValue(null),
        search: vi.fn()
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      // Package.json without promptDir
      vi.mocked(fs.readFile).mockImplementation(async (filePath) => {
        if (String(filePath).includes(path.join('node_modules', 'basic-pkg', 'package.json'))) {
          return JSON.stringify({ name: 'basic-pkg' });
        }
        return '{}';
      });

      await installFromNpm('basic-pkg');

      expect(vi.mocked(fs2.writeJson)).toHaveBeenCalledWith(
        expect.stringContaining('.pt-config.json'),
        expect.objectContaining({
          promptDirs: expect.arrayContaining([
            path.join('node_modules', 'basic-pkg', 'prompts')
          ])
        }),
        { spaces: 2 }
      );
    });

    it('should handle unreadable package.json in installed package', async () => {
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath) === 'package.json') return undefined;
        throw new Error('ENOENT');
      });
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);

      const mockExplorer = {
        load: vi.fn().mockResolvedValue(null),
        search: vi.fn()
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      // Package.json read fails
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      await installFromNpm('missing-pkg');

      // Should still fall back to default prompts directory
      expect(vi.mocked(fs2.writeJson)).toHaveBeenCalledWith(
        expect.stringContaining('.pt-config.json'),
        expect.objectContaining({
          promptDirs: expect.arrayContaining([
            path.join('node_modules', 'missing-pkg', 'prompts')
          ])
        }),
        { spaces: 2 }
      );
    });

    it('should not duplicate when default prompt path already exists', async () => {
      const existingPath = path.join('node_modules', 'dup-pkg', 'prompts');
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts', existingPath],
        version: '3.0.0'
      } as any);
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        if (String(filePath) === 'package.json') return undefined;
        throw new Error('ENOENT');
      });

      const mockExplorer = {
        load: vi.fn().mockResolvedValue(null),
        search: vi.fn()
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      await installFromNpm('dup-pkg');

      // Should not write since path already exists
      expect(vi.mocked(fs2.writeJson)).not.toHaveBeenCalled();
      expect(vi.mocked(logger.log)).toHaveBeenCalledWith(
        expect.stringContaining('already configured')
      );
    });
  });

  describe('detectPackageManager - additional cases', () => {
    it('should prefer pnpm over npm when both exist', async () => {
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        const file = String(filePath);
        if (file.endsWith('pnpm-lock.yaml') || file.endsWith('package-lock.json')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const result = await detectPackageManager();
      expect(result).toBe('pnpm');
    });

    it('should prefer yarn over npm when both exist', async () => {
      vi.mocked(fs.access).mockImplementation(async (filePath) => {
        const file = String(filePath);
        if (file.endsWith('yarn.lock') || file.endsWith('package-lock.json')) {
          return undefined;
        }
        throw new Error('ENOENT');
      });

      const result = await detectPackageManager();
      expect(result).toBe('yarn');
    });
  });

  describe('isNpmPackage - edge cases', () => {
    it('should reject scoped packages with just @ symbol', () => {
      expect(isNpmPackage('@')).toBe(false);
    });

    it('should reject scoped packages with empty package name', () => {
      expect(isNpmPackage('@scope/')).toBe(false);
    });

    it('should reject scoped packages with empty scope', () => {
      expect(isNpmPackage('@/package')).toBe(false);
    });

    it('should reject null/undefined-like values', () => {
      expect(isNpmPackage(null as any)).toBe(false);
      expect(isNpmPackage(undefined as any)).toBe(false);
    });

    it('should reject strings starting with invalid characters', () => {
      expect(isNpmPackage('-invalid')).toBe(false);
      expect(isNpmPackage('.invalid')).toBe(false);
      expect(isNpmPackage('_invalid')).toBe(false);
    });
  });

  describe('extractRepoName - additional edge cases', () => {
    it('should throw for URLs without recognizable format', () => {
      expect(() => extractRepoName('just-a-string')).toThrow(
        'Cannot extract repository name from URL'
      );
    });

    it('should handle file:// URLs ending with slash', () => {
      const name = extractRepoName('file:///home/user/repos/test-repo/');
      expect(name).toBe('test-repo');
    });

    it('should handle SSH URLs', () => {
      const name = extractRepoName('git@github.com:org/my-repo.git');
      expect(name).toBe('my-repo');
    });

    it('should handle git:// protocol', () => {
      const name = extractRepoName('git://example.com/user/cool-repo.git');
      expect(name).toBe('cool-repo');
    });
  });

  describe('installFromGit - installed package with existing promptDirs', () => {
    let mockGit: any;

    beforeEach(() => {
      mockGit = {
        clone: vi.fn().mockResolvedValue(undefined),
        checkIsRepo: vi.fn().mockResolvedValue(false)
      };
      vi.mocked(simpleGit).mockReturnValue(mockGit);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);
    });

    it('should add installed package promptDirs to config', async () => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        gitPromptDir: '.git-prompts',
        version: '3.0.0'
      } as any);

      // Mock cosmiconfig to return promptDirs from the cloned repo
      const mockExplorer = {
        load: vi.fn().mockImplementation(async (configPath: string) => {
          if (configPath.includes(path.join('.git-prompts', 'my-repo', '.pt-config.json'))) {
            return {
              config: {
                promptDirs: ['src/prompts', 'lib/prompts']
              }
            };
          }
          return null;
        }),
        search: vi.fn()
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      await installFromGit('https://github.com/user/my-repo');

      expect(vi.mocked(fs2.writeJson)).toHaveBeenCalledWith(
        expect.stringContaining('.pt-config.json'),
        expect.objectContaining({
          promptDirs: expect.arrayContaining([
            path.join('.git-prompts', 'my-repo', 'src/prompts'),
            path.join('.git-prompts', 'my-repo', 'lib/prompts')
          ])
        }),
        { spaces: 2 }
      );
    });

    it('should skip promptDirs already in config', async () => {
      const existingPath = path.join('.git-prompts', 'my-repo', 'src/prompts');
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts', existingPath],
        gitPromptDir: '.git-prompts',
        version: '3.0.0'
      } as any);

      const mockExplorer = {
        load: vi.fn().mockImplementation(async (configPath: string) => {
          if (configPath.includes('.pt-config.json')) {
            return {
              config: {
                promptDirs: ['src/prompts']
              }
            };
          }
          return null;
        }),
        search: vi.fn()
      };
      vi.mocked(cosmiconfig).mockReturnValue(mockExplorer as any);

      await installFromGit('https://github.com/user/my-repo');

      // All paths already in config => "already configured" message
      expect(vi.mocked(logger.log)).toHaveBeenCalledWith(
        expect.stringContaining('already configured')
      );
    });
  });
});
