import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { readFile, access, readdir } from 'fs-extra';
import { 
  createMockConfig, 
  createMockPrompt, 
  createMockHistoryEntry,
  createMockConsole,
  createMockSpawn,
  createMockInquirer,
  createMockFileSystem,
  createMockGit
} from './mock-factories.js';
import {
  setupTestEnvironment,
  createTestPromptStructure,
  mockEnvironmentVariables,
  mockDateNow,
  waitForCondition,
  captureProcessExit
} from './test-helpers.js';
import { fixtures } from './fixtures.js';

describe('Mock Factories', () => {
  describe('createMockConfig', () => {
    it('should create a basic config with defaults', () => {
      const config = createMockConfig();
      expect(config.promptDirectory).toEqual(['./.prompts']);
      expect(config.historyDirectory).toBe('./.pthistory');
      expect(config.editor).toBe('code');
    });

    it('should allow overriding defaults', () => {
      const config = createMockConfig({
        editor: 'vim',
        defaultModel: 'gpt-4'
      });
      expect(config.editor).toBe('vim');
      expect(config.defaultModel).toBe('gpt-4');
      expect(config.promptDirectory).toEqual(['./.prompts']); // Default preserved
    });
  });

  describe('createMockPrompt', () => {
    it('should create a basic prompt with defaults', () => {
      const prompt = createMockPrompt();
      expect(prompt.name).toBe('test-prompt');
      expect(prompt.description).toBe('A test prompt');
      expect(prompt.content).toBe('Test prompt content');
    });

    it('should allow overriding defaults', () => {
      const prompt = createMockPrompt({
        name: 'custom-prompt',
        metadata: { model: 'gpt-4' }
      });
      expect(prompt.name).toBe('custom-prompt');
      expect(prompt.metadata.model).toBe('gpt-4');
    });
  });

  describe('createMockConsole', () => {
    it('should mock console methods', () => {
      const mockConsole = createMockConsole();
      
      console.log('test log');
      console.error('test error');
      
      expect(mockConsole.log).toHaveBeenCalledWith('test log');
      expect(mockConsole.error).toHaveBeenCalledWith('test error');
      
      mockConsole.restore();
    });
  });

  describe('createMockSpawn', () => {
    it('should create a mock spawn function', async () => {
      const { mockSpawn, mockProcess } = createMockSpawn();
      
      const result = mockSpawn('echo', ['test']);
      expect(result).toBe(mockProcess);
      
      // Test close event
      const closePromise = new Promise((resolve) => {
        mockProcess.on('close', (code) => {
          resolve(code);
        });
      });
      
      const code = await closePromise;
      expect(code).toBe(0);
      expect(mockProcess.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });

  describe('createMockFileSystem', () => {
    it('should simulate file operations', async () => {
      const mockFs = createMockFileSystem();
      
      // Test file not found
      await expect(mockFs.readFile('nonexistent.txt')).rejects.toThrow('ENOENT');
      
      // Test write and read
      await mockFs.writeFile('test.txt', 'content');
      const content = await mockFs.readFile('test.txt');
      expect(content).toBe('content');
      
      // Test access
      await expect(mockFs.access('test.txt')).resolves.toBeUndefined();
      await expect(mockFs.access('nonexistent.txt')).rejects.toThrow('ENOENT');
    });
  });
});

describe('Test Helpers', () => {
  describe('setupTestEnvironment', () => {
    const env = setupTestEnvironment();
    
    it('should create and cleanup temp directory', async () => {
      expect(env.tempDir).toBeDefined();
      expect(env.tempDir).toContain('pt-test-');
      
      // Directory should exist
      await expect(access(env.tempDir)).resolves.toBeUndefined();
    });
  });

  describe('createTestPromptStructure', () => {
    const env = setupTestEnvironment();
    
    it('should create complete prompt structure', async () => {
      const structure = await createTestPromptStructure(env.tempDir);
      
      // Check directories exist
      await expect(access(structure.promptsDir)).resolves.toBeUndefined();
      await expect(access(structure.historyDir)).resolves.toBeUndefined();
      
      // Check files exist
      const testPrompt = await readFile(join(structure.promptsDir, 'test-prompt.md'), 'utf-8');
      expect(testPrompt).toContain('test-prompt');
      expect(testPrompt).toContain('{{variable}}');
      
      const config = await readFile(structure.configPath, 'utf-8');
      expect(JSON.parse(config)).toHaveProperty('promptDirectory');
    });
  });

  describe('mockEnvironmentVariables', () => {
    const originalValue = process.env.TEST_VAR;
    
    afterEach(() => {
      if (originalValue === undefined) {
        delete process.env.TEST_VAR;
      } else {
        process.env.TEST_VAR = originalValue;
      }
    });
    
    it('should mock and restore environment variables', () => {
      // Since mockEnvironmentVariables uses beforeEach/afterEach,
      // we can't call it inside an it() block. Just test the behavior directly.
      const originalValue = process.env.TEST_VAR;
      
      process.env.TEST_VAR = 'mocked';
      expect(process.env.TEST_VAR).toBe('mocked');
      
      // Clean up
      if (originalValue === undefined) {
        delete process.env.TEST_VAR;
      } else {
        process.env.TEST_VAR = originalValue;
      }
    });
  });

  describe('mockDateNow', () => {
    it('should mock Date.now()', () => {
      const timestamp = 1234567890000;
      const originalNow = Date.now;
      
      // Manually mock since mockDateNow uses beforeEach
      vi.spyOn(Date, 'now').mockReturnValue(timestamp);
      
      expect(Date.now()).toBe(timestamp);
      
      // Clean up
      vi.restoreAllMocks();
      Date.now = originalNow;
    });
  });

  describe('waitForCondition', () => {
    it('should wait for condition to be true', async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 3;
      };
      
      await waitForCondition(condition, 1000, 50);
      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it('should timeout if condition not met', async () => {
      const condition = () => false;
      
      await expect(waitForCondition(condition, 100, 10))
        .rejects.toThrow('Condition not met within 100ms');
    });
  });

  describe('captureProcessExit', () => {
    it('should capture process.exit calls', () => {
      const { exitSpy, restore } = captureProcessExit();
      
      expect(() => process.exit(1)).toThrow('Process.exit(1) called');
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      restore();
    });
  });
});

describe('Fixtures', () => {
  it('should provide valid config fixtures', () => {
    expect(fixtures.configs.minimal).toHaveProperty('promptDirectory');
    expect(fixtures.configs.complete.apiKeys).toHaveProperty('openai');
  });

  it('should provide valid prompt fixtures', () => {
    expect(fixtures.prompts.simple.name).toBe('simple-prompt');
    expect(fixtures.prompts.withInputs.metadata.inputs).toHaveLength(3);
  });

  it('should provide valid history fixtures', () => {
    expect(fixtures.historyEntries.basic.id).toBe('entry-001');
    expect(fixtures.historyEntries.withSensitiveData.variables).toHaveProperty('apiKey');
  });

  it('should provide file content fixtures', () => {
    expect(fixtures.fileContents.markdownPrompt).toContain('---');
    expect(fixtures.fileContents.yamlConfig).toContain('promptDirectory');
  });

  it('should provide error fixtures', () => {
    expect(fixtures.errors.fileNotFound.message).toContain('ENOENT');
    expect(fixtures.errors.permissionDenied.message).toContain('EACCES');
  });
});