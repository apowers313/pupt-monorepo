import * as pty from '@homebridge/node-pty-prebuilt-multiarch';
import fs from 'fs-extra';
import path from 'path';
import stripAnsi from 'strip-ansi';

import { getDataDir } from '../config/global-paths.js';
import { logger } from '../utils/logger.js';

// Helper to get high-precision timestamp
function getHighPrecisionTimestamp(): bigint {
  // Use process.hrtime.bigint() for nanosecond precision on all platforms
  return process.hrtime.bigint();
}

// Convert JSON output to plain text
function _convertJsonToPlainText(jsonFile: string, textFile: string): Promise<void> {
  return fs.readJson(jsonFile).then((chunks: OutputChunk[]) => {
    const textContent = chunks
      .filter(chunk => chunk.direction === 'output')
      .map(chunk => chunk.data)
      .join('');
    return fs.writeFile(textFile, textContent);
  });
}

// Extract user input lines from JSON output
export function extractUserInputLines(jsonFile: string): Promise<string[]> {
  return fs.readJson(jsonFile).then((chunks: OutputChunk[]) => {
    return chunks
      .filter(chunk => chunk.direction === 'input')
      .map(chunk => chunk.data.trim())
      .filter(line => line.length > 0);
  });
}

// Calculate actual execution time excluding user input wait time
export function calculateActiveExecutionTime(jsonFile: string, inputWaitThreshold = 100_000_000n): Promise<bigint> {
  return fs.readJson(jsonFile).then((chunks: OutputChunk[]) => {
    if (chunks.length === 0) {return 0n;}
    
    let totalActiveTime = 0n;
    let lastOutputTime = BigInt(chunks[0].timestamp);
    
    for (let i = 1; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkTime = BigInt(chunk.timestamp);
      const timeDiff = chunkTime - lastOutputTime;
      
      // If this is output after input and the gap is large, it's likely user thinking time
      if (chunk.direction === 'output' && chunks[i-1].direction === 'input' && timeDiff > inputWaitThreshold) {
        // Don't count the wait time, just add a small amount for processing
        totalActiveTime += inputWaitThreshold;
      } else {
        // Normal processing time
        totalActiveTime += timeDiff;
      }
      
      if (chunk.direction === 'output') {
        lastOutputTime = chunkTime;
      }
    }
    
    return totalActiveTime;
  });
}

interface OutputChunk {
  timestamp: string; // nanosecond precision timestamp as string (BigInt not JSON serializable)
  direction: 'input' | 'output';
  data: string;
}

interface CaptureResult {
  exitCode: number | null;
  outputFile: string;
  outputSize: number;
  truncated?: boolean;
  error?: string;
}

interface CaptureHandle {
  promise: Promise<CaptureResult>;
  kill: () => void;
}

interface OutputCaptureOptions {
  outputDirectory?: string;
  maxOutputSize?: number; // in bytes
}

interface ResolvedOutputCaptureOptions {
  outputDirectory: string;
  maxOutputSize: number;
}

export class OutputCaptureService {
  private readonly options: ResolvedOutputCaptureOptions;
  private defaultMaxSize = 10 * 1024 * 1024; // 10MB default

  constructor(options: OutputCaptureOptions = {}) {
    this.options = {
      outputDirectory: options.outputDirectory || path.join(getDataDir(), 'output'),
      maxOutputSize: options.maxOutputSize || this.defaultMaxSize
    };
  }

  captureCommandWithHandle(
    command: string,
    args: string[],
    prompt: string,
    outputPath: string
  ): CaptureHandle {
    let ptyProcess: pty.IPty | null = null;
    
    const promise = this._captureCommandInternal(command, args, prompt, outputPath, (process) => {
      ptyProcess = process;
    });
    
    return {
      promise,
      kill: () => {
        if (ptyProcess) {
          try {
            ptyProcess.kill();
          } catch {
            // Process might already be dead
          }
        }
      }
    };
  }

  async captureCommand(
    command: string,
    args: string[],
    prompt: string,
    outputPath: string
  ): Promise<CaptureResult> {
    return this._captureCommandInternal(command, args, prompt, outputPath);
  }

