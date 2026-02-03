import { isComponentClass } from '../component';
import type { ComponentType, PuptElement } from '../types';
import { isPuptElement } from '../types/element';
import { PROPS } from '../types/symbols';

// Check if we're in Node.js environment
const isNode = typeof process !== 'undefined' && process.versions?.node;

// Dynamically import Node.js modules only in Node environment
async function resolveLocalPath(source: string): Promise<string> {
  if (!isNode) {
    // In browser, just return the source as-is
    return source;
  }

  // In Node.js, resolve relative paths from CWD
  const path = await import('path');
  const url = await import('url');
  const absolutePath = path.resolve(process.cwd(), source);
  return url.pathToFileURL(absolutePath).href;
}

/**
 * Represents the source type of a module
 */
export type SourceType = 'npm' | 'url' | 'github' | 'local';

/**
 * Represents a loaded library with its components
 */
export interface LoadedLibrary {
  name: string;
  components: Record<string, ComponentType>;
  dependencies: string[];
}

/**
 * Parsed package source information
 */
export interface ParsedPackageSource {
  name: string;
  version?: string;
}

/**
 * ModuleLoader handles loading modules from various sources (npm, URL, GitHub, local).
 * It manages deduplication and version conflict detection.
 */
export class ModuleLoader {
  private loaded = new Map<string, LoadedLibrary>();
  private loading = new Map<string, Promise<LoadedLibrary>>();
  private versions = new Map<string, string>();

  /**
   * Determine the source type from a source string
   */
  resolveSourceType(source: string): SourceType {
    if (source.startsWith('https://') || source.startsWith('http://') || source.startsWith('data:')) {
      return 'url';
    }
    if (source.startsWith('github:')) {
      return 'github';
    }
    if (source.startsWith('./') || source.startsWith('/') || source.startsWith('../')) {
      return 'local';
    }
    return 'npm';
  }

  /**
   * Parse a package source string into name and version
   */
  parsePackageSource(source: string): ParsedPackageSource {
    // Handle scoped packages: @scope/package@version
    if (source.startsWith('@')) {
      const atIndex = source.indexOf('@', 1);
      if (atIndex !== -1) {
        return {
          name: source.slice(0, atIndex),
          version: source.slice(atIndex + 1),
        };
      }
      return { name: source };
    }

    // Handle regular packages: package@version
    const atIndex = source.indexOf('@');
    if (atIndex !== -1) {
      return {
        name: source.slice(0, atIndex),
        version: source.slice(atIndex + 1),
      };
    }

    return { name: source };
  }

  /**
   * Load a module from the given source.
   * Handles deduplication and version conflict detection.
   */
  async load(source: string): Promise<LoadedLibrary> {
    const normalizedSource = this.normalizeSource(source);
    const parsed = this.parsePackageSource(source);

    // Check for version conflicts
    if (parsed.version) {
      const existingVersion = this.versions.get(parsed.name);
      if (existingVersion && existingVersion !== parsed.version) {
        throw new Error(
          `Version conflict for ${parsed.name}: trying to load ${parsed.version} but ${existingVersion} is already loaded`,
        );
      }
    }

    // Already loaded?
    if (this.loaded.has(normalizedSource)) {
      return this.loaded.get(normalizedSource)!;
    }

    // Currently loading?
    if (this.loading.has(normalizedSource)) {
      return this.loading.get(normalizedSource)!;
    }

    // Start loading
    const promise = this.doLoad(normalizedSource);
    this.loading.set(normalizedSource, promise);

    try {
      const library = await promise;
      this.loaded.set(normalizedSource, library);

      // Track version
      if (parsed.version) {
        this.versions.set(parsed.name, parsed.version);
      }

      return library;
    } finally {
      this.loading.delete(normalizedSource);
    }
  }

  /**
   * Detect Component classes in module exports
   */
  detectComponents(exports: Record<string, unknown>): Record<string, ComponentType> {
    const components: Record<string, ComponentType> = {};

    for (const [name, value] of Object.entries(exports)) {
      if (isComponentClass(value)) {
        // Cast through unknown because isComponentClass returns typeof Component (abstract)
        // but ComponentType expects a concrete constructor
        components[name] = value as unknown as ComponentType;
      }
    }

    return components;
  }

