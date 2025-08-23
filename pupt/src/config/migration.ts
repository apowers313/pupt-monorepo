import fs from 'fs-extra';
import { Config } from '../types/config.js';
import { DateFormats } from '../utils/date-formatter.js';

export interface ConfigMigration {
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
      migrated.handlebarsExtensions = migrated.handlebarsExtensions ?? [];
      
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
      
      // Add auto-annotation defaults if not present
      if (!migrated.autoAnnotate) {
        migrated.autoAnnotate = {
          enabled: false,
          triggers: ['claude', 'ai', 'assistant'],
          analysisPrompt: 'analyze-execution'
        };
      }
      
      // Preserve v3 defaults if not set
      migrated.autoReview = migrated.autoReview ?? true;
      migrated.autoRun = migrated.autoRun ?? false;
      
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
    
    if (!migrated.version || migrated.version < '4.0.0') {
      // Apply v4 migration
      migrated = migrations[1].migrate(migrated);
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
      
      // Check if version is missing or old
      if (!config.version || config.version !== '4.0.0') {
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