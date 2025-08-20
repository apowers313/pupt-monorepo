export interface Config {
  promptDirs: string[];
  historyDir?: string;
  annotationDir?: string;
  defaultCmd?: string;
  defaultCmdArgs?: string[];
  defaultCmdOptions?: Record<string, string>;
  autoReview?: boolean;
  autoRun?: boolean;
  gitPromptDir?: string;
  handlebarsExtensions?: HandlebarsExtensionConfig[];
  version?: string;
  helpers?: Record<string, HelperConfig>;
  logLevel?: string;
  outputCapture?: OutputCaptureConfig;
  // Legacy fields for backward compatibility (will be migrated)
  codingTool?: string;
  codingToolArgs?: string[];
  codingToolOptions?: Record<string, string>;
}

export interface OutputCaptureConfig {
  enabled: boolean;
  directory?: string;
  maxSizeMB?: number;
  retentionDays?: number;
}

export interface HelperConfig {
  type: 'inline' | 'file';
  value?: string;
  path?: string;
}

export interface HandlebarsExtensionConfig {
  type: 'inline' | 'file';
  value?: string;
  path?: string;
}

export const DEFAULT_CONFIG: Partial<Config> = {
  autoReview: true,
  autoRun: false,
  gitPromptDir: '.git-prompts',
  handlebarsExtensions: [],
  version: '3.0.0'
};
