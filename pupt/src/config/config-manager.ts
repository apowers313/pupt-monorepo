import { cosmiconfig } from 'cosmiconfig';
import { Config, DEFAULT_CONFIG } from '../types/config.js';
import path from 'node:path';
import os from 'node:os';
import { getHomePath } from '../utils/platform.js';
import fs from 'fs-extra';
import { errors, createError, ErrorCategory } from '../utils/errors.js';
import { migrateConfig } from './migration.js';
import { ConfigSchema, ConfigFileSchema } from '../schemas/config-schema.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { migrateAnnotationsToJson } from '../utils/annotation-migration.js';
import { findProjectRoot } from '../utils/project-root.js';

interface ConfigResult {
  config: Config;
  filepath?: string;
  configDir?: string;
}

export class ConfigManager {
  private static getExplorer() {
    return cosmiconfig('pt', {
      searchPlaces: [
        '.pt-config',
        '.pt-config.json',
        '.pt-config.yaml',
        '.pt-config.yml',
        '.pt-config.js',
        '.pt-config.cjs',
        'pt.config.js',
      ],
      stopDir: os.homedir(), // This enables parent directory search up to home directory
    });
  }

  static async checkForOldConfigFiles(dir: string = process.cwd()): Promise<string[]> {
    const oldConfigPatterns = ['.ptrc', '.ptrc.json', '.ptrc.yaml', '.ptrc.yml', '.ptrc.js', '.ptrc.cjs'];
    const foundOldFiles: string[] = [];
    
    for (const pattern of oldConfigPatterns) {
      const filePath = path.join(dir, pattern);
      if (await fs.pathExists(filePath)) {
        foundOldFiles.push(filePath);
      }
    }
    
    return foundOldFiles;
  }

  static async renameOldConfigFile(oldPath: string): Promise<string> {
    const dir = path.dirname(oldPath);
    const filename = path.basename(oldPath);
    
    // Map old names to new names
    const nameMapping: Record<string, string> = {
      '.ptrc': '.pt-config',
      '.ptrc.json': '.pt-config.json',
      '.ptrc.yaml': '.pt-config.yaml',
      '.ptrc.yml': '.pt-config.yml',
      '.ptrc.js': '.pt-config.js',
      '.ptrc.cjs': '.pt-config.cjs'
    };
    
    const newFilename = nameMapping[filename];
    if (!newFilename) {
      throw new Error(`Unknown config file pattern: ${filename}`);
    }
    
    const newPath = path.join(dir, newFilename);
    
    // Check if new file already exists
    if (await fs.pathExists(newPath)) {
      throw new Error(`Cannot rename ${filename} to ${newFilename}: destination file already exists`);
    }
    
    // Rename the file
    await fs.rename(oldPath, newPath);
    
    return newPath;
  }

  static async load(startDir?: string): Promise<Config> {
    const result = await this.loadWithPath(startDir);
    return result.config;
  }

  static async loadWithPath(startDir?: string): Promise<ConfigResult> {
    const searchFrom = startDir || process.cwd();
    const explorer = this.getExplorer();

    // Use cosmiconfig's search which handles the directory traversal up to the root
    const result = await explorer.search(searchFrom);

    if (!result || !result.config) {
      // Create default config with all defaults
      const defaultConfig: Config = {
        promptDirs: [path.join(os.homedir(), '.pt/prompts')],
        ...DEFAULT_CONFIG
      };
      return {
        config: this.expandPaths(defaultConfig),
        filepath: undefined,
        configDir: undefined
      };
    }

    // Validate the loaded config
    this.validateConfig(result.config);

    // Check if migration is needed
    const migrated = await this.migrateConfig(result.config, result.filepath);

    // Get the directory containing the config file
    const configDir = path.dirname(result.filepath);

    // Expand paths relative to the config file directory
    const expandedConfig = this.expandPaths(migrated, configDir);

    // Migrate annotation files if needed
    if (expandedConfig.annotationDir) {
      try {
        await migrateAnnotationsToJson(expandedConfig.annotationDir);
      } catch (error) {
        logger.warn(`Failed to migrate annotation files: ${error}`);
      }
    }

    return {
      config: expandedConfig,
      filepath: result.filepath,
      configDir: configDir
    };
  }

