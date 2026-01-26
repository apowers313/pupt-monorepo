import { ModuleLoader } from './module-loader';
import { Scope, createScope } from './scope';

/**
 * ScopeLoader manages loading packages and creating scopes for component resolution.
 * It handles dependency loading and circular dependency detection.
 */
export class ScopeLoader {
  private moduleLoader = new ModuleLoader();
  private scopes = new Map<string, Scope>();
  private loading = new Set<string>();

  /**
   * Load a package and create a scope for it.
   * Dependencies are loaded recursively.
   *
   * @param source - The package source (npm, URL, local path, etc.)
   * @returns A Scope containing the package's components
   * @throws Error if circular dependency is detected
   */
  async loadPackage(source: string): Promise<Scope> {
    // Check for cached scope
    if (this.scopes.has(source)) {
      return this.scopes.get(source)!;
    }

    // Circular dependency detection
    if (this.loading.has(source)) {
      throw new Error(`Circular dependency detected: ${source}`);
    }

    this.loading.add(source);

    try {
      const library = await this.moduleLoader.load(source);

      // Load dependencies first
      for (const dep of library.dependencies) {
        if (this.loading.has(dep)) {
          throw new Error(`Circular dependency detected: ${source} -> ${dep}`);
        }
        await this.loadPackage(dep);
      }

      // Create scope for this package
      const scope = createScope(library.name);

      // Register components
      for (const [name, component] of Object.entries(library.components)) {
        scope.register(name, component);
      }

      this.scopes.set(source, scope);
      return scope;
    } finally {
      this.loading.delete(source);
    }
  }

  /**
   * Get a scope for a previously loaded package.
   *
   * @param source - The package source
   * @returns The Scope if found, undefined otherwise
   */
  getScope(source: string): Scope | undefined {
    return this.scopes.get(source);
  }

  /**
   * Create a combined scope containing components from all loaded packages.
   * Components from earlier loaded packages take precedence on name conflicts.
   *
   * @returns A Scope containing all components from all loaded packages
   */
  getCombinedScope(): Scope {
    const combined = createScope('combined');

    for (const scope of this.scopes.values()) {
      for (const name of scope.listOwn()) {
        if (!combined.has(name)) {
          const component = scope.get(name);
          if (component) {
            combined.register(name, component);
          }
        }
      }
    }

    return combined;
  }

  /**
   * List all loaded package sources.
   *
   * @returns Array of package sources
   */
  listPackages(): string[] {
    return [...this.scopes.keys()];
  }

  /**
   * Check if a package has been loaded.
   *
   * @param source - The package source
   * @returns true if the package has been loaded
   */
  hasPackage(source: string): boolean {
    return this.scopes.has(source);
  }

  /**
   * Clear all loaded packages and scopes.
   */
  clear(): void {
    this.scopes.clear();
    this.loading.clear();
    this.moduleLoader.clear();
  }
}

/**
 * Create a new ScopeLoader instance.
 */
export function createScopeLoader(): ScopeLoader {
  return new ScopeLoader();
}
