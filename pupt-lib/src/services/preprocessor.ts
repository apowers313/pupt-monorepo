/**
 * Preprocessor for .prompt files.
 * Injects imports for built-in components and wraps raw JSX with export default.
 *
 * Preprocessing is determined by file extension, not by scanning source content.
 * .prompt files always receive full preprocessing (import injection + export wrapping).
 * All other files (.tsx, .ts, etc.) are returned unchanged — they are expected to
 * manage their own imports and exports.
 *
 * This avoids false positives from content-based regex detection, where non-JS
 * `import` keywords (e.g., Python's `import hashlib`) or `export default` inside
 * code examples could be mistakenly detected as real JS statements (issue #29).
 */

import {
  getAskComponents,
  getAskShorthand,
  getBuiltinComponents,
} from './component-discovery';

export interface PreprocessOptions {
  /** Original filename for error messages */
  filename: string;
}

/**
 * Check if a file is a .prompt file based on extension.
 */
export function isPromptFile(filename: string): boolean {
  return filename.endsWith('.prompt');
}

/**
 * Generate the import statements for built-in components.
 * Lists are computed lazily from actual component exports.
 */
function generateImports(): string {
  const builtinComponents = getBuiltinComponents();
  const askComponents = getAskComponents();
  const askShorthand = getAskShorthand();

  const lines: string[] = [];

  // Main components import
  lines.push('import {');
  lines.push(`  ${builtinComponents.join(',\n  ')},`);
  lines.push('} from \'@pupt/lib\';');
  lines.push('');

  // Ask components import (including namespace)
  lines.push('import {');
  lines.push(`  ${askComponents.join(',\n  ')},`);
  lines.push('} from \'@pupt/lib\';');
  lines.push('');

  // Create shorthand aliases
  const aliases = Object.entries(askShorthand)
    .map(([short, full]) => `const ${short} = ${full};`)
    .join('\n');
  lines.push(aliases);

  return lines.join('\n');
}

/**
 * Preprocess source code for .prompt files.
 *
 * .prompt files always receive:
 * - Import injection for all built-in components
 * - Fragment wrapping around the content (so the uses-to-import Babel plugin
 *   can find and transform any <Uses> elements within the JSX tree)
 * - Export default wrapping
 *
 * Non-.prompt files are returned unchanged.
 *
 * @param source - Raw source code
 * @param options - Preprocessing options (must include filename)
 * @returns Preprocessed source code ready for Babel transformation
 */
export function preprocessSource(source: string, options: PreprocessOptions): string {
  const { filename } = options;

  if (!isPromptFile(filename)) {
    return source;
  }

  const imports = generateImports();

  // Wrap the entire content in a Fragment. The uses-to-import Babel plugin
  // visits all JSXElement nodes in the tree, so <Uses> elements anywhere
  // in the JSX will be found, transformed into imports, and removed.
  // The Fragment wrapper ensures that multiple top-level elements (including
  // <Uses> elements) are valid JSX.
  const result = `export default (\n<>\n${source}\n</>\n);`;

  return `// Preprocessed from: ${filename}\n${imports}\n\n${result}`;
}
