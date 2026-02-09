/**
 * Preprocessor for .prompt files.
 * Injects imports for built-in components and wraps raw JSX with export default.
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
 * Check if source code needs import injection.
 * Returns true if the source has no import statements.
 * The presence/absence of export default is handled separately.
 */
export function needsImportInjection(source: string): boolean {
  // Check for import statements - if present, user manages their own imports
  const hasImport = /^\s*import\s+/m.test(source);
  return !hasImport;
}

/**
 * Check if source code needs export default wrapper.
 * Returns true if there's no export default statement.
 */
export function needsExportWrapper(source: string): boolean {
  const hasExportDefault = /^\s*export\s+default\s+/m.test(source);
  return !hasExportDefault;
}

/**
 * Check if source code needs any preprocessing.
 * Returns true if the source needs import injection or export wrapper.
 * @deprecated Use needsImportInjection and needsExportWrapper instead
 */
export function needsPreprocessing(source: string): boolean {
  return needsImportInjection(source) || needsExportWrapper(source);
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
 * Preprocess source code for .prompt files and raw JSX.
 * Injects imports for built-in components if needed, and wraps with export default if needed.
 *
 * @param source - Raw source code
 * @param options - Preprocessing options
 * @returns Preprocessed source code ready for Babel transformation
 */
export function preprocessSource(source: string, options: PreprocessOptions): string {
  const { filename } = options;

  const injectImports = needsImportInjection(source);
  const wrapExport = needsExportWrapper(source);

  // If neither is needed, return as-is
  if (!injectImports && !wrapExport) {
    return source;
  }

  const imports = injectImports ? generateImports() : '';
  let result = source;

  if (wrapExport) {
    result = `export default (\n${source}\n);`;
  }

  if (injectImports) {
    result = `// Preprocessed from: ${filename}\n${imports}\n\n${result}`;
  }

  return result;
}
