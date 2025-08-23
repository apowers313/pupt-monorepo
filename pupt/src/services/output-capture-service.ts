import * as pty from '@homebridge/node-pty-prebuilt-multiarch';
import stripAnsi from 'strip-ansi';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { logger } from '../utils/logger.js';

export interface CaptureResult {
  exitCode: number | null;
  outputFile: string;
  outputSize: number;
  truncated?: boolean;
  error?: string;
}

export interface CaptureHandle {
  promise: Promise<CaptureResult>;
  kill: () => void;
}

export interface OutputCaptureOptions {
  outputDirectory?: string;
  maxOutputSize?: number; // in bytes
}

export class OutputCaptureService {
  private readonly options: OutputCaptureOptions;
  private defaultMaxSize = 10 * 1024 * 1024; // 10MB default

  constructor(options: OutputCaptureOptions = {}) {
    this.options = {
      outputDirectory: options.outputDirectory || './.history',
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

    // Create write stream with size tracking
    const writeStream = fs.createWriteStream(outputPath);
    let bytesWritten = 0;
    let truncated = false;

    // Create a wrapper to track bytes and enforce size limit
    const limitedWrite = (data: string): void => {
      if (truncated) return;
      if (!writeStream.writable) return; // Prevent writes after stream is closed

      const cleanData = stripAnsi(data);
      const dataSize = Buffer.byteLength(cleanData);

      if (bytesWritten + dataSize > this.options.maxOutputSize!) {
        // Write only what fits
        const remaining = this.options.maxOutputSize! - bytesWritten;
        const truncatedData = cleanData.substring(0, remaining);
        writeStream.write(truncatedData);
        writeStream.write('\n\n[OUTPUT TRUNCATED - SIZE LIMIT REACHED]');
        bytesWritten = this.options.maxOutputSize!;
        truncated = true;
      } else {
        writeStream.write(cleanData);
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
        
        // End the write stream only if it's still writable
        if (writeStream.writable) {
          writeStream.end();
        }
      };

      try {
        // Get terminal dimensions
        const cols = process.stdout.columns || 80;
        const rows = process.stdout.rows || 30;

        // For Claude with a prompt, use a shell to pipe the prompt to avoid paste detection
        // This allows the prompt to run immediately while keeping PTY for interaction
        if (command === 'claude' && prompt && isTTY) {
          // Create a temporary file for the prompt
          const tmpFile = path.join(os.tmpdir(), `pt-prompt-${Date.now()}.txt`);
          fs.writeFileSync(tmpFile, prompt);
          
          // Spawn shell that pipes the prompt to Claude
          const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
          const shellArgs = process.platform === 'win32' 
            ? ['/c', `type "${tmpFile}" | claude ${args.join(' ')}`]
            : ['-c', `cat "${tmpFile}" | claude ${args.join(' ')}`];
          
          ptyProcess = pty.spawn(shell, shellArgs, {
            name: 'xterm-256color',
            cols,
            rows,
            cwd: process.cwd(),
            env: process.env as Record<string, string>
          });
          
          // Clean up temp file after a delay
          setTimeout(() => fs.unlink(tmpFile).catch(() => {}), 1000);
        } else {
          // Normal PTY spawn for other commands
          ptyProcess = pty.spawn(command, args, {
            name: 'xterm-256color',
            cols,
            rows,
            cwd: process.cwd(),
            env: process.env as Record<string, string>
          });
        }
        
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
          limitedWrite(data);
          
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
              ptyProcess.write(data.toString('binary'));
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
        
        // If we have a prompt and it's not Claude in TTY mode, send it
        // (Claude in TTY mode already has the prompt piped via shell)
        if (prompt && !(command === 'claude' && isTTY)) {
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
              
              // Send EOF signal for commands that need it
              if (command !== 'claude') {
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
          
          // If Claude had a raw mode error, provide helpful guidance
          if (claudeRawModeError) {
            logger.error('\n' + '─'.repeat(60));
            logger.error('\x1b[31mError: Claude cannot run in interactive mode when launched from pt.\x1b[0m');
            logger.error('\x1b[33m\nThis typically happens when Claude needs to ask for directory trust permissions.\x1b[0m');
            logger.error('\x1b[34m\nTo fix this:\x1b[0m');
            logger.error('\x1b[37m1. Run Claude directly in this directory: \x1b[36mclaude\x1b[0m');
            logger.error('\x1b[37m2. When prompted, trust the directory\x1b[0m');
            logger.error('\x1b[37m3. Then run your pt command again\n\x1b[0m');
            logger.error('\x1b[90mAlternatively, you can use: \x1b[36mpt run claude -- --permission-mode acceptEdits\x1b[0m');
            logger.error('─'.repeat(60) + '\n');
          }
          
          resolve({
            exitCode: claudeRawModeError ? 1 : exitCode,
            outputFile: outputPath,
            outputSize: bytesWritten,
            truncated,
            error: claudeRawModeError ? 'Claude requires interactive trust setup. Please see instructions above.' : undefined
          });
        });


      } catch (error) {
        cleanup();
        resolve({
          exitCode: 1,
          outputFile: outputPath,
          outputSize: bytesWritten,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  async cleanupOldOutputs(retentionDays: number = 30): Promise<void> {
    if (!this.options.outputDirectory) return;

    try {
      await fs.ensureDir(this.options.outputDirectory);
      const files = await fs.readdir(this.options.outputDirectory);
      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        // Only clean up output files, not history JSON files
        if (!file.endsWith('-output.txt')) continue;
        
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