/**
 * Browser support utilities for pupt-lib.
 * Provides import map generation and CDN URL resolution for browser environments.
 */

/**
 * Supported CDN providers
 */
export type CdnProvider = 'esm.sh' | 'unpkg' | 'jsdelivr' | 'skypack';

/**
 * CDN URL templates for each provider
 */
const CDN_TEMPLATES: Record<CdnProvider, string> = {
  'esm.sh': 'https://esm.sh/{name}@{version}',
  'unpkg': 'https://unpkg.com/{name}@{version}',
  'jsdelivr': 'https://cdn.jsdelivr.net/npm/{name}@{version}',
  'skypack': 'https://cdn.skypack.dev/{name}@{version}',
};

/**
 * Options for CDN resolution
 */
export interface CdnOptions {
  /** CDN provider to use */
  cdn?: CdnProvider;
  /** Custom template URL with {name}, {version}, and optionally {path} placeholders */
  cdnTemplate?: string;
  /** Optional path within the package (e.g., 'dist/index.js') */
  path?: string;
  /** Optional scopes for import map */
  scopes?: Record<string, Record<string, string>>;
}

/**
 * Represents a dependency for import map generation
 */
export interface Dependency {
  name: string;
  version: string;
}

/**
 * Standard import map structure
 * @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap
 */
export interface ImportMap {
  imports: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
}

/**
 * Resolve a CDN URL for a package.
 *
 * @param name - Package name (e.g., '@acme/pkg' or 'lodash')
 * @param version - Package version (e.g., '1.0.0')
 * @param options - CDN options
 * @returns The resolved CDN URL
 *
 * @example
 * ```typescript
 * resolveCdn('@acme/pkg', '1.0.0', { cdn: 'esm.sh' });
 * // => 'https://esm.sh/@acme/pkg@1.0.0'
 *
 * resolveCdn('@acme/pkg', '1.0.0', { cdn: 'unpkg' });
 * // => 'https://unpkg.com/@acme/pkg@1.0.0'
 *
 * resolveCdn('@acme/pkg', '1.0.0', {
 *   cdnTemplate: 'https://cdn.example.com/{name}@{version}'
 * });
 * // => 'https://cdn.example.com/@acme/pkg@1.0.0'
 * ```
 */
export function resolveCdn(
  name: string,
  version: string,
  options: CdnOptions,
): string {
  // Use custom template if provided
  let template: string;

  if (options.cdnTemplate) {
    template = options.cdnTemplate;
  } else {
    const cdn = options.cdn ?? 'esm.sh';
    template = CDN_TEMPLATES[cdn];
  }

  // Replace placeholders
  let url = template
    .replace('{name}', name)
    .replace('{version}', version);

  // Handle optional path placeholder
  if (options.path) {
    url = url.replace('{path}', options.path);
  }

  return url;
}

/**
 * Generate an import map for a list of dependencies.
 *
 * @param dependencies - Array of dependencies with name and version
 * @param options - CDN options
 * @returns An ImportMap object ready to be serialized
 *
 * @example
 * ```typescript
 * const deps = [
 *   { name: 'pupt-lib', version: '1.0.0' },
 *   { name: '@acme/prompts', version: '2.0.0' },
 * ];
 *
 * const importMap = generateImportMap(deps, { cdn: 'esm.sh' });
 * // => {
 * //      imports: {
 * //        'pupt-lib': 'https://esm.sh/pupt-lib@1.0.0',
 * //        '@acme/prompts': 'https://esm.sh/@acme/prompts@2.0.0'
 * //      }
 * //    }
 * ```
 */
export function generateImportMap(
  dependencies: Dependency[],
  options: CdnOptions,
): ImportMap {
  const imports: Record<string, string> = {};

  for (const dep of dependencies) {
    imports[dep.name] = resolveCdn(dep.name, dep.version, options);
  }

  const importMap: ImportMap = { imports };

  // Add scopes if provided
  if (options.scopes) {
    importMap.scopes = options.scopes;
  }

  return importMap;
}

/**
 * Serialize an import map to a JSON string for embedding in HTML.
 *
 * @param importMap - The import map to serialize
 * @returns JSON string
 *
 * @example
 * ```typescript
 * const json = serializeImportMap(importMap);
 * // Use in HTML: <script type="importmap">${json}</script>
 * ```
 */
export function serializeImportMap(importMap: ImportMap): string {
  return JSON.stringify(importMap, null, 2);
}

/**
 * Generate an HTML script tag with an import map.
 *
 * @param dependencies - Array of dependencies with name and version
 * @param options - CDN options
 * @returns HTML string for the import map script tag
 *
 * @example
 * ```typescript
 * const html = generateImportMapScript(deps, { cdn: 'esm.sh' });
 * // => <script type="importmap">{"imports": {...}}</script>
 * ```
 */
export function generateImportMapScript(
  dependencies: Dependency[],
  options: CdnOptions,
): string {
  const importMap = generateImportMap(dependencies, options);
  const json = serializeImportMap(importMap);
  return `<script type="importmap">\n${json}\n</script>`;
}
