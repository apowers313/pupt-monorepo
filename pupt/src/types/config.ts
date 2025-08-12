export interface Config {
  promptDirs: string[];
  historyDir?: string;
  helpers?: Record<string, HelperConfig>;
}

export interface HelperConfig {
  type: 'inline' | 'file';
  value?: string;
  path?: string;
}

export const DEFAULT_CONFIG: Config = {
  promptDirs: ['./prompts'],
};
