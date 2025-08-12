import { cosmiconfig } from 'cosmiconfig';
import { Config, DEFAULT_CONFIG } from '../types/config.js';
import path from 'path';
import os from 'os';
import { getHomePath } from '../utils/platform.js';

export class ConfigManager {
  private static getExplorer() {
    return cosmiconfig('pt', {
      searchPlaces: [
        '.ptrc',
        '.ptrc.json',
        '.ptrc.yaml',
        '.ptrc.yml',
        '.ptrc.js',
        '.ptrc.cjs',
        'pt.config.js',
      ],
    });
  }

  static async load(startDir?: string): Promise<Config> {
    const searchFrom = startDir || process.cwd();
    const explorer = this.getExplorer();

    // Use cosmiconfig's search which handles the directory traversal
    const result = await explorer.search(searchFrom);

    if (!result || !result.config) {
      return this.expandPaths({ ...DEFAULT_CONFIG });
    }

    // Collect all configs in the hierarchy
    const configs: Config[] = [];

    // Add the found config
    configs.push(result.config);

    // Check if we should search parent directories
    const currentDir = path.dirname(result.filepath);
    const parentDir = path.dirname(currentDir);

    // Search parent directories if not at root
    if (parentDir !== currentDir) {
      const parentResult = await explorer.search(parentDir);
      if (parentResult && parentResult.config) {
        configs.unshift(parentResult.config);
      }
    }

    // Also check home directory
    const homeDir = os.homedir();
    if (currentDir !== homeDir && parentDir !== homeDir) {
      const homeResult = await explorer.search(homeDir);
      if (homeResult && homeResult.config) {
        configs.unshift(homeResult.config);
      }
    }

    // Merge configs
    const merged = this.mergeConfigs(configs);

    // Expand paths
    return this.expandPaths(merged);
  }

  private static mergeConfigs(configs: Config[]): Config {
    const merged: Config = { promptDirs: [] };

    // Start with default config if no configs provided
    if (configs.length === 0) {
      return { ...DEFAULT_CONFIG };
    }

    for (const config of configs) {
      if (config.promptDirs) {
        merged.promptDirs = [...merged.promptDirs, ...config.promptDirs];
      }

      if (config.historyDir) {
        merged.historyDir = config.historyDir;
      }

      if (config.helpers) {
        merged.helpers = { ...merged.helpers, ...config.helpers };
      }
    }

    // Remove duplicates from promptDirs
    merged.promptDirs = [...new Set(merged.promptDirs)];

    // If no promptDirs were specified in any config, use default
    if (merged.promptDirs.length === 0) {
      merged.promptDirs = DEFAULT_CONFIG.promptDirs;
    }

    return merged;
  }

  private static expandPaths(config: Config): Config {
    const expanded = { ...config };

    // Expand prompt directories
    if (config.promptDirs) {
      expanded.promptDirs = config.promptDirs.map(dir => this.expandPath(dir));
    }

    // Expand history directory
    if (config.historyDir) {
      expanded.historyDir = this.expandPath(config.historyDir);
    }

    // Expand helper paths
    if (config.helpers) {
      expanded.helpers = {};
      for (const [name, helper] of Object.entries(config.helpers)) {
        expanded.helpers[name] = { ...helper };
        if (helper.type === 'file' && helper.path) {
          expanded.helpers[name].path = this.expandPath(helper.path);
        }
      }
    }

    return expanded;
  }

  private static expandPath(filepath: string): string {
    if (filepath.startsWith('~/')) {
      return path.join(getHomePath(), filepath.slice(2));
    }
    return path.resolve(filepath);
  }
}
