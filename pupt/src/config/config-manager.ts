import path from 'node:path';

import { cosmiconfig } from 'cosmiconfig';
import fs from 'fs-extra';

import { ConfigFileSchema,ConfigSchema } from '../schemas/config-schema.js';
import { Config, DEFAULT_CONFIG } from '../types/config.js';
import { migrateAnnotationsToJson } from '../utils/annotation-migration.js';
import { createError, ErrorCategory,errors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { getHomePath } from '../utils/platform.js';
import { getConfigDir, getConfigPath, getDataDir } from './global-paths.js';
import { migrateConfig } from './migration.js';

interface ConfigResult {
  config: Config;
  filepath?: string;
  configDir?: string;
}

function getExplorer(): ReturnType<typeof cosmiconfig> {
  const configDir = getConfigDir();
  return cosmiconfig('pt', {
    searchPlaces: [
      'config.json',
      'config.yaml',
      'config.yml',
      'config.js',
      'config.cjs',
    ],
    stopDir: configDir,
  });
}

function validateConfig(config: unknown): void {
  // First validate that it's a valid config file format (any version)
  const fileResult = ConfigFileSchema.safeParse(config);
  if (!fileResult.success) {
    const {issues} = fileResult.error;
    const firstIssue = issues[0];

    // Handle union errors by looking for the most specific error
    let specificIssue = firstIssue;
    if (firstIssue.code === 'invalid_union' && 'errors' in firstIssue) {
      // Try to find a more specific error in union errors
      // Look for errors that match the actual config fields (not old schema fields)
      const cfg = config as Record<string, unknown>;
      // In zod v4, union issues have `errors` (array of issue arrays)
      const unionErrors = (firstIssue as { errors: Array<Array<typeof firstIssue>> }).errors;
      for (const issueGroup of unionErrors) {
        if (issueGroup.length > 0) {
          const issue = issueGroup[0];
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

      throw errors.invalidConfig(field, specificIssue.message, 'invalid value');
    } else {
      throw errors.invalidConfig('format', 'valid JSON', 'invalid JSON');
    }
  }
}

async function runMigrateConfig(config: unknown, filepath: string): Promise<Config> {
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
        icon: '\u2699\uFE0F'
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
    const {message} = firstIssue;

    throw errors.invalidConfig('validation', 'valid configuration', message);
  }

  return result.data;
}

function expandPath(filepath: string, configDir?: string): string {
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

function expandPaths(config: Config, configDir?: string): Config {
  const expanded = { ...config };

  // Expand prompt directories
  if (config.promptDirs) {
    expanded.promptDirs = config.promptDirs.map(dir => expandPath(dir, configDir));
  }

  // Expand history directory
  if (config.historyDir) {
    expanded.historyDir = expandPath(config.historyDir, configDir);
  }

  // Expand annotation directory
  if (config.annotationDir) {
    expanded.annotationDir = expandPath(config.annotationDir, configDir);
  }

  // Expand helper paths
  if (config.helpers) {
    expanded.helpers = {};
    for (const [name, helper] of Object.entries(config.helpers)) {
      expanded.helpers[name] = { ...helper };
      if (helper.type === 'file' && helper.path) {
        expanded.helpers[name].path = expandPath(helper.path, configDir);
      }
    }
  }

  // Expand output capture directory
  if (config.outputCapture && config.outputCapture.directory) {
    expanded.outputCapture = {
      ...config.outputCapture,
      directory: expandPath(config.outputCapture.directory, configDir)
    };
  }

  return expanded;
}

async function load(startDir?: string): Promise<Config> {
  const result = await loadWithPath(startDir);
  return result.config;
}

async function loadWithPath(_startDir?: string): Promise<ConfigResult> {
  const configDir = getConfigDir();
  const explorer = getExplorer();

  // Search from the global config directory (not CWD)
  const result = await explorer.search(configDir);

  if (!result || !result.config) {
    // Create default config with all defaults
    const dataDir = getDataDir();
    const defaultConfig: Config = {
      promptDirs: [path.join(dataDir, 'prompts')],
      ...DEFAULT_CONFIG
    };
    return {
      config: expandPaths(defaultConfig),
      filepath: undefined,
      configDir: undefined
    };
  }

  // Validate the loaded config
  validateConfig(result.config);

  // Check if migration is needed
  const migrated = await runMigrateConfig(result.config, result.filepath);

  // Get the directory containing the config file
  const resolvedConfigDir = path.dirname(result.filepath);

  // Expand paths relative to the config file directory
  const expandedConfig = expandPaths(migrated, resolvedConfigDir);

  // Migrate annotation files if needed
  if (expandedConfig.annotationDir) {
    try {
      await migrateAnnotationsToJson(expandedConfig.annotationDir);
    } catch (error) {
      logger.warn(`Failed to migrate annotation files: ${error instanceof Error ? error.message : String(error as string | number)}`);
    }
  }

  return {
    config: expandedConfig,
    filepath: result.filepath,
    configDir: resolvedConfigDir
  };
}

/**
 * Save a config object to the global config path.
 */
async function save(config: Config): Promise<void> {
  const configPath = getConfigPath();
  await fs.ensureDir(path.dirname(configPath));
  await fs.writeJson(configPath, config, { spaces: 2 });
}

export const ConfigManager = {
  load,
  loadWithPath,
  save,
};
