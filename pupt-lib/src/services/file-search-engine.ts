// Browser-safe detection (use globalThis to avoid TS2304 without DOM lib)
const isBrowser = 'document' in globalThis;

// Node.js module type definitions
type PathModule = typeof import('path');
type FsModule = typeof import('fs');
type OsModule = typeof import('os');

// Module references - these are set up lazily or can be injected for testing
let pathModule: PathModule | null = null;
let fsModule: FsModule | null = null;
let osModule: OsModule | null = null;

/**
 * Load Node.js modules asynchronously using dynamic import().
 * Must be called before using getNodeModules().
 * Safe to call multiple times (subsequent calls are no-ops).
 */
export async function loadNodeModules(): Promise<void> {
  if (isBrowser) {return;}
  if (pathModule && fsModule && osModule) {return;}

  const [p, f, o] = await Promise.all([
    import('path'),
    import('fs'),
    import('os'),
  ]);
  pathModule = p;
  fsModule = f;
  osModule = o;
}

/**
 * Get the Node.js modules. Returns cached modules loaded by loadNodeModules().
 * Throws if called in browser environment or if modules haven't been loaded.
 */
function getNodeModules(): { path: PathModule; fs: FsModule; os: OsModule } {
  if (isBrowser) {
    throw new Error('FileSearchEngine is not available in browser environments');
  }

  if (!pathModule || !fsModule || !osModule) {
    throw new Error(
      'Node modules not loaded. Use FileSearchEngine.create() or await loadNodeModules() before constructing FileSearchEngine.',
    );
  }

  return { path: pathModule, fs: fsModule, os: osModule };
}

/**
 * Inject mock modules for testing. Only use in test environments.
 * @internal
 */
export function _injectModulesForTesting(mocks: { path?: PathModule; fs?: FsModule; os?: OsModule }): void {
  if (mocks.path) {pathModule = mocks.path;}
  if (mocks.fs) {fsModule = mocks.fs;}
  if (mocks.os) {osModule = mocks.os;}
}

/**
 * Reset injected modules. Only use in test environments.
 * @internal
 */
export function _resetModulesForTesting(): void {
  pathModule = null;
  fsModule = null;
  osModule = null;
}

/**
 * Information about a file or directory
 */
export interface FileInfo {
  /** File or directory name */
  name: string;
  /** Full absolute path */
  absolutePath: string;
  /** Path relative to base path */
  relativePath: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** Last modification time */
  modTime: Date;
}

/**
 * Formatted file search result for display
 */
export interface FileSearchResult {
  /** Display string (with trailing slash for directories) */
  display: string;
  /** Absolute path value */
  value: string;
  /** Description (relative path) */
  description?: string;
}

/**
 * Configuration for the file search engine
 */
export interface FileSearchEngineConfig {
  /** Base path for searches (default: current directory) */
  basePath?: string;
  /** Optional file filter pattern */
  filter?: string;
  /** Cache timeout in milliseconds (default: 5000) */
  cacheTimeout?: number;
  /** Maximum cache entries before eviction (default: 100) */
  maxCacheEntries?: number;
}

/**
 * File search engine with fuzzy matching and caching.
 * Provides real-time directory navigation and file selection.
 *
 * Note: This class is only available in Node.js environments.
 * It will throw an error if instantiated in a browser.
 */
export class FileSearchEngine {
  private basePath: string;
  private filter?: string;
  private cache: Map<string, FileInfo[]> = new Map();
  private cacheTimeout: number;
  private cacheTimestamps: Map<string, number> = new Map();
  private maxCacheEntries: number;

  /**
   * Create a FileSearchEngine instance, loading Node.js modules first.
   * This is the preferred way to create a FileSearchEngine in ESM contexts.
   */
  static async create(config?: FileSearchEngineConfig): Promise<FileSearchEngine> {
    await loadNodeModules();
    return new FileSearchEngine(config);
  }

  constructor(config: FileSearchEngineConfig = {}) {
    // Get Node.js modules (throws in browser)
    const { path } = getNodeModules();

    this.basePath = path.resolve(config.basePath ?? '.');
    this.filter = config.filter;
    this.cacheTimeout = config.cacheTimeout ?? 5000;
    this.maxCacheEntries = config.maxCacheEntries ?? 100;
  }

