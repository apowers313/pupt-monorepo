import { execSync, ExecSyncOptions } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface E2eExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface E2eEnvOptions {
  /** If true, initialize a git repo in the sandbox working directory */
  initGit?: boolean;
}

export interface E2eExecOptions {
  /** Override the working directory (default: env.workDir) */
  cwd?: string;
  /** If true, don't throw on non-zero exit code */
  expectError?: boolean;
  /** Timeout in milliseconds (default: 15000) */
  timeout?: number;
}

/**
 * E2eTestEnvironment provides an isolated sandbox for e2e testing of the pt CLI.
 *
 * Key isolation features:
 * - Creates a unique temp directory as fake HOME
 * - configDir is set via PUPT_CONFIG_DIR env var to isolate config loading
 * - workDir is inside homeDir for working directory isolation
 * - Sets HOME, NODE_ENV=test, NO_COLOR=1 in child process env
 * - Clears XDG_CONFIG_HOME and XDG_DATA_HOME to prevent leakage
 */
export class E2eTestEnvironment {
  /** Root of the isolated sandbox (acts as fake HOME) */
  readonly homeDir: string;
  /** Working directory inside the sandbox (child of homeDir) */
  readonly workDir: string;
  /** Global config directory (set via PUPT_CONFIG_DIR) */
  readonly configDir: string;
  /** Absolute path to the compiled CLI */
  readonly cliPath: string;

  private constructor(homeDir: string, workDir: string, configDir: string, cliPath: string) {
    this.homeDir = homeDir;
    this.workDir = workDir;
    this.configDir = configDir;
    this.cliPath = cliPath;
  }

