import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { existsSync } from 'fs';

// Import the actual functions we'll test
import { TemplateContext } from '../../src/template/template-context.js';
import { handlePostRunReviews } from '../../src/commands/run.js';

// Need to export handlePostRunReviews from run.ts for testing
// For now, we'll test the TemplateContext tracking

describe('ReviewFile Tracking and Post-Run Review', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'pt-reviewfile-simple-'));
    process.chdir(testDir);
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true });
    }
  });

  describe('TemplateContext variable type tracking', () => {
    it('should track variables by type', () => {
      const context = new TemplateContext();
      
      // Set variables with types
      context.set('inputFile', '/path/to/input.txt');
      context.setType('inputFile', 'file');
      
      context.set('outputFile', '/path/to/output.txt');
      context.setType('outputFile', 'reviewFile');
      
      context.set('userName', 'John Doe');
      context.setType('userName', 'input');
      
      // Get variables by type
      const reviewFiles = context.getVariablesByType('reviewFile');
      expect(reviewFiles).toHaveLength(1);
      expect(reviewFiles[0]).toEqual({
        name: 'outputFile',
        value: '/path/to/output.txt'
      });
      
      const fileVars = context.getVariablesByType('file');
      expect(fileVars).toHaveLength(1);
      expect(fileVars[0]).toEqual({
        name: 'inputFile',
        value: '/path/to/input.txt'
      });
    });

    it('should return empty array for unknown type', () => {
      const context = new TemplateContext();
      context.set('someVar', 'value');
      context.setType('someVar', 'input');
      
      const unknownType = context.getVariablesByType('unknown');
      expect(unknownType).toHaveLength(0);
    });

    it('should handle multiple variables of the same type', () => {
      const context = new TemplateContext();
      
      // Set multiple reviewFile variables
      context.set('file1', '/path/1.txt');
      context.setType('file1', 'reviewFile');
      
      context.set('file2', '/path/2.txt');
      context.setType('file2', 'reviewFile');
      
      context.set('file3', '/path/3.txt');
      context.setType('file3', 'reviewFile');
      
      const reviewFiles = context.getVariablesByType('reviewFile');
      expect(reviewFiles).toHaveLength(3);
      expect(reviewFiles.map(f => f.name)).toEqual(['file1', 'file2', 'file3']);
    });
  });

  describe('Template processing with reviewFile', () => {
    it('should process template with reviewFile and track the type', async () => {
      const { TemplateEngine } = await import('../../src/template/template-engine.js');
      const { fileSearchPrompt } = await import('../../src/prompts/input-types/file-search-prompt.js');
      
      // Mock file search
      vi.mock('../../src/prompts/input-types/file-search-prompt.js', () => ({
        fileSearchPrompt: vi.fn().mockResolvedValue('/selected/file.txt'),
        default: vi.fn().mockResolvedValue('/selected/file.txt')
      }));
      
      const template = 'Output file: {{reviewFile "outputFile" "Select output file"}}';
      const engine = new TemplateEngine();
      
      const result = await engine.processTemplate(template, {
        variables: [{
          name: 'outputFile',
          type: 'reviewFile',
          message: 'Select output file'
        }]
      });
      
      // Check that the template was processed
      expect(result).toBe('Output file: /selected/file.txt');
      
      // Check that the type was tracked
      const reviewFiles = engine.getContext().getVariablesByType('reviewFile');
      expect(reviewFiles).toHaveLength(1);
      expect(reviewFiles[0]).toEqual({
        name: 'outputFile',
        value: '/selected/file.txt'
      });
    });
  });
});