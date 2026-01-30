/**
 * Functions for creating PuptElements from source files.
 * Supports both .tsx files (with standard imports) and .prompt files (with auto-imports).
 */

import { Transformer } from './services/transformer';
import { evaluateModule } from './services/module-evaluator';
import { preprocessSource } from './services/preprocessor';
import type { PuptElement } from './types';

export type CreatePromptOptions = Record<string, never>;

/**
 * Create a PuptElement from a TSX source string.
 * Transforms the JSX and evaluates it to produce an element tree.
 *
 * For .prompt files or raw JSX without imports, built-in component imports
 * are automatically injected.
 *
 * For .tsx files with imports, the source is used as-is.
 *
 * @param source - TSX source code
 * @param filename - Filename for error messages and source maps
 * @param _options - Optional configuration (reserved for future use)
 * @returns The default export as a PuptElement
 *
 * @example
 * ```typescript
 * // .tsx file with imports
 * const source = `
 *   import { Prompt, Role } from 'pupt-lib';
 *   export default (
 *     <Prompt name="test">
 *       <Role>Assistant</Role>
 *     </Prompt>
 *   );
 * `;
 * const element = await createPromptFromSource(source, 'test.tsx');
 * ```
 *
 * @example
 * ```typescript
 * // .prompt file (auto-imports built-in components)
 * const source = `
 *   <Prompt name="test">
 *     <Role>Assistant</Role>
 *   </Prompt>
 * `;
 * const element = await createPromptFromSource(source, 'test.prompt');
 * ```
 */
export async function createPromptFromSource(
  source: string,
  filename: string,
  _options: CreatePromptOptions = {},
): Promise<PuptElement> {
  // Preprocess to inject imports and/or export default if needed
  // preprocessSource is smart enough to return source unchanged if no preprocessing needed
  const processedSource = preprocessSource(source, { filename });

  // Transform with Babel (TypeScript + JSX + Uses→import plugin)
  const transformer = new Transformer();
  const code = await transformer.transformSourceAsync(processedSource, filename);

  // Evaluate as ES module
  const module = await evaluateModule(code, { filename });

  if (module.default === undefined) {
    throw new Error(`${filename} must have a default export`);
  }

  return module.default as PuptElement;
}

/**
 * Create a PuptElement by loading and transforming a TSX file.
 * Reads the file, transforms the JSX, and evaluates it.
 *
 * @param filePath - Path to the TSX file
 * @param options - Optional configuration
 * @returns The default export as a PuptElement
 *
 * @example
 * ```typescript
 * const element = await createPrompt('./prompts/greeting.tsx');
 * const result = render(element, { inputs: { name: 'World' } });
 * ```
 */
export async function createPrompt(
  filePath: string,
  options: CreatePromptOptions = {},
): Promise<PuptElement> {
  const { readFile } = await import('fs/promises');
  const source = await readFile(filePath, 'utf-8');

  return createPromptFromSource(source, filePath, options);
}