  /**
   * Create a new isolated test environment.
   * - Creates a unique temp directory as the fake HOME
   * - Creates a workDir inside it (so cosmiconfig traversal stops at homeDir)
   * - Optionally initializes a git repo in workDir
   */
  static async create(options: E2eEnvOptions = {}): Promise<E2eTestEnvironment> {
    const homeDir = path.join(
      os.tmpdir(),
      `pt-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    );
    const workDir = path.join(homeDir, 'project');
    const configDir = path.join(homeDir, '.config', 'pupt');
    const cliPath = path.resolve(__dirname, '../../dist/cli.js');

    await fs.ensureDir(workDir);
    await fs.ensureDir(configDir);

    if (options.initGit) {
      execSync('git init', { cwd: workDir, stdio: 'ignore' });
      execSync('git config user.email "test@test.com"', { cwd: workDir, stdio: 'ignore' });
      execSync('git config user.name "Test"', { cwd: workDir, stdio: 'ignore' });
    }

    return new E2eTestEnvironment(homeDir, workDir, configDir, cliPath);
  }

  /**
   * Execute a pt command with full environment isolation.
   * - HOME is set to this.homeDir (makes os.homedir() return fake home)
   * - PUPT_CONFIG_DIR points to isolated config directory
   * - cwd is set to this.workDir (or options.cwd)
   * - NODE_ENV=test (prevents old config migration prompt)
   * - NO_COLOR=1, FORCE_COLOR=0 to suppress ANSI codes
   * - XDG vars cleared to prevent leakage
   */
  exec(args: string, options: E2eExecOptions = {}): E2eExecResult {
    const cwd = options.cwd ?? this.workDir;
    const timeout = options.timeout ?? 15000;

    // Build isolated environment
    const env: Record<string, string | undefined> = {
      ...process.env,
      HOME: this.homeDir,
      USERPROFILE: this.homeDir, // Windows compatibility
      PUPT_CONFIG_DIR: this.configDir,
      NODE_ENV: 'test',
      NO_COLOR: '1',
      FORCE_COLOR: '0',
      // Clear XDG vars that could leak
      XDG_CONFIG_HOME: undefined,
      XDG_DATA_HOME: undefined,
    };

    const execOptions: ExecSyncOptions = {
      cwd,
      env: env as NodeJS.ProcessEnv,
      encoding: 'utf-8',
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
    };

    try {
      const stdout = execSync(`node "${this.cliPath}" ${args}`, execOptions) as string;
      return { stdout, stderr: '', exitCode: 0 };
    } catch (error: unknown) {
      const execError = error as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
      if (options.expectError) {
        return {
          stdout: execError.stdout?.toString() ?? '',
          stderr: execError.stderr?.toString() ?? '',
          exitCode: execError.status ?? 1,
        };
      }
      throw error;
    }
  }

  /** Write a config.json in the global config directory (configDir).
   * Relative paths in promptDirs, historyDir, and annotationDir are
   * automatically resolved against workDir so that the CLI finds them
   * correctly (config paths are resolved relative to the config file
   * directory, not the working directory).
   */
  async writeConfig(config: Record<string, unknown>): Promise<void> {
    await fs.ensureDir(this.configDir);
    // Resolve relative paths in well-known fields against workDir
    const resolved = { ...config };
    if (Array.isArray(resolved.promptDirs)) {
      resolved.promptDirs = (resolved.promptDirs as string[]).map(d =>
        d.startsWith('/') || d.startsWith('~') ? d : path.join(this.workDir, d)
      );
    }
    if (typeof resolved.historyDir === 'string' && !resolved.historyDir.startsWith('/') && !resolved.historyDir.startsWith('~')) {
      resolved.historyDir = path.join(this.workDir, resolved.historyDir);
    }
    if (typeof resolved.annotationDir === 'string' && !resolved.annotationDir.startsWith('/') && !resolved.annotationDir.startsWith('~')) {
      resolved.annotationDir = path.join(this.workDir, resolved.annotationDir);
    }
    await fs.writeJson(path.join(this.configDir, 'config.json'), resolved, { spaces: 2 });
  }

  /** Create a prompt file in a given directory (relative to workDir) */
  async writePrompt(dir: string, filename: string, content: string): Promise<void> {
    const promptDir = path.join(this.workDir, dir);
    await fs.ensureDir(promptDir);
    await fs.writeFile(path.join(promptDir, filename), content);
  }

  /** Create a history entry JSON file */
  async writeHistoryEntry(
    historyDir: string,
    filename: string,
    entry: Record<string, unknown>
  ): Promise<void> {
    const absHistoryDir = path.join(this.workDir, historyDir);
    await fs.ensureDir(absHistoryDir);
    await fs.writeJson(path.join(absHistoryDir, filename), entry, { spaces: 2 });
  }

  /** Read a file from the workDir */
  async readFile(relativePath: string): Promise<string> {
    return fs.readFile(path.join(this.workDir, relativePath), 'utf-8');
  }

  /** Read a JSON file from the workDir */
  async readJson(relativePath: string): Promise<unknown> {
    return fs.readJson(path.join(this.workDir, relativePath));
  }

  /** Read the config.json from the configDir */
  async readConfigJson(): Promise<unknown> {
    return fs.readJson(path.join(this.configDir, 'config.json'));
  }

  /** Check if a file exists in workDir */
  async exists(relativePath: string): Promise<boolean> {
    return fs.pathExists(path.join(this.workDir, relativePath));
  }

  /** List files in a directory within workDir */
  async listDir(relativePath: string): Promise<string[]> {
    const absPath = path.join(this.workDir, relativePath);
    if (!(await fs.pathExists(absPath))) {
      return [];
    }
    return fs.readdir(absPath);
  }

  /** Remove the entire sandbox */
  async cleanup(): Promise<void> {
    // Retry removal for Windows EBUSY errors
    const maxRetries = 3;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await fs.remove(this.homeDir);
        return;
      } catch (error: unknown) {
        const fsError = error as { code?: string };
        if (fsError.code === 'EBUSY' && i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        } else if (fsError.code !== 'EBUSY') {
          throw error;
        }
        // On last attempt with EBUSY, just ignore - CI will clean up temp files
      }
    }
  }

  /** Strip ANSI escape codes from a string */
  static stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
  }
}
