import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { findOldFormatPrompts, migratePromptFile } from '../../src/commands/migrate.js';

describe('migrate', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pupt-migrate-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  describe('findOldFormatPrompts', () => {
    it('should find .md files with frontmatter', async () => {
      const promptDir = path.join(tmpDir, 'prompts');
      await fs.ensureDir(promptDir);
      await fs.writeFile(path.join(promptDir, 'test.md'), '---\ntitle: Test\n---\nContent');

      const results = await findOldFormatPrompts([promptDir]);

      expect(results).toHaveLength(1);
      expect(results[0].path).toContain('test.md');
      expect(results[0].dir).toBe(promptDir);
      expect(results[0].relativePath).toBe('test.md');
    });

    it('should find .md files with handlebars expressions', async () => {
      const promptDir = path.join(tmpDir, 'prompts');
      await fs.ensureDir(promptDir);
      await fs.writeFile(path.join(promptDir, 'test.md'), 'Hello {{input "name"}}');

      const results = await findOldFormatPrompts([promptDir]);

      expect(results).toHaveLength(1);
    });

    it('should find .md files with prompt section headers', async () => {
      const promptDir = path.join(tmpDir, 'prompts');
      await fs.ensureDir(promptDir);
      await fs.writeFile(path.join(promptDir, 'test.md'), '**Role** Expert coder.');

      const results = await findOldFormatPrompts([promptDir]);

      expect(results).toHaveLength(1);
    });

    it('should skip .md files that do not look like prompts', async () => {
      const promptDir = path.join(tmpDir, 'prompts');
      await fs.ensureDir(promptDir);
      await fs.writeFile(path.join(promptDir, 'readme.md'), 'Just a plain readme.');

      const results = await findOldFormatPrompts([promptDir]);

      expect(results).toHaveLength(0);
    });

    it('should skip non-.md files', async () => {
      const promptDir = path.join(tmpDir, 'prompts');
      await fs.ensureDir(promptDir);
      await fs.writeFile(path.join(promptDir, 'test.prompt'), '---\ntitle: Test\n---\nContent');

      const results = await findOldFormatPrompts([promptDir]);

      expect(results).toHaveLength(0);
    });

    it('should skip non-existent directories', async () => {
      const results = await findOldFormatPrompts(['/nonexistent/path']);

      expect(results).toHaveLength(0);
    });

    it('should scan subdirectories recursively', async () => {
      const promptDir = path.join(tmpDir, 'prompts');
      const subDir = path.join(promptDir, 'sub');
      await fs.ensureDir(subDir);
      await fs.writeFile(path.join(subDir, 'test.md'), '---\ntitle: Nested\n---\nContent');

      const results = await findOldFormatPrompts([promptDir]);

      expect(results).toHaveLength(1);
      expect(results[0].relativePath).toBe(path.join('sub', 'test.md'));
    });

    it('should scan multiple directories', async () => {
      const dir1 = path.join(tmpDir, 'dir1');
      const dir2 = path.join(tmpDir, 'dir2');
      await fs.ensureDir(dir1);
      await fs.ensureDir(dir2);
      await fs.writeFile(path.join(dir1, 'a.md'), '---\ntitle: A\n---\nContent');
      await fs.writeFile(path.join(dir2, 'b.md'), '---\ntitle: B\n---\nContent');

      const results = await findOldFormatPrompts([dir1, dir2]);

      expect(results).toHaveLength(2);
    });

    it('should match Task and Requirements section patterns', async () => {
      const promptDir = path.join(tmpDir, 'prompts');
      await fs.ensureDir(promptDir);
      await fs.writeFile(path.join(promptDir, 'task.md'), '**Task** Do something important.');
      await fs.writeFile(path.join(promptDir, 'req.md'), '**Requirements** List of requirements.');
      await fs.writeFile(path.join(promptDir, 'obj.md'), '**Objective** Main goal.');
      await fs.writeFile(path.join(promptDir, 'ctx.md'), '**Context** Background information.');

      const results = await findOldFormatPrompts([promptDir]);

      expect(results).toHaveLength(4);
    });
  });

  describe('migratePromptFile', () => {
    it('should convert .md to .prompt file', async () => {
      const mdPath = path.join(tmpDir, 'test.md');
      await fs.writeFile(mdPath, '---\ntitle: Test\n---\n\n**Role**: Expert.');

      const result = await migratePromptFile(mdPath);

      expect(result.success).toBe(true);
      expect(result.newPath).toBe(path.join(tmpDir, 'test.prompt'));
      expect(await fs.pathExists(result.newPath)).toBe(true);

      const content = await fs.readFile(result.newPath, 'utf-8');
      expect(content).toContain('<Prompt');
      expect(content).toContain('<Role>');

      // Original file should be removed
      expect(await fs.pathExists(mdPath)).toBe(false);
    });

    it('should support dry-run mode', async () => {
      const mdPath = path.join(tmpDir, 'test.md');
      await fs.writeFile(mdPath, '---\ntitle: Test\n---\nContent');

      const result = await migratePromptFile(mdPath, { dryRun: true });

      expect(result.success).toBe(true);
      expect(result.newPath).toBe(path.join(tmpDir, 'test.prompt'));
      // Original file should still exist
      expect(await fs.pathExists(mdPath)).toBe(true);
      // New file should NOT exist
      expect(await fs.pathExists(result.newPath)).toBe(false);
    });

    it('should support backup mode', async () => {
      const mdPath = path.join(tmpDir, 'test.md');
      await fs.writeFile(mdPath, '---\ntitle: Test\n---\nContent');

      const result = await migratePromptFile(mdPath, { backup: true });

      expect(result.success).toBe(true);
      // New file should exist
      expect(await fs.pathExists(result.newPath)).toBe(true);
      // Original .md.bak should exist
      expect(await fs.pathExists(mdPath + '.bak')).toBe(true);
      // Original .md should not exist
      expect(await fs.pathExists(mdPath)).toBe(false);
    });

    it('should return error on failure', async () => {
      const mdPath = path.join(tmpDir, 'nonexistent.md');

      const result = await migratePromptFile(mdPath);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