  /**
   * Search for files matching the query.
   * Supports directory navigation and fuzzy matching.
   *
   * @param query - Search query (can include path components)
   * @param signal - Optional AbortSignal to cancel the search
   * @returns Array of matching files
   */
  async search(query: string, signal?: AbortSignal): Promise<FileInfo[]> {
    const normalizedQuery = this.normalizePathInput(query);
    const { searchPath, searchTerm } = this.parseSearchQuery(normalizedQuery);

    const candidates = await this.getCandidatePaths(searchPath, signal);

    if (!searchTerm) {
      // Sort alphabetically with directories first even when no search term
      return this.sortResults(candidates);
    }

    return this.filterAndSort(candidates, searchTerm);
  }

  /**
   * List all files in a directory.
   *
   * @param dirPath - Directory path to list
   * @returns Array of files in the directory
   */
  async listDirectory(dirPath: string): Promise<FileInfo[]> {
    const normalizedPath = this.normalizePathInput(dirPath);
    return this.getCandidatePaths(normalizedPath);
  }

  /**
   * Parse a search query into path and search term components.
   *
   * @param query - The search query
   * @returns Object with searchPath and searchTerm
   */
  parseSearchQuery(query: string): { searchPath: string; searchTerm: string } {
    if (!query) {
      return { searchPath: '.', searchTerm: '' };
    }

    // Find the last separator position
    let lastSepIndex = -1;
    for (let i = query.length - 1; i >= 0; i--) {
      if (query[i] === '/' || query[i] === '\\') {
        lastSepIndex = i;
        break;
      }
    }

    if (lastSepIndex === -1) {
      return { searchPath: '.', searchTerm: query };
    }

    const searchPath = query.substring(0, lastSepIndex + 1);
    const searchTerm = query.substring(lastSepIndex + 1);

    return { searchPath, searchTerm };
  }