  /* private static formatValidationError(issue: z.ZodIssue): string {
    // Handle specific type validation errors
    if (issue.code === 'invalid_type') {
      const fieldName = issue.path[issue.path.length - 1];
      const expectedType = issue.expected;
      let typeDescription = expectedType;
      
      // Map Zod types to user-friendly descriptions
      if (expectedType === 'string') {
        typeDescription = 'a string';
      } else if (expectedType === 'array') {
        typeDescription = 'an array';
      } else if (expectedType === 'boolean') {
        typeDescription = 'a boolean';
      } else if (expectedType === 'object') {
        typeDescription = 'an object';
      }
      
      return `'${fieldName}' must be ${typeDescription}`;
    }
    
    // Handle union validation messages
    if (issue.code === 'invalid_union' && issue.path && issue.path.length > 0) {
      const fieldName = issue.path[issue.path.length - 1];
      // Try to infer the expected type from the field name
      if (fieldName === 'historyDir' || fieldName === 'annotationDir' || fieldName === 'gitPromptDir') {
        return `'${fieldName}' must be a string`;
      } else if (fieldName === 'autoReview' || fieldName === 'autoRun') {
        return `'${fieldName}' must be a boolean`;
      } else if (fieldName === 'handlebarsExtensions' || fieldName === 'defaultCmdArgs') {
        return `'${fieldName}' must be an array`;
      } else if (fieldName === 'defaultCmdOptions') {
        return `'${fieldName}' must be an object`;
      }
    }
    
    // Handle enum validation for handlebarsExtensions type field
    if (issue.code === 'invalid_enum_value' && issue.path && issue.path.length >= 2) {
      const fieldPath = issue.path;
      if (fieldPath[0] === 'handlebarsExtensions' && fieldPath[2] === 'type') {
        return "handlebarsExtension type must be 'inline' or 'file'";
      }
    }
    
    return issue.message;
  } */

  private static validateConfig(config: unknown): void {
    // First validate that it's a valid config file format (any version)
    const fileResult = ConfigFileSchema.safeParse(config);
    if (!fileResult.success) {
      const issues = fileResult.error.issues;
      const firstIssue = issues[0];
      
      // Handle union errors by looking for the most specific error
      let specificIssue = firstIssue;
      if (firstIssue.code === 'invalid_union' && 'unionErrors' in firstIssue) {
        // Try to find a more specific error in union errors
        // Look for errors that match the actual config fields (not old schema fields)
        const cfg = config as Record<string, unknown>;
        const unionIssue = firstIssue as z.ZodInvalidUnionIssue;
        for (const unionError of unionIssue.unionErrors) {
          if (unionError.issues && unionError.issues.length > 0) {
            const issue = unionError.issues[0];
            if (issue.path && issue.path.length > 0) {
              const fieldName = issue.path[0];
              // Check if this field exists in the actual config
              if (fieldName in cfg) {
                specificIssue = issue;
                break;
              }
            }
          }
        }
      }
      
      // Create user-friendly error messages
      if (specificIssue.path && specificIssue.path.length > 0) {
        const field = specificIssue.path.join('.');
        // const message = this.formatValidationError(specificIssue);
        
        throw errors.invalidConfig(field, specificIssue.message, 'invalid value');
      } else {
        throw errors.invalidConfig('format', 'valid JSON', 'invalid JSON');
      }
    }
  }

