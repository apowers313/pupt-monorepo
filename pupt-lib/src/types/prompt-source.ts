/** A raw .prompt file discovered from a source */
export interface DiscoveredPromptFile {
  filename: string;   // e.g., "code-review.prompt"
  content: string;    // raw .prompt file source
}

/** Interface for all prompt discovery backends */
export interface PromptSource {
  getPrompts(): Promise<DiscoveredPromptFile[]>;
}

/** Type guard to check if a value implements the PromptSource interface */
export function isPromptSource(value: unknown): value is PromptSource {
  return (
    value !== null &&
    typeof value === 'object' &&
    'getPrompts' in value &&
    typeof (value as PromptSource).getPrompts === 'function'
  );
}
