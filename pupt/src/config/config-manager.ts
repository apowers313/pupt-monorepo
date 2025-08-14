import { cosmiconfig } from 'cosmiconfig';
import { Config, DEFAULT_CONFIG } from '../types/config.js';
import path from 'path';
import os from 'os';
import { getHomePath } from '../utils/platform.js';
import fs from 'fs-extra';
import { errors } from '../utils/errors.js';

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
      // Create default config with all defaults
      const defaultConfig: Config = {
        promptDirs: [path.join(os.homedir(), '.pt/prompts')],
        ...DEFAULT_CONFIG
      };
      return this.expandPaths(defaultConfig);
    }

    // Validate the loaded config
    this.validateConfig(result.config);

    // Check if migration is needed
    const migrated = await this.migrateConfig(result.config, result.filepath);

    // Collect all configs in the hierarchy
    const configs: Config[] = [];

    // Add the found config
    configs.push(migrated);

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

  private static validateConfig(config: unknown): void {
    const cfg = config as Record<string, unknown>;
    
    // Validate historyDir
    if (cfg.historyDir !== undefined && typeof cfg.historyDir !== 'string') {
      throw errors.invalidConfig('historyDir', 'a string path', cfg.historyDir);
    }

    // Validate annotationDir
    if (cfg.annotationDir !== undefined && typeof cfg.annotationDir !== 'string') {
      throw errors.invalidConfig('annotationDir', 'a string path', cfg.annotationDir);
    }

    // Validate codingTool
    if (cfg.codingTool !== undefined && typeof cfg.codingTool !== 'string') {
      throw errors.invalidConfig('codingTool', 'a string', cfg.codingTool);
    }

    // Validate codingToolArgs
    if (cfg.codingToolArgs !== undefined && !Array.isArray(cfg.codingToolArgs)) {
      throw errors.invalidConfig('codingToolArgs', 'an array of strings', cfg.codingToolArgs);
    }

    // Validate codingToolOptions
    if (cfg.codingToolOptions !== undefined && 
        (typeof cfg.codingToolOptions !== 'object' || Array.isArray(cfg.codingToolOptions))) {
      throw errors.invalidConfig('codingToolOptions', 'an object', cfg.codingToolOptions);
    }
  }

  private static async migrateConfig(config: unknown, filepath: string): Promise<Config> {
    const cfg = config as Partial<Config>;
    
    // Check if migration is needed
    if (!cfg.version || cfg.version !== '2.0.0') {
      // Migrate to version 2.0.0
      const migrated: Config = {
        ...cfg,
        ...DEFAULT_CONFIG,
        // Preserve existing values
        promptDirs: cfg.promptDirs || [path.join(os.homedir(), '.pt/prompts')],
        historyDir: cfg.historyDir,
        annotationDir: cfg.annotationDir,
        helpers: cfg.helpers,
        // Override with existing values if present
        codingTool: cfg.codingTool || DEFAULT_CONFIG.codingTool,
        codingToolArgs: cfg.codingToolArgs || DEFAULT_CONFIG.codingToolArgs,
        codingToolOptions: cfg.codingToolOptions || DEFAULT_CONFIG.codingToolOptions,
        version: '2.0.0'
      };

      // Save migrated config back to disk
      if (filepath.endsWith('.json')) {
        await fs.writeJson(filepath, migrated, { spaces: 2 });
      }

      return migrated;
    }

    return cfg as Config;
  }

  private static mergeConfigs(configs: Config[]): Config {
    const merged: Config = { promptDirs: [] };

    // Start with default config if no configs provided
    if (configs.length === 0) {
      return { 
        promptDirs: [path.join(os.homedir(), '.pt/prompts')],
        ...DEFAULT_CONFIG 
      };
    }

    for (const config of configs) {
      if (config.promptDirs) {
        merged.promptDirs = [...merged.promptDirs, ...config.promptDirs];
      }

      if (config.historyDir) {
        merged.historyDir = config.historyDir;
      }

      if (config.annotationDir) {
        merged.annotationDir = config.annotationDir;
      }

      if (config.codingTool) {
        merged.codingTool = config.codingTool;
      }

      if (config.codingToolArgs) {
        merged.codingToolArgs = config.codingToolArgs;
      }

      if (config.codingToolOptions) {
        merged.codingToolOptions = config.codingToolOptions;
      }

      if (config.version) {
        merged.version = config.version;
      }

      if (config.helpers) {
        merged.helpers = { ...merged.helpers, ...config.helpers };
      }
    }

    // Remove duplicates from promptDirs
    merged.promptDirs = [...new Set(merged.promptDirs)];

    // If no promptDirs were specified in any config, use default
    if (merged.promptDirs.length === 0) {
      merged.promptDirs = [path.join(os.homedir(), '.pt/prompts')];
    }

    // Apply defaults for new fields if not present
    if (!merged.codingTool && DEFAULT_CONFIG.codingTool) {
      merged.codingTool = DEFAULT_CONFIG.codingTool;
    }
    if (!merged.codingToolArgs && DEFAULT_CONFIG.codingToolArgs) {
      merged.codingToolArgs = DEFAULT_CONFIG.codingToolArgs;
    }
    if (!merged.codingToolOptions && DEFAULT_CONFIG.codingToolOptions) {
      merged.codingToolOptions = DEFAULT_CONFIG.codingToolOptions;
    }
    if (!merged.version && DEFAULT_CONFIG.version) {
      merged.version = DEFAULT_CONFIG.version;
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

    // Expand annotation directory
    if (config.annotationDir) {
      expanded.annotationDir = this.expandPath(config.annotationDir);
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
