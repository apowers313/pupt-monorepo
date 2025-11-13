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

interface OutputCaptureConfig {
  enabled: boolean;
  directory?: string;
  maxSizeMB?: number;
  retentionDays?: number;
}

interface AutoAnnotateConfig {
  enabled: boolean;
  triggers?: string[];
  analysisPrompt: string;
}

interface HelperConfig {
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
  version: '4.0.0',
  outputCapture: {
    enabled: false,
    directory: '.pt-output',
    maxSizeMB: 50,
    retentionDays: 30
  },
  autoAnnotate: {
    enabled: false,
    triggers: ['claude', 'ai', 'assistant'],
    analysisPrompt: 'analyze-execution'
  }
};
