export interface HistoryEntry {
  timestamp: string;
  templatePath: string;
  templateContent: string;
  variables: Record<string, unknown>;
  finalPrompt: string;
  title?: string;
  summary?: string;
  filename: string;
  execution?: Record<string, unknown>;
  rerun?: string;
}

export interface EnhancedHistoryEntry extends HistoryEntry {
  environment?: {
    working_directory: string;
    git_commit?: string;
    git_branch?: string;
    git_dirty?: boolean;
    node_version?: string;
    os: string;
    shell?: string;
  };
  execution?: {
    start_time: string;
    end_time: string;
    duration: string;
    exit_code: number | null;
    command: string;
    output_file?: string;
    output_size?: number;
    active_time?: string; // Time excluding user input wait
    user_input_count?: number; // Number of user inputs during execution
  };
}