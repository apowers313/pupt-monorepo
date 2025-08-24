import { HistoryManager } from './history-manager.js';
import { EnhancedHistoryEntry } from '../types/history.js';
import { getGitInfo, formatDuration } from '../utils/git-info.js';
import fs from 'fs-extra';
import path from 'node:path';
import { calculateActiveExecutionTime, extractUserInputLines } from '../services/output-capture-service.js';
import crypto from 'node:crypto';
import { sanitizeObject } from '../utils/security.js';
import { DateFormats } from '../utils/date-formatter.js';

export interface EnhancedHistorySaveOptions {
  templatePath: string;
  templateContent: string;
  variables: Map<string, unknown>;
  finalPrompt: string;
  title?: string;
  summary?: string;
  timestamp?: Date;
  startTime?: Date;
  endTime?: Date;
  command?: string;
  exitCode?: number | null;
  outputFile?: string;
  outputSize?: number;
  executionTime?: number; // milliseconds from run.ts
}

export class EnhancedHistoryManager extends HistoryManager {
  constructor(private enhancedHistoryDir: string) {
    super(enhancedHistoryDir);
  }

  async listHistory(limit?: number): Promise<EnhancedHistoryEntry[]> {
    const entries = await super.listHistory(limit);
    // The parent method returns HistoryEntry[], but they may actually contain enhanced fields
    // TypeScript just doesn't know about them, so we cast
    return entries as EnhancedHistoryEntry[];
  }

  async getHistoryEntry(index: number): Promise<EnhancedHistoryEntry | null> {
    const entry = await super.getHistoryEntry(index);
    return entry as EnhancedHistoryEntry | null;
  }
  async savePrompt(options: EnhancedHistorySaveOptions): Promise<string> {
    // Don't save empty prompts
    if (!options.finalPrompt || !options.finalPrompt.trim()) {
      return '';
    }

    try {
      await fs.ensureDir(this.enhancedHistoryDir);

      const now = options.timestamp || new Date();
      const timestamp = DateFormats.UTC_DATETIME(now);
      
      // Generate filename using local time: YYYYMMDD-HHMMSS-<random>.json
      const dateStr = DateFormats.YYYYMMDD(now);
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      const timeStr = `${hours}${minutes}${seconds}`;
      const random = crypto.randomBytes(4).toString('hex');
      const filename = `${dateStr}-${timeStr}-${random}.json`;

      // Gather environment info
      const gitInfo = await getGitInfo();
      const environment = {
        working_directory: process.cwd(),
        node_version: process.version,
        os: process.platform,
        ...(gitInfo.branch && { git_branch: gitInfo.branch }),
        ...(gitInfo.commit && { git_commit: gitInfo.commit }),
        ...(gitInfo.isDirty !== undefined && { git_dirty: gitInfo.isDirty }),
        ...(process.env.SHELL && { shell: process.env.SHELL })
      };

      // Build execution info if provided
      let execution: EnhancedHistoryEntry['execution'] | undefined;
      if (options.startTime) {
        const endTime = options.endTime || new Date();
        let duration = formatDuration(options.startTime, endTime);
        let activeTime: string | undefined;
        let userInputCount: number | undefined;
        
        // If we have a JSON output file, calculate active execution time
        if (options.outputFile && options.outputFile.endsWith('.json')) {
          try {
            const activeNanos = await calculateActiveExecutionTime(options.outputFile);
            const activeMs = Number(activeNanos / 1_000_000n);
            activeTime = `${activeMs}ms`;
            
            // Also get user input count
            const userInputs = await extractUserInputLines(options.outputFile);
            userInputCount = userInputs.length;
          } catch {
            // If calculation fails, just use the provided execution time
            if (options.executionTime) {
              activeTime = `${options.executionTime}ms`;
            }
          }
        } else if (options.executionTime) {
          // Use the execution time from run.ts if no JSON file
          duration = `${options.executionTime}ms`;
        }
        
        execution = {
          start_time: options.startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration,
          exit_code: options.exitCode ?? null,
          command: options.command || 'unknown',
          ...(options.outputFile && { output_file: options.outputFile }),
          ...(options.outputSize !== undefined && { output_size: options.outputSize }),
          ...(activeTime && { active_time: activeTime }),
          ...(userInputCount !== undefined && { user_input_count: userInputCount })
        };
      }

      // Create enhanced history entry
      const entry: Omit<EnhancedHistoryEntry, 'filename'> = {
        timestamp,
        templatePath: options.templatePath,
        templateContent: options.templateContent,
        variables: sanitizeObject(Object.fromEntries(options.variables)),
        finalPrompt: options.finalPrompt,
        title: options.title,
        summary: options.summary,
        environment,
        ...(execution && { execution })
      };

      // Save to history
      const filePath = path.join(this.enhancedHistoryDir, filename);
      await fs.writeJson(filePath, entry, { spaces: 2 });
      
      return filename;
    } catch (error) {
      throw new Error(`Failed to save prompt to history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


}