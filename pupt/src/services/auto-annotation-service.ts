import type { Config } from '../types/config.js';
import type { EnhancedHistoryEntry } from '../types/history.js';
import type { AnnotationMetadata, IssueIdentified, StructuredOutcome } from '../types/annotations.js';
import { PromptManager } from '../prompts/prompt-manager.js';
import { HistoryManager } from '../history/history-manager.js';
import fs from 'fs-extra';
import * as fsNode from 'node:fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

interface AnalysisResult {
  status: 'success' | 'partial' | 'failure';
  notes?: string;
  tags?: string[];
  auto_detected?: boolean;
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

      // Construct full path to output file
      // The output_file can be either:
      // 1. Just a filename (when stored by history-manager using path.relative)
      // 2. An absolute path (in some test scenarios)
      const historyDir = this.config.historyDir || '.pthistory';
      let outputFilePath = historyEntry.execution.output_file;
      
      // If it's not an absolute path and doesn't exist as-is, try joining with history dir
      if (!path.isAbsolute(outputFilePath)) {
        const possiblePath = path.join(historyDir, outputFilePath);
        // Check if the file exists at the joined path
        try {
          await fs.access(possiblePath);
          outputFilePath = possiblePath;
        } catch {
          // If not found at joined path, try as-is (might be relative to cwd)
        }
      }

      // Read the output file
      const fullOutputContent = await fs.readFile(outputFilePath, 'utf-8');
      
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

      try {
        // Try AI analysis - Claude will run in background and save the annotation
        await this.runAIAnalysis(outputContent);
        // Analysis is running in background, we can return immediately
      } catch (error) {
        logger.warn('Auto-annotation failed: ' + (error instanceof Error ? error.message : String(error)));
        // Do NOT create any annotation if analysis fails
        return;
      }
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

    // Get annotation directory and filename info
    const annotationDir = this.config.annotationDir || this.config.historyDir;
    const historyBasename = path.basename(
      historyEntry?.filename || `${historyEntry?.timestamp}.json`,
      '.json'
    );

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
- History File: ${historyBasename}
- Annotation Directory: ${annotationDir}

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
      // Use spawn for background execution but capture output
      const { spawn } = await import('node:child_process');
      
      // For claude, use -p flag for non-interactive mode and output format
      const args: string[] = [];
      if (tool === 'claude') {
        args.push('-p'); // Print response and exit
        args.push('--permission-mode', 'acceptEdits'); // Bypass directory trust prompt
        args.push('--output-format', 'json'); // Request JSON output format
      }
      
      // Log that we're launching the analysis
      logger.log(`Launching auto-annotation analysis with ${tool}...`);
      logger.debug(`Working directory: ${process.cwd()}`);
      logger.debug(`Annotation will be saved to: ${annotationDir}`);
      
      // Create temporary files for output capture
      const tmpDir = await import('os').then(os => os.tmpdir());
      const timestamp = Date.now();
      const stdoutFile = path.join(tmpDir, `pt-annotation-${timestamp}-stdout.txt`);
      const stderrFile = path.join(tmpDir, `pt-annotation-${timestamp}-stderr.txt`);
      
      // Add debug logging for file paths
      logger.debug(`Auto-annotation temp files: stdout=${stdoutFile}, stderr=${stderrFile}`);
      
      // Execute the tool in background with output redirected to files
      // Use file descriptors instead of streams for detached process
      const stdoutFd = fsNode.openSync(stdoutFile, 'w');
      const stderrFd = fsNode.openSync(stderrFile, 'w');
      
      const analysisProcess = spawn(tool, args, {
        detached: true,
        stdio: ['pipe', stdoutFd, stderrFd],
        env: { ...process.env, CLAUDE_NO_CONTINUE: '1' } // Ensure new session
      });
      
      // Log the PID for debugging
      logger.debug(`Auto-annotation process started with PID: ${analysisProcess.pid}`);
      
      // Send the prompt via stdin
      if (analysisProcess.stdin) {
        analysisProcess.stdin.write(analysisContext);
        analysisProcess.stdin.end();
      }
      
      // Close file descriptors in parent process
      fsNode.closeSync(stdoutFd);
      fsNode.closeSync(stderrFd);
      
      // Store info needed for completion handler
      const historyEntry = this.historyEntry;
      
      // Create a marker file with all the info needed to save the annotation
      const markerFile = path.join(tmpDir, `pt-annotation-${timestamp}-marker.json`);
      const markerData = {
        stdoutFile,
        stderrFile,
        historyEntry,
        annotationDir,
        pid: analysisProcess.pid
      };
      await fs.writeJson(markerFile, markerData);
      
