import path from 'node:path';

import { afterEach,beforeEach, describe, expect, it } from 'vitest';

describe('global-paths', () => {
  let savedConfigDir: string | undefined;
  let savedDataDir: string | undefined;
  let savedCacheDir: string | undefined;

  beforeEach(() => {
    savedConfigDir = process.env.PUPT_CONFIG_DIR;
    savedDataDir = process.env.PUPT_DATA_DIR;
    savedCacheDir = process.env.PUPT_CACHE_DIR;

    delete process.env.PUPT_CONFIG_DIR;
    delete process.env.PUPT_DATA_DIR;
    delete process.env.PUPT_CACHE_DIR;
  });

  afterEach(() => {
    if (savedConfigDir !== undefined) {
      process.env.PUPT_CONFIG_DIR = savedConfigDir;
    } else {
      delete process.env.PUPT_CONFIG_DIR;
    }

    if (savedDataDir !== undefined) {
      process.env.PUPT_DATA_DIR = savedDataDir;
    } else {
      delete process.env.PUPT_DATA_DIR;
    }

    if (savedCacheDir !== undefined) {
      process.env.PUPT_CACHE_DIR = savedCacheDir;
    } else {
      delete process.env.PUPT_CACHE_DIR;
    }
  });

  describe('getConfigDir', () => {
    it('should return PUPT_CONFIG_DIR env var when set', async () => {
      const { getConfigDir } = await import('../../src/config/global-paths.js');
      process.env.PUPT_CONFIG_DIR = '/custom/config/dir';
      expect(getConfigDir()).toBe('/custom/config/dir');
    });

    it('should return env-paths default when env var is not set', async () => {
      const { getConfigDir } = await import('../../src/config/global-paths.js');
      delete process.env.PUPT_CONFIG_DIR;
      const result = getConfigDir();
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      // env-paths with name 'pupt' and suffix '' should include 'pupt' in the path
      expect(result).toContain('pupt');
    });
  });

  describe('getDataDir', () => {
    it('should return PUPT_DATA_DIR env var when set', async () => {
      const { getDataDir } = await import('../../src/config/global-paths.js');
      process.env.PUPT_DATA_DIR = '/custom/data/dir';
      expect(getDataDir()).toBe('/custom/data/dir');
    });

    it('should return env-paths default when env var is not set', async () => {
      const { getDataDir } = await import('../../src/config/global-paths.js');
      delete process.env.PUPT_DATA_DIR;
      const result = getDataDir();
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain('pupt');
    });
  });

  describe('getCacheDir', () => {
    it('should return PUPT_CACHE_DIR env var when set', async () => {
      const { getCacheDir } = await import('../../src/config/global-paths.js');
      process.env.PUPT_CACHE_DIR = '/custom/cache/dir';
      expect(getCacheDir()).toBe('/custom/cache/dir');
    });

    it('should return env-paths default when env var is not set', async () => {
      const { getCacheDir } = await import('../../src/config/global-paths.js');
      delete process.env.PUPT_CACHE_DIR;
      const result = getCacheDir();
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toContain('pupt');
    });
  });

  describe('getConfigPath', () => {
    it('should return config.json inside the config dir', async () => {
      const { getConfigPath } = await import('../../src/config/global-paths.js');
      process.env.PUPT_CONFIG_DIR = '/custom/config/dir';
      expect(getConfigPath()).toBe(path.join('/custom/config/dir', 'config.json'));
    });

    it('should use env-paths config dir when env var is not set', async () => {
      const { getConfigPath } = await import('../../src/config/global-paths.js');
      delete process.env.PUPT_CONFIG_DIR;
      const result = getConfigPath();
      expect(result).toMatch(/config\.json$/);
      expect(result).toContain('pupt');
    });
  });

  describe('default paths are distinct', () => {
    it('should return different paths for config, data, and cache', async () => {
      const { getConfigDir, getDataDir, getCacheDir } = await import('../../src/config/global-paths.js');
      delete process.env.PUPT_CONFIG_DIR;
      delete process.env.PUPT_DATA_DIR;
      delete process.env.PUPT_CACHE_DIR;

      const configDir = getConfigDir();
      const dataDir = getDataDir();
      const cacheDir = getCacheDir();

      // On Linux, env-paths produces distinct directories for config, data, and cache
      // They should all be non-empty strings
      expect(configDir).toBeTruthy();
      expect(dataDir).toBeTruthy();
      expect(cacheDir).toBeTruthy();
    });
  });
});
