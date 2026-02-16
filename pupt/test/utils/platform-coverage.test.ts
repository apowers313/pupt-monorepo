import os from 'os';
import { describe, expect,it } from 'vitest';

import {
  getUsername,
  normalizeLineEndings,
} from '@/utils/platform';

describe('Platform utilities - additional coverage', () => {
  describe('normalizeLineEndings', () => {
    it('should convert CRLF to LF', () => {
      const input = 'line1\r\nline2\r\nline3';
      const result = normalizeLineEndings(input);

      expect(result).toBe('line1\nline2\nline3');
    });

    it('should convert CR to LF', () => {
      const input = 'line1\rline2\rline3';
      const result = normalizeLineEndings(input);

      expect(result).toBe('line1\nline2\nline3');
    });

    it('should keep LF as LF', () => {
      const input = 'line1\nline2\nline3';
      const result = normalizeLineEndings(input);

      expect(result).toBe('line1\nline2\nline3');
    });

    it('should handle mixed line endings', () => {
      const input = 'line1\r\nline2\rline3\nline4';
      const result = normalizeLineEndings(input);

      expect(result).toBe('line1\nline2\nline3\nline4');
    });

    it('should handle empty string', () => {
      const result = normalizeLineEndings('');

      expect(result).toBe('');
    });

    it('should handle string with no line endings', () => {
      const input = 'single line without endings';
      const result = normalizeLineEndings(input);

      expect(result).toBe('single line without endings');
    });

    it('should handle string with only line endings', () => {
      const result = normalizeLineEndings('\r\n\r\n');

      expect(result).toBe('\n\n');
    });

    it('should handle trailing line endings', () => {
      const input = 'text\r\n';
      const result = normalizeLineEndings(input);

      expect(result).toBe('text\n');
    });
  });

  describe('getUsername', () => {
    it('should return a non-empty string', () => {
      const username = getUsername();

      expect(typeof username).toBe('string');
      expect(username.length).toBeGreaterThan(0);
    });

    it('should return the same value as os.userInfo().username', () => {
      const username = getUsername();
      const osUsername = os.userInfo().username;

      expect(username).toBe(osUsername);
    });
  });
});
