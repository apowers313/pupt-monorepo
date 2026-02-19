import path from 'node:path';

export interface Prompt {
  path: string; // Full path to file
  relativePath: string; // Path relative to prompt directory
  filename: string; // Just the filename
  title: string; // From frontmatter or filename
  tags: string[]; // From frontmatter
  content: string; // Markdown content without frontmatter, or description for JSX prompts
  frontmatter: Record<string, unknown>; // Raw frontmatter data (empty for JSX prompts)
  variables?: VariableDefinition[];
  summary?: string; // Summary from frontmatter for history display
  _source?: import('@pupt/lib').DiscoveredPromptWithMethods; // Original pupt-lib prompt (for JSX prompts)
}

export interface VariableDefinition {
  name: string;
  type: 'input' | 'select' | 'multiselect' | 'editor' | 'confirm' | 'password' | 'file' | 'reviewFile';
  message?: string;
  default?: unknown;
  choices?: string[];
  validate?: string;
  basePath?: string;
  filter?: string;
  autoReview?: boolean;
}

/**
 * Convert a pupt-lib DiscoveredPromptWithMethods to pupt's Prompt interface.
 * This adapter allows the JSX-based prompts to work with existing search/UI code.
 */
export function fromDiscoveredPrompt(
  dp: import('@pupt/lib').DiscoveredPromptWithMethods,
  filePath?: string,
  baseDir?: string,
): Prompt {
  const resolvedPath = filePath || dp.name;
  const relativePath = (filePath && baseDir)
    ? path.relative(baseDir, filePath)
    : resolvedPath;
  const filename = path.basename(resolvedPath);

  return {
    path: resolvedPath,
    relativePath,
    filename,
    title: dp.title || dp.description || dp.name, // Use human-friendly title, fall back to description then name
    tags: dp.tags,
    content: dp.description,
    frontmatter: {},
    summary: dp.description,
    _source: dp,
  };
}
