import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import MiniSearch from 'minisearch';

export interface FileInfo {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
}

export interface ListFilesOptions {
  includeHidden?: boolean;
  pattern?: string;
}

export interface GlobOptions {
  ignore?: string[];
  followSymlinks?: boolean;
}

export interface FileSystemServiceOptions {
  cacheTimeout?: number;
  excludePatterns?: string[];
}

export class FileSystemService {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private searchIndex: MiniSearch<FileInfo> | null = null;
  private searchIndexPath: string | null = null;
  private options: Required<FileSystemServiceOptions>;

  constructor(options: FileSystemServiceOptions = {}) {
    this.options = {
      cacheTimeout: options.cacheTimeout ?? 5000,
      excludePatterns: options.excludePatterns ?? [
        'node_modules/**',
        '.git/**',
        'dist/**',
        'coverage/**'
      ]
    };
  }

  expandPath(inputPath: string): string {
    if (!inputPath) return '';
    
    // Handle home directory expansion
    if (inputPath.startsWith('~/')) {
      return path.join(os.homedir(), inputPath.slice(2));
    }
    
    // Resolve relative paths
    return path.resolve(inputPath);
  }

  normalizePath(input: string): string {
    if (!input) return '';
    
    // Expand home directory first
    let normalized = input;
    if (normalized.startsWith('~')) {
      normalized = normalized.replace(/^~/, os.homedir());
    }
    
    // Normalize separators for the current platform
    if (process.platform === 'win32') {
      // On Windows, convert forward slashes to backslashes
      normalized = normalized.replace(/\//g, path.sep);
    } else {
      // On Unix, convert backslashes to forward slashes
      normalized = normalized.replace(/\\/g, path.sep);
    }
    
    // Use path.normalize to clean up the path
    return path.normalize(normalized);
  }

  resolveSearchPath(query: string): { searchPath: string; searchTerm: string } {
    // Handle empty query
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
      // No separator - searching in current directory
      return { searchPath: '.', searchTerm: query };
    }
    
    // Split at the last separator
    const searchPath = query.substring(0, lastSepIndex) || '.';
    const searchTerm = query.substring(lastSepIndex + 1);
    
    return { searchPath, searchTerm };
  }

  async listFiles(directory: string, options: ListFilesOptions = {}): Promise<FileInfo[]> {
    const cacheKey = `list:${directory}:${JSON.stringify(options)}`;
    const cached = this.getFromCache<FileInfo[]>(cacheKey);
    if (cached) return cached;

    const expandedDir = this.expandPath(directory);
    
    try {
      const entries = await fs.readdir(expandedDir, { withFileTypes: true });
      const files: FileInfo[] = [];

      for (const entry of entries) {
        // Skip hidden files unless explicitly included
        if (!options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(expandedDir, entry.name);
        const stats = await fs.stat(fullPath);

        const fileInfo: FileInfo = {
          name: entry.name,
          path: fullPath,
          relativePath: path.relative(process.cwd(), fullPath),
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime,
        };

        // Apply pattern filter if provided
        if (options.pattern) {
          if (fileInfo.isDirectory || minimatch(fileInfo.name, options.pattern)) {
            files.push(fileInfo);
          }
        } else {
          files.push(fileInfo);
        }
      }

      // Sort files: directories first, then by modification time
      files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return b.modified.getTime() - a.modified.getTime();
      });
      
      this.setCache(cacheKey, files);
      return files;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Directory not found: ${directory}`);
      }
      throw error;
    }
  }

  async searchFiles(directory: string, query: string): Promise<FileInfo[]> {
    // Build or update search index if needed
    if (!this.searchIndex || this.searchIndexPath !== directory) {
      await this.buildSearchIndex(directory);
    }

    if (!this.searchIndex) {
      return [];
    }

    const results = this.searchIndex.search(query, {
      fuzzy: 0.2,
      prefix: true,
      boost: { name: 2 }
    });

    return results.map(result => {
      const fileInfo = this.searchIndex!.getStoredFields(result.id);
      return fileInfo as unknown as FileInfo;
    });
  }

  async glob(directory: string, pattern: string, options: GlobOptions = {}): Promise<FileInfo[]> {
    const cacheKey = `glob:${directory}:${pattern}:${JSON.stringify(options)}`;
    const cached = this.getFromCache<FileInfo[]>(cacheKey);
    if (cached) return cached;

    const expandedDir = this.expandPath(directory);
    const globOptions = {
      cwd: expandedDir,
      ignore: options.ignore || this.options.excludePatterns,
      follow: options.followSymlinks ?? false,
      absolute: false
    };

    const matches = await glob(pattern, globOptions);
    const files: FileInfo[] = [];

    for (const match of matches) {
      const fullPath = path.join(expandedDir, match);
      try {
        const stats = await fs.stat(fullPath);
        files.push({
          name: path.basename(match),
          path: fullPath,
          relativePath: match,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modified: stats.mtime
        });
      } catch {
        // Skip files that can't be accessed
      }
    }

    this.setCache(cacheKey, files);
    return files;
  }

  private async buildSearchIndex(directory: string): Promise<void> {
    const files = await this.listFilesRecursive(directory);
    
    this.searchIndex = new MiniSearch({
      fields: ['name', 'relativePath'],
      storeFields: ['name', 'path', 'relativePath', 'isDirectory', 'size', 'modified'],
      searchOptions: {
        boost: { name: 2 },
        fuzzy: 0.2
      }
    });

    // Add numeric IDs to files
    const filesWithIds = files.map((file, index) => ({
      ...file,
      id: index.toString()
    }));

    this.searchIndex.addAll(filesWithIds);
    this.searchIndexPath = directory;
  }

  private async listFilesRecursive(directory: string): Promise<FileInfo[]> {
    const allFiles: FileInfo[] = [];
    const expandedDir = this.expandPath(directory);

    const walk = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          // Skip hidden files and excluded patterns
          if (entry.name.startsWith('.')) continue;
          
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(expandedDir, fullPath);
          
          // Skip excluded patterns
          let skip = false;
          for (const pattern of this.options.excludePatterns) {
            if (minimatch(relativePath, pattern)) {
              skip = true;
              break;
            }
          }
          if (skip) continue;

          const stats = await fs.stat(fullPath);
          
          allFiles.push({
            name: entry.name,
            path: fullPath,
            relativePath,
            isDirectory: entry.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          });

          if (entry.isDirectory()) {
            await walk(fullPath);
          }
        }
      } catch {
        // Skip directories that can't be accessed
      }
    };

    await walk(expandedDir);
    return allFiles;
  }

  private getFromCache<T = unknown>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.options.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    
    // Clean up old cache entries if too many
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20 entries
      for (let i = 0; i < 20; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.searchIndex = null;
    this.searchIndexPath = null;
  }
}