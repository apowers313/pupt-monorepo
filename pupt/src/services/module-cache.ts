import crypto from 'node:crypto';
import path from 'node:path';

import fs from 'fs-extra';

interface CacheManifestEntry {
  hash: string;
  fetchedAt: string;
  etag?: string;
  lastModified?: string;
  ttl: number;
}

interface CacheManifest {
  entries: Record<string, CacheManifestEntry>;
}

export interface ModuleCacheResolveOptions {
  noCache?: boolean;
}

const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
const ONE_HOUR_SECONDS = 60 * 60;

/**
 * Caches fetched URL and GitHub module content to disk so prompts
 * work offline after the first fetch.
 */
export class ModuleCache {
  private cacheDir: string;
  private modulesDir: string;
  private manifestPath: string;

  constructor(cacheDir: string) {
    this.cacheDir = cacheDir;
    this.modulesDir = path.join(cacheDir, 'modules');
    this.manifestPath = path.join(cacheDir, 'manifest.json');
  }

  /**
   * Resolve a URL or GitHub shorthand to its content, using cache when possible.
   */
  async resolve(url: string, options?: ModuleCacheResolveOptions): Promise<string> {
    const resolvedUrl = this.resolveGitHubShorthand(url);
    const hash = this.computeHash(resolvedUrl);
    const cachedFilePath = path.join(this.modulesDir, hash);

    const manifest = await this.loadManifest();
    const entry = manifest.entries[url];

    // Check if we have a valid cached entry and noCache is not set
    if (entry && !options?.noCache) {
      const fetchedAt = new Date(entry.fetchedAt).getTime();
      const expiresAt = fetchedAt + entry.ttl * 1000;
      const now = Date.now();

      if (now < expiresAt) {
        // Cache is still valid
        const content = await fs.readFile(cachedFilePath, 'utf-8');
        return content;
      }
    }

    // Need to fetch (or re-fetch)
    try {
      const content = await this.fetchWithConditional(resolvedUrl, url, entry, cachedFilePath);
      return content;
    } catch (error) {
      // If fetch fails but we have cached content, return it
      if (entry && await fs.pathExists(cachedFilePath)) {
        return await fs.readFile(cachedFilePath, 'utf-8');
      }
      throw error;
    }
  }

  /**
   * Clear cached modules. If url is provided, clear only that entry.
   */
  async clear(url?: string): Promise<void> {
    const manifest = await this.loadManifest();

    if (url) {
      const entry = manifest.entries[url];
      if (entry) {
        const cachedFilePath = path.join(this.modulesDir, entry.hash);
        await fs.remove(cachedFilePath);
        delete manifest.entries[url];
      }
    } else {
      // Clear all
      for (const entry of Object.values(manifest.entries)) {
        const cachedFilePath = path.join(this.modulesDir, entry.hash);
        await fs.remove(cachedFilePath);
      }
      manifest.entries = {};
    }

    await this.saveManifest(manifest);
  }

  /**
   * Get cache statistics.
   */
  async getStats(): Promise<{ entryCount: number; totalSizeMB: number }> {
    const manifest = await this.loadManifest();
    const entryCount = Object.keys(manifest.entries).length;

    let totalSize = 0;
    for (const entry of Object.values(manifest.entries)) {
      const filePath = path.join(this.modulesDir, entry.hash);
      try {
        const stat = await fs.stat(filePath);
        totalSize += stat.size;
      } catch {
        // File might not exist
      }
    }

    return {
      entryCount,
      totalSizeMB: totalSize / (1024 * 1024),
    };
  }

  private async fetchWithConditional(
    resolvedUrl: string,
    originalUrl: string,
    existingEntry: CacheManifestEntry | undefined,
    cachedFilePath: string,
  ): Promise<string> {
    const headers: Record<string, string> = {};

    // Add conditional headers if we have cached data
    if (existingEntry) {
      if (existingEntry.etag) {
        headers['If-None-Match'] = existingEntry.etag;
      }
      if (existingEntry.lastModified) {
        headers['If-Modified-Since'] = existingEntry.lastModified;
      }
    }

    const response = await fetch(resolvedUrl, { headers });

    if (response.status === 304 && existingEntry) {
      // Not modified - update fetchedAt and return cached content
      const manifest = await this.loadManifest();
      manifest.entries[originalUrl] = {
        ...existingEntry,
        fetchedAt: new Date().toISOString(),
      };
      await this.saveManifest(manifest);
      return await fs.readFile(cachedFilePath, 'utf-8');
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch ${resolvedUrl}: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    const hash = this.computeHash(resolvedUrl);

    // Save content to disk
    await fs.ensureDir(this.modulesDir);
    await fs.writeFile(cachedFilePath, content, 'utf-8');

    // Update manifest
    const manifest = await this.loadManifest();
    manifest.entries[originalUrl] = {
      hash,
      fetchedAt: new Date().toISOString(),
      etag: response.headers.get('ETag') || undefined,
      lastModified: response.headers.get('Last-Modified') || undefined,
      ttl: this.computeTtl(originalUrl),
    };
    await this.saveManifest(manifest);

    return content;
  }

  private computeHash(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex');
  }

  private computeTtl(url: string): number {
    return this.isVersionedUrl(url) ? SEVEN_DAYS_SECONDS : ONE_HOUR_SECONDS;
  }

  private isVersionedUrl(url: string): boolean {
    // Check for semver patterns in URL path or query params
    // e.g., /v1.2.3/, @1.2.3, ?v=1.2.3
    const semverPattern = /(?:\/v?\d+\.\d+\.\d+(?:[-+][\w.]+)?[\/]?)|(?:[?&]v(?:ersion)?=\d+\.\d+\.\d+)/;
    return semverPattern.test(url);
  }

  /**
   * Resolve GitHub shorthand notation to a raw.githubusercontent.com URL.
   * Supports:
   *   github:user/repo/path/to/file.js         → main branch
   *   github:user/repo@branch/path/to/file.js   → specific branch/tag
   */
  private resolveGitHubShorthand(specifier: string): string {
    if (!specifier.startsWith('github:')) {
      return specifier;
    }

    const rest = specifier.slice('github:'.length);

    // Parse user/repo[@branch]/path
    const slashIndex = rest.indexOf('/');
    if (slashIndex === -1) {
      return specifier; // Invalid format, return as-is
    }

    const secondSlashIndex = rest.indexOf('/', slashIndex + 1);
    if (secondSlashIndex === -1) {
      return specifier;
    }

    const userRepo = rest.substring(0, secondSlashIndex);
    const filePath = rest.substring(secondSlashIndex + 1);

    // Check for @branch syntax
    let user: string;
    let repo: string;
    let branch = 'main';

    if (userRepo.includes('@')) {
      const atIndex = userRepo.indexOf('@');
      const beforeAt = userRepo.substring(0, atIndex);
      branch = userRepo.substring(atIndex + 1);

      const parts = beforeAt.split('/');
      user = parts[0];
      repo = parts[1];
    } else {
      const parts = userRepo.split('/');
      user = parts[0];
      repo = parts[1];
    }

    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
  }

  private async loadManifest(): Promise<CacheManifest> {
    try {
      return await fs.readJson(this.manifestPath);
    } catch {
      return { entries: {} };
    }
  }

  private async saveManifest(manifest: CacheManifest): Promise<void> {
    await fs.ensureDir(this.cacheDir);
    await fs.writeJson(this.manifestPath, manifest, { spaces: 2 });
  }
}
