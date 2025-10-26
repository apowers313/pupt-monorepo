import fs from 'fs-extra';
import * as path from 'node:path';
import os from 'node:os';

interface FileInfo {
  name: string;
  absolutePath: string;
  relativePath: string;
  isDirectory: boolean;
  modTime: Date;
}

interface FileSearchResult {
  display: string;
  value: string;
  description?: string;
}

export class FileSearchEngine {
  private basePath: string;
  private filter?: string;
  private cache: Map<string, FileInfo[]> = new Map();
  private cacheTimeout = 5000; // 5 seconds
  private cacheTimestamps: Map<string, number> = new Map();
  private pathSeparatorRegex: RegExp;

  constructor(basePath: string, filter?: string) {
    this.basePath = path.resolve(basePath);
    this.filter = filter;
    // Create regex that matches either separator
    this.pathSeparatorRegex = process.platform === 'win32' ? /[/\\]/ : /\//;
  }

  async search(query: string, signal?: AbortSignal): Promise<FileInfo[]> {
    // Normalize the input based on platform
    const normalizedQuery = this.normalizePathInput(query);
    
    // Parse query to extract path components
    const { searchPath, searchTerm } = this.parseSearchQuery(normalizedQuery);
    
    // Get all accessible paths from searchPath
    const candidates = await this.getCandidatePaths(searchPath, signal);
    
    // Filter based on searchTerm - this happens on EVERY keystroke
    if (!searchTerm) {
      return candidates; // Show all files in directory
    }
    
    // Filter and sort results
    return this.filterAndSort(candidates, searchTerm);
  }

  async listDirectory(dirPath: string): Promise<FileInfo[]> {
    const normalizedPath = this.normalizePathInput(dirPath);
    return this.getCandidatePaths(normalizedPath);
  }

  parseSearchQuery(query: string): { searchPath: string; searchTerm: string } {
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
    const searchPath = query.substring(0, lastSepIndex + 1);
    const searchTerm = query.substring(lastSepIndex + 1);
    
    return { searchPath, searchTerm };
  }

  normalizePathInput(input: string): string {
    if (!input) return '';
    
    // Handle home directory expansion
    if (input.startsWith('~')) {
      input = input.replace(/^~/, os.homedir());
    }
    
    // Normalize separators for the current platform
    if (process.platform === 'win32') {
      // On Windows, convert forward slashes to backslashes
      input = input.replace(/\//g, path.sep);
    }
    
    // Use path.normalize to clean up the path
    return path.normalize(input);
  }

  resolveToAbsolutePath(input: string): string {
    const normalized = this.normalizePathInput(input);
    return path.resolve(this.basePath, normalized);
  }

  formatFileInfo(fileInfo: FileInfo): FileSearchResult {
    // Always use forward slashes in display for consistency
    const displayPath = fileInfo.relativePath.replace(/\\/g, '/');
    
    return {
      display: displayPath + (fileInfo.isDirectory ? '/' : ''),
      value: fileInfo.absolutePath, // Keep native separators
      description: fileInfo.relativePath,
    };
  }

  private async getCandidatePaths(searchPath: string, signal?: AbortSignal): Promise<FileInfo[]> {
    const resolvedPath = path.resolve(this.basePath, searchPath);
    
    // Check cache
    const cached = this.getFromCache(resolvedPath);
    if (cached) {
      return cached;
    }
    
    try {
      // Check if operation was cancelled
      if (signal?.aborted) {
        return [];
      }
      
      const entries = await fs.readdir(resolvedPath);
      
      // Check again after async operation
      if (signal?.aborted) {
        return [];
      }
      
      const fileInfos: FileInfo[] = [];
      
      for (const entry of entries) {
        const absolutePath = path.join(resolvedPath, entry);
        const stat = await fs.stat(absolutePath);
        
        fileInfos.push({
          name: entry,
          absolutePath,
          relativePath: path.relative(this.basePath, absolutePath),
          isDirectory: stat.isDirectory(),
          modTime: stat.mtime,
        });
      }
      
      // Cache the results
      this.addToCache(resolvedPath, fileInfos);
      
      return fileInfos;
    } catch {
      // Return empty array if directory doesn't exist or is inaccessible
      return [];
    }
  }

  private filterAndSort(candidates: FileInfo[], searchTerm: string): FileInfo[] {
    const isFileSystemCaseSensitive = process.platform !== 'win32' && process.platform !== 'darwin';
    
    const filtered = candidates.filter(file => {
      const name = isFileSystemCaseSensitive ? file.name : file.name.toLowerCase();
      const term = isFileSystemCaseSensitive ? searchTerm : searchTerm.toLowerCase();
      
      // Prefix matching (most important for file paths)
      if (name.startsWith(term)) return true;
      
      // Fuzzy matching for convenience
      return this.fuzzyMatch(name, term);
    });
    
    // Sort results
    return filtered.sort((a, b) => {
      const termLower = searchTerm.toLowerCase();
      const aStarts = a.name.toLowerCase().startsWith(termLower);
      const bStarts = b.name.toLowerCase().startsWith(termLower);
      
      // Prioritize exact prefix matches
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Then directories
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      
      // Then by name
      return a.name.localeCompare(b.name);
    });
  }

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
    if (this.cache.size > 100) {
      const oldestKey = Array.from(this.cacheTimestamps.entries())
        .sort((a, b) => a[1] - b[1])[0][0];
      this.cache.delete(oldestKey);
      this.cacheTimestamps.delete(oldestKey);
    }
  }
}