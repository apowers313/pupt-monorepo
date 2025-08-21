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
  autoAnnotate?: AutoAnnotateConfig;
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

export interface AutoAnnotateConfig {
  enabled: boolean;
  triggers: string[];
  analysisPrompt: string;
  fallbackRules: FallbackRule[];
}

export interface FallbackRule {
  pattern: string;
  category: 'verification_gap' | 'incomplete_task' | 'ambiguous_instruction' | 'missing_constraint';
  severity: 'low' | 'medium' | 'high' | 'critical';
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
