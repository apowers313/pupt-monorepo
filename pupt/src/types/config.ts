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
  // Legacy fields for backward compatibility (will be migrated)
  codingTool?: string;
  codingToolArgs?: string[];
  codingToolOptions?: Record<string, string>;
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
  defaultCmd: 'claude',
  defaultCmdArgs: [],
  defaultCmdOptions: {
    'Continue with last context?': '--continue'
  },
  autoReview: true,
  autoRun: false,
  gitPromptDir: '.git-prompts',
  handlebarsExtensions: [],
  version: '3.0.0'
};
