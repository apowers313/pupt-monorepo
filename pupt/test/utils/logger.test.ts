import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../../src/utils/logger.js';
import os from 'os';

describe('Logger', () => {
  let logger: Logger;
  let stdoutSpy: any;
  let stderrSpy: any;
  let platformSpy: any;

  beforeEach(() => {
    // Clear singleton instance for fresh tests
    (Logger as any).instance = null;
    logger = Logger.getInstance();
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    if (platformSpy) {
      platformSpy.mockRestore();
    }
  });

  describe('line endings', () => {
    it('should use LF on Unix platforms', () => {
      logger.log('test');
      
      expect(stdoutSpy).toHaveBeenCalled();
      const call = stdoutSpy.mock.calls[0][0];
      expect(call).toBe('test\n');
      expect(call.charCodeAt(call.length - 1)).toBe(10); // LF
    });

    it('should use CRLF on Windows', () => {
      platformSpy = vi.spyOn(os, 'platform').mockReturnValue('win32');
      
      // Force re-instantiation to pick up platform change
      (Logger as any).instance = null;
      const winLogger = Logger.getInstance();
      
      winLogger.log('test');
      
      expect(stdoutSpy).toHaveBeenCalled();
      const call = stdoutSpy.mock.calls[0][0];
      expect(call).toBe('test\r\n');
      expect(call.slice(-2)).toBe('\r\n');
    });

    it('should normalize mixed line endings to platform format', () => {
      const input = 'line1\r\nline2\nline3\rline4';
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      const expected = `line1${lineEnding}line2${lineEnding}line3${lineEnding}line4${lineEnding}`;
      
      logger.log(input);
      
      expect(stdoutSpy).toHaveBeenCalledWith(expected);
    });

    it('should remove trailing newlines before adding platform-specific one', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log('test\n\n');
      
      expect(stdoutSpy).toHaveBeenCalledWith(`test${lineEnding}`);
    });
  });

  describe('null character handling', () => {
    it('should remove null characters from output', () => {
      const input = 'test\0string\0with\0nulls';
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log(input);
      
      expect(stdoutSpy).toHaveBeenCalledWith(`teststringwithnulls${lineEnding}`);
    });

    it('should handle strings with only null characters', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log('\0\0\0');
      
      expect(stdoutSpy).toHaveBeenCalledWith(lineEnding);
    });
  });

  describe('methods', () => {
    it('should log to stdout with log()', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log('test message');
      
      expect(stdoutSpy).toHaveBeenCalledWith(`test message${lineEnding}`);
      expect(stderrSpy).not.toHaveBeenCalled();
    });

    it('should log to stderr with error()', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.error('error message');
      
      expect(stderrSpy).toHaveBeenCalledWith(`error message${lineEnding}`);
      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('should log to stderr with warn()', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.warn('warning message');
      
      expect(stderrSpy).toHaveBeenCalledWith(`warning message${lineEnding}`);
      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('should write without newline using write()', () => {
      logger.write('partial');
      
      expect(stdoutSpy).toHaveBeenCalledWith('partial');
    });

    it('should handle empty strings', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log('');
      
      expect(stdoutSpy).toHaveBeenCalledWith(lineEnding);
    });

    it('should handle undefined as empty string', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log();
      
      expect(stdoutSpy).toHaveBeenCalledWith(lineEnding);
    });
  });

  describe('complex scenarios', () => {
    it('should handle history output with proper formatting', () => {
      const historyOutput = '**Role & Context**: You are a debugging expert\n\nwith deep knowledge';
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      const expected = `**Role & Context**: You are a debugging expert${lineEnding}${lineEnding}with deep knowledge${lineEnding}`;
      
      logger.log(historyOutput);
      
      expect(stdoutSpy).toHaveBeenCalledWith(expected);
    });

    it('should handle ANSI color codes correctly', () => {
      const coloredText = '\x1b[36m123.\x1b[39m \x1b[90m[2025-08-17 22:24]\x1b[39m Test';
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      logger.log(coloredText);
      
      expect(stdoutSpy).toHaveBeenCalledWith(coloredText + lineEnding);
    });

    it('should prevent double newlines in output', () => {
      const isWindows = os.platform() === 'win32';
      const lineEnding = isWindows ? '\r\n' : '\n';
      
      // Test that multiple trailing newlines are collapsed
      logger.log('Line 1\n\n\n');
      logger.log('Line 2');
      
      expect(stdoutSpy).toHaveBeenNthCalledWith(1, `Line 1${lineEnding}`);
      expect(stdoutSpy).toHaveBeenNthCalledWith(2, `Line 2${lineEnding}`);
    });
  });
});