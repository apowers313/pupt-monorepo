import type { SearchablePrompt } from "pupt-react";
import { transformSource, PROPS } from "pupt-react";
import { EXAMPLES, type ExampleFormat } from "./examples";
import { wrapJsx } from "../util/jsxWrapper";

/**
 * Metadata for built-in prompts that maps name -> source/format for editor loading
 */
export interface BuiltinPromptMeta {
  title: string;
  source: string;
  format: ExampleFormat;
}

export interface ParsedBuiltinPrompts {
  prompts: SearchablePrompt[];
  meta: Map<string, BuiltinPromptMeta>;
}

/**
 * Parse all built-in example sources to extract prompt metadata (name, description, tags).
 * Uses the same pattern as pupt CLI: parse source -> read element[PROPS].
 */
export async function parseBuiltinPrompts(): Promise<ParsedBuiltinPrompts> {
  const prompts: SearchablePrompt[] = [];
  const meta = new Map<string, BuiltinPromptMeta>();

  const results = await Promise.all(
    EXAMPLES.map(async (example) => {
      const filename = example.format === "jsx" ? "prompt.tsx" : "prompt.prompt";

      // JSX sources stored without wrapping need to be wrapped for parsing
      const sourceForParsing = example.format === "jsx" && !example.source.includes("export default")
        ? wrapJsx(example.source)
        : example.source;

      const element = await transformSource(sourceForParsing, { filename });
      const props = element[PROPS] as Record<string, unknown>;

      const name = (props.name as string) || "untitled";
      const title = (props.title as string) || name;
      const description = (props.description as string) || "";
      const tags = Array.isArray(props.tags) ? (props.tags as string[]) : [];

      return { name, title, description, tags, source: example.source, format: example.format };
    })
  );

  for (const r of results) {
    prompts.push({
      name: r.name,
      description: r.description,
      tags: r.tags,
      library: "built-in",
    });
    meta.set(r.name, { title: r.title, source: r.source, format: r.format });
  }

  return { prompts, meta };
}
