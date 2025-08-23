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

// Now import after mocking
import { validateGitUrl, extractRepoName, installFromGit } from '../../src/commands/install.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import simpleGit from 'simple-git';

vi.mock('fs/promises');
vi.mock('../../src/config/config-manager.js');
vi.mock('fs-extra');

vi.mock('../../src/utils/logger.js');
describe('Install Command', () => {
  let loggerLogSpy: any;
  let loggerWarnSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});
    loggerWarnSpy = vi.mocked(logger.warn).mockImplementation(() => {});
  });

  afterEach(() => {
  });

  describe('Git URL Detection', () => {
    describe('validateGitUrl', () => {
      it('should accept valid HTTPS git URLs', () => {
        const validUrls = [
          'https://github.com/user/repo',
          'https://github.com/user/repo.git',
          'https://gitlab.com/org/project',
          'https://bitbucket.org/team/repo.git',
          'https://github.com/user-name/repo-name',
          'https://github.com/user_name/repo_name',
          'https://github.com/user123/repo456'
        ];

        validUrls.forEach(url => {
          expect(() => validateGitUrl(url)).not.toThrow();
        });
      });

      it('should accept valid SSH git URLs', () => {
        const validUrls = [
          'git@github.com:user/repo.git',
          'git@gitlab.com:org/project.git',
          'git@bitbucket.org:team/repo.git',
          'git@github.com:user-name/repo-name.git',
          'ssh://git@github.com/user/repo.git'
        ];

        validUrls.forEach(url => {
          expect(() => validateGitUrl(url)).not.toThrow();
        });
      });

      it('should accept git:// protocol URLs', () => {
        const validUrls = [
          'git://github.com/user/repo.git',
          'git://gitlab.com/org/project.git'
        ];

        validUrls.forEach(url => {
          expect(() => validateGitUrl(url)).not.toThrow();
        });
      });

      it('should reject invalid URLs', () => {
        const invalidUrls = [
          'not-a-url',
          'http://github.com/user/repo', // http not https
          'ftp://github.com/user/repo',
          'github.com/user/repo', // missing protocol
          'https://github.com', // missing repo path
          'https://github.com/', // missing repo path
          'https://github.com/user', // missing repo name
          'https://github.com/user/', // missing repo name
          '', // empty string
          ' ', // whitespace
          'file:///' // file protocol without proper path
        ];

        invalidUrls.forEach(url => {
          expect(() => validateGitUrl(url), `URL "${url}" should be invalid`).toThrow();
        });
      });

      it('should accept file:// URLs for local repos', () => {
        const validFileUrls = [
          'file:///home/user/repos/my-prompts',
          'file:///tmp/test-repo'
        ];

        validFileUrls.forEach(url => {
          expect(() => validateGitUrl(url)).not.toThrow();
        });
      });
    });

    describe('extractRepoName', () => {
      it('should extract repo name from HTTPS URLs', () => {
        expect(extractRepoName('https://github.com/user/my-repo')).toBe('my-repo');
        expect(extractRepoName('https://github.com/user/my-repo.git')).toBe('my-repo');
        expect(extractRepoName('https://gitlab.com/org/project-name.git')).toBe('project-name');
      });

      it('should extract repo name from SSH URLs', () => {
        expect(extractRepoName('git@github.com:user/my-repo.git')).toBe('my-repo');
        expect(extractRepoName('ssh://git@github.com/user/another-repo.git')).toBe('another-repo');
      });

      it('should extract repo name from git:// URLs', () => {
        expect(extractRepoName('git://github.com/user/repo-name.git')).toBe('repo-name');
      });

      it('should extract repo name from file:// URLs', () => {
        expect(extractRepoName('file:///home/user/repos/my-prompts')).toBe('my-prompts');
        expect(extractRepoName('file:///tmp/test-repo/')).toBe('test-repo');
      });

      it('should handle special characters in repo names', () => {
        expect(extractRepoName('https://github.com/user/repo_with_underscores')).toBe('repo_with_underscores');
        expect(extractRepoName('https://github.com/user/repo-with-dashes')).toBe('repo-with-dashes');
        expect(extractRepoName('https://github.com/user/repo.with.dots')).toBe('repo.with.dots');
      });
    });
  });

  describe('Git Operations', () => {
    let mockGit: any;
    
    beforeEach(() => {
      vi.mocked(ConfigManager.load).mockResolvedValue({
        promptDirs: ['./.prompts'],
        gitPromptDir: '.git-prompts',
        version: '3.0.0'
      } as any);
      
      // Create a fresh mock git instance for each test
      mockGit = {
        clone: vi.fn().mockResolvedValue(undefined),
        checkIsRepo: vi.fn().mockResolvedValue(false)
      };
      
      vi.mocked(simpleGit).mockReturnValue(mockGit);
    });

    it('should construct correct git clone command', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/test-prompts');

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/test-prompts',
        path.join('.git-prompts', 'test-prompts'),
        ['--depth', '1']
      );
    });

    it('should use shallow clone with depth 1', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/repo');

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo',
        path.join('.git-prompts', 'repo'),
        ['--depth', '1']
      );
    });

    it('should create git prompt directory if it doesn\'t exist', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/repo');

      expect(vi.mocked(fs.mkdir)).toHaveBeenCalledWith('.git-prompts', { recursive: true });
    });

    it('should handle git clone errors', async () => {
      mockGit.clone.mockRejectedValue(new Error('fatal: Authentication failed'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await expect(installFromGit('https://github.com/user/private-repo')).rejects.toThrow('Failed to clone repository');
    });

    it('should update .gitignore if in git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);
      
      vi.mocked(fs.readFile).mockResolvedValue('# Existing content\nnode_modules/\n');
      vi.mocked(fs2.readFile).mockResolvedValue('# Existing content\nnode_modules/\n');
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs2.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/repo');

      expect(vi.mocked(fs2.writeFile)).toHaveBeenCalledWith(
        expect.stringContaining('.gitignore'),
        expect.stringContaining('.git-prompts'),
        'utf-8'
      );
      expect(vi.mocked(fs2.writeFile)).toHaveBeenCalledWith(
        expect.stringContaining('.gitignore'),
        expect.stringContaining('# PUPT'),
        'utf-8'
      );
    });

    it('should not duplicate .gitignore entries', async () => {
      mockGit.checkIsRepo.mockResolvedValue(true);
      
      vi.mocked(fs.readFile).mockResolvedValue('# Existing\n.git-prompts\n');
      vi.mocked(fs2.readFile).mockResolvedValue('# Existing\n.git-prompts\n');
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/repo');

      // Should not write to .gitignore since entry already exists
      expect(vi.mocked(fs2.writeFile)).not.toHaveBeenCalled();
    });

    it('should not update .gitignore if not in git repository', async () => {
      mockGit.checkIsRepo.mockResolvedValue(false);
      
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs2.writeJson).mockResolvedValue(undefined);

      await installFromGit('https://github.com/user/repo');

      // Should not create .gitignore since we're not in a git repo
      expect(vi.mocked(fs.writeFile)).not.toHaveBeenCalledWith(
        '.gitignore',
        expect.any(String),
        'utf-8'
      );
    });
  });

  describe('Config Updates', () => {
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

    it('should add cloned prompts directory to config', async () => {
      const initialConfig = {
        promptDirs: ['./.prompts'],
        gitPromptDir: '.git-prompts',
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.load).mockResolvedValue(initialConfig as any);

      await installFromGit('https://github.com/user/my-prompts');

      expect(vi.mocked(fs2.writeJson)).toHaveBeenCalledWith(
        expect.stringContaining('.pt-config.json'),
        expect.objectContaining({
          promptDirs: expect.arrayContaining([
            './.prompts',
            path.join('.git-prompts', 'my-prompts', 'prompts')
          ])
        }),
        { spaces: 2 }
      );
    });

    it('should not duplicate prompt directories in config', async () => {
      const existingPath = path.join('.git-prompts', 'existing-repo', 'prompts');
      const initialConfig = {
        promptDirs: ['./.prompts', existingPath],
        gitPromptDir: '.git-prompts',
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.load).mockResolvedValue(initialConfig as any);

      await installFromGit('https://github.com/user/existing-repo');

      expect(vi.mocked(fs2.writeJson)).not.toHaveBeenCalled();
    });

    it('should handle custom gitPromptDir from config', async () => {
      const initialConfig = {
        promptDirs: ['./.prompts'],
        gitPromptDir: '.custom-git-prompts',
        version: '3.0.0'
      };

      vi.mocked(ConfigManager.load).mockResolvedValue(initialConfig as any);

      await installFromGit('https://github.com/user/repo');

      expect(mockGit.clone).toHaveBeenCalledWith(
        'https://github.com/user/repo',
        path.join('.custom-git-prompts', 'repo'),
        ['--depth', '1']
      );

      expect(vi.mocked(fs2.writeJson)).toHaveBeenCalledWith(
        expect.stringContaining('.pt-config.json'),
        expect.objectContaining({
          promptDirs: expect.arrayContaining([
            path.join('.custom-git-prompts', 'repo', 'prompts')
          ])
        }),
        { spaces: 2 }
      );
    });
  });

  describe('NPM Package Detection', () => {
    describe('isNpmPackage', () => {
      it('should detect regular npm package names', async () => {
        const { isNpmPackage } = await import('../../src/commands/install.js');
        
        expect(isNpmPackage('express')).toBe(true);
        expect(isNpmPackage('lodash')).toBe(true);
        expect(isNpmPackage('react')).toBe(true);
        expect(isNpmPackage('vue')).toBe(true);
      });

      it('should detect scoped npm package names', async () => {
        const { isNpmPackage } = await import('../../src/commands/install.js');
        
        expect(isNpmPackage('@babel/core')).toBe(true);
        expect(isNpmPackage('@types/node')).toBe(true);
        expect(isNpmPackage('@angular/cli')).toBe(true);
        expect(isNpmPackage('@my-org/my-package')).toBe(true);
      });

      it('should reject invalid package names', async () => {
        const { isNpmPackage } = await import('../../src/commands/install.js');
        
        expect(isNpmPackage('https://github.com/user/repo')).toBe(false);
        expect(isNpmPackage('git@github.com:user/repo.git')).toBe(false);
        expect(isNpmPackage('../local/path')).toBe(false);
        expect(isNpmPackage('./relative/path')).toBe(false);
        expect(isNpmPackage('/absolute/path')).toBe(false);
        expect(isNpmPackage('C:\\Windows\\Path')).toBe(false);
        expect(isNpmPackage('package name with spaces')).toBe(false);
        expect(isNpmPackage('package@#$%')).toBe(false);
        expect(isNpmPackage('')).toBe(false);
        expect(isNpmPackage(' ')).toBe(false);
      });

      it('should handle edge cases', async () => {
        const { isNpmPackage } = await import('../../src/commands/install.js');
        
        // Valid edge cases
        expect(isNpmPackage('a')).toBe(true); // single character
        expect(isNpmPackage('package-with-dashes')).toBe(true);
        expect(isNpmPackage('package_with_underscores')).toBe(true);
        expect(isNpmPackage('package.with.dots')).toBe(true);
        expect(isNpmPackage('package123')).toBe(true);
        
        // Invalid edge cases
        expect(isNpmPackage('-starts-with-dash')).toBe(false);
        expect(isNpmPackage('.starts-with-dot')).toBe(false);
        expect(isNpmPackage('_starts-with-underscore')).toBe(false);
        expect(isNpmPackage('@')).toBe(false); // just scope
        expect(isNpmPackage('@scope/')).toBe(false); // scope without package
        expect(isNpmPackage('@/package')).toBe(false); // empty scope
      });
    });

    describe('validateNpmPackage', () => {
      it('should accept valid package names', async () => {
        const { validateNpmPackage } = await import('../../src/commands/install.js');
        
        expect(() => validateNpmPackage('express')).not.toThrow();
        expect(() => validateNpmPackage('@types/node')).not.toThrow();
        expect(() => validateNpmPackage('my-package')).not.toThrow();
      });

      it('should reject invalid package names with helpful errors', async () => {
        const { validateNpmPackage } = await import('../../src/commands/install.js');
        
        expect(() => validateNpmPackage('')).toThrow('Package name cannot be empty');
        expect(() => validateNpmPackage('https://github.com/user/repo')).toThrow('Invalid npm package name');
        expect(() => validateNpmPackage('../local/path')).toThrow('Invalid npm package name');
      });
    });
  });

  describe('NPM Operations', () => {
    let mockExeca: any;
    
    beforeEach(async () => {
      // Import execa mock
      const execaMock = await import('execa');
      mockExeca = execaMock.execa as any;
      
      // Setup default mocks
      vi.mocked(mockExeca).mockResolvedValue({
        stdout: '',
        stderr: '',
        exitCode: 0
      } as any);
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.readFile).mockResolvedValue('{}');
    });

    describe('isNpmProject', () => {
      it('should detect npm project by package.json presence', async () => {
        const { isNpmProject } = await import('../../src/commands/install.js');
        
        vi.mocked(fs.access).mockResolvedValue(undefined);
        expect(await isNpmProject()).toBe(true);
        
        expect(vi.mocked(fs.access)).toHaveBeenCalledWith('package.json');
      });

      it('should return false when package.json is missing', async () => {
        const { isNpmProject } = await import('../../src/commands/install.js');
        
        vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
        expect(await isNpmProject()).toBe(false);
      });
    });

    describe('installFromNpm', () => {
      beforeEach(() => {
        vi.mocked(ConfigManager.load).mockResolvedValue({
          promptDirs: ['./.prompts'],
          npmPromptDir: 'node_modules',
          version: '3.0.0'
        } as any);
      });

      it('should install npm package using execa', async () => {
        const { installFromNpm } = await import('../../src/commands/install.js');
        
        vi.mocked(fs.access).mockResolvedValue(undefined); // npm project exists
        vi.mocked(fs2.writeJson).mockResolvedValue(undefined);
        
        await installFromNpm('@my-org/prompt-pack');
        
        expect(mockExeca).toHaveBeenCalledWith('npm', ['install', '@my-org/prompt-pack'], {
          stdio: 'inherit'
        });
      });

      it('should handle installation in non-npm projects', async () => {
        const { installFromNpm } = await import('../../src/commands/install.js');
        
        vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT')); // no package.json
        
        await expect(installFromNpm('some-package')).rejects.toThrow(
          'NPM package installation requires a package.json file'
        );
      });

      it('should parse package.json to find prompt directory', async () => {
        const { installFromNpm } = await import('../../src/commands/install.js');
        
        vi.mocked(fs.access).mockResolvedValue(undefined);
        vi.mocked(fs.readFile)
          .mockImplementation(async (filePath) => {
            if (filePath === 'package.json') {
              return '{}'; // Project package.json
            } else if (filePath === path.join('node_modules', '@my-org/prompt-pack', 'package.json')) {
              return JSON.stringify({
                name: '@my-org/prompt-pack',
                promptDir: 'custom-prompts'
              });
            }
            throw new Error('Unexpected file read');
          });
        vi.mocked(fs2.writeJson).mockResolvedValue(undefined);
        
        await installFromNpm('@my-org/prompt-pack');
        
        expect(vi.mocked(fs.readFile)).toHaveBeenCalledWith(
          path.join('node_modules', '@my-org/prompt-pack', 'package.json'),
          'utf-8'
        );
        
        expect(vi.mocked(fs2.writeJson)).toHaveBeenCalledWith(
          expect.stringContaining('.pt-config.json'),
          expect.objectContaining({
            promptDirs: expect.arrayContaining([
              path.join('node_modules', '@my-org/prompt-pack', 'custom-prompts')
            ])
          }),
          { spaces: 2 }
        );
      });

      it('should update config with correct npm package path', async () => {
        const { installFromNpm } = await import('../../src/commands/install.js');
        
        vi.mocked(fs.access).mockResolvedValue(undefined);
        vi.mocked(fs.readFile)
          .mockImplementation(async (filePath) => {
            if (filePath === 'package.json') {
              return '{}'; // Project package.json
            } else if (filePath === path.join('node_modules', '@my-org/prompt-pack', 'package.json')) {
              return JSON.stringify({
                name: '@my-org/prompt-pack',
                promptDir: 'prompts'
              });
            }
            throw new Error('Unexpected file read');
          });
        vi.mocked(fs2.writeJson).mockResolvedValue(undefined);
        
        await installFromNpm('@my-org/prompt-pack');
        
        expect(vi.mocked(fs2.writeJson)).toHaveBeenCalledWith(
          expect.stringContaining('.pt-config.json'),
          expect.objectContaining({
            promptDirs: expect.arrayContaining([
              './.prompts',
              path.join('node_modules', '@my-org/prompt-pack', 'prompts')
            ])
          }),
          { spaces: 2 }
        );
      });

      it('should use default prompts directory when promptDir not specified', async () => {
        const { installFromNpm } = await import('../../src/commands/install.js');
        
        vi.mocked(fs.access).mockResolvedValue(undefined);
        vi.mocked(fs.readFile)
          .mockResolvedValueOnce('{}') // isNpmProject check
          .mockResolvedValueOnce(JSON.stringify({
            name: 'simple-prompts'
          }));
        vi.mocked(fs2.writeJson).mockResolvedValue(undefined);
        
        await installFromNpm('simple-prompts');
        
        expect(vi.mocked(fs2.writeJson)).toHaveBeenCalledWith(
          expect.stringContaining('.pt-config.json'),
          expect.objectContaining({
            promptDirs: expect.arrayContaining([
              path.join('node_modules', 'simple-prompts', 'prompts')
            ])
          }),
          { spaces: 2 }
        );
      });

      it('should handle npm install errors', async () => {
        const { installFromNpm } = await import('../../src/commands/install.js');
        
        vi.mocked(fs.access).mockResolvedValue(undefined);
        mockExeca.mockRejectedValue(new Error('npm ERR! 404 Not Found'));
        
        await expect(installFromNpm('non-existent-package')).rejects.toThrow(
          'Failed to install npm package'
        );
      });

      it('should not duplicate existing prompt directories', async () => {
        const { installFromNpm } = await import('../../src/commands/install.js');
        
        const existingPath = path.join('node_modules', 'existing-package', 'prompts');
        vi.mocked(ConfigManager.load).mockResolvedValue({
          promptDirs: ['./.prompts', existingPath],
          npmPromptDir: 'node_modules',
          version: '3.0.0'
        } as any);
        
        vi.mocked(fs.access).mockResolvedValue(undefined);
        vi.mocked(fs.readFile)
          .mockResolvedValueOnce('{}')
          .mockResolvedValueOnce(JSON.stringify({
            name: 'existing-package'
          }));
        
        await installFromNpm('existing-package');
        
        expect(vi.mocked(fs2.writeJson)).not.toHaveBeenCalled();
      });
    });
  });
});