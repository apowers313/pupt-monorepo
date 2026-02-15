import { isComponentClass } from '../component';
import type { ComponentType, PuptElement, ModuleEntry } from '../types';
import type { PromptSource, DiscoveredPromptFile } from '../types/prompt-source';
import { isPromptSource } from '../types/prompt-source';
import { isPuptElement } from '../types/element';
import { PROPS } from '../types/symbols';
import { createPromptFromSource } from '../create-prompt';

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

/** A compiled prompt from a discovered .prompt file */
export interface CompiledPrompt {
  element: PuptElement;
  id: string;
  name: string;
  description: string;
  tags: string[];
  version?: string;
}

/**
 * Represents a loaded library with its components and prompts
 */
export interface LoadedLibrary {
  name: string;
  components: Record<string, ComponentType>;
  prompts: Record<string, CompiledPrompt>;
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

    // Start loading — use original source for doLoad, normalized only for cache key
    const promise = this.doLoad(source);
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
   * Load a module entry of any type (string, PromptSource, or package reference).
   * Dispatches to the appropriate loading strategy based on entry type.
   */
  async loadEntry(entry: ModuleEntry): Promise<LoadedLibrary> {
    if (typeof entry === 'string') {
      return this.load(entry);
    }

    if (isPromptSource(entry)) {
      return this.loadPromptSource(entry);
    }

    // Package reference: { source, config }
    if (typeof entry === 'object' && entry !== null && 'source' in entry && 'config' in entry) {
      return this.loadPackageReference(entry as { source: string; config: Record<string, unknown> });
    }

    throw new Error('Invalid module entry: must be a string, PromptSource, or { source, config } object');
  }

  /**
   * Load prompts from a PromptSource instance.
   */
  async loadPromptSource(source: PromptSource, name?: string): Promise<LoadedLibrary> {
    const prompts = await this.discoverAndCompilePrompts(source);

    return {
      name: name ?? source.constructor?.name ?? 'PromptSource',
      components: {},
      prompts,
      dependencies: [],
    };
  }