  /**
   * Normalize a path input, handling home directory and separators.
   *
   * @param input - The input path
   * @returns Normalized path
   */
  normalizePathInput(input: string): string {
    if (!input) {return '';}

    const { path, os } = getNodeModules();

    // Handle home directory expansion
    if (input.startsWith('~')) {
      input = input.replace(/^~/, os.homedir());
    }

    // Normalize separators for the current platform
    if (process.platform === 'win32') {
      input = input.replace(/\//g, path.sep);
    }

    return path.normalize(input);
  }

  /**
   * Resolve an input path to an absolute path.
   *
   * @param input - The input path
   * @returns Absolute path
   */
  resolveToAbsolutePath(input: string): string {
    const { path } = getNodeModules();
    const normalized = this.normalizePathInput(input);
    return path.resolve(this.basePath, normalized);
  }

  /**
   * Format a FileInfo object for display.
   *
   * @param fileInfo - The file info to format
   * @returns Formatted search result
   */
  formatFileInfo(fileInfo: FileInfo): FileSearchResult {
    // Always use forward slashes in display for consistency
    const displayPath = fileInfo.relativePath.replace(/\\/g, '/');

    return {
      display: displayPath + (fileInfo.isDirectory ? '/' : ''),
      value: fileInfo.absolutePath,
      description: fileInfo.relativePath,
    };
  }

  /**
   * Check if the filesystem is case-sensitive.
   *
   * @returns true if case-sensitive (Linux), false otherwise (macOS, Windows)
   */
  isFileSystemCaseSensitive(): boolean {
    return process.platform !== 'win32' && process.platform !== 'darwin';
  }

  /**
   * Clear the directory cache.
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get the current base path.
   */
  getBasePath(): string {
    return this.basePath;
  }

  /**
   * Set a new base path.
   *
   * @param basePath - New base path
   */
  setBasePath(basePath: string): void {
    const { path } = getNodeModules();
    this.basePath = path.resolve(basePath);
    this.clearCache();
  }

  private getCandidatePaths(searchPath: string, signal?: AbortSignal): Promise<FileInfo[]> {
    const { path: pathMod, fs: fsMod } = getNodeModules();
    const resolvedPath = pathMod.resolve(this.basePath, searchPath);

    // Check cache
    const cached = this.getFromCache(resolvedPath);
    if (cached) {
      return Promise.resolve(cached);
    }

    try {
      if (signal?.aborted) {
        return Promise.resolve([]);
      }

      const entries = fsMod.readdirSync(resolvedPath);

      if (signal?.aborted) {
        return Promise.resolve([]);
      }

      const fileInfos: FileInfo[] = [];

      for (const entry of entries) {
        // Skip hidden files (starting with .)
        if (entry.startsWith('.')) {
          continue;
        }

        const absolutePath = pathMod.join(resolvedPath, entry);

        try {
          const stat = fsMod.statSync(absolutePath);

          // Apply filter if configured
          if (this.filter && !stat.isDirectory()) {
            const ext = pathMod.extname(entry);
            if (!this.matchesFilter(entry, ext)) {
              continue;
            }
          }

          fileInfos.push({
            name: entry,
            absolutePath,
            relativePath: pathMod.relative(this.basePath, absolutePath),
            isDirectory: stat.isDirectory(),
            modTime: stat.mtime,
          });
        } catch {
          // Skip files we can't stat (permission issues, etc.)
        }
      }

      this.addToCache(resolvedPath, fileInfos);

      return Promise.resolve(fileInfos);
    } catch {
      return Promise.resolve([]);
    }
  }

  private matchesFilter(name: string, ext: string): boolean {
    if (!this.filter) {return true;}

    // Simple glob-like matching
    if (this.filter.startsWith('*.')) {
      const filterExt = this.filter.substring(1);
      return ext === filterExt;
    }

    return name.includes(this.filter);
  }

  private filterAndSort(candidates: FileInfo[], searchTerm: string): FileInfo[] {
    const caseSensitive = this.isFileSystemCaseSensitive();

    const filtered = candidates.filter(file => {
      const name = caseSensitive ? file.name : file.name.toLowerCase();
      const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();

      // Prefix matching (highest priority)
      if (name.startsWith(term)) {return true;}

      // Fuzzy matching
      return this.fuzzyMatch(name, term);
    });

    // Sort results
    return filtered.sort((a, b) => {
      const termLower = searchTerm.toLowerCase();
      const aStarts = a.name.toLowerCase().startsWith(termLower);
      const bStarts = b.name.toLowerCase().startsWith(termLower);

      // Prioritize exact prefix matches
      if (aStarts && !bStarts) {return -1;}
      if (!aStarts && bStarts) {return 1;}

      // Then directories first
      if (a.isDirectory && !b.isDirectory) {return -1;}
      if (!a.isDirectory && b.isDirectory) {return 1;}

      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Sort results with directories first, then alphabetically.
   */
  private sortResults(files: FileInfo[]): FileInfo[] {
    return files.sort((a, b) => {
      // Directories first
      if (a.isDirectory && !b.isDirectory) {return -1;}
      if (!a.isDirectory && b.isDirectory) {return 1;}

      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Simple fuzzy matching - checks if all characters in pattern
   * appear in str in the same order.
   */
  private fuzzyMatch(str: string, pattern: string): boolean {
    let patternIdx = 0;
    let strIdx = 0;

    while (strIdx < str.length && patternIdx < pattern.length) {
      if (str[strIdx] === pattern[patternIdx]) {
        patternIdx++;
      }
      strIdx++;
    }

    return patternIdx === pattern.length;
  }

  private getFromCache(dirPath: string): FileInfo[] | null {
    const cached = this.cache.get(dirPath);
    const timestamp = this.cacheTimestamps.get(dirPath);

    if (cached && timestamp && Date.now() - timestamp < this.cacheTimeout) {
      return cached;
    }

    return null;
  }

  private addToCache(dirPath: string, files: FileInfo[]): void {
    this.cache.set(dirPath, files);
    this.cacheTimestamps.set(dirPath, Date.now());

    // Clean up old cache entries
    if (this.cache.size > this.maxCacheEntries) {
      const oldestKey = Array.from(this.cacheTimestamps.entries())
        .sort((a, b) => a[1] - b[1])[0][0];
      this.cache.delete(oldestKey);
      this.cacheTimestamps.delete(oldestKey);
    }
  }
}

/**
 * Create a new FileSearchEngine instance, loading Node.js modules first.
 *
 * @param config - Configuration options
 * @returns Promise resolving to FileSearchEngine instance
 */
export async function createFileSearchEngine(config?: FileSearchEngineConfig): Promise<FileSearchEngine> {
  await loadNodeModules();
  return new FileSearchEngine(config);
}
