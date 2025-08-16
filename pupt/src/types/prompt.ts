export interface Prompt {
  path: string; // Full path to file
  relativePath: string; // Path relative to prompt directory
  filename: string; // Just the filename
  title: string; // From frontmatter or filename
  labels: string[]; // From frontmatter
  content: string; // Markdown content without frontmatter
  frontmatter: Record<string, unknown>; // Raw frontmatter data
  variables?: VariableDefinition[];
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