  /**
   * Detect Prompt elements in module exports
   */
  detectPrompts(exports: Record<string, unknown>): Record<string, PuptElement> {
    const prompts: Record<string, PuptElement> = {};

    for (const [name, value] of Object.entries(exports)) {
      if (this.isPromptElement(value)) {
        prompts[name] = value as PuptElement;
      }
    }

    return prompts;
  }

  /**
   * Check if a value is a PuptElement with a name prop (indicates a Prompt)
   */
  private isPromptElement(value: unknown): boolean {
    if (!isPuptElement(value)) {
      return false;
    }
    const props = (value as PuptElement)[PROPS];
    return (
      props !== null &&
      typeof props === 'object' &&
      'name' in props
    );
  }

  /**
   * Normalize a source string for consistent caching
   */
  private normalizeSource(source: string): string {
    // For now, just return the source as-is
    // Future: could normalize paths, resolve aliases, etc.
    return source;
  }

  /**
   * Actually load the module from the source.
   * This is the internal implementation that can be mocked in tests.
   */
  private async doLoad(source: string): Promise<LoadedLibrary> {
    const sourceType = this.resolveSourceType(source);

    switch (sourceType) {
      case 'local':
        return this.loadLocal(source);
      case 'npm':
        return this.loadNpm(source);
      case 'url':
        return this.loadUrl(source);
      case 'github':
        return this.loadGithub(source);
      default:
        throw new Error(`Unsupported source type: ${sourceType}`);
    }
  }

  /**
   * Load a local module
   */
  private async loadLocal(source: string): Promise<LoadedLibrary> {
    try {
      // Resolve path - in Node.js this resolves from CWD, in browser it's passed through
      const resolvedPath = await resolveLocalPath(source);

      // Use dynamic import to load the module
      const module = await import(/* @vite-ignore */ resolvedPath);

      return {
        name: this.extractNameFromPath(source),
        components: this.detectComponents(module),
        dependencies: module.dependencies ?? [],
      };
    } catch (error) {
      throw new Error(
        `Failed to load local module "${source}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load an npm package
   */
  private async loadNpm(source: string): Promise<LoadedLibrary> {
    const parsed = this.parsePackageSource(source);

    try {
      // Use dynamic import to load the module
      const module = await import(parsed.name);

      return {
        name: parsed.name,
        components: this.detectComponents(module),
        dependencies: module.dependencies ?? [],
      };
    } catch (error) {
      throw new Error(
        `Failed to load npm package "${source}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load a module from a URL
   */
  private async loadUrl(source: string): Promise<LoadedLibrary> {
    try {
      // Use dynamic import to load from URL
      const module = await import(/* webpackIgnore: true */ source);

      return {
        name: this.extractNameFromUrl(source),
        components: this.detectComponents(module),
        dependencies: module.dependencies ?? [],
      };
    } catch (error) {
      throw new Error(
        `Failed to load module from URL "${source}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load a module from GitHub
   */
  private async loadGithub(source: string): Promise<LoadedLibrary> {
    // Parse github:user/repo#ref format
    const match = source.match(/^github:([^/]+)\/([^#]+)(?:#(.+))?$/);
    if (!match) {
      throw new Error(`Invalid GitHub source format: ${source}`);
    }

    const [, user, repo, ref] = match;
    const url = `https://raw.githubusercontent.com/${user}/${repo}/${ref ?? 'main'}/index.js`;

    return this.loadUrl(url);
  }

  /**
   * Extract a module name from a file path
   */
  private extractNameFromPath(path: string): string {
    const parts = path.split('/');
    return parts[parts.length - 1] || 'unknown';
  }

  /**
   * Extract a module name from a URL
   */
  private extractNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/').filter(Boolean);
      return parts[parts.length - 1]?.replace(/\.js$/, '') || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Clear all loaded modules (useful for testing)
   */
  clear(): void {
    this.loaded.clear();
    this.loading.clear();
    this.versions.clear();
  }
}
