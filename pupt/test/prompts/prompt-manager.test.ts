import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PromptManager } from '@/prompts/prompt-manager';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('PromptManager', () => {
  const testDir = path.join(os.tmpdir(), 'pt-test-prompts');
  const promptsDir = path.join(testDir, '.prompts');

  beforeEach(async () => {
    await fs.ensureDir(promptsDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should discover markdown files in prompt directories', async () => {
    // Create test prompt files
    await fs.writeFile(path.join(promptsDir, 'test1.md'), '# Test Prompt 1');
    await fs.writeFile(path.join(promptsDir, 'test2.md'), '# Test Prompt 2');
    await fs.writeFile(path.join(promptsDir, 'not-markdown.txt'), 'This should be ignored');

    const manager = new PromptManager([promptsDir]);
    const prompts = await manager.discoverPrompts();

    expect(prompts).toHaveLength(2);
    expect(prompts.map(p => p.filename)).toContain('test1.md');
    expect(prompts.map(p => p.filename)).toContain('test2.md');
  });

  it('should parse prompt with frontmatter', async () => {
    const promptContent = `---
title: API Client Generator
tags: [api, client, typescript]
variables:
  - name: serviceName
    type: input
    message: "Service name?"
---

# {{serviceName}} API Client

This is the prompt content.
`;

    const promptPath = path.join(promptsDir, 'api-client.md');
    await fs.writeFile(promptPath, promptContent);

    const manager = new PromptManager([promptsDir]);
    const prompts = await manager.discoverPrompts();
    const prompt = prompts[0];

    expect(prompt.title).toBe('API Client Generator');
    expect(prompt.tags).toEqual(['api', 'client', 'typescript']);
    expect(prompt.content).toContain('This is the prompt content');
    expect(prompt.variables).toHaveLength(1);
    expect(prompt.variables![0].name).toBe('serviceName');
  });

  it('should parse summary from frontmatter', async () => {
    const promptContent = `---
title: Implementation Plan
summary: Create a plan from {{file "design"}} and write it to {{reviewFile "plan"}}
tags: [planning]
---

# Implementation Plan

Generate implementation plan...
`;

    const promptPath = path.join(promptsDir, 'plan.md');
    await fs.writeFile(promptPath, promptContent);

    const manager = new PromptManager([promptsDir]);
    const prompts = await manager.discoverPrompts();
    const prompt = prompts[0];

    expect(prompt.title).toBe('Implementation Plan');
    expect(prompt.summary).toBe('Create a plan from {{file "design"}} and write it to {{reviewFile "plan"}}');
    expect(prompt.tags).toEqual(['planning']);
  });

  it('should handle prompts without frontmatter', async () => {
    const promptContent = `# Simple Prompt

Just a simple prompt without frontmatter.`;

    const promptPath = path.join(promptsDir, 'simple.md');
    await fs.writeFile(promptPath, promptContent);

    const manager = new PromptManager([promptsDir]);
    const prompts = await manager.discoverPrompts();
    const prompt = prompts[0];

    expect(prompt.title).toBe('simple'); // Filename without extension
    expect(prompt.tags).toEqual([]);
    expect(prompt.content).toContain('Just a simple prompt');
  });

  it('should discover prompts in subdirectories', async () => {
    const subDir = path.join(promptsDir, 'category');
    await fs.ensureDir(subDir);
    await fs.writeFile(path.join(subDir, 'nested.md'), '# Nested Prompt');

    const manager = new PromptManager([promptsDir]);
    const prompts = await manager.discoverPrompts();

    expect(prompts).toHaveLength(1);
    expect(prompts[0].relativePath).toBe(path.join('category', 'nested.md'));
  });

  it('should handle multiple prompt directories', async () => {
    const dir1 = path.join(testDir, 'prompts1');
    const dir2 = path.join(testDir, 'prompts2');
    await fs.ensureDir(dir1);
    await fs.ensureDir(dir2);

    await fs.writeFile(path.join(dir1, 'prompt1.md'), '# Prompt 1');
    await fs.writeFile(path.join(dir2, 'prompt2.md'), '# Prompt 2');

    const manager = new PromptManager([dir1, dir2]);
    const prompts = await manager.discoverPrompts();

    expect(prompts).toHaveLength(2);
    expect(prompts.map(p => p.filename).sort()).toEqual(['prompt1.md', 'prompt2.md']);
  });

  it('should handle non-existent directories gracefully', async () => {
    const manager = new PromptManager(['/non/existent/path', promptsDir]);
    await fs.writeFile(path.join(promptsDir, 'exists.md'), '# Exists');

    const prompts = await manager.discoverPrompts();
    expect(prompts).toHaveLength(1);
    expect(prompts[0].filename).toBe('exists.md');
  });

  it('should parse complex variable definitions', async () => {
    const promptContent = `---
title: Complex Variables
variables:
  - name: language
    type: select
    message: "Choose language"
    choices: ["javascript", "typescript", "python"]
    default: "typescript"
  - name: useAuth
    type: confirm
    message: "Include authentication?"
    default: true
  - name: apiKey
    type: password
    message: "Enter API key"
    validate: "^[A-Za-z0-9]{32}$"
---

Content here
`;

    await fs.writeFile(path.join(promptsDir, 'complex.md'), promptContent);

    const manager = new PromptManager([promptsDir]);
    const prompts = await manager.discoverPrompts();
    const vars = prompts[0].variables!;

    expect(vars).toHaveLength(3);
    expect(vars[0].type).toBe('select');
    expect(vars[0].choices).toEqual(['javascript', 'typescript', 'python']);
    expect(vars[0].default).toBe('typescript');
    expect(vars[1].type).toBe('confirm');
    expect(vars[1].default).toBe(true);
    expect(vars[2].type).toBe('password');
    expect(vars[2].validate).toBe('^[A-Za-z0-9]{32}$');
  });

  it('should load prompt by path', async () => {
    const content = `---
title: Direct Load
---
Content`;
    const promptPath = path.join(promptsDir, 'direct.md');
    await fs.writeFile(promptPath, content);

    const manager = new PromptManager([promptsDir]);
    const prompt = await manager.loadPromptByPath(promptPath);

    expect(prompt.title).toBe('Direct Load');
    expect(prompt.path).toBe(promptPath);
  });
});
