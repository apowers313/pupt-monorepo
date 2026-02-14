import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';

// Mock global-paths before importing the module
const mockCacheDir = path.join(os.tmpdir(), 'pupt-cache-cmd-test-' + Date.now());

vi.mock('../../src/config/global-paths.js', () => ({
  getCacheDir: () => mockCacheDir,
  getConfigDir: () => mockCacheDir,
  getDataDir: () => mockCacheDir,
  getConfigPath: () => path.join(mockCacheDir, 'config.json'),
}));

// Mock logger to capture output
const logMessages: string[] = [];
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    log: (...args: unknown[]) => logMessages.push(args.map(String).join(' ')),
    warn: (...args: unknown[]) => logMessages.push(args.map(String).join(' ')),
    error: (...args: unknown[]) => logMessages.push(args.map(String).join(' ')),
  },
}));

import { cacheCommand } from '../../src/commands/cache.js';
import { ModuleCache } from '../../src/services/module-cache.js';

describe('cacheCommand', () => {
  beforeEach(async () => {
    await fs.ensureDir(mockCacheDir);
    logMessages.length = 0;
  });

  afterEach(async () => {
    await fs.remove(mockCacheDir);
    vi.restoreAllMocks();
  });

  it('should clear all cached modules with pt cache clear', async () => {
    // Set up some cached data
    const cache = new ModuleCache(mockCacheDir);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('content', { status: 200 })
    );
    await cache.resolve('https://example.com/test.js');

    // Verify there's cached data
    let stats = await cache.getStats();
    expect(stats.entryCount).toBe(1);

    // Run cache clear command
    await cacheCommand({ clear: true });

    // Verify cache is empty
    stats = await cache.getStats();
    expect(stats.entryCount).toBe(0);
  });

  it('should clear specific URL with pt cache clear --url <url>', async () => {
    const cache = new ModuleCache(mockCacheDir);
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('content-a', { status: 200 }))
      .mockResolvedValueOnce(new Response('content-b', { status: 200 }));

    await cache.resolve('https://example.com/a.js');
    await cache.resolve('https://example.com/b.js');

    let stats = await cache.getStats();
    expect(stats.entryCount).toBe(2);

    await cacheCommand({ clear: true, url: 'https://example.com/a.js' });

    stats = await cache.getStats();
    expect(stats.entryCount).toBe(1);
  });

  it('should show cache statistics', async () => {
    const cache = new ModuleCache(mockCacheDir);
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('some cached content', { status: 200 })
    );
    await cache.resolve('https://example.com/test.js');

    await cacheCommand({});

    const output = logMessages.join('\n');
    expect(output).toContain('1');
  });

  it('should show empty cache message', async () => {
    await cacheCommand({});

    const output = logMessages.join('\n');
    expect(output).toContain('0');
  });
});
