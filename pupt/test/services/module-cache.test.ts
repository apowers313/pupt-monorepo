import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

// We'll import the actual class after it's created
import { ModuleCache } from '../../src/services/module-cache.js';

describe('ModuleCache', () => {
  let cacheDir: string;
  let cache: ModuleCache;

  beforeEach(async () => {
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pupt-cache-test-'));
    cache = new ModuleCache(cacheDir);
  });

  afterEach(async () => {
    await fs.remove(cacheDir);
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create cache with specified directory', () => {
      expect(cache).toBeDefined();
    });
  });

  describe('resolve', () => {
    it('should cache fetched URL content to {cacheDir}/modules/', async () => {
      const url = 'https://example.com/component.js';
      const content = 'export default function() { return "hello"; }';

      // Mock global fetch
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(content, {
          status: 200,
          headers: { 'Content-Type': 'text/javascript' },
        })
      );

      const result = await cache.resolve(url);
      expect(result).toBe(content);

      // Verify file was cached
      const modulesDir = path.join(cacheDir, 'modules');
      const exists = await fs.pathExists(modulesDir);
      expect(exists).toBe(true);
    });

    it('should compute SHA-256 hash of URL for filename', async () => {
      const url = 'https://example.com/component.js';
      const content = 'export default "test";';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(content, { status: 200 })
      );

      await cache.resolve(url);

      const expectedHash = crypto.createHash('sha256').update(url).digest('hex');
      const cachedFile = path.join(cacheDir, 'modules', expectedHash);
      const exists = await fs.pathExists(cachedFile);
      expect(exists).toBe(true);
    });

    it('should return cached content when not expired', async () => {
      const url = 'https://example.com/v1.0.0/component.js';
      const content = 'cached content';

      // First fetch
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(content, { status: 200 })
      );

      const result1 = await cache.resolve(url);
      expect(result1).toBe(content);

      // Second call should not trigger another fetch
      const result2 = await cache.resolve(url);
      expect(result2).toBe(content);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('should re-fetch when TTL expired', async () => {
      const url = 'https://example.com/latest/component.js';
      const content1 = 'original content';
      const content2 = 'updated content';

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(content1, { status: 200 }))
        .mockResolvedValueOnce(new Response(content2, { status: 200 }));

      // First fetch
      await cache.resolve(url);

      // Manually expire the cache entry
      const manifestPath = path.join(cacheDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      const hash = crypto.createHash('sha256').update(url).digest('hex');
      manifest.entries[url].fetchedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      manifest.entries[url].ttl = 3600; // 1 hour TTL
      await fs.writeJson(manifestPath, manifest);

      // Second fetch should re-fetch
      const result = await cache.resolve(url);
      expect(result).toBe(content2);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('should use 7-day TTL for versioned URLs', async () => {
      const url = 'https://cdn.example.com/v2.1.0/component.js';
      const content = 'versioned content';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(content, { status: 200 })
      );

      await cache.resolve(url);

      const manifestPath = path.join(cacheDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      expect(manifest.entries[url].ttl).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });

    it('should use 1-hour TTL for unversioned URLs', async () => {
      const url = 'https://example.com/latest/component.js';
      const content = 'unversioned content';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(content, { status: 200 })
      );

      await cache.resolve(url);

      const manifestPath = path.join(cacheDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      expect(manifest.entries[url].ttl).toBe(60 * 60); // 1 hour in seconds
    });

    it('should support conditional fetch with ETag/If-Modified-Since', async () => {
      const url = 'https://example.com/component.js';
      const content = 'etag content';
      const etag = '"abc123"';

      // First fetch returns with ETag
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(content, {
            status: 200,
            headers: { 'ETag': etag },
          })
        )
        .mockResolvedValueOnce(
          new Response(null, { status: 304 })
        );

      await cache.resolve(url);

      // Expire the cache
      const manifestPath = path.join(cacheDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      manifest.entries[url].fetchedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      manifest.entries[url].ttl = 3600;
      await fs.writeJson(manifestPath, manifest);

      // Second call should send conditional request
      const result = await cache.resolve(url);
      expect(result).toBe(content);

      // Verify the second fetch included the If-None-Match header
      const secondCall = vi.mocked(globalThis.fetch).mock.calls[1];
      const headers = secondCall[1]?.headers as Record<string, string>;
      expect(headers['If-None-Match']).toBe(etag);
    });

    it('should return cached content on 304 Not Modified', async () => {
      const url = 'https://example.com/component.js';
      const content = 'original content';

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          new Response(content, {
            status: 200,
            headers: { 'ETag': '"test"' },
          })
        )
        .mockResolvedValueOnce(
          new Response(null, { status: 304 })
        );

      await cache.resolve(url);

      // Expire the cache
      const manifestPath = path.join(cacheDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      manifest.entries[url].fetchedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      manifest.entries[url].ttl = 3600;
      await fs.writeJson(manifestPath, manifest);

      const result = await cache.resolve(url);
      expect(result).toBe(content);
    });

    it('should handle network errors gracefully when cache exists', async () => {
      const url = 'https://example.com/component.js';
      const content = 'cached fallback';

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(content, { status: 200 }))
        .mockRejectedValueOnce(new Error('Network error'));

      // First fetch succeeds
      await cache.resolve(url);

      // Expire the cache
      const manifestPath = path.join(cacheDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      manifest.entries[url].fetchedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      manifest.entries[url].ttl = 3600;
      await fs.writeJson(manifestPath, manifest);

      // Second fetch fails but returns cached content
      const result = await cache.resolve(url);
      expect(result).toBe(content);
    });

    it('should throw on network error when no cache exists', async () => {
      const url = 'https://example.com/component.js';

      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      await expect(cache.resolve(url)).rejects.toThrow('Network error');
    });

    it('should resolve GitHub shorthand to raw.githubusercontent.com URL', async () => {
      const shorthand = 'github:user/repo/path/component.js';
      const content = 'github content';

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(content, { status: 200 })
      );

      const result = await cache.resolve(shorthand);
      expect(result).toBe(content);

      // Verify the URL was resolved to raw.githubusercontent.com
      const fetchedUrl = fetchSpy.mock.calls[0][0];
      expect(fetchedUrl).toContain('raw.githubusercontent.com');
      expect(fetchedUrl).toContain('user/repo');
    });

    it('should persist manifest.json with cache metadata', async () => {
      const url = 'https://example.com/component.js';
      const content = 'test content';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(content, {
          status: 200,
          headers: { 'ETag': '"test-etag"' },
        })
      );

      await cache.resolve(url);

      const manifestPath = path.join(cacheDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);

      expect(manifest.entries).toBeDefined();
      expect(manifest.entries[url]).toBeDefined();
      expect(manifest.entries[url].hash).toBeDefined();
      expect(manifest.entries[url].fetchedAt).toBeDefined();
      expect(manifest.entries[url].etag).toBe('"test-etag"');
      expect(manifest.entries[url].ttl).toBeGreaterThan(0);
    });

    it('should bypass cache when noCache option is set', async () => {
      const url = 'https://example.com/component.js';
      const content1 = 'first content';
      const content2 = 'second content';

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response(content1, { status: 200 }))
        .mockResolvedValueOnce(new Response(content2, { status: 200 }));

      await cache.resolve(url);
      const result = await cache.resolve(url, { noCache: true });

      expect(result).toBe(content2);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    });

    it('should still update cache even when bypassed', async () => {
      const url = 'https://example.com/component.js';
      const content = 'fresh content';

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('old', { status: 200 }))
        .mockResolvedValueOnce(new Response(content, { status: 200 }));

      await cache.resolve(url);
      await cache.resolve(url, { noCache: true });

      // Third call should return the updated cache
      const result = await cache.resolve(url);
      expect(result).toBe(content);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2); // No third fetch
    });

    it('should handle fetch returning non-ok status', async () => {
      const url = 'https://example.com/notfound.js';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('Not Found', { status: 404 })
      );

      await expect(cache.resolve(url)).rejects.toThrow('404');
    });
  });

  describe('clear', () => {
    it('should clear all cached modules with no arguments', async () => {
      const url = 'https://example.com/component.js';
      const content = 'test content';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(content, { status: 200 })
      );

      await cache.resolve(url);
      await cache.clear();

      const manifestPath = path.join(cacheDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      expect(Object.keys(manifest.entries)).toHaveLength(0);

      const modulesDir = path.join(cacheDir, 'modules');
      const files = await fs.readdir(modulesDir).catch(() => []);
      expect(files).toHaveLength(0);
    });

    it('should clear specific URL cache entry', async () => {
      const url1 = 'https://example.com/a.js';
      const url2 = 'https://example.com/b.js';

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('content-a', { status: 200 }))
        .mockResolvedValueOnce(new Response('content-b', { status: 200 }));

      await cache.resolve(url1);
      await cache.resolve(url2);

      await cache.clear(url1);

      const manifestPath = path.join(cacheDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      expect(manifest.entries[url1]).toBeUndefined();
      expect(manifest.entries[url2]).toBeDefined();
    });

    it('should handle clearing when cache is empty', async () => {
      // Should not throw
      await cache.clear();
    });
  });

  describe('getStats', () => {
    it('should show cache statistics', async () => {
      const url1 = 'https://example.com/a.js';
      const url2 = 'https://example.com/b.js';

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(new Response('content-a', { status: 200 }))
        .mockResolvedValueOnce(new Response('content-b', { status: 200 }));

      await cache.resolve(url1);
      await cache.resolve(url2);

      const stats = await cache.getStats();
      expect(stats.entryCount).toBe(2);
      expect(stats.totalSizeMB).toBeGreaterThan(0);
    });

    it('should return zero stats for empty cache', async () => {
      const stats = await cache.getStats();
      expect(stats.entryCount).toBe(0);
      expect(stats.totalSizeMB).toBe(0);
    });
  });

  describe('GitHub shorthand resolution', () => {
    it('should resolve github:user/repo/path to raw URL', async () => {
      const shorthand = 'github:user/repo/src/component.js';
      const content = 'github component';

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(content, { status: 200 })
      );

      await cache.resolve(shorthand);

      const fetchedUrl = fetchSpy.mock.calls[0][0];
      expect(fetchedUrl).toBe('https://raw.githubusercontent.com/user/repo/main/src/component.js');
    });

    it('should resolve github:user/repo@branch/path', async () => {
      const shorthand = 'github:user/repo@v2.0/src/component.js';
      const content = 'branched content';

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(content, { status: 200 })
      );

      await cache.resolve(shorthand);

      const fetchedUrl = fetchSpy.mock.calls[0][0];
      expect(fetchedUrl).toBe('https://raw.githubusercontent.com/user/repo/v2.0/src/component.js');
    });
  });

  describe('versioned URL detection', () => {
    it('should detect semver in URL path', async () => {
      const url = 'https://cdn.example.com/v1.2.3/lib.js';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('test', { status: 200 })
      );

      await cache.resolve(url);

      const manifestPath = path.join(cacheDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      // Versioned URLs get 7-day TTL
      expect(manifest.entries[url].ttl).toBe(7 * 24 * 60 * 60);
    });

    it('should detect version query param', async () => {
      const url = 'https://cdn.example.com/lib.js?v=1.2.3';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('test', { status: 200 })
      );

      await cache.resolve(url);

      const manifestPath = path.join(cacheDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      expect(manifest.entries[url].ttl).toBe(7 * 24 * 60 * 60);
    });

    it('should treat URLs without version as unversioned', async () => {
      const url = 'https://cdn.example.com/latest/lib.js';
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response('test', { status: 200 })
      );

      await cache.resolve(url);

      const manifestPath = path.join(cacheDir, 'manifest.json');
      const manifest = await fs.readJson(manifestPath);
      expect(manifest.entries[url].ttl).toBe(60 * 60);
    });
  });
});
