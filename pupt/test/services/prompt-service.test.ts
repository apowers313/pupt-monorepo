import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { PromptService } from '../../src/services/prompt-service';
import { z } from 'zod';

describe('PromptService', () => {
  let service: PromptService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-test-'));
    service = new PromptService([tempDir]);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('discoverPrompts', () => {
    beforeEach(async () => {
      // Create test prompt files
      await fs.writeFile(
        path.join(tempDir, 'simple.md'),
        '# Simple prompt\n\nThis is a simple prompt.'
      );

      await fs.ensureDir(path.join(tempDir, 'category'));
      await fs.writeFile(
        path.join(tempDir, 'category', 'nested.md'),
        `---
title: Nested Prompt
tags: [test, nested]
variables:
  - name: username
    type: input
    message: Enter username
---

# Nested prompt

Hello {{username}}!`
      );
    });

    it('should discover prompts in directory', async () => {
      const prompts = await service.discoverPrompts();
      
      expect(prompts).toHaveLength(2);
      expect(prompts.map(p => p.filename).sort()).toEqual(['nested.md', 'simple.md']);
    });

    it('should parse frontmatter correctly', async () => {
      const prompts = await service.discoverPrompts();
      const nested = prompts.find(p => p.filename === 'nested.md');
      
      expect(nested?.title).toBe('Nested Prompt');
      expect(nested?.tags).toEqual(['test', 'nested']);
      expect(nested?.variables).toHaveLength(1);
      expect(nested?.variables?.[0]).toEqual({
        name: 'username',
        type: 'input',
        message: 'Enter username'
      });
    });

    it('should handle missing directories gracefully', async () => {
      service = new PromptService(['/non/existent/path', tempDir]);
      
      const prompts = await service.discoverPrompts();
      
      expect(prompts).toHaveLength(2);
    });

    it('should cache discovery results', async () => {
      const spy = vi.spyOn(fs, 'readdir');
      
      await service.discoverPrompts();
      await service.discoverPrompts();
      
      // Should only read directory once due to caching
      expect(spy).toHaveBeenCalledTimes(2); // Root + category dir
    });
  });

  describe('loadPrompt', () => {
    let promptPath: string;

    beforeEach(async () => {
      promptPath = path.join(tempDir, 'test.md');
      await fs.writeFile(
        promptPath,
        `---
title: Test Prompt
description: A test prompt
model: gpt-4
temperature: 0.7
variables:
  - name: name
    type: input
    message: What is your name?
    default: User
  - name: language
    type: select
    message: Choose a language
    choices: [JavaScript, TypeScript, Python]
---

# Hello {{name}}

Write code in {{language}}.`
      );
    });

    it('should load prompt from path', async () => {
      const prompt = await service.loadPrompt(promptPath);
      
      expect(prompt.title).toBe('Test Prompt');
      expect(prompt.frontmatter.description).toBe('A test prompt');
      expect(prompt.frontmatter.model).toBe('gpt-4');
      expect(prompt.frontmatter.temperature).toBe(0.7);
      expect(prompt.content).toContain('Hello {{name}}');
    });

    it('should parse variables correctly', async () => {
      const prompt = await service.loadPrompt(promptPath);
      
      expect(prompt.variables).toHaveLength(2);
      expect(prompt.variables?.[0]).toEqual({
        name: 'name',
        type: 'input',
        message: 'What is your name?',
        default: 'User'
      });
      expect(prompt.variables?.[1]).toEqual({
        name: 'language',
        type: 'select',
        message: 'Choose a language',
        choices: ['JavaScript', 'TypeScript', 'Python']
      });
    });

    it('should throw error for non-existent file', async () => {
      await expect(service.loadPrompt('/non/existent.md')).rejects.toThrow();
    });
  });

  describe('validatePrompt', () => {
    it('should validate prompt with schema', async () => {
      const prompt = {
        path: '/test/prompt.md',
        relativePath: 'prompt.md',
        filename: 'prompt.md',
        title: 'Test',
        tags: ['test'],
        content: 'Test content',
        frontmatter: {},
        variables: []
      };

      const result = await service.validatePrompt(prompt);
      expect(result.success).toBe(true);
    });

    it('should validate variables', async () => {
      const prompt = {
        path: '/test/prompt.md',
        relativePath: 'prompt.md',
        filename: 'prompt.md',
        title: 'Test',
        tags: ['test'],
        content: 'Test content',
        frontmatter: {},
        variables: [
          {
            name: 'test',
            type: 'invalid' as any,
            message: 'Test'
          }
        ]
      };

      const result = await service.validatePrompt(prompt);
      expect(result.success).toBe(false);
      expect(result.errors?.[0]).toContain('Invalid enum value');
    });
  });

  describe('searchPrompts', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(tempDir, 'api-test.md'),
        `---
title: API Test
tags: [api, testing]
---
Test API endpoints`
      );

      await fs.writeFile(
        path.join(tempDir, 'unit-test.md'),
        `---
title: Unit Test Generator
tags: [testing, generator]
---
Generate unit tests`
      );

      await fs.writeFile(
        path.join(tempDir, 'readme.md'),
        `---
title: README Generator
tags: [documentation]
---
Generate README files`
      );
    });

    it('should search prompts by title', async () => {
      const results = await service.searchPrompts('test');
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.title).sort()).toEqual(['API Test', 'Unit Test Generator']);
    });

    it('should search prompts by tag', async () => {
      const results = await service.searchPrompts('testing');
      
      expect(results).toHaveLength(2);
    });

    it('should search prompts by content', async () => {
      const results = await service.searchPrompts('endpoints');
      
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('API Test');
    });

    it('should support fuzzy search', async () => {
      const results = await service.searchPrompts('gener');
      
      expect(results).toHaveLength(2); // Both generators match
      const titles = results.map(r => r.title).sort();
      expect(titles).toEqual(['README Generator', 'Unit Test Generator']);
    });
  });

  describe('getPromptsByTag', () => {
    beforeEach(async () => {
      await fs.writeFile(
        path.join(tempDir, 'prompt1.md'),
        `---
tags: [api, v1]
---
Content 1`
      );

      await fs.writeFile(
        path.join(tempDir, 'prompt2.md'),
        `---
tags: [api, v2]
---
Content 2`
      );

      await fs.writeFile(
        path.join(tempDir, 'prompt3.md'),
        `---
tags: [testing]
---
Content 3`
      );
    });

    it('should filter prompts by tag', async () => {
      const results = await service.getPromptsByTag('api');
      
      expect(results).toHaveLength(2);
    });

    it('should return empty array for non-existent tag', async () => {
      const results = await service.getPromptsByTag('nonexistent');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('caching', () => {
    it('should cache loaded prompts', async () => {
      const promptPath = path.join(tempDir, 'cached.md');
      await fs.writeFile(promptPath, '# Cached prompt');
      
      const spy = vi.spyOn(fs, 'readFile');
      
      await service.loadPrompt(promptPath);
      await service.loadPrompt(promptPath);
      
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should clear cache', async () => {
      const promptPath = path.join(tempDir, 'cached.md');
      await fs.writeFile(promptPath, '# Cached prompt');
      
      const spy = vi.spyOn(fs, 'readFile');
      
      await service.loadPrompt(promptPath);
      service.clearCache();
      await service.loadPrompt(promptPath);
      
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });
});