  private static async migrateConfig(config: unknown, filepath: string): Promise<Config> {
    const cfg = config as Record<string, unknown>;
    
    // Check if migration is needed
    if (migrateConfig.needsMigration(cfg)) {
      // Create backup before migration
      if (filepath && await fs.pathExists(filepath)) {
        try {
          await migrateConfig.createBackup(filepath);
        } catch (error) {
          // Backup failed, but continue with migration
          logger.warn(`Warning: Could not create backup of config file: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Apply migration
      const migrated = migrateConfig(cfg);

      // Validate the migrated config with the current schema
      const result = ConfigSchema.safeParse(migrated);
      if (!result.success) {
        const firstIssue = result.error.issues[0];
        
        throw createError({
          message: `Configuration migration failed: ${firstIssue.message}`,
          code: 'MIGRATION_FAILED',
          category: ErrorCategory.CONFIG_ERROR,
          suggestions: [
            { text: 'Check your configuration file for invalid values' },
            { text: 'Try removing the config file and running "pt init" to start fresh' }
          ],
          icon: '⚙️'
        });
      }

      // Save migrated config back to disk
      if (filepath && filepath.endsWith('.json')) {
        await fs.writeJson(filepath, migrated, { spaces: 2 });
      }

      return migrated;
    }

    // Validate existing config is valid for current version
    const result = ConfigSchema.safeParse(cfg);
    if (!result.success) {
      // Try to migrate even if needsMigration returned false
      const migrated = migrateConfig(cfg);
      const retryResult = ConfigSchema.safeParse(migrated);
      if (retryResult.success) {
        return migrated;
      }
      
      // Still invalid after migration attempt
      const firstIssue = retryResult.error.issues[0];
      const message = firstIssue.message;
      
      throw errors.invalidConfig('validation', 'valid configuration', message);
    }

    return result.data;
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

      if (config.outputCapture) {
        merged.outputCapture = config.outputCapture;
      }

      if (config.autoAnnotate) {
        merged.autoAnnotate = config.autoAnnotate;
      }

      if (config.logLevel) {
        merged.logLevel = config.logLevel;
      }
    }

    // Remove duplicates from promptDirs
    merged.promptDirs = [...new Set(merged.promptDirs)];

    // If no promptDirs were specified in any config, use default
    if (merged.promptDirs.length === 0) {
      merged.promptDirs = [path.join(os.homedir(), '.pt/prompts')];
    }

    // Don't apply default tool settings here anymore - they come from tool detection during init
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

  private static expandPaths(config: Config, configDir?: string): Config {
    const expanded = { ...config };

    // Expand prompt directories
    if (config.promptDirs) {
      expanded.promptDirs = config.promptDirs.map(dir => this.expandPath(dir, configDir));
    }

    // Expand history directory
    if (config.historyDir) {
      expanded.historyDir = this.expandPath(config.historyDir, configDir);
    }

    // Expand annotation directory
    if (config.annotationDir) {
      expanded.annotationDir = this.expandPath(config.annotationDir, configDir);
    }

    // Expand git prompt directory
    if (config.gitPromptDir) {
      expanded.gitPromptDir = this.expandPath(config.gitPromptDir, configDir);
    }

    // Expand helper paths
    if (config.helpers) {
      expanded.helpers = {};
      for (const [name, helper] of Object.entries(config.helpers)) {
        expanded.helpers[name] = { ...helper };
        if (helper.type === 'file' && helper.path) {
          expanded.helpers[name].path = this.expandPath(helper.path, configDir);
        }
      }
    }

    // Expand handlebars extension paths
    if (config.handlebarsExtensions) {
      expanded.handlebarsExtensions = config.handlebarsExtensions.map(ext => {
        if (ext.type === 'file' && ext.path) {
          return { ...ext, path: this.expandPath(ext.path, configDir) };
        }
        return ext;
      });
    }

    // Expand output capture directory
    if (config.outputCapture && config.outputCapture.directory) {
      expanded.outputCapture = {
        ...config.outputCapture,
        directory: this.expandPath(config.outputCapture.directory, configDir)
      };
    }

    return expanded;
  }

  private static expandPath(filepath: string, configDir?: string): string {
    // Handle ${projectRoot} variable substitution
    if (filepath.includes('${projectRoot}')) {
      const searchDir = configDir || process.cwd();
      const projectRoot = findProjectRoot(searchDir);
      if (!projectRoot) {
        throw createError({
          message: `Cannot resolve \${projectRoot}: no project marker found searching upward from ${searchDir}`,
          code: 'PROJECT_ROOT_NOT_FOUND',
          category: ErrorCategory.CONFIG_ERROR,
          suggestions: [
            { text: 'Ensure you are in a project directory with a recognized project file (package.json, .git, Cargo.toml, etc.)' },
            { text: 'Use an absolute path or relative path instead of ${projectRoot}' }
          ],
          icon: '📁'
        });
      }
      filepath = filepath.replace(/\$\{projectRoot\}/g, projectRoot);
      // Normalize path to ensure consistent separators across platforms
      // (e.g., after replacing ${projectRoot} on Windows, forward slashes in the
      // template may remain, creating mixed paths like C:\foo/.bar)
      filepath = path.normalize(filepath);
    }

    if (filepath.startsWith('~/')) {
      return path.join(getHomePath(), filepath.slice(2));
    }

    // If the path is already absolute, return it as is
    if (path.isAbsolute(filepath)) {
      return filepath;
    }

    // If we have a config directory, resolve relative paths from there
    if (configDir) {
      return path.resolve(configDir, filepath);
    }

    // Otherwise resolve from current working directory
    return path.resolve(filepath);
  }
}