      // Start a watcher process that will monitor and save the annotation
      const watcherCode = `
        const fs = require('fs-extra');
        const path = require('path');
        const { v4: uuidv4 } = require('uuid');
        
        async function watchAndSave() {
          const markerFile = '${markerFile}';
          const marker = await fs.readJson(markerFile);
          const maxWait = 30000; // 30 seconds
          const startTime = Date.now();
          
          // Poll for completion
          while (Date.now() - startTime < maxWait) {
            try {
              // Check if process is still running
              process.kill(marker.pid, 0);
              // Still running, wait
              await new Promise(resolve => setTimeout(resolve, 1000));
            } catch {
              // Process finished
              break;
            }
          }
          
          // Process the result
          try {
            const stdout = await fs.readFile(marker.stdoutFile, 'utf-8');
            
            // Parse result (simplified version)
            const parsed = JSON.parse(stdout);
            let result;
            if (parsed.result && typeof parsed.result === 'string') {
              const match = parsed.result.match(/\\{[\\s\\S]*\\}/);
              if (match) result = JSON.parse(match[0]);
            }
            
            if (result && result.status) {
              // Save annotation
              const annotationData = {
                historyFile: marker.historyEntry.filename,
                timestamp: new Date().toISOString(),
                status: result.status,
                tags: result.tags || ['auto-annotation', 'ai-analysis'],
                auto_detected: true,
                structured_outcome: result.structured_outcome,
                issues_identified: result.issues_identified,
                notes: result.notes || 'Auto-generated annotation'
              };
              
              const filename = path.basename(marker.historyEntry.filename, '.json') + '-annotation-' + uuidv4() + '.json';
              const filepath = path.join(marker.annotationDir || '.pthistory', filename);
              
              await fs.ensureDir(path.dirname(filepath));
              await fs.writeJson(filepath, annotationData, { spaces: 2 });
              console.log('Auto-annotation saved to', filepath);
            }
          } catch (error) {
            console.error('Failed to save annotation:', error);
          } finally {
            // Clean up
            await fs.remove(marker.stdoutFile).catch(() => {});
            await fs.remove(marker.stderrFile).catch(() => {});
            await fs.remove(markerFile).catch(() => {});
          }
        }
        
        watchAndSave();
      `;
      
      // Start the watcher as a detached process
      const watcherProcess = spawn(process.execPath, ['-e', watcherCode], {
        detached: true,
        stdio: 'ignore'
      });
      watcherProcess.unref();
      
      // Unref the process so Node.js can exit without waiting
      analysisProcess.unref();
      
      // Log that we've launched the analysis
      logger.log(`Auto-annotation analysis launched in background.`);
      
      // Return a special result indicating background processing
      return {
        status: 'success' as const,
        notes: 'Analysis delegated to Claude (running in background)'
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
    // If result is a string, try to extract JSON
    if (typeof result === 'string') {
      try {
        // If using --output-format json, Claude returns a wrapper object
        // Try to parse the entire string first
        let parsed: unknown;
        try {
          parsed = JSON.parse(result);
        } catch {
          // If direct parsing fails, try to extract JSON from the response
          // Look for JSON object in the output
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found in response');
          }
        }
        
        // If Claude returned a wrapper with 'result' or 'content' field
        if (typeof parsed === 'object' && parsed !== null) {
          // Check for 'result' field (Claude's JSON output format)
          if ('result' in parsed) {
            const result = (parsed as { result: unknown }).result;
            if (typeof result === 'string') {
              // Extract JSON from the result string
              const jsonMatch = result.match(/```json\s*(\{[\s\S]*?\})\s*```/);
              if (jsonMatch) {
                return this.parseAnalysisResult(JSON.parse(jsonMatch[1]));
              }
              // Try without code block markers
              const plainJsonMatch = result.match(/\{[\s\S]*\}/);
              if (plainJsonMatch) {
                return this.parseAnalysisResult(JSON.parse(plainJsonMatch[0]));
              }
            }
          }
          // Check for 'content' field (alternative format)
          else if ('content' in parsed) {
            const content = (parsed as { content: unknown }).content;
            if (typeof content === 'string') {
              // Parse the content if it's a JSON string
              try {
                return this.parseAnalysisResult(JSON.parse(content));
              } catch {
                // If content is not JSON, try to extract JSON from it
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  return this.parseAnalysisResult(JSON.parse(jsonMatch[0]));
                }
              }
            } else if (typeof content === 'object') {
              return this.parseAnalysisResult(content);
            }
          }
        }
        
        // Otherwise, treat parsed as the result
        return this.parseAnalysisResult(parsed);
      } catch (error) {
        logger.debug(`Failed to parse analysis result: ${result}`);
        throw new Error(`Failed to parse analysis result as JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // If result is already an object, validate it
    if (typeof result === 'object' && result !== null) {
      const obj = result as Record<string, unknown>;
      
      // Handle empty object case
      if (Object.keys(obj).length === 0) {
        throw new Error('Empty analysis result');
      }
      
      // Validate required fields
      if (!obj.status || !['success', 'partial', 'failure'].includes(String(obj.status))) {
        throw new Error('Invalid analysis result: missing or invalid status');
      }
      
      return obj as unknown as AnalysisResult;
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