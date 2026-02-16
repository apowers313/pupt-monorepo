import os from 'node:os';
import path from 'node:path';

import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ModuleCache } from '../../src/services/module-cache.js';

describe('PuptService - Cache Bypass', () => {
  let cacheDir: string;

  beforeEach(async () => {
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pupt-nocache-test-'));
  });

  afterEach(async () => {
    await fs.remove(cacheDir);
    vi.restoreAllMocks();
  });

  it('should bypass cache when --no-cache flag is set', async () => {
    const cache = new ModuleCache(cacheDir);
    const content1 = 'original';
    const content2 = 'updated';

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(content1, { status: 200 }))
      .mockResolvedValueOnce(new Response(content2, { status: 200 }));

    // First resolve populates cache
    const result1 = await cache.resolve('https://example.com/mod.js');
    expect(result1).toBe(content1);

    // noCache bypasses the cache and fetches again
    const result2 = await cache.resolve('https://example.com/mod.js', { noCache: true });
    expect(result2).toBe(content2);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('should still update cache even when bypassed', async () => {
    const cache = new ModuleCache(cacheDir);
    const content = 'fresh content';

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('stale', { status: 200 }))
      .mockResolvedValueOnce(new Response(content, { status: 200 }));

    await cache.resolve('https://example.com/mod.js');
    await cache.resolve('https://example.com/mod.js', { noCache: true });

    // Third call should use updated cache
    const result = await cache.resolve('https://example.com/mod.js');
    expect(result).toBe(content);
    // Only 2 fetches total (third call uses cache)
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
