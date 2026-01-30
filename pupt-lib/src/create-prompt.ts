/**
 * Functions for creating PuptElements from source files.
 * Supports both .tsx files (with standard imports) and .prompt files (with auto-imports).
 */

import { Transformer } from './services/transformer';
import { evaluateModule } from './services/module-evaluator';
import { preprocessSource } from './services/preprocessor';
import type { PuptElement, ComponentType } from './types';

/**
 * Custom component registration for browser environments.
 *
 * In browser environments, dynamically evaluated code can only import from URLs
 * that the import map knows about. For custom components that aren't published
 * to npm, you can pass them here and reference them by name in your source.
 *
 * @example
 * ```typescript
 * const element = await createPromptFromSource(source, 'test.prompt', {
 *   components: {
 *     MyHeader: MyHeaderComponent,
 *     CustomCard: CustomCardComponent,
 *   }
 * });
 * ```
 *
 * Then in your source:
 * ```tsx
 * <Prompt name="test">
 *   <MyHeader>Title</MyHeader>
 *   <CustomCard>Content</CustomCard>
 * </Prompt>
 * ```
 */
export interface CreatePromptOptions {
  /**
   * Custom components to make available in the evaluated source.
   * Keys are component names, values are component classes.
   *
   * In browser environments, this is the primary way to use custom components
   * that aren't published to npm.
   */
  components?: Record<string, ComponentType>;
}

/**
 * Global key used for injecting custom components.
 * @internal
 */
export const CUSTOM_COMPONENTS_GLOBAL = '__PUPT_CUSTOM_COMPONENTS__';

/**
 * Declare the global type for TypeScript
 */
declare global {
  var __PUPT_CUSTOM_COMPONENTS__: Record<string, ComponentType> | undefined;
}

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
 * @param options - Optional configuration
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
 *
 * @example
 * ```typescript
 * // Using custom components in browser environments
 * const source = `
 *   <Prompt name="test">
 *     <MyCustomHeader>Welcome</MyCustomHeader>
 *   </Prompt>
 * `;
 * const element = await createPromptFromSource(source, 'test.prompt', {
 *   components: {
 *     MyCustomHeader: MyCustomHeaderComponent,
 *   }
 * });
 * ```
 */
export async function createPromptFromSource(
  source: string,
  filename: string,
  options: CreatePromptOptions = {},
): Promise<PuptElement> {
  const { components } = options;

  // Preprocess to inject imports and/or export default if needed
  // preprocessSource is smart enough to return source unchanged if no preprocessing needed
  let processedSource = preprocessSource(source, { filename });

  // If custom components are provided, inject them via globalThis
  // This is primarily for browser environments where custom components
  // can't be imported via the module system
  if (components && Object.keys(components).length > 0) {
    // Set up the global registry
    globalThis[CUSTOM_COMPONENTS_GLOBAL] = components;

    // Inject code to extract custom components from globalThis
    const componentNames = Object.keys(components);
    const extractCode = `const { ${componentNames.join(', ')} } = globalThis.${CUSTOM_COMPONENTS_GLOBAL};\n`;

    // Find the end of all import statements
    // We need to handle multi-line imports like:
    // import {
    //   Foo,
    //   Bar,
    // } from 'package';
    let lastImportEnd = 0;

    // Match complete import statements including multi-line ones
    // Import pattern: import ... from '...' or import '...'
    const fullImportRegex = /import\s+(?:(?:\{[^}]*\}|[^;{]*)\s+from\s+)?['"][^'"]+['"];?/g;
    let match;
    while ((match = fullImportRegex.exec(processedSource)) !== null) {
      const matchEnd = match.index + match[0].length;
      if (matchEnd > lastImportEnd) {
        lastImportEnd = matchEnd;
      }
    }

    if (lastImportEnd > 0) {
      // Insert after imports
      processedSource = processedSource.slice(0, lastImportEnd) + '\n' + extractCode + processedSource.slice(lastImportEnd);
    } else {
      // No imports, prepend at the beginning
      processedSource = extractCode + processedSource;
    }
  }

  try {
    // Transform with Babel (TypeScript + JSX + Uses→import plugin)
    const transformer = new Transformer();
    const code = await transformer.transformSourceAsync(processedSource, filename);

    // Evaluate as ES module
    const module = await evaluateModule(code, { filename });

    if (module.default === undefined) {
      throw new Error(`${filename} must have a default export`);
    }

    return module.default as PuptElement;
  } finally {
    // Clean up the global registry
    if (components) {
      delete globalThis[CUSTOM_COMPONENTS_GLOBAL];
    }
  }
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
