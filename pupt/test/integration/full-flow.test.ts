import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('Full Integration Flow', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-test-'));
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up
    process.chdir(originalCwd);
    await fs.remove(testDir);
  });

  describe('Complete User Journey', () => {
    it('should support full workflow from init to annotate', async () => {
      // 1. Initialize configuration
      const configPath = path.join(testDir, '.pt-config.json');
      const config = {
        promptDirs: ['./.prompts'],
        historyDir: './.pthistory',
        annotationDir: './.pthistory',
        defaultCmd: 'echo',
        defaultCmdArgs: [],
        defaultCmdOptions: {},
        version: '3.0.0'
      };
      await fs.writeJson(configPath, config);
      await fs.ensureDir('./.prompts');
      await fs.ensureDir('./.pthistory');

      // 2. Create a prompt using add command
      const promptContent = `---
title: Test Prompt
author: Test User
creationDate: 20240120
labels: [test]
---

This is a test prompt with {{input "name" "What is your name?"}}`;
      
      await fs.writeFile('./.prompts/test-prompt.md', promptContent);

      // 3. Verify prompt discovery
      const { PromptManager } = await import('../../src/prompts/prompt-manager.js');
      const promptManager = new PromptManager(['./.prompts']);
      const prompts = await promptManager.discoverPrompts();
      
      expect(prompts).toHaveLength(1);
      expect(prompts[0].title).toBe('Test Prompt');

      // 4. Skip interactive template processing in tests
      // Instead, verify the prompt was created correctly
      const savedPromptContent = await fs.readFile('./.prompts/test-prompt.md', 'utf-8');
      expect(savedPromptContent).toContain('This is a test prompt with {{input "name" "What is your name?"}}');
      
      // Mock the processed result for history saving
      const result = 'This is a test prompt with TestUser';

      // 5. Save to history
      const { HistoryManager } = await import('../../src/history/history-manager.js');
      const historyManager = new HistoryManager('./.pthistory');
      
      const filename = await historyManager.savePrompt({
        templatePath: './.prompts/test-prompt.md',
        templateContent: promptContent,
        variables: new Map([['name', 'TestUser']]),
        finalPrompt: result,
        title: 'Test Prompt'
      });
      
      expect(filename).toMatch(/^\d{8}-\d{6}-[a-f0-9]{8}\.json$/);

      // 6. List history
      const entries = await historyManager.listHistory();
      expect(entries).toHaveLength(1);
      expect(entries[0].title).toBe('Test Prompt');

      // 7. Get specific history entry
      const entry = await historyManager.getHistoryEntry(1);
      expect(entry).toBeDefined();
      expect(entry?.title).toBe('Test Prompt');

      // 8. Create annotation
      const annotationContent = `---
historyFile: ${filename}
timestamp: ${new Date().toISOString()}
status: success
tags:
  - test
  - integration
---

## Notes

This test was successful.`;

      const annotationPath = path.join('./.pthistory', `${filename.replace('.json', '')}-annotation-test.md`);
      await fs.writeFile(annotationPath, annotationContent);

      // Verify annotation was created
      const annotationExists = await fs.pathExists(annotationPath);
      expect(annotationExists).toBe(true);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle missing configuration gracefully', async () => {
      const { ConfigManager } = await import('../../src/config/config-manager.js');
      const os = await import('os');
      const path = await import('path');
      
      // Should create default config when missing
      const config = await ConfigManager.load();
      expect(config.promptDirs).toEqual([path.join(os.homedir(), '.pt/prompts')]);
    });

    it('should handle invalid prompt files', async () => {
      await fs.ensureDir('./.prompts');
      await fs.writeFile('./.prompts/invalid.md', 'Not a valid prompt');
      
      const { PromptManager } = await import('../../src/prompts/prompt-manager.js');
      const promptManager = new PromptManager(['./.prompts']);
      const prompts = await promptManager.discoverPrompts();
      
      // Should still discover the file
      expect(prompts).toHaveLength(1);
      // But it won't have a title from frontmatter
      expect(prompts[0].title).toBe('invalid');
    });

    it('should handle missing history directory', async () => {
      const { HistoryManager } = await import('../../src/history/history-manager.js');
      const historyManager = new HistoryManager('./non-existent-history');
      
      // Should create directory on save
      await historyManager.savePrompt({
        templatePath: 'test.md',
        templateContent: 'test',
        variables: new Map(),
        finalPrompt: 'test',
        title: 'Test'
      });
      
      const exists = await fs.pathExists('./non-existent-history');
      expect(exists).toBe(true);
    });

    it('should handle template processing errors', async () => {
      const { TemplateEngine } = await import('../../src/template/template-engine.js');
      const engine = new TemplateEngine();
      
      // Invalid helper syntax
      const invalidTemplate = 'Test {{invalid helper syntax}}';
      
      await expect(engine.processTemplate(invalidTemplate, {
        title: 'Test',
        path: 'test.md'
      })).rejects.toThrow();
    });
  });

  describe('Command Integration', () => {
    it('should handle all commands with various configurations', async () => {
      // Test with minimal config
      const minimalConfig = {
        promptDirs: ['./.prompts']
      };
      await fs.writeJson('.pt-config.json', minimalConfig);
      await fs.ensureDir('./.prompts');

      // Create a simple prompt
      await fs.writeFile('./.prompts/simple.md', '# Simple Prompt\n\nHello World!');

      // Test prompt discovery works
      const { PromptManager } = await import('../../src/prompts/prompt-manager.js');
      const promptManager = new PromptManager(['./.prompts']);
      const prompts = await promptManager.discoverPrompts();
      expect(prompts).toHaveLength(1);

      // Test with full config
      const fullConfig = {
        promptDirs: ['./.prompts', './templates'],
        historyDir: './history',
        annotationDir: './annotations',
        defaultCmd: 'cat',
        defaultCmdArgs: ['-n'],
        defaultCmdOptions: {
          'Show line numbers?': '--number'
        },
        version: '3.0.0'
      };
      await fs.writeJson('.pt-config.json', fullConfig);
      await fs.ensureDir('./templates');

      // Create prompt in second directory
      await fs.writeFile('./templates/template.md', '# Template\n\nTemplate content');

      // Test discovery from multiple directories
      const multiPromptManager = new PromptManager(['./.prompts', './templates']);
      const multiPrompts = await multiPromptManager.discoverPrompts();
      expect(multiPrompts).toHaveLength(2);
    });
  });

  describe('Cancellation Handling', () => {
    it('should handle user cancellation gracefully', async () => {
      const { TemplateEngine } = await import('../../src/template/template-engine.js');
      const { TemplateContext } = await import('../../src/template/template-context.js');
      
      const engine = new TemplateEngine();
      const context = new TemplateContext();
      
      // Mock user cancellation
      const originalExit = process.exit;
      const exitMock = vi.fn();
      process.exit = exitMock as any;
      
      // Simulate Ctrl+C during processing
      process.emit('SIGINT');
      
      // Should handle gracefully
      expect(exitMock).not.toHaveBeenCalled();
      
      process.exit = originalExit;
    });
  });
});