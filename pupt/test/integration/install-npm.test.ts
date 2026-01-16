import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import fs from 'fs-extra';
import { installCommand } from '../../src/commands/install.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import { logger } from '../../src/utils/logger.js';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn()
}));

// Mock simple-git
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    clone: vi.fn(),
    checkIsRepo: vi.fn().mockResolvedValue(false)
  }))
}));

// Mock ConfigManager to use test configs
vi.mock('../../src/config/config-manager.js');

vi.mock('../../src/utils/logger.js');
describe('NPM Installation Integration Tests', () => {
  let tempDir: string;
  let originalCwd: string;
  let mockExeca: any;
  let loggerLogSpy: any;
  let loggerErrorSpy: any;

  beforeEach(async () => {
    // Save original cwd
    originalCwd = process.cwd();
    
    // Create temp directory
    tempDir = path.join(os.tmpdir(), `pt-test-npm-${Date.now()}`);
    await fs.ensureDir(tempDir);
    process.chdir(tempDir);
    
    // Create initial config
    const testConfig = {
      version: '3.0.0',
      promptDirs: ['./.prompts']
    };
    await fs.writeJson('.pt-config.json', testConfig);
    
    // Mock ConfigManager to use our test config
    vi.mocked(ConfigManager.load).mockImplementation(async () => {
      const configContent = await fs.readJson('.pt-config.json');
      return configContent;
    });
    
    // Create prompts directory
    await fs.ensureDir('prompts');
    
    // Get mocked execa
    const execaMock = await import('execa');
    mockExeca = execaMock.execa as any;
    
    // Setup console spies
    loggerLogSpy = vi.mocked(logger.log).mockImplementation(() => {});
    loggerErrorSpy = vi.mocked(logger.error).mockImplementation(() => {});
  });

  afterEach(async () => {
    // Restore console
    
    // Restore cwd
    process.chdir(originalCwd);
    
    // Clean up temp directory
    await fs.remove(tempDir);
    
    // Clear mocks
    vi.clearAllMocks();
  });

  describe('Full NPM Installation Flow', () => {
    it('should install a regular npm package', async () => {
      // Create package.json to simulate npm project
      await fs.writeJson('package.json', {
        name: 'test-project',
        version: '1.0.0'
      });
      
      // Mock successful npm install
      mockExeca.mockResolvedValue({
        stdout: 'added 1 package',
        stderr: '',
        exitCode: 0
      });
      
      // Create mock installed package
      const packageDir = path.join('node_modules', 'my-prompts');
      await fs.ensureDir(packageDir);
      await fs.writeJson(path.join(packageDir, 'package.json'), {
        name: 'my-prompts',
        version: '1.0.0',
        promptDir: 'templates'
      });
      await fs.ensureDir(path.join(packageDir, 'templates'));
      
      // Run install command
      await installCommand('my-prompts');
      
      // Verify npm install was called
      expect(mockExeca).toHaveBeenCalledWith('npm', ['install', '--save-dev', 'my-prompts'], {
        stdio: 'inherit'
      });
      
      // Verify config was updated
      const config = await fs.readJson('.pt-config.json');
      expect(config.promptDirs).toContain(path.join('node_modules', 'my-prompts', 'templates'));
      
      // Verify console output
      expect(loggerLogSpy).toHaveBeenCalledWith('Installing npm package my-prompts...');
      expect(loggerLogSpy).toHaveBeenCalledWith('Successfully installed prompts from my-prompts');
    });

    it('should install a scoped npm package', async () => {
      // Create package.json
      await fs.writeJson('package.json', {
        name: 'test-project',
        version: '1.0.0'
      });
      
      // Mock successful npm install
      mockExeca.mockResolvedValue({
        stdout: 'added 1 package',
        stderr: '',
        exitCode: 0
      });
      
      // Create mock installed package
      const packageDir = path.join('node_modules', '@myorg', 'prompts');
      await fs.ensureDir(packageDir);
      await fs.writeJson(path.join(packageDir, 'package.json'), {
        name: '@myorg/prompts',
        version: '2.0.0'
      });
      await fs.ensureDir(path.join(packageDir, 'prompts'));
      
      // Run install command
      await installCommand('@myorg/prompts');
      
      // Verify npm install was called
      expect(mockExeca).toHaveBeenCalledWith('npm', ['install', '--save-dev', '@myorg/prompts'], {
        stdio: 'inherit'
      });
      
      // Verify config was updated with default prompts directory
      const config = await fs.readJson('.pt-config.json');
      expect(config.promptDirs).toContain(path.join('node_modules', '@myorg/prompts', 'prompts'));
    });

    it('should handle missing package.json error', async () => {
      // No package.json created
      
      await expect(installCommand('some-package')).rejects.toThrow(
        'NPM package installation requires a package.json file'
      );
      
      // Verify npm install was not called
      expect(mockExeca).not.toHaveBeenCalled();
    });

    it('should handle npm install failure', async () => {
      // Create package.json
      await fs.writeJson('package.json', {
        name: 'test-project',
        version: '1.0.0'
      });
      
      // Mock failed npm install
      mockExeca.mockRejectedValue(new Error('npm ERR! 404 Not Found'));
      
      await expect(installCommand('non-existent-package')).rejects.toThrow(
        'Failed to install npm package'
      );
    });

    it('should not duplicate existing prompt directories', async () => {
      // Create package.json
      await fs.writeJson('package.json', {
        name: 'test-project',
        version: '1.0.0'
      });
      
      // Create config with existing path
      const existingPath = path.join('node_modules', 'existing-package', 'prompts');
      await fs.writeJson('.pt-config.json', {
        version: '3.0.0',
        promptDirs: ['./.prompts', existingPath]
      });
      
      // Mock successful npm install
      mockExeca.mockResolvedValue({
        stdout: 'added 1 package',
        stderr: '',
        exitCode: 0
      });
      
      // Create mock installed package
      const packageDir = path.join('node_modules', 'existing-package');
      await fs.ensureDir(packageDir);
      await fs.writeJson(path.join(packageDir, 'package.json'), {
        name: 'existing-package',
        version: '1.0.0'
      });
      await fs.ensureDir(path.join(packageDir, 'prompts'));
      
      // Run install command
      await installCommand('existing-package');
      
      // Verify config was not modified
      const config = await fs.readJson('.pt-config.json');
      expect(config.promptDirs).toHaveLength(2);
      expect(config.promptDirs.filter(dir => dir === existingPath)).toHaveLength(1);
      
      // Verify appropriate console output
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('already configured at')
      );
    });

    it('should handle invalid installation sources', async () => {
      await expect(installCommand('https://not-git-or-npm')).rejects.toThrow(
        'Invalid installation source'
      );
      
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('neither a valid git URL nor an npm package name')
      );
    });

    it('should differentiate between git URLs and npm packages', async () => {
      // Create package.json for npm test
      await fs.writeJson('package.json', {
        name: 'test-project',
        version: '1.0.0'
      });
      
      // Test npm package - should use npm
      mockExeca.mockResolvedValue({
        stdout: 'added 1 package',
        stderr: '',
        exitCode: 0
      });
      
      const packageDir = path.join('node_modules', 'npm-package');
      await fs.ensureDir(packageDir);
      await fs.writeJson(path.join(packageDir, 'package.json'), {
        name: 'npm-package',
        version: '1.0.0'
      });
      await fs.ensureDir(path.join(packageDir, 'prompts'));
      
      await installCommand('npm-package');
      expect(mockExeca).toHaveBeenCalledWith('npm', ['install', '--save-dev', 'npm-package'], expect.any(Object));
      
      // Reset mocks
      mockExeca.mockClear();
      
      // Mock simple-git to simulate successful git operation
      const simpleGitMock = await import('simple-git');
      const mockGit = {
        clone: vi.fn().mockResolvedValue(undefined),
        checkIsRepo: vi.fn().mockResolvedValue(false)
      };
      vi.mocked(simpleGitMock.default).mockReturnValue(mockGit as any);
      
      // Create git-prompts directory for git URL test
      await fs.ensureDir('.git-prompts/repo/prompts');
      
      // Test git URL - should use git, not npm
      await installCommand('https://github.com/user/repo');
      expect(mockExeca).not.toHaveBeenCalled(); // npm should not be called for git URLs
      expect(mockGit.clone).toHaveBeenCalled(); // git should be called instead
    });
  });

  describe('Package.json Parsing', () => {
    it('should respect custom promptDir from package.json', async () => {
      // Create package.json
      await fs.writeJson('package.json', {
        name: 'test-project',
        version: '1.0.0'
      });
      
      // Mock successful npm install
      mockExeca.mockResolvedValue({
        stdout: 'added 1 package',
        stderr: '',
        exitCode: 0
      });
      
      // Create mock installed package with custom promptDir
      const packageDir = path.join('node_modules', 'custom-prompts');
      await fs.ensureDir(packageDir);
      await fs.writeJson(path.join(packageDir, 'package.json'), {
        name: 'custom-prompts',
        version: '1.0.0',
        promptDir: 'my-templates'
      });
      await fs.ensureDir(path.join(packageDir, 'my-templates'));
      
      // Run install command
      await installCommand('custom-prompts');
      
      // Verify config uses custom directory
      const config = await fs.readJson('.pt-config.json');
      expect(config.promptDirs).toContain(path.join('node_modules', 'custom-prompts', 'my-templates'));
    });

    it('should use default prompts directory when promptDir not specified', async () => {
      // Create package.json
      await fs.writeJson('package.json', {
        name: 'test-project',
        version: '1.0.0'
      });
      
      // Mock successful npm install
      mockExeca.mockResolvedValue({
        stdout: 'added 1 package',
        stderr: '',
        exitCode: 0
      });
      
      // Create mock installed package without promptDir
      const packageDir = path.join('node_modules', 'default-prompts');
      await fs.ensureDir(packageDir);
      await fs.writeJson(path.join(packageDir, 'package.json'), {
        name: 'default-prompts',
        version: '1.0.0'
      });
      await fs.ensureDir(path.join(packageDir, 'prompts'));
      
      // Run install command
      await installCommand('default-prompts');
      
      // Verify config uses default directory
      const config = await fs.readJson('.pt-config.json');
      expect(config.promptDirs).toContain(path.join('node_modules', 'default-prompts', 'prompts'));
    });

    it('should handle missing or invalid package.json in installed package', async () => {
      // Create package.json
      await fs.writeJson('package.json', {
        name: 'test-project',
        version: '1.0.0'
      });
      
      // Mock successful npm install
      mockExeca.mockResolvedValue({
        stdout: 'added 1 package',
        stderr: '',
        exitCode: 0
      });
      
      // Create mock installed package with no package.json
      const packageDir = path.join('node_modules', 'no-metadata');
      await fs.ensureDir(packageDir);
      await fs.ensureDir(path.join(packageDir, 'prompts'));
      
      // Run install command - should not throw
      await installCommand('no-metadata');
      
      // Verify config uses default directory
      const config = await fs.readJson('.pt-config.json');
      expect(config.promptDirs).toContain(path.join('node_modules', 'no-metadata', 'prompts'));
    });
  });
});