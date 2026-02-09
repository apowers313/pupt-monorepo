import type { SearchablePrompt } from "pupt-react";
import { EXAMPLES, type ExampleFormat } from "./examples";

/**
 * Metadata for built-in prompts that maps name -> source/format for editor loading
 */
export interface BuiltinPromptMeta {
  source: string;
  format: ExampleFormat;
}

/**
 * Convert EXAMPLES to SearchablePrompt[] for indexing in the search engine.
 */
export const BUILTIN_PROMPTS: SearchablePrompt[] = EXAMPLES.map((example) => ({
  name: example.name,
  description: example.description,
  tags: [example.format],
  library: "built-in",
}));

/**
 * Map of prompt name -> source/format for loading into the editor.
 */
export const BUILTIN_PROMPT_META = new Map<string, BuiltinPromptMeta>(
  EXAMPLES.map((example) => [
    example.name,
    { source: example.source, format: example.format },
  ])
);
