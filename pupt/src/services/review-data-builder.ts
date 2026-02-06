import { HistoryManager } from '../history/history-manager.js';
import { PuptService } from './pupt-service.js';
import type { Config } from '../types/config.js';
import type { HistoryEntry } from '../types/history.js';
import type { ParsedAnnotation, AnnotationMetadata } from '../types/annotations.js';
import type { 
  ReviewData, 
  ReviewOptions, 
  PromptReviewData, 
  UsageStatistics,
  ExecutionOutcomes,
  DataCompleteness,
  ReviewMetadata
} from '../types/review.js';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { AnnotationAnalyzer } from '../annotations/annotation-analyzer.js';
import type { EnhancedHistoryEntry } from '../types/history.js';

export class ReviewDataBuilder {
  private historyManager: HistoryManager;
  private puptService: PuptService;
  private annotationAnalyzer: AnnotationAnalyzer;

  constructor(private config: Config) {
    this.historyManager = new HistoryManager(config.historyDir || './history', config.annotationDir);
    this.puptService = new PuptService({ promptDirs: config.promptDirs || ['./prompts'], libraries: config.libraries, environment: config.environment });
    this.annotationAnalyzer = new AnnotationAnalyzer();
  }

  async buildReviewData(options: ReviewOptions): Promise<ReviewData> {
    // Get all history entries
    let historyEntries = await this.historyManager.listHistory();

    // Filter by time if specified
    if (options.since) {
      historyEntries = this.filterBySince(historyEntries, options.since);
    }

    // Filter by prompt name if specified
    if (options.promptName) {
      historyEntries = historyEntries.filter(
        entry => this.extractPromptName(entry) === options.promptName
      );
    }

    // Group entries by prompt
    const entriesByPrompt = this.groupByPrompt(historyEntries);

    // Get all annotations
    const annotations = await this.getAnnotations();

    // Build prompt review data for each unique prompt
    const prompts: PromptReviewData[] = [];
    for (const [promptName, entries] of entriesByPrompt) {
      const promptData = await this.buildPromptReviewData(
        promptName,
        entries,
        annotations
      );
      prompts.push(promptData);
    }

    // Calculate metadata
    const metadata = this.calculateMetadata(
      options.since || '30d',
      prompts,
      historyEntries
    );

    return {
      metadata,
      prompts,
      cross_prompt_patterns: [] // Will be implemented in Phase 5
    };
  }

