import fs from 'fs-extra';
import { Config } from '../types/config.js';
import { DateFormats } from '../utils/date-formatter.js';
import { getDataDir } from './global-paths.js';
import path from 'node:path';

interface ConfigMigration {
  version: string;
  migrate: (config: Record<string, unknown>) => Record<string, unknown>;
}

export const migrations: ConfigMigration[] = [
  {
    version: '3.0.0',
    migrate: (config) => {
      const migrated = { ...config };

      // Handle v1 format: promptDirectory -> promptDirs
      if ('promptDirectory' in config) {
        const pd = config.promptDirectory;
        migrated.promptDirs = Array.isArray(pd) ? pd : [pd as string];
        delete migrated.promptDirectory;
      }

      // Handle v1 format: historyDirectory -> historyDir
      if ('historyDirectory' in config) {
        migrated.historyDir = config.historyDirectory;
        delete migrated.historyDirectory;
      }

      // Handle v1 format: annotationDirectory -> annotationDir
      if ('annotationDirectory' in config) {
        migrated.annotationDir = config.annotationDirectory;
        delete migrated.annotationDirectory;
      }

      // Rename fields
      if ('codingTool' in config) {
        migrated.defaultCmd = config.codingTool;
        delete migrated.codingTool;
      }
      if ('codingToolArgs' in config) {
        migrated.defaultCmdArgs = config.codingToolArgs;
        delete migrated.codingToolArgs;
      }
      if ('codingToolOptions' in config) {
        migrated.defaultCmdOptions = config.codingToolOptions;
        delete migrated.codingToolOptions;
      }

      // Add new fields with defaults
      migrated.version = '3.0.0';
      migrated.autoReview = migrated.autoReview ?? true;
      migrated.autoRun = migrated.autoRun ?? false;
      migrated.gitPromptDir = migrated.gitPromptDir ?? '.git-prompts';
      delete migrated.handlebarsExtensions;

      // Set defaults for renamed fields if they don't exist
      migrated.defaultCmd = migrated.defaultCmd ?? 'claude';
      migrated.defaultCmdArgs = migrated.defaultCmdArgs ?? [];
      migrated.defaultCmdOptions = migrated.defaultCmdOptions ?? {
        'Continue with last context?': '--continue'
      };

      // Ensure required fields exist
      migrated.promptDirs = migrated.promptDirs ?? ['./.prompts'];

      // Preserve outputCapture settings
      if ('outputCapture' in config) {
        migrated.outputCapture = config.outputCapture;
      }

      return migrated;
    }
  },
  {
    version: '4.0.0',
    migrate: (config) => {
      const migrated = { ...config };

      // Update version
      migrated.version = '4.0.0';

      // Add output capture defaults if not present
      if (!migrated.outputCapture) {
        migrated.outputCapture = {
          enabled: false,
          directory: '.pt-output',
          maxSizeMB: 50,
          retentionDays: 30
        };
      }

      // Remove auto-annotation config (feature removed)
      delete migrated.autoAnnotate;

      // Preserve v3 defaults if not set
      migrated.autoReview = migrated.autoReview ?? true;
      migrated.autoRun = migrated.autoRun ?? false;

      return migrated;
    }
  },
  {
    version: '5.0.0',
    migrate: (config) => {
      const migrated = { ...config };

      // Update version
      migrated.version = '5.0.0';

      // Remove deprecated features
      delete migrated.autoAnnotate;
      delete migrated.handlebarsExtensions;

      // Add pupt-lib integration defaults
      migrated.libraries = migrated.libraries ?? [];

      return migrated;
    }
  },
  {
    version: '6.0.0',
    migrate: (config) => {
      const migrated = { ...config };

      // Update version
      migrated.version = '6.0.0';

      // Migrate targetLlm to environment.llm.provider
      if ('targetLlm' in config && config.targetLlm) {
        const existingEnv = (migrated.environment as Record<string, unknown>) ?? {};
        const existingLlm = (existingEnv.llm as Record<string, unknown>) ?? {};

        migrated.environment = {
          ...existingEnv,
          llm: {
            ...existingLlm,
            provider: existingLlm.provider ?? config.targetLlm,
          }
        };
        delete migrated.targetLlm;
      }

      return migrated;
    }
  },
  {
    version: '7.0.0',
    migrate: (config) => {
      const migrated = { ...config };

      // Update version
      migrated.version = '7.0.0';

      // Migrate Amazon Q ('q') to Kiro CLI ('kiro-cli')
      if (migrated.defaultCmd === 'q') {
        migrated.defaultCmd = 'kiro-cli';
        migrated.defaultCmdArgs = ['chat'];
      }

      return migrated;
    }
  },
  {
    version: '8.0.0',
    migrate: (config) => {
      const migrated = { ...config };

      // Update version
      migrated.version = '8.0.0';

      // Remove deprecated fields
      delete migrated.gitPromptDir;
      delete migrated.codingTool;
      delete migrated.codingToolArgs;
      delete migrated.codingToolOptions;
      delete migrated.targetLlm;

      // Update default paths to global paths
      const dataDir = getDataDir();

      // Update promptDirs: replace old local defaults with global default
      const promptDirs = migrated.promptDirs as string[] | undefined;
      if (!promptDirs || promptDirs.length === 0 ||
          (promptDirs.length === 1 && (
            promptDirs[0] === './.prompts' ||
            promptDirs[0] === '.prompts'
          ))) {
        migrated.promptDirs = [path.join(dataDir, 'prompts')];
      }

      // Update historyDir: replace old local defaults with global default
      const historyDir = migrated.historyDir as string | undefined;
      if (!historyDir || historyDir === './.pthistory' || historyDir === '.pthistory') {
        migrated.historyDir = path.join(dataDir, 'history');
      }

      // Update annotationDir: replace old local defaults with global default
      const annotationDir = migrated.annotationDir as string | undefined;
      if (!annotationDir || annotationDir === './.pthistory' || annotationDir === '.pthistory') {
        migrated.annotationDir = path.join(dataDir, 'history');
      }

      // Update outputCapture: enable by default, update directory
      const outputCapture = migrated.outputCapture as Record<string, unknown> | undefined;
      if (outputCapture) {
        outputCapture.enabled = true;
        const captureDir = outputCapture.directory as string | undefined;
        if (!captureDir || captureDir === '.pt-output' || captureDir === './.pt-output') {
          outputCapture.directory = path.join(dataDir, 'output');
        }
      } else {
        migrated.outputCapture = {
          enabled: true,
          directory: path.join(dataDir, 'output'),
          maxSizeMB: 50,
          retentionDays: 30,
        };
      }

      // Convert old string[] libraries to empty LibraryEntry[]
      const libraries = migrated.libraries;
      if (Array.isArray(libraries) && libraries.length > 0 && typeof libraries[0] === 'string') {
        migrated.libraries = [];
      }

      return migrated;
    }
  }
];

