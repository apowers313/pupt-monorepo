import { Transformer } from './services/transformer';
import type { PuptElement } from './types';
import { jsx, jsxs, Fragment } from './jsx-runtime';

// Import all registered components so they're available during evaluation
import {
  Prompt,
  Section,
  Role,
  Task,
  Context,
  Constraint,
  Format,
  Audience,
  Tone,
  SuccessCriteria,
  Criterion,
} from './components/structural';

import {
  UUID,
  Timestamp,
  DateTime,
  Hostname,
  Username,
  Cwd,
} from './components/utility';

import { Uses } from './components/meta';

import {
  AskOption,
  AskLabel,
  AskText,
  AskNumber,
  AskSelect,
  AskConfirm,
  AskEditor,
  AskMultiSelect,
  AskFile,
  AskPath,
  AskDate,
  AskSecret,
  AskChoice,
  AskRating,
  AskReviewFile,
} from './components/ask';

import { If } from './components/control/If';
import { ForEach } from './components/control/ForEach';

import { Example, Examples, ExampleInput, ExampleOutput } from './components/examples';

import { Steps, Step } from './components/reasoning';

import { Code, Data, File, Json, Xml } from './components/data';

import { PostExecution, ReviewFile, OpenUrl, RunCommand } from './components/post-execution';

// Create Ask namespace object for Ask.Text, Ask.Select, etc.
const Ask = {
  Text: AskText,
  Number: AskNumber,
  Select: AskSelect,
  Confirm: AskConfirm,
  Editor: AskEditor,
  MultiSelect: AskMultiSelect,
  File: AskFile,
  Path: AskPath,
  Date: AskDate,
  Secret: AskSecret,
  Choice: AskChoice,
  Rating: AskRating,
  ReviewFile: AskReviewFile,
};

export interface CreatePromptOptions {
  /** Additional scope variables available during evaluation */
  scope?: Record<string, unknown>;
}

/**
 * Evaluate transformed code and extract the default export.
 * This creates a sandboxed environment with the JSX runtime available.
 *
 * @param code - Transformed JavaScript code
 * @param filename - Original filename for error messages
 * @param scope - Additional scope variables
 * @returns The default export (expected to be a PuptElement)
 */
function evaluateModule(
  code: string,
  filename: string,
  scope: Record<string, unknown> = {},
): PuptElement {
  // Create module-like environment
  const moduleExports: { default?: PuptElement } = {};

  // Create evaluation context with jsx runtime and all registered components
  // Babel transforms JSX to use _jsx, _jsxs, _Fragment (with underscore prefix)
  // Components are needed so jsx(Prompt, ...) can access Prompt.name
  const evalContext: Record<string, unknown> = {
    // JSX runtime (both prefixed and non-prefixed)
    jsx,
    jsxs,
    Fragment,
    _jsx: jsx,
    _jsxs: jsxs,
    _Fragment: Fragment,

    // Module exports
    exports: moduleExports,

    // Structural components
    Prompt,
    Section,
    Role,
    Task,
    Context,
    Constraint,
    Format,
    Audience,
    Tone,
    SuccessCriteria,
    Criterion,

    // Utility components
    UUID,
    Timestamp,
    DateTime,
    Hostname,
    Username,
    Cwd,

    // Meta components
    Uses,

    // Ask namespace and individual components
    Ask,
    Option: AskOption,
    Label: AskLabel,
    Text: AskText,
    Select: AskSelect,
    Confirm: AskConfirm,
    Editor: AskEditor,
    MultiSelect: AskMultiSelect,
    Path: AskPath,
    Secret: AskSecret,
    Choice: AskChoice,
    Rating: AskRating,

    // Control flow
    If,
    ForEach,

    // Examples
    Example,
    Examples,
    ExampleInput,
    ExampleOutput,

    // Reasoning
    Steps,
    Step,

    // Data
    Code,
    Data,
    File,
    Json,
    Xml,

    // Post-execution
    PostExecution,
    ReviewFile,
    OpenUrl,
    RunCommand,

    // User-provided scope (can override defaults)
    ...scope,
  };

  // Build the function arguments and values
  const contextKeys = Object.keys(evalContext);
  const contextValues = Object.values(evalContext);

  // Process the transformed code:
  // 1. Remove import statements (we provide jsx runtime in scope)
  // 2. Convert export default to exports.default =
  const processedCode = code
    // Remove jsx-runtime import (Babel generates: import { jsx as _jsx } from "pupt-lib/jsx-runtime")
    .replace(/import\s*\{[^}]*\}\s*from\s*["']pupt-lib\/jsx-runtime["'];?/g, '')
    .replace(/import\s*\{[^}]*\}\s*from\s*["']pupt-lib["'];?/g, '')
    // Convert export default to exports.default =
    .replace(/export\s+default\s+/g, 'exports.default = ');

  try {
     
    const evalFn = new Function(...contextKeys, processedCode);
    evalFn(...contextValues);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to evaluate ${filename}: ${message}`);
  }

  if (!moduleExports.default) {
    throw new Error(`${filename} must have a default export`);
  }

  return moduleExports.default;
}

/**
 * Create a PuptElement from a TSX source string.
 * Transforms the JSX and evaluates it to produce an element tree.
 *
 * @param source - TSX source code
 * @param filename - Filename for error messages and source maps
 * @param options - Optional configuration
 * @returns The default export as a PuptElement
 *
 * @example
 * ```typescript
 * const source = `
 *   export default (
 *     <Prompt name="test">
 *       <Role>Assistant</Role>
 *     </Prompt>
 *   );
 * `;
 * const element = await createPromptFromSource(source, 'test.tsx');
 * ```
 */
export async function createPromptFromSource(
  source: string,
  filename: string,
  options: CreatePromptOptions = {},
): Promise<PuptElement> {
  // Auto-wrap raw JSX that doesn't have export default
  let processedSource = source;
  if (!source.includes('export default')) {
    processedSource = `export default (\n${source}\n);`;
  }

  const transformer = new Transformer();
  // Use async transform to support both Node.js and browser environments
  const code = await transformer.transformSourceAsync(processedSource, filename);

  return evaluateModule(code, filename, options.scope);
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