  private filterBySince(entries: HistoryEntry[], since: string): HistoryEntry[] {
    const cutoffDate = this.parseSinceDate(since);
    return entries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= cutoffDate;
    });
  }

  private parseSinceDate(since: string): Date {
    const now = new Date();
    const match = since.match(/^(\d+)([dDhHmMwW])$/);
    
    if (!match) {
      // Try to parse as ISO date
      const date = new Date(since);
      if (!isNaN(date.getTime())) {
        return date;
      }
      throw new Error(`Invalid since format: ${since}`);
    }

    const [, amountStr, unit] = match;
    const amount = parseInt(amountStr, 10);

    switch (unit.toLowerCase()) {
      case 'd':
        now.setDate(now.getDate() - amount);
        break;
      case 'h':
        now.setHours(now.getHours() - amount);
        break;
      case 'm':
        now.setMinutes(now.getMinutes() - amount);
        break;
      case 'w':
        now.setDate(now.getDate() - (amount * 7));
        break;
      default:
        throw new Error(`Invalid time unit: ${unit}`);
    }

    return now;
  }

  private groupByPrompt(entries: HistoryEntry[]): Map<string, HistoryEntry[]> {
    const grouped = new Map<string, HistoryEntry[]>();
    
    for (const entry of entries) {
      const promptName = this.extractPromptName(entry);
      if (!grouped.has(promptName)) {
        grouped.set(promptName, []);
      }
      grouped.get(promptName)!.push(entry);
    }

    return grouped;
  }

  private async buildPromptReviewData(
    promptName: string,
    entries: HistoryEntry[],
    allAnnotations: ParsedAnnotation[]
  ): Promise<PromptReviewData> {
    // Get prompt content and metadata
    let promptContent = '';
    let promptPath = '';
    // let promptMetadata = {};
    
    try {
      await this.puptService.init();
      const prompts = this.puptService.getPromptsAsAdapted();
      const prompt = prompts.find(p => {
        const ext = path.extname(p.path);
        return path.basename(p.path, ext) === promptName;
      });
      if (prompt) {
        promptContent = prompt.content;
        promptPath = prompt.path;
      } else {
        // Prompt file might have been deleted
        promptPath = entries[0]?.templatePath || `prompts/${promptName}.prompt`;
      }
    } catch {
      // Prompt file might have been deleted
      promptPath = entries[0]?.templatePath || `prompts/${promptName}.prompt`;
    }

    // Get last modified time
    let lastModified = '';
    try {
      const stats = await fs.stat(promptPath);
      lastModified = stats.mtime.toISOString();
    } catch {
      // Use most recent execution time as fallback
      lastModified = entries[entries.length - 1]?.timestamp || new Date().toISOString();
    }

    // Filter annotations for this prompt
    const promptAnnotations = allAnnotations.filter(annotation => {
      return entries.some(entry => {
        const historyFileName = this.getHistoryFileName(entry);
        return annotation.historyFile === historyFileName;
      });
    });

    // Calculate usage statistics
    const usageStatistics = this.calculateUsageStatistics(entries, promptAnnotations);

    // Calculate execution outcomes
    const executionOutcomes = this.calculateExecutionOutcomes(promptAnnotations);

    return {
      name: promptName,
      path: promptPath,
      content: promptContent,
      last_modified: lastModified,
      usage_statistics: usageStatistics,
      execution_outcomes: executionOutcomes,
      environment_correlations: {}, // Will be enhanced in future phases
      captured_outputs: [], // Will be populated in Phase 2
      user_annotations: promptAnnotations,
      detected_patterns: [] // Will be populated in Phase 5
    };
  }

  private getHistoryFileName(entry: HistoryEntry): string {
    // Use the actual filename from the entry
    return entry.filename;
  }

  private extractPromptName(entry: HistoryEntry): string {
    // Extract prompt name from template path
    if (entry.templatePath) {
      const ext = path.extname(entry.templatePath);
      return path.basename(entry.templatePath, ext);
    }
    // Fallback to extracting from filename if template path not available
    const match = entry.filename.match(/history_.*?_(.+)\.json$/);
    return match ? match[1] : 'unknown';
  }

  private async getAnnotations(): Promise<ParsedAnnotation[]> {
    if (!this.config.annotationDir) {
      return [];
    }

    try {
      const files = await fs.readdir(this.config.annotationDir);
      const annotationFiles = files.filter(f => 
        (f.endsWith('.md') && f.includes('annotation')) || 
        (f.endsWith('.json') && f.includes('annotation'))
      );
      
      const rawAnnotations: Array<AnnotationMetadata & { notes: string; annotationPath: string }> = [];
      
      for (const file of annotationFiles) {
        const filePath = path.join(this.config.annotationDir, file);
        
        if (file.endsWith('.json')) {
          // Handle JSON format
          const data = await fs.readJson(filePath) as AnnotationMetadata & { notes?: string };
          rawAnnotations.push({
            ...data,
            notes: data.notes || '',
            annotationPath: filePath
          });
        } else {
          // Handle legacy markdown format
          const content = await fs.readFile(filePath, 'utf-8');
          const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
          
          if (frontmatterMatch) {
            const metadata = yaml.load(frontmatterMatch[1]) as AnnotationMetadata;
            const notes = content.slice(frontmatterMatch[0].length).trim()
              .replace(/^## Notes\n\n/, ''); // Remove the "## Notes" header if present
            rawAnnotations.push({
              ...metadata,
              notes,
              annotationPath: filePath
            });
          }
        }
      }
      
      return this.annotationAnalyzer.parseAnnotations(rawAnnotations);
    } catch {
      // Directory might not exist
      return [];
    }
  }

  private calculateUsageStatistics(
    entries: HistoryEntry[],
    annotations: ParsedAnnotation[]
  ): UsageStatistics {
    const totalRuns = entries.length;
    const annotatedRuns = annotations.length;
    
    // Calculate success rate from annotations
    const successCount = annotations.filter(a => a.status === 'success').length;
    const successRate = annotatedRuns > 0 ? successCount / annotatedRuns : 0;

    // Get last used time
    const lastUsed = entries[entries.length - 1]?.timestamp || new Date().toISOString();

    // Calculate average duration from enhanced history entries
    let avgDuration = 'N/A';
    let avgActiveTime = 'N/A';
    let avgUserInputs = 'N/A';
    
    const enhancedEntries = entries as EnhancedHistoryEntry[];
    const durationsMs: number[] = [];
    const activeTimesMs: number[] = [];
    const userInputCounts: number[] = [];
    
    for (const entry of enhancedEntries) {
      if (entry.execution) {
        // Parse duration (format: "123ms" or "1h 2m 3s")
        if (entry.execution.duration) {
          const match = entry.execution.duration.match(/^(\d+)ms$/);
          if (match) {
            durationsMs.push(parseInt(match[1], 10));
          }
        }
        
        // Parse active time if available
        if (entry.execution.active_time) {
          const match = entry.execution.active_time.match(/^(\d+)ms$/);
          if (match) {
            activeTimesMs.push(parseInt(match[1], 10));
          }
        }
        
        // Track user input counts
        if (entry.execution.user_input_count !== undefined) {
          userInputCounts.push(entry.execution.user_input_count);
        }
      }
    }
    
    // Calculate averages
    if (durationsMs.length > 0) {
      const avg = durationsMs.reduce((a, b) => a + b, 0) / durationsMs.length;
      avgDuration = `${Math.round(avg)}ms`;
    }
    
    if (activeTimesMs.length > 0) {
      const avg = activeTimesMs.reduce((a, b) => a + b, 0) / activeTimesMs.length;
      avgActiveTime = `${Math.round(avg)}ms`;
    }
    
    if (userInputCounts.length > 0) {
      const avg = userInputCounts.reduce((a, b) => a + b, 0) / userInputCounts.length;
      avgUserInputs = avg.toFixed(1);
    }

    return {
      total_runs: totalRuns,
      annotated_runs: annotatedRuns,
      success_rate: successRate,
      avg_duration: avgDuration,
      last_used: lastUsed,
      avg_active_time: avgActiveTime,
      avg_user_inputs: avgUserInputs
    };
  }

  private calculateExecutionOutcomes(annotations: ParsedAnnotation[]): ExecutionOutcomes {
    let success = 0;
    let partial = 0;
    let failure = 0;

    for (const annotation of annotations) {
      switch (annotation.status) {
        case 'success':
          success++;
          break;
        case 'partial':
          partial++;
          break;
        case 'failure':
          failure++;
          break;
      }
    }

    return { success, partial, failure };
  }

  private calculateMetadata(
    analysisPeriod: string,
    prompts: PromptReviewData[],
    allEntries: HistoryEntry[]
  ): ReviewMetadata {
    const totalPrompts = prompts.length;
    const totalExecutions = allEntries.length;

    // Calculate data completeness
    const dataCompleteness = this.calculateDataCompleteness(prompts, allEntries);

    return {
      analysis_period: analysisPeriod,
      total_prompts: totalPrompts,
      total_executions: totalExecutions,
      data_completeness: dataCompleteness
    };
  }

  private calculateDataCompleteness(
    prompts: PromptReviewData[],
    entries: HistoryEntry[]
  ): DataCompleteness {
    if (entries.length === 0) {
      return {
        with_annotations: 0,
        with_output_capture: 0,
        with_environment_data: 0
      };
    }

    // Count entries with annotations
    const totalAnnotations = prompts.reduce(
      (sum, prompt) => sum + prompt.user_annotations.length,
      0
    );
    const withAnnotations = Math.round((totalAnnotations / entries.length) * 100);

    // Output capture and environment data will be tracked in future phases
    const withOutputCapture = 0;
    const withEnvironmentData = 0;

    return {
      with_annotations: withAnnotations,
      with_output_capture: withOutputCapture,
      with_environment_data: withEnvironmentData
    };
  }
}