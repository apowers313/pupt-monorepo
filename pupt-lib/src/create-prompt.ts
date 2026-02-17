/**
 * Functions for creating PuptElements from source files.
 * Supports both .tsx files (with standard imports) and .prompt files (with auto-imports).
 */

import { Fragment } from './jsx-runtime';
import { evaluateModule } from './services/module-evaluator';
import { isPromptFile,preprocessSource } from './services/preprocessor';
import { Transformer, type TransformOptions } from './services/transformer';
import type { ComponentType, PuptElement } from './types';
import { CHILDREN,TYPE } from './types/symbols';

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
 *   import { Prompt, Role } from '@pupt/lib';
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
  const processedSource = preprocessSource(source, { filename });

  // If custom components are provided, inject them via globalThis.
  // The custom-component-injection Babel plugin handles inserting the
  // destructuring declaration at the AST level, avoiding regex-based
  // string matching that could be confused by import-like prompt content.
  if (components && Object.keys(components).length > 0) {
    globalThis[CUSTOM_COMPONENTS_GLOBAL] = components;
  }

  // Build extra plugins for the Babel transform
  const extraPlugins: TransformOptions['extraPlugins'] =
    components && Object.keys(components).length > 0
      ? [['custom-component-injection', {
        componentNames: Object.keys(components),
        globalKey: CUSTOM_COMPONENTS_GLOBAL,
      }]]
      : undefined;

  try {
    // Transform with Babel (TypeScript + JSX + Uses→import plugin + optional custom components)
    const transformer = new Transformer();
    const code = await transformer.transformSourceAsync(processedSource, filename, { extraPlugins });

    // Evaluate as ES module
    const module = await evaluateModule(code, { filename });

    if (module.default === undefined) {
      throw new Error(`${filename} must have a default export`);
    }

    let element = module.default as PuptElement;

    // The preprocessor wraps .prompt file content in a Fragment (<>...</>)
    // to allow multiple top-level elements (including <Uses>). After the
    // uses-to-import plugin removes <Uses> elements, the Fragment may
    // contain a single child — unwrap it to preserve the expected element
    // tree structure (e.g., Prompt at the root, not Fragment > Prompt).
    if (isPromptFile(filename) && element && element[TYPE] === Fragment) {
      const children = element[CHILDREN];
      // Filter out whitespace-only text nodes that come from newlines
      // between the Fragment tags and the actual content
      const meaningful = children.filter(
        child => !(typeof child === 'string' && child.trim() === ''),
      );
      if (meaningful.length === 1) {
        element = meaningful[0] as PuptElement;
      }
    }

    return element;
  } finally {
    // Clean up the global registry
    if (components) {
      Reflect.deleteProperty(globalThis, CUSTOM_COMPONENTS_GLOBAL);
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
