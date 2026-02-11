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
  getBuiltinComponents,
  getAskComponents,
  getAskShorthand,
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
  lines.push('} from \'pupt-lib\';');
  lines.push('');

  // Ask components import (including namespace)
  lines.push('import {');
  lines.push(`  ${askComponents.join(',\n  ')},`);
  lines.push('} from \'pupt-lib\';');
  lines.push('');

  // Create shorthand aliases
  const aliases = Object.entries(askShorthand)
    .map(([short, full]) => `const ${short} = ${full};`)
    .join('\n');
  lines.push(aliases);

  return lines.join('\n');
}

/**
 * Extract <Uses> elements from source so they can be placed at module level.
 *
 * <Uses> is a framework construct that the babel plugin transforms into import
 * declarations. It must appear at the module level (not inside an expression),
 * so we extract it before wrapping the rest with export default.
 */
function extractUses(source: string): { uses: string[]; remaining: string } {
  const uses: string[] = [];
  const remaining = source.replace(/^\s*<Uses\s[^>]*\/>\s*$/gm, (match) => {
    uses.push(match.trim());
    return '';
  });
  return { uses, remaining };
}

/**
 * Preprocess source code for .prompt files.
 *
 * .prompt files always receive:
 * - Import injection for all built-in components
 * - Extraction of <Uses> elements to module level (for the babel plugin)
 * - Export default wrapping around the remaining JSX content
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

  // Extract <Uses> elements — they must remain at module level for the
  // uses-to-import babel plugin to transform them into import declarations
  const { uses, remaining } = extractUses(source);
  const usesSection = uses.length > 0 ? uses.join('\n') + '\n\n' : '';

  const result = `export default (\n${remaining}\n);`;

  return `// Preprocessed from: ${filename}\n${imports}\n\n${usesSection}${result}`;
}
