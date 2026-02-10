/**
 * ES Module evaluator using dynamic import().
 * Supports both browser (Blob URLs) and Node.js environments.
 *
 * Uses Option 2 (Full Path Rewriting) from design/module-import-design.md:
 * All bare specifiers are resolved to absolute file:// URLs at transform time,
 * eliminating the need for Node.js module resolution at runtime.
 */

/**
 * Check if we're running in a Node.js environment.
 */
function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' && process.versions?.node !== undefined;
}

/**
 * Check if we're running in a browser environment.
 */
function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined' && typeof Blob !== 'undefined';
}

export interface EvaluateOptions {
  /** Filename for error messages */
  filename: string;
}

/**
 * Evaluate JavaScript code as an ES module in the browser using Blob URLs.
 * Browser bare specifier resolution relies on import maps being configured.
 */
async function evaluateInBrowser(code: string, filename: string): Promise<unknown> {
  const blob = new Blob([code], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);

  try {
    const module = await import(/* @vite-ignore */ url);
    return module;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Provide helpful error for missing import maps
    if (message.includes('Failed to resolve module specifier')) {
      const match = message.match(/["']([^"']+)["']/);
      const specifier = match ? match[1] : 'unknown';
      throw new Error(
        `Failed to resolve module "${specifier}" in ${filename}. ` +
        'Ensure an import map is configured for this module. ' +
        'See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap',
      );
    }

    throw new Error(`Failed to evaluate module ${filename}: ${message}`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Check if a specifier is a bare specifier (not a relative or absolute path).
 * Bare specifiers are things like 'pupt-lib', 'zod', 'lodash/map'.
 */
function isBareSpecifier(specifier: string): boolean {
  // Relative paths
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return false;
  }
  // Absolute paths
  if (specifier.startsWith('/')) {
    return false;
  }
  // URLs
  if (specifier.startsWith('file://') || specifier.startsWith('http://') || specifier.startsWith('https://') || specifier.startsWith('data:')) {
    return false;
  }
  // Node.js built-in modules
  if (specifier.startsWith('node:')) {
    return false;
  }
  return true;
}

/**
 * Resolve a bare specifier to an absolute file:// URL.
 * Uses import.meta.resolve() when available (Node.js 20+), which correctly
 * handles ESM-only packages (packages with only an "import" export condition).
 * Falls back to createRequire for environments that shim import.meta (e.g., Vitest).
 */
async function resolveBareSpecifier(specifier: string): Promise<string> {
  if (typeof import.meta.resolve === 'function') {
    try {
      return import.meta.resolve(specifier);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Cannot resolve module "${specifier}": ${message}`);
    }
  }

  // Fallback for environments where import.meta.resolve is unavailable
  const { pathToFileURL } = await import('url');
  const { createRequire } = await import('module');
  const esmRequire = createRequire(import.meta.url);
  try {
    return pathToFileURL(esmRequire.resolve(specifier)).href;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot resolve module "${specifier}": ${message}`);
  }
}

/**
 * Rewrite all bare specifiers in the code to absolute file:// URLs.
 * This allows the code to be evaluated from anywhere (data URL, temp file, etc.)
 * without relying on Node.js module resolution.
 */
async function rewriteAllImports(code: string): Promise<string> {
  // Match import statements: import ... from 'specifier'
  // and dynamic imports: import('specifier')
  const importRegex = /from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  // Collect all unique specifiers
  const specifiers = new Set<string>();
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const specifier = match[1] || match[2];
    if (isBareSpecifier(specifier)) {
      specifiers.add(specifier);
    }
  }

  // Resolve all specifiers to absolute paths
  const resolutions = new Map<string, string>();
  for (const specifier of specifiers) {
    const resolved = await resolveBareSpecifier(specifier);
    resolutions.set(specifier, resolved);
  }

  // Rewrite the code
  let rewritten = code;
  for (const [specifier, resolved] of resolutions) {
    // Escape special regex characters in specifier
    const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Replace in static imports: from 'specifier' or from "specifier"
    rewritten = rewritten.replace(
      new RegExp(`from\\s+(['"])${escaped}\\1`, 'g'),
      `from $1${resolved}$1`,
    );

    // Replace in dynamic imports: import('specifier') or import("specifier")
    rewritten = rewritten.replace(
      new RegExp(`import\\s*\\(\\s*(['"])${escaped}\\1\\s*\\)`, 'g'),
      `import($1${resolved}$1)`,
    );
  }

  return rewritten;
}

/**
 * Evaluate JavaScript code as an ES module in Node.js.
 * Since all bare specifiers are rewritten to absolute paths,
 * we can use a simple temp file in /tmp.
 */
async function evaluateInNode(code: string, filename: string): Promise<unknown> {
  const fs = await import('fs/promises');
  const path = await import('path');
  const os = await import('os');
  const crypto = await import('crypto');
  const { pathToFileURL } = await import('url');

  // Rewrite all bare specifiers to absolute file:// URLs
  const rewrittenCode = await rewriteAllImports(code);

  // Create a unique temp file (can be anywhere since imports are absolute)
  const hash = crypto.createHash('md5').update(rewrittenCode).digest('hex').slice(0, 8);
  const tempDir = path.join(os.tmpdir(), 'pupt-lib');

  // Ensure temp directory exists
  await fs.mkdir(tempDir, { recursive: true });

  const tempFile = path.join(tempDir, `eval-${hash}.mjs`);

  try {
    // Write the code to the temp file
    await fs.writeFile(tempFile, rewrittenCode, 'utf-8');

    // Import the temp file as an ES module
    const fileUrl = pathToFileURL(tempFile).href;
    const module = await import(/* @vite-ignore */ fileUrl);

    return module;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Provide helpful error for module resolution failures
    if (message.includes('Cannot find module') || message.includes('ERR_MODULE_NOT_FOUND') || message.includes('Cannot find package')) {
      const match = message.match(/["']([^"']+)["']/);
      const specifier = match ? match[1] : 'unknown';
      throw new Error(
        `Failed to resolve module "${specifier}" in ${filename}. ` +
        `Ensure the module is installed (npm install ${specifier}).`,
      );
    }

    throw new Error(`Failed to evaluate module ${filename}: ${message}`);
  } finally {
    // Clean up temp file
    try {
      await fs.unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Evaluate JavaScript code as an ES module.
 * Uses Blob URLs in browser and temp files in Node.js.
 *
 * In Node.js, all bare specifiers (like 'pupt-lib', 'zod') are rewritten
 * to absolute file:// URLs before evaluation, eliminating module resolution issues.
 *
 * @param code - JavaScript code to evaluate (should be valid ES module)
 * @param options - Evaluation options
 * @returns The module's exports object
 *
 * @example
 * ```typescript
 * const code = `
 *   import { Prompt } from 'pupt-lib';
 *   export default <Prompt name="test" />;
 * `;
 * const module = await evaluateModule(code, { filename: 'test.tsx' });
 * const element = module.default;
 * ```
 */
export async function evaluateModule(
  code: string,
  options: EvaluateOptions,
): Promise<{ default?: unknown; [key: string]: unknown }> {
  const { filename } = options;

  if (isBrowserEnvironment()) {
    return evaluateInBrowser(code, filename) as Promise<{ default?: unknown; [key: string]: unknown }>;
  }

  if (isNodeEnvironment()) {
    return evaluateInNode(code, filename) as Promise<{ default?: unknown; [key: string]: unknown }>;
  }

  throw new Error(
    `Unsupported environment: Cannot evaluate module ${filename}. ` +
    'Neither browser nor Node.js environment detected.',
  );
}
