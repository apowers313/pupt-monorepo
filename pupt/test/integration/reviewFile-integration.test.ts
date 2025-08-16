import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { TemplateEngine } from '../../src/template/template-engine.js';
import { ConfigManager } from '../../src/config/config-manager.js';
import type { Config } from '../../src/types/config.js';
import type { Prompt } from '../../src/types/prompt.js';
import { fileSearchPrompt } from '../../src/prompts/input-types/file-search-prompt.js';

vi.mock('child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn()
}));
// Use vi.hoisted to ensure mocks are available before imports
const { mockExecFileAsync } = vi.hoisted(() => {
  return {
    mockExecFileAsync: vi.fn()
  };
});

vi.mock('util', () => ({
  promisify: vi.fn(() => mockExecFileAsync)
}));
// Don't mock fs-extra globally as it breaks FileSearchEngine
vi.mock('../../src/prompts/input-types/file-search-prompt.js', () => {
  const mockFn = vi.fn();
  return {
    default: mockFn,
    fileSearchPrompt: mockFn
  };
});

describe('ReviewFile Integration Tests', () => {
  let tempDir: string;
  let configPath: string;
  let mockSpawn: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockExecFileAsync.mockReset();
    mockExecFileAsync.mockResolvedValue(undefined);
    
    // Setup temp directory - use actual fs for this
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-test-'));
    configPath = path.join(tempDir, '.ptrc.json');
    
    // Create test directories and files
    await fs.ensureDir(path.join(tempDir, 'prompts'));
    await fs.writeFile(path.join(tempDir, 'test.txt'), 'test content');
    
    // Mock spawn
    mockSpawn = vi.mocked(spawn);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env.EDITOR;
    delete process.env.VISUAL;
    // Clean up temp directory
    await fs.remove(tempDir);
  });

  describe('prompt with reviewFile variable', () => {
    it('should open selected file in editor when autoReview is true', async () => {
      // Mock config with autoReview enabled
      const config: Config = {
        promptDirs: [path.join(tempDir, 'prompts')],
        autoReview: true,
        defaultCmd: 'claude'
      };
      
      vi.spyOn(ConfigManager, 'load').mockResolvedValue(config);
      
      // Set editor env var
      process.env.EDITOR = 'vim';
      
      // Mock editor spawn
      const mockChildProcess = {
        on: vi.fn((event, handler) => {
          if (event === 'exit') {
            setTimeout(() => handler(0), 100);
          }
        }),
        unref: vi.fn()
      };
      mockSpawn.mockReturnValue(mockChildProcess);
      
      // Create a prompt with reviewFile variable
      const prompt: Prompt = {
        path: path.join(tempDir, 'prompts', 'test.md'),
        relativePath: 'test.md',
        filename: 'test.md',
        title: 'Test Prompt',
        labels: [],
        content: 'Select a file: {{reviewFile "sourceFile" "Select source file to review:"}}',
        frontmatter: {},
        variables: [
          {
            name: 'sourceFile',
            type: 'reviewFile',
            message: 'Select source file to review:',
            basePath: './src',
            filter: '*.ts'
          }
        ]
      };
      
      // File selection will be handled by mock
      
      // Mock filePrompt to return test.ts
      vi.mocked(fileSearchPrompt).mockResolvedValue(path.resolve('./src/test.ts'));
      
      const engine = new TemplateEngine();
      const result = await engine.processTemplate(prompt.content, prompt);
      
      // Verify editor was spawned with selected file
      expect(mockSpawn).toHaveBeenCalledWith('vim', expect.arrayContaining([path.resolve('./src/test.ts')]), { stdio: 'inherit' });
    });

    it('should not open editor when autoReview is false', async () => {
      // Mock config with autoReview disabled
      const config: Config = {
        promptDirs: [path.join(tempDir, 'prompts')],
        autoReview: false,
        defaultCmd: 'claude'
      };
      
      vi.spyOn(ConfigManager, 'load').mockResolvedValue(config);
      
      process.env.EDITOR = 'vim';
      
      // Create a prompt with reviewFile variable
      const prompt: Prompt = {
        path: path.join(tempDir, 'prompts', 'test.md'),
        relativePath: 'test.md',
        filename: 'test.md',
        title: 'Test Prompt',
        labels: [],
        content: 'File: {{reviewFile "sourceFile"}}',
        frontmatter: {},
        variables: [
          {
            name: 'sourceFile',
            type: 'reviewFile'
          }
        ]
      };
      
      // File selection will be handled by mock
      
      const engine = new TemplateEngine();
      
      // Mock filePrompt to return test.ts
      vi.mocked(fileSearchPrompt).mockResolvedValue(path.resolve('./src/test.ts'));
      
      await engine.processTemplate(prompt.content, prompt);
      
      // Verify editor was NOT spawned
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should handle editor cancellation gracefully', async () => {
      const config: Config = {
        promptDirs: [path.join(tempDir, 'prompts')],
        autoReview: true,
        defaultCmd: 'claude'
      };
      
      vi.spyOn(ConfigManager, 'load').mockResolvedValue(config);
      
      process.env.EDITOR = 'vim';
      
      // Mock editor spawn with non-zero exit code
      const mockChildProcess = {
        on: vi.fn((event, handler) => {
          if (event === 'exit') {
            // Simulate user cancelling editor (exit code 1)
            setTimeout(() => handler(1), 100);
          }
        }),
        unref: vi.fn()
      };
      mockSpawn.mockReturnValue(mockChildProcess);
      
      const prompt: Prompt = {
        path: path.join(tempDir, 'prompts', 'test.md'),
        relativePath: 'test.md',
        filename: 'test.md',
        title: 'Test Prompt',
        labels: [],
        content: 'File: {{reviewFile "sourceFile"}}',
        frontmatter: {},
        variables: [
          {
            name: 'sourceFile',
            type: 'reviewFile'
          }
        ]
      };
      
      // File selection will be handled by fileSearchPrompt mock
      
      // Mock filePrompt to return test.ts
      vi.mocked(fileSearchPrompt).mockResolvedValue(path.resolve('./src/test.ts'));
      
      const engine = new TemplateEngine();
      
      // Should throw when editor exits with non-zero code
      await expect(engine.processTemplate(prompt.content, prompt)).rejects.toThrow('Failed to open editor: Editor exited with code 1');
    });

    it('should fallback to common editors when EDITOR not set', async () => {
      const config: Config = {
        promptDirs: [path.join(tempDir, 'prompts')],
        autoReview: true,
        defaultCmd: 'claude'
      };
      
      vi.spyOn(ConfigManager, 'load').mockResolvedValue(config);
      
      // No EDITOR env var
      delete process.env.EDITOR;
      delete process.env.VISUAL;
      
      // Mock editor availability checks - first two fail, third succeeds
      mockExecFileAsync.mockReset();
      mockExecFileAsync
        .mockRejectedValueOnce(new Error('not found')) // code not found
        .mockRejectedValueOnce(new Error('not found')) // vim not found
        .mockResolvedValueOnce(undefined); // nano found
      
      // Mock editor spawn
      const mockChildProcess = {
        on: vi.fn((event, handler) => {
          if (event === 'exit') {
            handler(0);
          }
        }),
        unref: vi.fn()
      };
      mockSpawn.mockReturnValue(mockChildProcess);
      
      const prompt: Prompt = {
        path: path.join(tempDir, 'prompts', 'test.md'),
        relativePath: 'test.md',
        filename: 'test.md',
        title: 'Test Prompt',
        labels: [],
        content: 'File: {{reviewFile "sourceFile"}}',
        frontmatter: {},
        variables: [
          {
            name: 'sourceFile',
            type: 'reviewFile'
          }
        ]
      };
      
      // File selection will be handled by fileSearchPrompt mock
      
      // Mock filePrompt to return test.ts
      vi.mocked(fileSearchPrompt).mockResolvedValue(path.resolve('./src/test.ts'));
      
      const engine = new TemplateEngine();
      
      await engine.processTemplate(prompt.content, prompt);
      
      // Should have checked for editors using which/where
      expect(mockExecFileAsync).toHaveBeenCalledWith(process.platform === 'win32' ? 'where' : 'which', ['code']);
      expect(mockExecFileAsync).toHaveBeenCalledWith(process.platform === 'win32' ? 'where' : 'which', ['vim']);
      expect(mockExecFileAsync).toHaveBeenCalledWith(process.platform === 'win32' ? 'where' : 'which', ['nano']);
      
      // Should have launched nano editor (the first available)
      expect(mockSpawn).toHaveBeenCalledWith('nano', expect.arrayContaining([path.resolve('./src/test.ts')]), { stdio: 'inherit' });
    });

    it('should respect VISUAL over EDITOR environment variable', async () => {
      const config: Config = {
        promptDirs: [path.join(tempDir, 'prompts')],
        autoReview: true,
        defaultCmd: 'claude'
      };
      
      vi.spyOn(ConfigManager, 'load').mockResolvedValue(config);
      
      // Set both VISUAL and EDITOR
      process.env.VISUAL = 'emacs';
      process.env.EDITOR = 'vim';
      
      // Mock editor spawn
      const mockChildProcess = {
        on: vi.fn((event, handler) => {
          if (event === 'exit') {
            handler(0);
          }
        })
      };
      mockSpawn.mockReturnValue(mockChildProcess);
      
      const prompt: Prompt = {
        path: path.join(tempDir, 'prompts', 'test.md'),
        relativePath: 'test.md',
        filename: 'test.md',
        title: 'Test Prompt',
        labels: [],
        content: 'File: {{reviewFile "sourceFile"}}',
        frontmatter: {},
        variables: [
          {
            name: 'sourceFile',
            type: 'reviewFile'
          }
        ]
      };
      
      // File selection will be handled by fileSearchPrompt mock
      
      // Mock filePrompt to return test.ts
      vi.mocked(fileSearchPrompt).mockResolvedValue(path.resolve('./src/test.ts'));
      
      const engine = new TemplateEngine();
      
      await engine.processTemplate(prompt.content, prompt);
      
      // Should use VISUAL (emacs) not EDITOR (vim)
      expect(mockSpawn).toHaveBeenCalledWith('emacs', expect.arrayContaining([path.resolve('./src/test.ts')]), { stdio: 'inherit' });
      
      delete process.env.VISUAL;
    });

    it('should throw error when no editor is available', async () => {
      const config: Config = {
        promptDirs: [path.join(tempDir, 'prompts')],
        autoReview: true,
        defaultCmd: 'claude'
      };
      
      vi.spyOn(ConfigManager, 'load').mockResolvedValue(config);
      
      // No env vars
      delete process.env.EDITOR;
      delete process.env.VISUAL;
      
      // Mock all editor checks to fail
      mockSpawn.mockImplementation((command, args) => {
        const proc = {
          on: vi.fn((event, handler) => {
            if (event === 'error') {
              handler(new Error('Not found'));
            }
          }),
          unref: vi.fn()
        };
        return proc;
      });
      
      const prompt: Prompt = {
        path: path.join(tempDir, 'prompts', 'test.md'),
        relativePath: 'test.md',
        filename: 'test.md',
        title: 'Test Prompt',
        labels: [],
        content: 'File: {{reviewFile "sourceFile"}}',
        frontmatter: {},
        variables: [
          {
            name: 'sourceFile',
            type: 'reviewFile'
          }
        ]
      };
      
      // File selection will be handled by fileSearchPrompt mock
      
      // Mock filePrompt to return test.ts
      vi.mocked(fileSearchPrompt).mockResolvedValue(path.resolve('./src/test.ts'));
      
      const engine = new TemplateEngine();
      
      await expect(engine.processTemplate(prompt.content, prompt)).rejects.toThrow(/editor/i);
    });
  });
});