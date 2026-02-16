import os from 'os';
import path from 'path';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getConfigPaths,
  getHomePath,
  getPlatform,
  isLinux,
  isMacOS,
  isWindows,
} from '@/utils/platform';

describe('Platform utilities', () => {
  const originalPlatform = process.platform;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    process.env = originalEnv;
  });

  describe('getHomePath', () => {
    it('should return home directory path', () => {
      const homePath = getHomePath();
      expect(homePath).toBe(os.homedir());
    });
  });

  describe('getConfigPaths', () => {
    it('should return correct config paths on Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        enumerable: true,
        configurable: true,
      });
      process.env.APPDATA = 'C:\\Users\\test\\AppData\\Roaming';

      const paths = getConfigPaths();
      expect(paths).toEqual([
        process.cwd(),
        path.join('C:\\Users\\test\\AppData\\Roaming', 'pupt'),
      ]);
    });

    it('should return correct config paths on macOS', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        enumerable: true,
        configurable: true,
      });
      vi.spyOn(os, 'homedir').mockReturnValue('/Users/test');

      const paths = getConfigPaths();
      expect(paths).toEqual([
        process.cwd(),
        path.join('/Users/test/Library/Application Support/pupt'),
        path.join('/Users/test/.config/pupt'),
      ]);
    });

    it('should return correct config paths on Linux', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        enumerable: true,
        configurable: true,
      });
      vi.spyOn(os, 'homedir').mockReturnValue('/home/test');
      process.env.XDG_CONFIG_HOME = '/home/test/.config';

      const paths = getConfigPaths();
      expect(paths).toEqual([process.cwd(), path.join('/home/test/.config/pupt')]);
    });

    it('should use home directory if XDG_CONFIG_HOME is not set on Linux', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        enumerable: true,
        configurable: true,
      });
      vi.spyOn(os, 'homedir').mockReturnValue('/home/test');
      delete process.env.XDG_CONFIG_HOME;

      const paths = getConfigPaths();
      expect(paths).toEqual([process.cwd(), path.join('/home/test/.config/pupt')]);
    });
  });

  describe('getPlatform', () => {
    it('should return current platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        enumerable: true,
        configurable: true,
      });

      expect(getPlatform()).toBe('linux');
    });
  });

  describe('Platform detection', () => {
    it('should correctly detect Windows', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        enumerable: true,
        configurable: true,
      });

      expect(isWindows()).toBe(true);
      expect(isMacOS()).toBe(false);
      expect(isLinux()).toBe(false);
    });

    it('should correctly detect macOS', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        enumerable: true,
        configurable: true,
      });

      expect(isWindows()).toBe(false);
      expect(isMacOS()).toBe(true);
      expect(isLinux()).toBe(false);
    });

    it('should correctly detect Linux', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        enumerable: true,
        configurable: true,
      });

      expect(isWindows()).toBe(false);
      expect(isMacOS()).toBe(false);
      expect(isLinux()).toBe(true);
    });
  });
});