  /**
   * Load prompts from a dynamic package reference.
   * Imports the source module, instantiates its default export with the config,
   * and calls getPrompts() on it.
   */
  async loadPackageReference(ref: { source: string; config: Record<string, unknown> }): Promise<LoadedLibrary> {
    let resolvedSource = ref.source;

    // Resolve relative paths from CWD
    if (isNode && (ref.source.startsWith('./') || ref.source.startsWith('/') || ref.source.startsWith('../'))) {
      const path = await import('path');
      const url = await import('url');
      const absolutePath = path.resolve(process.cwd(), ref.source);
      resolvedSource = url.pathToFileURL(absolutePath).href;
    }

    const module = await import(/* @vite-ignore */ resolvedSource);
    const SourceClass = module.default;

    if (typeof SourceClass !== 'function') {
      throw new Error(
        `Package reference source "${ref.source}" must have a default export that is a class or constructor function`,
      );
    }

    const sourceInstance: PromptSource = new SourceClass(ref.config);
    const prompts = await this.discoverAndCompilePrompts(sourceInstance);

    return {
      name: ref.source,
      components: {},
      prompts,
      dependencies: [],
    };
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
   * Normalize a source string for consistent deduplication.
   * Resolves relative paths to absolute, normalizes package names to lowercase.
   */
  normalizeSource(source: string): string {
    const sourceType = this.resolveSourceType(source);

    if (sourceType === 'local' && isNode) {
      // Resolve relative paths to absolute for consistent dedup
      // Use synchronous path resolution (no async needed for path.resolve)
      try {
        // Dynamic import of 'path' is async, but we can use a simpler approach
        // since path.resolve just does string manipulation on POSIX-like paths
        if (source.startsWith('./') || source.startsWith('../')) {
          // Normalize by removing ./ prefix and collapsing ..
          // This ensures './foo' and 'foo' are treated the same
          const cwd = process.cwd();
          return `${cwd}/${source}`.replace(/\/\.\//g, '/');
        }
      } catch {
        // Fallback to raw source
      }
    }

    if (sourceType === 'npm') {
      // Normalize package names to lowercase for consistent dedup
      const parsed = this.parsePackageSource(source);
      const normalizedName = parsed.name.toLowerCase();
      return parsed.version ? `${normalizedName}@${parsed.version}` : normalizedName;
    }

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
   * Discover and compile .prompt files from a PromptSource.
   * Each file is compiled through createPromptFromSource() and metadata extracted.
   */
  async discoverAndCompilePrompts(source: PromptSource): Promise<Record<string, CompiledPrompt>> {
    const files = await source.getPrompts();
    return this.compilePromptFiles(files);
  }

  /**
   * Compile an array of discovered prompt files into CompiledPrompt records.
   */
  private async compilePromptFiles(files: DiscoveredPromptFile[]): Promise<Record<string, CompiledPrompt>> {
    const prompts: Record<string, CompiledPrompt> = {};

    for (const file of files) {
      const element = await createPromptFromSource(file.content, file.filename);
      const props = element[PROPS] as { name?: string; description?: string; tags?: string[]; version?: string } | null;
      const name = props?.name ?? file.filename.replace(/\.prompt$/, '');
      prompts[name] = {
        element,
        id: crypto.randomUUID(),
        name,
        description: props?.description ?? '',
        tags: props?.tags ?? [],
        version: props?.version,
      };
    }

    return prompts;
  }

  /**
   * Load a local module
   */
  private async loadLocal(source: string): Promise<LoadedLibrary> {
    let components: Record<string, ComponentType> = {};
    let dependencies: string[] = [];
    let prompts: Record<string, CompiledPrompt> = {};

    // Try to import as a JS module
    try {
      const resolvedPath = await resolveLocalPath(source);
      const module = await import(/* @vite-ignore */ resolvedPath);
      components = this.detectComponents(module);
      dependencies = module.dependencies ?? [];
    } catch {
      // No JS module found — that's fine, we may still have .prompt files
    }

    // Try to discover .prompt files
    if (isNode) {
      try {
        const { LocalPromptSource } = await import('./prompt-sources/local-prompt-source');
        const promptSource = new LocalPromptSource(source);
        prompts = await this.discoverAndCompilePrompts(promptSource);
      } catch {
        // No .prompt files found — that's fine
      }
    }

    // If we found neither components nor prompts, throw
    if (Object.keys(components).length === 0 && Object.keys(prompts).length === 0) {
      throw new Error(
        `Failed to load local module "${source}": no JS module or .prompt files found`,
      );
    }

    return {
      name: this.extractNameFromPath(source),
      components,
      prompts,
      dependencies,
    };
  }

  /**
   * Load an npm package.
   * Tries to import as a JS module and additionally discovers .prompt files.
   */
  private async loadNpm(source: string): Promise<LoadedLibrary> {
    const parsed = this.parsePackageSource(source);
    let components: Record<string, ComponentType> = {};
    let dependencies: string[] = [];
    let prompts: Record<string, CompiledPrompt> = {};
    let jsLoaded = false;

    // Try to import as a JS module
    try {
      const module = await import(parsed.name);
      components = this.detectComponents(module);
      dependencies = module.dependencies ?? [];
      jsLoaded = true;
    } catch {
      // JS module not found — may still have .prompt files
    }

    // Try to discover .prompt files from the npm package
    if (isNode) {
      try {
        const { NpmLocalPromptSource } = await import('./prompt-sources/npm-local-prompt-source');
        const promptSource = new NpmLocalPromptSource(parsed.name);
        prompts = await this.discoverAndCompilePrompts(promptSource);
      } catch {
        // No .prompt files found — that's fine
      }
    }

    // If we couldn't import the JS module and found no prompts, throw
    if (!jsLoaded && Object.keys(prompts).length === 0) {
      throw new Error(
        `Failed to load npm package "${source}": no JS module or .prompt files found`,
      );
    }

    return {
      name: parsed.name,
      components,
      prompts,
      dependencies,
    };
  }

  /**
   * Check if a URL looks like an npm tarball or CDN package URL.
   */
  private isTarballOrCdnUrl(url: string): boolean {
    // Direct tarball URLs end in .tgz
    if (url.endsWith('.tgz')) return true;

    // Known CDN patterns for npm packages
    try {
      const parsed = new URL(url);
      const host = parsed.hostname;
      return host === 'cdn.jsdelivr.net' ||
        host === 'unpkg.com' ||
        host === 'esm.sh' ||
        host === 'registry.npmjs.org';
    } catch {
      return false;
    }
  }

  /**
   * Load a module from a URL.
   * Routes tarball/CDN URLs to NpmRegistryPromptSource for prompt discovery.
   * Other URLs are loaded as JS modules via dynamic import.
   */
  private async loadUrl(source: string): Promise<LoadedLibrary> {
    // Check if this is a tarball or CDN package URL
    if (this.isTarballOrCdnUrl(source)) {
      return this.loadUrlAsPromptSource(source);
    }

    // Standard JS module import via URL
    try {
      const module = await import(/* webpackIgnore: true */ source);

      return {
        name: this.extractNameFromUrl(source),
        components: this.detectComponents(module),
        prompts: {},
        dependencies: module.dependencies ?? [],
      };
    } catch (error) {
      throw new Error(
        `Failed to load module from URL "${source}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load prompts from a tarball or CDN URL via NpmRegistryPromptSource.
   */
  private async loadUrlAsPromptSource(source: string): Promise<LoadedLibrary> {
    const { NpmRegistryPromptSource } = await import('./prompt-sources/npm-registry-prompt-source');
    const promptSource = NpmRegistryPromptSource.fromUrl(source);
    const prompts = await this.discoverAndCompilePrompts(promptSource);

    return {
      name: this.extractNameFromUrl(source),
      components: {},
      prompts,
      dependencies: [],
    };
  }

  /**
   * Load a module from GitHub.
   * Tries to import index.js and additionally discovers .prompt files via GitHubPromptSource.
   */
  private async loadGithub(source: string): Promise<LoadedLibrary> {
    // Parse github:user/repo#ref format
    const match = source.match(/^github:([^/]+)\/([^#]+)(?:#(.+))?$/);
    if (!match) {
      throw new Error(`Invalid GitHub source format: ${source}`);
    }

    const [, user, repo, ref] = match;
    let components: Record<string, ComponentType> = {};
    let dependencies: string[] = [];
    let prompts: Record<string, CompiledPrompt> = {};

    // Try to import as a JS module from GitHub
    try {
      const url = `https://raw.githubusercontent.com/${user}/${repo}/${ref ?? 'main'}/index.js`;
      const library = await this.loadUrl(url);
      components = library.components;
      dependencies = library.dependencies;
    } catch {
      // No JS module found — that's fine, we may still have .prompt files
    }

    // Try to discover .prompt files via GitHubPromptSource
    try {
      const { GitHubPromptSource } = await import('./prompt-sources/github-prompt-source');
      const ownerRepo = `${user}/${repo}`;
      const options = ref ? { ref } : undefined;
      const promptSource = new GitHubPromptSource(ownerRepo, options);
      prompts = await this.discoverAndCompilePrompts(promptSource);
    } catch {
      // No .prompt files found — that's fine
    }

    // If we found neither components nor prompts, throw
    if (Object.keys(components).length === 0 && Object.keys(prompts).length === 0) {
      throw new Error(
        `Failed to load GitHub module "${source}": no JS module or .prompt files found`,
      );
    }

    return {
      name: `${user}/${repo}`,
      components,
      prompts,
      dependencies,
    };
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
