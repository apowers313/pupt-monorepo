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
 * Bare specifiers are things like '@pupt/lib', 'zod', 'lodash/map'.
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
 * Babel packages for AST-based import rewriting (loaded lazily).
 * Only parser and generator are needed — traversal is done manually to
 * avoid issues with @babel/traverse and error-recovery AST nodes.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AstNode = any;

let babelPackagesCache: {
  parse: (code: string, options: Record<string, unknown>) => AstNode;
  generate: (ast: AstNode) => { code: string };
} | null = null;

/**
 * Load Babel's bundled parser and generator from @babel/standalone.
 */
async function loadBabelPackages(): Promise<NonNullable<typeof babelPackagesCache>> {
  if (babelPackagesCache) {return babelPackagesCache;}

  const babelModule = await import('@babel/standalone');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Babel = (babelModule.default || babelModule) as any;
  const { parser, generator: generatorMod } = Babel.packages;

  // generator may be a module object with a .default property
  const generate = typeof generatorMod === 'function' ? generatorMod : generatorMod.default;

  babelPackagesCache = {
    parse: parser.parse.bind(parser),
    generate,
  };
  return babelPackagesCache;
}

/**
 * Recursively walk an AST node and call the visitor on each node that has a `type`.
 */
function walkAst(node: AstNode, visitor: (n: AstNode) => void): void {
  if (!node || typeof node !== 'object') {return;}
  if (node.type) {
    visitor(node);
  }
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') {continue;}
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object' && item.type) {
          walkAst(item, visitor);
        }
      }
    } else if (child && typeof child === 'object' && child.type) {
      walkAst(child, visitor);
    }
  }
}

/**
 * Rewrite all bare specifiers in the code to absolute file:// URLs.
 * Uses AST parsing to only modify actual import declarations and dynamic import()
 * calls, ignoring import-like text in string literals or comments.
 */
async function rewriteAllImports(code: string): Promise<string> {
  const { parse, generate } = await loadBabelPackages();

  // Parse the already-transformed JS code into an AST.
  // Use errorRecovery to tolerate duplicate import bindings that can arise
  // when .prompt auto-imports and <Uses> imports overlap (e.g., both import
  // Prompt from '@pupt/lib'). We only need the AST for import rewriting.
  const ast = parse(code, { sourceType: 'module', errorRecovery: true });

  // Collect AST nodes that contain bare specifiers
  const nodesToRewrite: Array<{ node: { value: string }; specifier: string }> = [];

  // Top-level import declarations
  for (const stmt of ast.program.body) {
    if (stmt.type === 'ImportDeclaration' && stmt.source) {
      const specifier = stmt.source.value;
      if (isBareSpecifier(specifier)) {
        nodesToRewrite.push({ node: stmt.source, specifier });
      }
    }
  }

  // Dynamic imports anywhere in the code: import('specifier')
  walkAst(ast, (node: AstNode) => {
    if (
      node.type === 'CallExpression' &&
      node.callee?.type === 'Import' &&
      node.arguments?.length > 0 &&
      node.arguments[0].type === 'StringLiteral'
    ) {
      const specifier = node.arguments[0].value;
      if (isBareSpecifier(specifier)) {
        nodesToRewrite.push({ node: node.arguments[0], specifier });
      }
    }
  });

  // If nothing to rewrite, return unchanged
  if (nodesToRewrite.length === 0) {
    return code;
  }

  // Resolve all unique specifiers to absolute file:// URLs
  const uniqueSpecifiers = new Set(nodesToRewrite.map(n => n.specifier));
  const resolutions = new Map<string, string>();
  for (const specifier of uniqueSpecifiers) {
    const resolved = await resolveBareSpecifier(specifier);
    resolutions.set(specifier, resolved);
  }

  // Mutate AST nodes in place with resolved paths
  for (const { node, specifier } of nodesToRewrite) {
    const resolved = resolutions.get(specifier);
    if (resolved) {
      node.value = resolved;
    }
  }

  // Generate code from modified AST
  return generate(ast).code;
}

/**
 * Evaluate JavaScript code as an ES module in Node.js.
 * Since all bare specifiers are rewritten to absolute paths,
 * we can use a simple temp file in /tmp.
 */
/**
 * Rewrite imports with filename context for error messages.
 */
async function rewriteImportsForFile(code: string, filename: string): Promise<string> {
  try {
    return await rewriteAllImports(code);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to evaluate module ${filename}: ${message}`);
  }
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
  const rewrittenCode = await rewriteImportsForFile(code, filename);

  // Create a unique temp file (can be anywhere since imports are absolute)
  const hash = crypto.createHash('md5').update(rewrittenCode).digest('hex').slice(0, 8);
  const tempDir = path.join(os.tmpdir(), '@pupt/lib');

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
 * In Node.js, all bare specifiers (like '@pupt/lib', 'zod') are rewritten
 * to absolute file:// URLs before evaluation, eliminating module resolution issues.
 *
 * @param code - JavaScript code to evaluate (should be valid ES module)
 * @param options - Evaluation options
 * @returns The module's exports object
 *
 * @example
 * ```typescript
 * const code = `
 *   import { Prompt } from '@pupt/lib';
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
