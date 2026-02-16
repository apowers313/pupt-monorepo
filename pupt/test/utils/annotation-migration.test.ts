import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { migrateAnnotationsToJson } from '../../src/utils/annotation-migration.js';
import { logger } from '../../src/utils/logger.js';

vi.mock('../../src/utils/logger.js');

describe('Annotation Migration', () => {
  let tempDir: string;
  let annotationDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-annotation-migration-test-'));
    annotationDir = path.join(tempDir, 'annotations');
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    vi.restoreAllMocks();
  });

  describe('migrateAnnotationsToJson', () => {
    it('should return early if directory does not exist', async () => {
      const nonExistentDir = path.join(tempDir, 'does-not-exist');

      const result = await migrateAnnotationsToJson(nonExistentDir);

      expect(result).toEqual({
        migrated: 0,
        skipped: 0,
        failed: 0,
        errors: []
      });
      expect(logger.debug).toHaveBeenCalledWith('Annotation directory does not exist, nothing to migrate');
    });

    it('should return early if no markdown annotation files exist', async () => {
      await fs.ensureDir(annotationDir);
      await fs.writeFile(path.join(annotationDir, 'regular-file.md'), '# Just a file');
      await fs.writeFile(path.join(annotationDir, 'data.json'), '{}');

      const result = await migrateAnnotationsToJson(annotationDir);

      expect(result).toEqual({
        migrated: 0,
        skipped: 0,
        failed: 0,
        errors: []
      });
      expect(logger.debug).toHaveBeenCalledWith('No markdown annotation files found to migrate');
    });

    it('should successfully migrate a markdown annotation file to JSON', async () => {
      await fs.ensureDir(annotationDir);
      const mdFile = path.join(annotationDir, 'test-annotation-001.md');
      const jsonFile = path.join(annotationDir, 'test-annotation-001.json');

      const mdContent = `---
historyFile: history-001.json
status: success
timestamp: 2024-01-15T10:00:00Z
tags:
  - test
  - success
---

## Notes

This is a test annotation with some notes.
`;

      await fs.writeFile(mdFile, mdContent);

      const result = await migrateAnnotationsToJson(annotationDir);

      expect(result).toEqual({
        migrated: 1,
        skipped: 0,
        failed: 0,
        errors: []
      });

      // Verify JSON file was created
      expect(await fs.pathExists(jsonFile)).toBe(true);
      const jsonData = await fs.readJson(jsonFile);
      expect(jsonData).toEqual({
        historyFile: 'history-001.json',
        status: 'success',
        timestamp: '2024-01-15T10:00:00.000Z',
        tags: ['test', 'success'],
        notes: 'This is a test annotation with some notes.'
      });

      // Verify markdown file was removed
      expect(await fs.pathExists(mdFile)).toBe(false);

      expect(logger.debug).toHaveBeenCalledWith('Found 1 markdown annotation files to migrate');
      expect(logger.debug).toHaveBeenCalledWith('Migrated test-annotation-001.md to test-annotation-001.json');
      expect(logger.log).toHaveBeenCalledWith('Migrated 1 annotation files from markdown to JSON format');
    });

    it('should skip migration if JSON file already exists', async () => {
      await fs.ensureDir(annotationDir);
      const mdFile = path.join(annotationDir, 'test-annotation-002.md');
      const jsonFile = path.join(annotationDir, 'test-annotation-002.json');

      const mdContent = `---
historyFile: history-002.json
status: success
timestamp: 2024-01-15T10:00:00Z
tags: [test]
---

## Notes

Test notes
`;

      await fs.writeFile(mdFile, mdContent);
      await fs.writeJson(jsonFile, { existing: 'data' });

      const result = await migrateAnnotationsToJson(annotationDir);

      expect(result).toEqual({
        migrated: 0,
        skipped: 1,
        failed: 0,
        errors: []
      });

      // Verify JSON file was not overwritten
      const jsonData = await fs.readJson(jsonFile);
      expect(jsonData).toEqual({ existing: 'data' });

      // Verify markdown file still exists
      expect(await fs.pathExists(mdFile)).toBe(true);

      expect(logger.debug).toHaveBeenCalledWith('Skipping test-annotation-002.md - JSON version already exists');
    });

    it('should handle parse errors gracefully', async () => {
      await fs.ensureDir(annotationDir);
      const mdFile = path.join(annotationDir, 'broken-annotation-003.md');

      // Invalid markdown - no frontmatter
      const mdContent = `This is just text without frontmatter`;

      await fs.writeFile(mdFile, mdContent);

      const result = await migrateAnnotationsToJson(annotationDir);

      expect(result).toEqual({
        migrated: 0,
        skipped: 0,
        failed: 1,
        errors: [expect.stringContaining('Failed to migrate broken-annotation-003.md')]
      });

      // Verify markdown file still exists (not deleted on error)
      expect(await fs.pathExists(mdFile)).toBe(true);

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to migrate broken-annotation-003.md'));
    });

    it('should migrate multiple annotation files', async () => {
      await fs.ensureDir(annotationDir);

      const files = [
        { name: 'test-annotation-004.md', status: 'success' },
        { name: 'test-annotation-005.md', status: 'failure' },
        { name: 'test-annotation-006.md', status: 'partial' }
      ];

      for (const file of files) {
        const mdContent = `---
historyFile: history-${file.name}.json
status: ${file.status}
timestamp: 2024-01-15T10:00:00Z
tags: [test]
---

## Notes

Test notes for ${file.name}
`;
        await fs.writeFile(path.join(annotationDir, file.name), mdContent);
      }

      const result = await migrateAnnotationsToJson(annotationDir);

      expect(result).toEqual({
        migrated: 3,
        skipped: 0,
        failed: 0,
        errors: []
      });

      // Verify all JSON files were created
      for (const file of files) {
        const jsonFile = path.join(annotationDir, file.name.replace('.md', '.json'));
        expect(await fs.pathExists(jsonFile)).toBe(true);
        const jsonData = await fs.readJson(jsonFile);
        expect(jsonData.status).toBe(file.status);
      }

      // Verify all markdown files were removed
      for (const file of files) {
        const mdFile = path.join(annotationDir, file.name);
        expect(await fs.pathExists(mdFile)).toBe(false);
      }
    });

    it('should handle mixed success, skip, and failure scenarios', async () => {
      await fs.ensureDir(annotationDir);

      // File to migrate successfully
      const successFile = path.join(annotationDir, 'success-annotation-007.md');
      await fs.writeFile(successFile, `---
historyFile: history-007.json
status: success
timestamp: 2024-01-15T10:00:00Z
tags: [test]
---

## Notes

Success
`);

      // File to skip (JSON already exists)
      const skipFile = path.join(annotationDir, 'skip-annotation-008.md');
      const skipJsonFile = path.join(annotationDir, 'skip-annotation-008.json');
      await fs.writeFile(skipFile, `---
historyFile: history-008.json
status: success
timestamp: 2024-01-15T10:00:00Z
tags: [test]
---

## Notes

Skip
`);
      await fs.writeJson(skipJsonFile, { existing: 'data' });

      // File to fail (invalid frontmatter)
      const failFile = path.join(annotationDir, 'fail-annotation-009.md');
      await fs.writeFile(failFile, 'Invalid content without frontmatter');

      const result = await migrateAnnotationsToJson(annotationDir);

      expect(result).toEqual({
        migrated: 1,
        skipped: 1,
        failed: 1,
        errors: [expect.stringContaining('Failed to migrate fail-annotation-009.md')]
      });
    });

    it('should handle annotation with structured outcome and issues', async () => {
      await fs.ensureDir(annotationDir);
      const mdFile = path.join(annotationDir, 'complex-annotation-010.md');
      const jsonFile = path.join(annotationDir, 'complex-annotation-010.json');

      const mdContent = `---
historyFile: history-010.json
status: partial
timestamp: 2024-01-15T10:00:00Z
tags:
  - test
  - complex
auto_detected: true
structured_outcome:
  tasks_completed: 3
  tasks_total: 5
  tests_run: 10
  tests_passed: 8
  tests_failed: 2
  verification_passed: false
  execution_time: 45s
issues_identified:
  - category: verification_gap
    severity: high
    description: Missing test coverage
    evidence: Only 80% coverage achieved
---

## Notes

Complex annotation with structured data.
Multiple lines of notes.
`;

      await fs.writeFile(mdFile, mdContent);

      const result = await migrateAnnotationsToJson(annotationDir);

      expect(result.migrated).toBe(1);

      const jsonData = await fs.readJson(jsonFile);
      expect(jsonData.status).toBe('partial');
      expect(jsonData.auto_detected).toBe(true);
      expect(jsonData.structured_outcome).toEqual({
        tasks_completed: 3,
        tasks_total: 5,
        tests_run: 10,
        tests_passed: 8,
        tests_failed: 2,
        verification_passed: false,
        execution_time: '45s'
      });
      expect(jsonData.issues_identified).toHaveLength(1);
      expect(jsonData.issues_identified[0].category).toBe('verification_gap');
      expect(jsonData.notes).toBe('Complex annotation with structured data.\nMultiple lines of notes.');
    });

    it('should handle annotation without notes section', async () => {
      await fs.ensureDir(annotationDir);
      const mdFile = path.join(annotationDir, 'no-notes-annotation-011.md');
      const jsonFile = path.join(annotationDir, 'no-notes-annotation-011.json');

      const mdContent = `---
historyFile: history-011.json
status: success
timestamp: 2024-01-15T10:00:00Z
tags: [test]
---
`;

      await fs.writeFile(mdFile, mdContent);

      const result = await migrateAnnotationsToJson(annotationDir);

      expect(result.migrated).toBe(1);

      const jsonData = await fs.readJson(jsonFile);
      expect(jsonData.notes).toBe('');
    });

    it('should only process files with -annotation- in the name', async () => {
      await fs.ensureDir(annotationDir);

      // Should be migrated
      const annotationFile = path.join(annotationDir, 'test-annotation-012.md');
      await fs.writeFile(annotationFile, `---
historyFile: history-012.json
status: success
timestamp: 2024-01-15T10:00:00Z
tags: [test]
---

## Notes

Test
`);

      // Should be ignored (no -annotation-)
      const regularFile = path.join(annotationDir, 'regular-file.md');
      await fs.writeFile(regularFile, `---
some: data
---

## Notes

Regular file
`);

      const result = await migrateAnnotationsToJson(annotationDir);

      expect(result.migrated).toBe(1);

      // Annotation file should be migrated and removed
      expect(await fs.pathExists(annotationFile)).toBe(false);
      expect(await fs.pathExists(path.join(annotationDir, 'test-annotation-012.json'))).toBe(true);

      // Regular file should still exist
      expect(await fs.pathExists(regularFile)).toBe(true);
    });

    it('should throw error if directory read fails', async () => {
      await fs.ensureDir(annotationDir);

      // Make directory unreadable (Unix-like systems only)
      if (process.platform !== 'win32') {
        await fs.chmod(annotationDir, 0o000);

        await expect(migrateAnnotationsToJson(annotationDir)).rejects.toThrow();

        // Restore permissions for cleanup
        await fs.chmod(annotationDir, 0o755);
      }
    });

    it('should handle YAML with different formatting styles', async () => {
      await fs.ensureDir(annotationDir);
      const mdFile = path.join(annotationDir, 'yaml-style-annotation-013.md');
      const jsonFile = path.join(annotationDir, 'yaml-style-annotation-013.json');

      // Using inline array syntax
      const mdContent = `---
historyFile: history-013.json
status: success
timestamp: 2024-01-15T10:00:00Z
tags: [inline, array, style]
---

## Notes

YAML inline style
`;

      await fs.writeFile(mdFile, mdContent);

      const result = await migrateAnnotationsToJson(annotationDir);

      expect(result.migrated).toBe(1);

      const jsonData = await fs.readJson(jsonFile);
      expect(jsonData.tags).toEqual(['inline', 'array', 'style']);
    });

    it('should preserve spaces in JSON output', async () => {
      await fs.ensureDir(annotationDir);
      const mdFile = path.join(annotationDir, 'format-annotation-014.md');
      const jsonFile = path.join(annotationDir, 'format-annotation-014.json');

      const mdContent = `---
historyFile: history-014.json
status: success
timestamp: 2024-01-15T10:00:00Z
tags: [test]
---

## Notes

Test
`;

      await fs.writeFile(mdFile, mdContent);
      await migrateAnnotationsToJson(annotationDir);

      // Read raw file content to check formatting
      const rawContent = await fs.readFile(jsonFile, 'utf-8');

      // Should have 2-space indentation
      expect(rawContent).toContain('  "historyFile"');
      expect(rawContent).toContain('  "status"');
    });
  });
});
