import { cosmiconfig } from 'cosmiconfig';
import { Config, DEFAULT_CONFIG } from '../types/config.js';
import path from 'path';
import os from 'os';
import { getHomePath } from '../utils/platform.js';
import fs from 'fs-extra';
import { errors } from '../utils/errors.js';
import { migrateConfig } from './migration.js';

export interface ConfigResult {
  config: Config;
  filepath?: string;
}

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
    const result = await this.loadWithPath(startDir);
    return result.config;
  }

  static async loadWithPath(startDir?: string): Promise<ConfigResult> {
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
      return {
        config: this.expandPaths(defaultConfig),
        filepath: undefined
      };
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
    return {
      config: this.expandPaths(merged),
      filepath: result.filepath
    };
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

    // Validate defaultCmd (and legacy codingTool)
    if (cfg.defaultCmd !== undefined && typeof cfg.defaultCmd !== 'string') {
      throw errors.invalidConfig('defaultCmd', 'a string', cfg.defaultCmd);
    }
    if (cfg.codingTool !== undefined && typeof cfg.codingTool !== 'string') {
      throw errors.invalidConfig('codingTool', 'a string', cfg.codingTool);
    }

    // Validate defaultCmdArgs (and legacy codingToolArgs)
    if (cfg.defaultCmdArgs !== undefined && !Array.isArray(cfg.defaultCmdArgs)) {
      throw errors.invalidConfig('defaultCmdArgs', 'an array of strings', cfg.defaultCmdArgs);
    }
    if (cfg.codingToolArgs !== undefined && !Array.isArray(cfg.codingToolArgs)) {
      throw errors.invalidConfig('codingToolArgs', 'an array of strings', cfg.codingToolArgs);
    }

    // Validate defaultCmdOptions (and legacy codingToolOptions)
    if (cfg.defaultCmdOptions !== undefined && 
        (typeof cfg.defaultCmdOptions !== 'object' || Array.isArray(cfg.defaultCmdOptions))) {
      throw errors.invalidConfig('defaultCmdOptions', 'an object', cfg.defaultCmdOptions);
    }
    if (cfg.codingToolOptions !== undefined && 
        (typeof cfg.codingToolOptions !== 'object' || Array.isArray(cfg.codingToolOptions))) {
      throw errors.invalidConfig('codingToolOptions', 'an object', cfg.codingToolOptions);
    }

    // Validate new fields
    if (cfg.autoReview !== undefined && typeof cfg.autoReview !== 'boolean') {
      throw errors.invalidConfig('autoReview', 'a boolean', cfg.autoReview);
    }

    if (cfg.autoRun !== undefined && typeof cfg.autoRun !== 'boolean') {
      throw errors.invalidConfig('autoRun', 'a boolean', cfg.autoRun);
    }

    if (cfg.gitPromptDir !== undefined && typeof cfg.gitPromptDir !== 'string') {
      throw errors.invalidConfig('gitPromptDir', 'a string path', cfg.gitPromptDir);
    }

    if (cfg.handlebarsExtensions !== undefined && !Array.isArray(cfg.handlebarsExtensions)) {
      throw errors.invalidConfig('handlebarsExtensions', 'an array', cfg.handlebarsExtensions);
    }

    // Validate handlebarsExtensions items
    if (Array.isArray(cfg.handlebarsExtensions)) {
      for (const ext of cfg.handlebarsExtensions) {
        if (typeof ext !== 'object' || !ext || !['inline', 'file'].includes(ext.type)) {
          throw new Error("Configuration error: handlebarsExtension type must be 'inline' or 'file'");
        }
      }
    }
  }

  private static async migrateConfig(config: unknown, filepath: string): Promise<Config> {
    const cfg = config as Partial<Config>;
    
    // Check if migration is needed
    if (migrateConfig.needsMigration(cfg)) {
      // Create backup before migration
      if (filepath && await fs.pathExists(filepath)) {
        try {
          await migrateConfig.createBackup(filepath);
        } catch (error) {
          // Backup failed, but continue with migration
          console.warn(`Warning: Could not create backup of config file: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Apply migration
      const migrated = migrateConfig(cfg);

      // Save migrated config back to disk
      if (filepath && filepath.endsWith('.json')) {
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

      // Merge new field names
      if (config.defaultCmd) {
        merged.defaultCmd = config.defaultCmd;
      }

      if (config.defaultCmdArgs) {
        merged.defaultCmdArgs = config.defaultCmdArgs;
      }

      if (config.defaultCmdOptions) {
        merged.defaultCmdOptions = config.defaultCmdOptions;
      }

      if (config.autoReview !== undefined) {
        merged.autoReview = config.autoReview;
      }

      if (config.autoRun !== undefined) {
        merged.autoRun = config.autoRun;
      }

      if (config.gitPromptDir) {
        merged.gitPromptDir = config.gitPromptDir;
      }

      if (config.handlebarsExtensions) {
        merged.handlebarsExtensions = config.handlebarsExtensions;
      }

      // Also merge legacy fields if present (will be migrated later)
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
    if (!merged.defaultCmd && DEFAULT_CONFIG.defaultCmd) {
      merged.defaultCmd = DEFAULT_CONFIG.defaultCmd;
    }
    if (!merged.defaultCmdArgs && DEFAULT_CONFIG.defaultCmdArgs) {
      merged.defaultCmdArgs = DEFAULT_CONFIG.defaultCmdArgs;
    }
    if (!merged.defaultCmdOptions && DEFAULT_CONFIG.defaultCmdOptions) {
      merged.defaultCmdOptions = DEFAULT_CONFIG.defaultCmdOptions;
    }
    if (merged.autoReview === undefined && DEFAULT_CONFIG.autoReview !== undefined) {
      merged.autoReview = DEFAULT_CONFIG.autoReview;
    }
    if (merged.autoRun === undefined && DEFAULT_CONFIG.autoRun !== undefined) {
      merged.autoRun = DEFAULT_CONFIG.autoRun;
    }
    if (!merged.gitPromptDir && DEFAULT_CONFIG.gitPromptDir) {
      merged.gitPromptDir = DEFAULT_CONFIG.gitPromptDir;
    }
    if (!merged.handlebarsExtensions && DEFAULT_CONFIG.handlebarsExtensions) {
      merged.handlebarsExtensions = DEFAULT_CONFIG.handlebarsExtensions;
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

    // Expand handlebars extension paths
    if (config.handlebarsExtensions) {
      expanded.handlebarsExtensions = config.handlebarsExtensions.map(ext => {
        if (ext.type === 'file' && ext.path) {
          return { ...ext, path: this.expandPath(ext.path) };
        }
        return ext;
      });
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
