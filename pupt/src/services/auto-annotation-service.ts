import type { Config } from '../types/config.js';
import type { EnhancedHistoryEntry } from '../types/history.js';
import type { AnnotationMetadata, IssueIdentified, StructuredOutcome } from '../types/annotations.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { HistoryManager } from '../history/history-manager.js';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

interface AnalysisResult {
  status: 'success' | 'partial' | 'failure';
  notes?: string;
  structured_outcome?: StructuredOutcome;
  issues_identified?: IssueIdentified[];
}

export class AutoAnnotationService {
  constructor(
    private config: Config,
    private promptManager: PromptManager,
    private historyManager: HistoryManager
  ) {}

  /**
   * Check if auto-annotation should run for a given prompt
   */
  shouldAutoAnnotate(promptName: string): boolean {
    if (!this.config.autoAnnotate?.enabled) {
      return false;
    }

    // If triggers array is missing or empty, run for all prompts
    if (!this.config.autoAnnotate.triggers || this.config.autoAnnotate.triggers.length === 0) {
      return true;
    }

    return this.config.autoAnnotate.triggers.includes(promptName);
  }

  /**
   * Analyze execution output and create annotation
   */
  async analyzeExecution(historyEntry: EnhancedHistoryEntry): Promise<void> {
    // Store history entry for use in executeAnalysisPrompt
    this.historyEntry = historyEntry;

    try {
      // Skip if no output file
      if (!historyEntry.execution?.output_file) {
        logger.debug('No output file found, skipping auto-annotation');
        return;
      }

      // Read the output file
      const fullOutputContent = await fs.readFile(historyEntry.execution.output_file, 'utf-8');
      
      // Truncate output to prevent OOM errors (max 100KB for analysis)
      const MAX_OUTPUT_LENGTH = 100 * 1024; // 100KB
      let outputContent = fullOutputContent;
      if (fullOutputContent.length > MAX_OUTPUT_LENGTH) {
        // Take first 50KB and last 50KB
        const halfSize = MAX_OUTPUT_LENGTH / 2;
        const firstPart = fullOutputContent.slice(0, halfSize);
        const lastPart = fullOutputContent.slice(-halfSize);
        outputContent = `${firstPart}\n\n[... truncated ${fullOutputContent.length - MAX_OUTPUT_LENGTH} characters ...]\n\n${lastPart}`;
        logger.debug(`Truncated output from ${fullOutputContent.length} to ${outputContent.length} characters for analysis`);
      }

      let analysisResult: AnalysisResult;

      try {
        // Try AI analysis
        analysisResult = await this.runAIAnalysis(outputContent);
      } catch (error) {
        logger.warn('Auto-annotation failed: ' + (error instanceof Error ? error.message : String(error)));
        return;
      }

      // Create annotation
      const annotation = this.createAnnotation(historyEntry, analysisResult);
      
      // Save annotation with notes
      logger.debug(`Saving auto-annotation for history entry: ${historyEntry.filename}`);
      logger.debug(`Annotation directory: ${this.config.annotationDir || this.config.historyDir}`);
      
      await this.historyManager.saveAnnotation(historyEntry, annotation, analysisResult.notes);
      
      logger.log('Auto-annotation completed and saved successfully');
    } catch (error) {
      logger.error('Failed to auto-annotate execution', error);
    } finally {
      // Clear stored history entry
      this.historyEntry = undefined;
    }
  }

  /**
   * Run AI analysis using the configured analysis prompt
   */
  private async runAIAnalysis(outputContent: string): Promise<AnalysisResult> {
    if (!this.config.autoAnnotate?.analysisPrompt) {
      throw new Error('No analysis prompt configured');
    }

    // Find the analysis prompt
    const analysisPrompt = await this.promptManager.findPrompt(this.config.autoAnnotate.analysisPrompt);
    if (!analysisPrompt) {
      throw new Error(`Analysis prompt '${this.config.autoAnnotate.analysisPrompt}' not found`);
    }

    // Execute the analysis prompt
    const result = await this.executeAnalysisPrompt(analysisPrompt, outputContent);

    // Parse and validate the result
    return this.parseAnalysisResult(result);
  }

