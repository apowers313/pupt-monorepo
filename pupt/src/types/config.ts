export interface Config {
  promptDirs: string[];
  historyDir?: string;
  annotationDir?: string;
  codingTool?: string;
  codingToolArgs?: string[];
  codingToolOptions?: Record<string, string>;
  version?: string;
  helpers?: Record<string, HelperConfig>;
}

export interface HelperConfig {
  type: 'inline' | 'file';
  value?: string;
  path?: string;
}

export const DEFAULT_CONFIG: Partial<Config> = {
  codingTool: 'claude',
  codingToolArgs: [],
  codingToolOptions: {
    'Continue with last context?': '--continue'
  },
  version: '2.0.0'
};
