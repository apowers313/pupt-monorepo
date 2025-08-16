import { input, confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
import path from 'node:path';
import { BaseCommand, CommandContext, CommandOptions } from './base-command.js';
import { Config, DEFAULT_CONFIG } from '../types/config.js';
import { isGitRepository, addToGitignore } from '../utils/gitignore.js';
import { errors } from '../utils/errors.js';

interface InitInput {
  overwrite: boolean;
  promptDir: string;
  enableHistory: boolean;
  historyDir?: string;
  annotationDir?: string;
}

export class InitCommand extends BaseCommand<InitInput, void> {
  private configPath: string;

  constructor(context: CommandContext, options: CommandOptions = {}) {
    super(context, options);
    this.configPath = path.join(process.cwd(), '.ptrc.json');
  }

  protected get name(): string {
    return 'init';
  }

  protected async validatePreconditions(): Promise<void> {
    // Check write permissions in current directory
    try {
      await fs.access(process.cwd(), fs.constants.W_OK);
    } catch {
      throw errors.permissionDenied(process.cwd());
    }
  }

  protected async collectInput(): Promise<InitInput> {
    // Check for existing config
    let overwrite = true;
    if (await fs.pathExists(this.configPath)) {
      overwrite = await confirm({
        message: 'Config file already exists. Overwrite?',
        default: false
      });
      if (!overwrite) {
        return {
          overwrite: false,
          promptDir: '',
          enableHistory: false
        };
      }
    }

    // Prompt for configuration
    const promptDir = await input({
      message: 'Where should prompts be stored?',
      default: './prompts'
    });

    const enableHistory = await confirm({
      message: 'Enable prompt history?',
      default: true
    });

    let historyDir: string | undefined;
    let annotationDir: string | undefined;

    if (enableHistory) {
      historyDir = await input({
        message: 'Where should history be stored?',
        default: './.pthistory'
      });

      const enableAnnotations = await confirm({
        message: 'Enable history annotations?',
        default: true
      });

      if (enableAnnotations) {
        annotationDir = await input({
          message: 'Where should annotations be stored?',
          default: './.pthistory'
        });
      }
    }

    return {
      overwrite,
      promptDir,
      enableHistory,
      historyDir,
      annotationDir
    };
  }

  protected async performAction(input: InitInput): Promise<void> {
    if (!input.overwrite) {
      this.context.ui.info('Configuration cancelled.');
      return;
    }

    // Create directories
    const dirsToCreate = [input.promptDir];
    if (input.historyDir) dirsToCreate.push(input.historyDir);
    if (input.annotationDir && input.annotationDir !== input.historyDir) {
      dirsToCreate.push(input.annotationDir);
    }

    for (const dir of dirsToCreate) {
      if (!dir) continue;
      const resolvedDir = dir.startsWith('~') 
        ? path.join(process.env.HOME || '', dir.slice(2))
        : path.resolve(dir);
      await fs.ensureDir(resolvedDir);
    }

    // Generate config
    const config = {
      promptDirs: [input.promptDir],
      ...(input.historyDir && { historyDir: input.historyDir }),
      ...(input.annotationDir && { annotationDir: input.annotationDir }),
      ...DEFAULT_CONFIG
    };

    // Save config
    await fs.writeJson(this.configPath, config, { spaces: 2 });

    // Add to .gitignore if in git repository
    if (await isGitRepository()) {
      const entriesToIgnore: string[] = [];
      
      // Add config backup file
      entriesToIgnore.push('.ptrc.json.backup');
      
      // Add history directory if it's a local directory
      if (input.historyDir && !path.isAbsolute(input.historyDir) && !input.historyDir.startsWith('~')) {
        entriesToIgnore.push(input.historyDir);
      }
      
      // Add git prompts directory
      const gitPromptDir = config.gitPromptDir || DEFAULT_CONFIG.gitPromptDir || '.git-prompts';
      entriesToIgnore.push(gitPromptDir);
      
      // Add all entries to .gitignore
      for (const entry of entriesToIgnore) {
        await addToGitignore(entry);
      }
    }

    this.context.ui.success('Configuration created successfully!');
  }
}

// Export factory function for backward compatibility
export async function initCommand(context?: CommandContext, options?: CommandOptions): Promise<void> {
  // If no context provided, create a minimal one
  const defaultConfig: Config = {
    promptDirs: ['./prompts'],
    ...DEFAULT_CONFIG
  };
  
  const defaultContext = context || {
    config: defaultConfig,
    ui: (await import('../ui/console-ui.js')).ui,
    logger: (await import('../services/logging-service.js')).createLogger(defaultConfig)
  };
  
  const command = new InitCommand(defaultContext, options);
  return command.execute();
}