  private async _captureCommandInternal(
    command: string,
    args: string[],
    prompt: string,
    outputPath: string,
    onProcessCreated?: (process: pty.IPty) => void
  ): Promise<CaptureResult> {
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.ensureDir(outputDir);

    // Change extension from .txt to .json if needed
    const jsonOutputPath = outputPath.endsWith('.json') 
      ? outputPath 
      : outputPath.replace(/\.txt$/, '.json');
    
    // Create array to store chunks
    const chunks: OutputChunk[] = [];
    let bytesWritten = 0;
    let truncated = false;

    // Create a wrapper to track bytes and enforce size limit
    const limitedWrite = (data: string, direction: 'input' | 'output'): void => {
      if (truncated) {return;}

      const cleanData = stripAnsi(data);
      const dataSize = Buffer.byteLength(cleanData);

      if (bytesWritten + dataSize > this.options.maxOutputSize) {
        // Write only what fits
        const remaining = this.options.maxOutputSize - bytesWritten;
        const truncatedData = cleanData.substring(0, remaining);
        chunks.push({
          timestamp: getHighPrecisionTimestamp().toString(),
          direction,
          data: truncatedData
        });
        chunks.push({
          timestamp: getHighPrecisionTimestamp().toString(),
          direction: 'output',
          data: '\n\n[OUTPUT TRUNCATED - SIZE LIMIT REACHED]'
        });
        bytesWritten = this.options.maxOutputSize;
        truncated = true;
      } else {
        chunks.push({
          timestamp: getHighPrecisionTimestamp().toString(),
          direction,
          data: cleanData
        });
        bytesWritten += dataSize;
      }
    };

    return new Promise((resolve) => {
      let ptyProcess: pty.IPty | null = null;
      let stdinListener: ((data: Buffer) => void) | null = null;
      let resizeListener: (() => void) | null = null;
      const isTTY = process.stdin.isTTY && process.stdout.isTTY;

      const cleanup = () => {
        // Kill PTY process if still running
        if (ptyProcess) {
          try {
            ptyProcess.kill();
          } catch {
            // Process might already be dead
          }
        }
        
        // Restore terminal mode
        if (isTTY) {
          try {
            process.stdin.setRawMode(false);
          } catch {
            // Ignore errors if stdin is already closed
          }
        }
        
        // Remove listeners
        if (stdinListener) {
          process.stdin.removeListener('data', stdinListener);
        }
        if (resizeListener) {
          process.stdout.removeListener('resize', resizeListener);
        }
        
        process.stdin.pause();
        
        // Write chunks to JSON file
        fs.writeJsonSync(jsonOutputPath, chunks, { spaces: 2 });
      };

      try {
        // Get terminal dimensions
        const cols = process.stdout.columns || 80;
        const rows = process.stdout.rows || 30;

        // Spawn PTY process - always spawn directly to preserve TTY
        ptyProcess = pty.spawn(command, args, {
          name: 'xterm-256color',
          cols,
          rows,
          cwd: process.cwd(),
          env: process.env as Record<string, string>
        });
        
        // Notify callback if provided
        if (onProcessCreated && ptyProcess) {
          onProcessCreated(ptyProcess);
        }

        // Track Claude raw mode errors
        let claudeRawModeError = false;
        
        // Handle data from PTY
        const dataHandler = (data: string) => {
          // Pass through to terminal (preserving colors)
          process.stdout.write(data);
          // Capture clean version
          limitedWrite(data, 'output');
          
          // Check for Claude raw mode error
          if (command === 'claude' && data.includes('Raw mode is not supported') && data.includes('Ink')) {
            claudeRawModeError = true;
          }
        };
        ptyProcess.onData(dataHandler);

        // Set up bidirectional communication for TTY
        if (isTTY) {
          // Put stdin into raw mode for proper terminal interaction
          process.stdin.setRawMode(true);
          process.stdin.resume();

          // Forward stdin to PTY
          stdinListener = (data: Buffer) => {
            if (ptyProcess) {
              const inputStr = data.toString('binary');
              ptyProcess.write(inputStr);
              // Capture user input
              limitedWrite(inputStr, 'input');
            }
          };
          process.stdin.on('data', stdinListener);

          // Handle terminal resize
          resizeListener = () => {
            if (ptyProcess) {
              ptyProcess.resize(process.stdout.columns || cols, process.stdout.rows || rows);
            }
          };
          process.stdout.on('resize', resizeListener);
        }
        
        // If we have a prompt, write it to the process
        if (prompt) {
          // Write prompt in chunks to avoid blocking on large inputs
          const CHUNK_SIZE = 1024; // Safe chunk size for PTY buffers
          let written = 0;
          
          // Debug logging for CI environments is intentionally disabled
          // to avoid linting errors. Use environment-specific debugging instead.
          
          let writeTimeout: NodeJS.Timeout | null = null;
          const maxWriteTime = 5000; // 5 second max for writing all data
          
          const writeNextChunk = () => {
            if (written < prompt.length && ptyProcess) {
              const chunk = prompt.slice(written, written + CHUNK_SIZE);
              
              try {
                ptyProcess.write(chunk);
                written += chunk.length;
                
                // Progress tracking disabled for production
                
                // For macOS CI, use a small delay to prevent buffer overflow
                if (process.platform === 'darwin' && process.env.CI) {
                  setTimeout(writeNextChunk, 1);
                } else {
                  // Use setImmediate to allow PTY to process data
                  setImmediate(writeNextChunk);
                }
              } catch {
                // Write errors are expected in some environments
                // Continue anyway, command might still complete
              }
            } else if (ptyProcess) {
              if (writeTimeout) {
                clearTimeout(writeTimeout);
              }
              
              // After all data is written, send newline and EOF
              if (!prompt.endsWith('\n')) {
                ptyProcess.write('\n');
              }

              // Send EOF signal to indicate end of input
              setTimeout(() => {
                if (ptyProcess) {
                  try {
                    ptyProcess.write('\x04'); // EOT
                  } catch {
                    // EOF errors are non-critical
                  }
                }
              }, 50); // Reduced delay since we're already async
            }
          };
          
          // Set a timeout to prevent infinite hangs
          writeTimeout = setTimeout(() => {
            // Timeout reached, but process may still complete
          }, maxWriteTime);
          
          writeNextChunk();
        }

        // Handle process exit
        ptyProcess.onExit(({ exitCode }) => {
          cleanup();
          
          // If Claude had a raw mode error AND failed, provide helpful guidance
          // Only show error if Claude actually failed (non-zero exit code)
          if (claudeRawModeError && exitCode !== 0) {
            logger.error(`\n${  '─'.repeat(60)}`);
            logger.error('\x1b[31mError: Claude cannot run in interactive mode when launched from pt.\x1b[0m');
            logger.error('\x1b[33m\nThis typically happens when Claude needs to ask for directory trust permissions.\x1b[0m');
            logger.error('\x1b[34m\nTo fix this:\x1b[0m');
            logger.error('\x1b[37m1. Run Claude directly in this directory: \x1b[36mclaude\x1b[0m');
            logger.error('\x1b[37m2. When prompted, trust the directory\x1b[0m');
            logger.error('\x1b[37m3. Then run your pt command again\n\x1b[0m');
            logger.error('\x1b[90mAlternatively, you can use: \x1b[36mpt run claude -- --permission-mode acceptEdits\x1b[0m');
            logger.error(`${'─'.repeat(60)  }\n`);
          }
          
          // Write final JSON file
          fs.writeJsonSync(jsonOutputPath, chunks, { spaces: 2 });
          
          resolve({
            exitCode: (claudeRawModeError && exitCode !== 0) ? 1 : exitCode,
            outputFile: jsonOutputPath,
            outputSize: bytesWritten,
            truncated,
            error: (claudeRawModeError && exitCode !== 0) ? 'Claude requires interactive trust setup. Please see instructions above.' : undefined
          });
        });


      } catch (error) {
        cleanup();
        // Write any collected chunks before error
        if (chunks.length > 0) {
          fs.writeJsonSync(jsonOutputPath, chunks, { spaces: 2 });
        }
        
        resolve({
          exitCode: 1,
          outputFile: jsonOutputPath,
          outputSize: bytesWritten,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  async cleanupOldOutputs(retentionDays: number = 30): Promise<void> {
    if (!this.options.outputDirectory) {return;}

    try {
      await fs.ensureDir(this.options.outputDirectory);
      const files = await fs.readdir(this.options.outputDirectory);
      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        // Clean up both .txt and .json output files
        if (!file.endsWith('-output.txt') && !file.endsWith('-output.json')) {continue;}
        
        const filePath = path.join(this.options.outputDirectory, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > retentionMs) {
          await fs.remove(filePath);
        }
      }
    } catch {
      // Cleanup errors are not critical - silently continue
    }
  }
}