  /**
   * Execute the analysis prompt with the output content
   */
  private async executeAnalysisPrompt(prompt: { content: string }, outputContent: string): Promise<AnalysisResult> {
    // Read the original prompt from the history entry
    const historyEntry = this.historyEntry;
    const originalPrompt = historyEntry?.finalPrompt || '';

    // Truncate original prompt if too long
    const MAX_PROMPT_LENGTH = 50 * 1024; // 50KB
    let truncatedPrompt = originalPrompt;
    if (originalPrompt.length > MAX_PROMPT_LENGTH) {
      truncatedPrompt = originalPrompt.slice(0, MAX_PROMPT_LENGTH) + '\n\n[... prompt truncated ...]';
    }

    // Create a combined prompt with the analysis template
    const analysisContext = `
**Original Prompt**:
${truncatedPrompt}

**AI Output**:
${outputContent}

**Execution Metadata**:
- Exit Code: ${historyEntry?.execution?.exit_code || 0}
- Duration: ${historyEntry?.execution?.duration || 'unknown'}
- Command: ${historyEntry?.execution?.command || 'unknown'}

---

${prompt.content}`;

    // Log total size for debugging
    logger.debug(`Total analysis context size: ${analysisContext.length} characters`);

    // Determine which tool to use
    const tool = await this.findAvailableTool();
    if (!tool) {
      throw new Error('No AI tool available for analysis');
    }

    try {
      // Use spawn for true background execution
      const { spawn } = await import('node:child_process');
      
      // For claude, use -p flag for non-interactive mode
      const args: string[] = [];
      if (tool === 'claude') {
        args.push('-p'); // Print response and exit
      }
      
      // Execute the tool in a truly detached process
      const analysisProcess = spawn(tool, args, {
        detached: true,
        stdio: ['pipe', 'ignore', 'ignore'], // Only pipe stdin, ignore stdout and stderr
        env: { ...process.env, CLAUDE_NO_CONTINUE: '1' } // Ensure new session
      });
      
      // Send the prompt via stdin
      analysisProcess.stdin.write(analysisContext);
      analysisProcess.stdin.end();
      
      // Unref the process so Node.js can exit without waiting for it
      analysisProcess.unref();
      
      // Don't wait for completion - let it run in the background
      // The actual annotation will be created by the AI tool itself
      return {
        status: 'success' as const,
        notes: 'Auto-annotation launched in background'
      };
    } catch (error) {
      throw error;
    }
  }

  private historyEntry?: EnhancedHistoryEntry;

  /**
   * Find an available AI tool
   */
  private async findAvailableTool(): Promise<string | null> {
    const execFileAsync = promisify(execFile);
    
    // Check for configured default tool first
    if (this.config.defaultCmd) {
      try {
        if (process.platform === 'win32') {
          await execFileAsync('where', [this.config.defaultCmd]);
        } else {
          await execFileAsync('which', [this.config.defaultCmd]);
        }
        return this.config.defaultCmd;
      } catch {
        // Default tool not found, continue checking
      }
    }

    // Check for common AI tools
    const tools = ['claude', 'q', 'copilot'];
    for (const tool of tools) {
      try {
        if (process.platform === 'win32') {
          await execFileAsync('where', [tool]);
        } else {
          await execFileAsync('which', [tool]);
        }
        return tool;
      } catch {
        // Tool not found, continue checking
      }
    }

    return null;
  }

  /**
   * Parse and validate AI analysis result
   */
  private parseAnalysisResult(result: unknown): AnalysisResult {
    // If result is already an object, validate it
    if (typeof result === 'object' && result !== null) {
      const obj = result as Record<string, unknown>;
      // Validate required fields
      if (!obj.status || !['success', 'partial', 'failure'].includes(String(obj.status))) {
        throw new Error('Invalid analysis result: missing or invalid status');
      }
      return obj as unknown as AnalysisResult;
    }

    // If result is a string, try to parse as JSON
    if (typeof result === 'string') {
      try {
        const parsed = JSON.parse(result);
        return this.parseAnalysisResult(parsed);
      } catch {
        throw new Error('Failed to parse analysis result as JSON');
      }
    }

    throw new Error('Invalid analysis result format');
  }


  /**
   * Create annotation from analysis result
   */
  private createAnnotation(
    historyEntry: EnhancedHistoryEntry,
    analysisResult: AnalysisResult
  ): AnnotationMetadata {
    const annotation: AnnotationMetadata = {
      historyFile: path.basename(historyEntry.timestamp + '.json'),
      timestamp: new Date().toISOString(),
      status: analysisResult.status,
      tags: ['auto-annotation'],
      auto_detected: true,
    };

    // Add ai-analysis tag
    annotation.tags.push('ai-analysis');

    // Add structured outcome if available
    if (analysisResult.structured_outcome) {
      annotation.structured_outcome = analysisResult.structured_outcome;
    }

    // Add identified issues
    if (analysisResult.issues_identified && analysisResult.issues_identified.length > 0) {
      annotation.issues_identified = analysisResult.issues_identified;
    }

    return annotation;
  }
}