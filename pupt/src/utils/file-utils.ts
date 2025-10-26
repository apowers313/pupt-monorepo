import fs from 'node:fs';
import path from 'node:path';
import { minimatch } from 'minimatch';

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  mtime: Date;
}

interface ListFilesOptions {
  includeHidden?: boolean;
}

export function listFiles(dirPath: string, options: ListFilesOptions = {}): FileInfo[] {
  const { includeHidden = false } = options;
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files: FileInfo[] = [];

    for (const entry of entries) {
      // Skip hidden files unless explicitly included
      if (!includeHidden && entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);
      const stats = fs.statSync(fullPath);

      files.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        mtime: stats.mtime,
      });
    }

    return files;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Directory not found: ${dirPath}`);
    }
    throw error;
  }
}

export function sortFilesByModTime(files: FileInfo[]): FileInfo[] {
  return [...files].sort((a, b) => {
    // Directories always come first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    
    // Then sort by modification time (newest first)
    return b.mtime.getTime() - a.mtime.getTime();
  });
}

export function filterFilesByPattern(files: FileInfo[], pattern: string): FileInfo[] {
  if (!pattern || pattern === '') {
    return files;
  }

  return files.filter(file => {
    // Always include directories for navigation
    if (file.isDirectory) {
      return true;
    }
    
    // Match files against the pattern
    return minimatch(file.name, pattern);
  });
}

const fileCache = new Map<string, { files: FileInfo[]; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

export function listFilesWithCache(dirPath: string, options: ListFilesOptions = {}): FileInfo[] {
  const cacheKey = `${dirPath}:${JSON.stringify(options)}`;
  const cached = fileCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.files;
  }

  const files = listFiles(dirPath, options);
  fileCache.set(cacheKey, { files, timestamp: Date.now() });
  
  return files;
}

function _clearFileCache(): void {
  fileCache.clear();
}

export function resolveFilePath(input: string, basePath: string): string {
  if (path.isAbsolute(input)) {
    return input;
  }
  
  return path.resolve(basePath, input);
}

function _getParentDirectory(filePath: string): string {
  return path.dirname(filePath);
}

export function expandPath(inputPath: string): string {
  // Handle home directory expansion
  if (inputPath.startsWith('~/')) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, inputPath.slice(2));
  }
  
  return inputPath;
}