import simpleGit, { SimpleGit, StatusResult, LogResult } from 'simple-git';
import { errors } from '../utils/errors.js';

export interface CloneOptions {
  depth?: number;
  branch?: string;
  singleBranch?: boolean;
}

export interface PullOptions {
  remote?: string;
  branch?: string;
}

export class GitService {
  private git: SimpleGit;

  constructor(workingDirectory?: string) {
    this.git = simpleGit(workingDirectory);
  }

  async isRepository(path?: string): Promise<boolean> {
    try {
      const git = path ? simpleGit(path) : this.git;
      return await git.checkIsRepo();
    } catch {
      return false;
    }
  }

  async cloneRepository(url: string, destination: string, options: CloneOptions = {}): Promise<void> {
    try {
      const args: string[] = [];
      
      if (options.depth !== undefined) {
        args.push('--depth', options.depth.toString());
      } else {
        args.push('--depth', '1'); // Default to shallow clone
      }
      
      if (options.branch) {
        args.push('--branch', options.branch);
      }
      
      if (options.singleBranch !== false) {
        args.push('--single-branch');
      }
      
      await this.git.clone(url, destination, args);
    } catch (error) {
      throw errors.gitError(`Failed to clone repository: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async pullRepository(path: string, options: PullOptions = {}): Promise<void> {
    try {
      const git = simpleGit(path);
      
      if (options.remote && options.branch) {
        await git.pull(options.remote, options.branch);
      } else {
        await git.pull();
      }
    } catch (error) {
      throw errors.gitError(`Failed to pull repository: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateGitUrl(url: string): void {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      throw errors.validationError('URL', 'non-empty string', url);
    }

    // Support common git URL formats
    const gitUrlPatterns = [
      // HTTPS URLs
      /^https:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\.git)?$/,
      // SSH URLs (git@)
      /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\.git)?$/,
      // SSH URLs (ssh://)
      /^ssh:\/\/git@[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\.git)?$/,
      // Git protocol
      /^git:\/\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+(?:\.git)?$/,
      // File protocol (for testing and local repos)
      /^file:\/\/\/.+$/
    ];

    const isValidGitUrl = gitUrlPatterns.some(pattern => pattern.test(url));

    if (!isValidGitUrl) {
      throw errors.validationError('git URL format', 'valid git URL', url);
    }
  }

  extractRepoName(url: string): string {
    // Remove .git suffix if present
    const cleanUrl = url.replace(/\.git$/, '');
    
    // Extract repo name from different URL formats
    let repoName: string;
    
    if (url.includes('://')) {
      // HTTPS, git://, or file:// URLs
      const parts = cleanUrl.split('/');
      repoName = parts[parts.length - 1];
      
      // For file:// URLs that might end with a slash
      if (!repoName && parts.length > 1) {
        repoName = parts[parts.length - 2];
      }
    } else if (url.startsWith('git@')) {
      // SSH URLs (git@host:user/repo)
      const parts = cleanUrl.split(':')[1].split('/');
      repoName = parts[parts.length - 1];
    } else {
      throw errors.validationError('repository URL', 'URL with repository name', url);
    }

    if (!repoName) {
      throw errors.validationError('repository URL', 'URL with repository name', url);
    }

    return repoName;
  }

  async getCurrentBranch(): Promise<string | null> {
    try {
      const branchSummary = await this.git.branch();
      return branchSummary.current;
    } catch {
      return null;
    }
  }

  async getStatus(): Promise<StatusResult | null> {
    try {
      return await this.git.status();
    } catch {
      return null;
    }
  }

  async getRemoteUrl(remote: string = 'origin'): Promise<string | null> {
    try {
      const url = await this.git.remote(['get-url', remote]);
      return url ? url.trim() : null;
    } catch {
      return null;
    }
  }

  async getRecentCommits(limit: number = 10): Promise<LogResult | null> {
    try {
      return await this.git.log(['-n', limit.toString()]);
    } catch {
      return null;
    }
  }

  async hasUncommittedChanges(): Promise<boolean> {
    try {
      const status = await this.git.status();
      return !status.isClean();
    } catch {
      return false;
    }
  }

  async getRepositoryRoot(): Promise<string | null> {
    try {
      const root = await this.git.revparse(['--show-toplevel']);
      return root.trim();
    } catch {
      return null;
    }
  }

  setWorkingDirectory(path: string): void {
    this.git = simpleGit(path);
  }
}