export const migrateConfig = Object.assign(
  function(config: Record<string, unknown>): Config {
    // Apply migrations in sequence
    let migrated = { ...config };

    // Start with the appropriate migration based on current version
    const currentVersion = config.version as string | undefined;

    if (!currentVersion || currentVersion < '3.0.0') {
      // Apply v3 migration first
      migrated = migrations[0].migrate(migrated);
    }

    // Apply v4 migration if version is old OR if required v4 fields are missing
    if (!migrated.version || migrated.version < '4.0.0' ||
        (migrated.version === '4.0.0' && !migrated.outputCapture)) {
      // Apply v4 migration
      migrated = migrations[1].migrate(migrated);
    }

    // Apply v5 migration if version is old
    if (!migrated.version || migrated.version < '5.0.0') {
      migrated = migrations[2].migrate(migrated);
    }

    // Apply v6 migration if version is old or targetLlm exists
    if (!migrated.version || migrated.version < '6.0.0' || 'targetLlm' in migrated) {
      migrated = migrations[3].migrate(migrated);
    }

    // Apply v7 migration if version is old or defaultCmd is 'q'
    if (!migrated.version || migrated.version < '7.0.0' || migrated.defaultCmd === 'q') {
      migrated = migrations[4].migrate(migrated);
    }

    // Apply v8 migration if version is old or deprecated fields exist
    if (!migrated.version || migrated.version < '8.0.0' ||
        'gitPromptDir' in migrated || 'targetLlm' in migrated ||
        'codingTool' in migrated) {
      migrated = migrations[5].migrate(migrated);
    }

    return migrated as unknown as Config;
  },
  {
    needsMigration(config: Record<string, unknown>): boolean {
      // Check if config has old v1 field names
      if ('promptDirectory' in config || 'historyDirectory' in config || 'annotationDirectory' in config) {
        return true;
      }

      // Check if config has old field names
      if ('codingTool' in config || 'codingToolArgs' in config || 'codingToolOptions' in config) {
        return true;
      }

      // Check if targetLlm exists (should be migrated to environment.llm.provider)
      if ('targetLlm' in config) {
        return true;
      }

      // Check if defaultCmd is 'q' (Amazon Q renamed to Kiro CLI)
      if (config.defaultCmd === 'q') {
        return true;
      }

      // Check if gitPromptDir exists (removed in v8)
      if ('gitPromptDir' in config) {
        return true;
      }

      // Check if version is missing or old
      if (!config.version || config.version < '8.0.0') {
        return true;
      }

      return false;
    },

    async createBackup(configPath: string): Promise<void> {
      const backupPath = configPath + '.backup';

      // If backup already exists, create timestamped backup
      if (await fs.pathExists(backupPath)) {
        const now = new Date();
        const dateStr = DateFormats.YYYYMMDD(now);
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestamp = `${dateStr}${hours}${minutes}${seconds}`;
        const timestampedBackup = configPath + '.backup.' + timestamp;
        await fs.copy(configPath, timestampedBackup);
      } else {
        await fs.copy(configPath, backupPath);
      }
    }
  }
);
