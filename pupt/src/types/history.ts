export interface HistoryEntry {
  timestamp: string;
  templatePath: string;
  templateContent: string;
  variables: Record<string, unknown>;
  finalPrompt: string;
  title?: string;
  summary?: string;
  filename: string;
}