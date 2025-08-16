import { describe, it, expect } from 'vitest';
import { Trie, findCommonPrefix, completeFilePath } from '../../src/utils/trie.js';

describe('Tab Completion Algorithm', () => {
  describe('Trie data structure', () => {
    it('should insert and find completions', () => {
      const trie = new Trie();
      trie.insert('src/index.ts');
      trie.insert('src/cli.ts');
      trie.insert('src/config.ts');
      trie.insert('test/index.test.ts');

      const completions = trie.findCompletions('src/');
      expect(completions).toHaveLength(3);
      expect(completions).toContain('src/index.ts');
      expect(completions).toContain('src/cli.ts');
      expect(completions).toContain('src/config.ts');
    });

    it('should handle empty prefix', () => {
      const trie = new Trie();
      trie.insert('file1.ts');
      trie.insert('file2.ts');

      const completions = trie.findCompletions('');
      expect(completions).toHaveLength(2);
    });

    it('should handle non-existent prefix', () => {
      const trie = new Trie();
      trie.insert('src/index.ts');

      const completions = trie.findCompletions('lib/');
      expect(completions).toHaveLength(0);
    });

    it('should handle special characters in paths', () => {
      const trie = new Trie();
      trie.insert('my file.txt');
      trie.insert('my-file.txt');
      trie.insert('my_file.txt');
      trie.insert('my@file.txt');

      const completions = trie.findCompletions('my');
      expect(completions).toHaveLength(4);
    });

    it('should be case sensitive', () => {
      const trie = new Trie();
      trie.insert('README.md');
      trie.insert('readme.md');

      const upperCompletions = trie.findCompletions('REA');
      expect(upperCompletions).toHaveLength(1);
      expect(upperCompletions[0]).toBe('README.md');

      const lowerCompletions = trie.findCompletions('rea');
      expect(lowerCompletions).toHaveLength(1);
      expect(lowerCompletions[0]).toBe('readme.md');
    });
  });

  describe('findCommonPrefix', () => {
    it('should find common prefix among strings', () => {
      const strings = ['src/index.ts', 'src/cli.ts', 'src/config.ts'];
      const prefix = findCommonPrefix(strings);
      expect(prefix).toBe('src/');
    });

    it('should return empty string when no common prefix', () => {
      const strings = ['abc', 'def', 'ghi'];
      const prefix = findCommonPrefix(strings);
      expect(prefix).toBe('');
    });

    it('should handle single string', () => {
      const strings = ['src/index.ts'];
      const prefix = findCommonPrefix(strings);
      expect(prefix).toBe('src/index.ts');
    });

    it('should handle empty array', () => {
      const strings: string[] = [];
      const prefix = findCommonPrefix(strings);
      expect(prefix).toBe('');
    });

    it('should handle strings with spaces', () => {
      const strings = ['my folder/file1.txt', 'my folder/file2.txt'];
      const prefix = findCommonPrefix(strings);
      expect(prefix).toBe('my folder/file');
    });
  });

  describe('completeFilePath', () => {
    it('should complete to full path when single match', () => {
      const files = ['src/index.ts', 'test/index.test.ts'];
      const result = completeFilePath('src/in', files);
      
      expect(result.completed).toBe('src/index.ts');
      expect(result.suggestions).toHaveLength(0);
    });

    it('should complete to common prefix when multiple matches', () => {
      const files = ['src/index.ts', 'src/cli.ts', 'src/config.ts'];
      const result = completeFilePath('src/c', files);
      
      expect(result.completed).toBe('src/c');
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions).toContain('src/cli.ts');
      expect(result.suggestions).toContain('src/config.ts');
    });

    it('should handle directory completion', () => {
      const files = ['src/', 'src/index.ts', 'src/cli.ts'];
      const result = completeFilePath('sr', files);
      
      expect(result.completed).toBe('src/');
      expect(result.suggestions).toHaveLength(3); // All 3 paths start with 'src/'
    });

    it('should handle paths with special characters', () => {
      const files = ['My Documents/file.txt', 'My Downloads/file.txt'];
      const result = completeFilePath('My D', files);
      
      expect(result.completed).toBe('My Do');
      expect(result.suggestions).toHaveLength(2);
    });

    it('should handle absolute paths', () => {
      const files = ['/home/user/file1.txt', '/home/user/file2.txt'];
      const result = completeFilePath('/home/user/file', files);
      
      expect(result.completed).toBe('/home/user/file');
      expect(result.suggestions).toHaveLength(2);
    });

    it('should return original input when no matches', () => {
      const files = ['src/index.ts'];
      const result = completeFilePath('lib/', files);
      
      expect(result.completed).toBe('lib/');
      expect(result.suggestions).toHaveLength(0);
    });

    it('should handle parent directory references', () => {
      const files = ['../config.json', '../package.json'];
      const result = completeFilePath('../', files);
      
      expect(result.completed).toBe('../');
      expect(result.suggestions).toHaveLength(2);
    });
  });
});