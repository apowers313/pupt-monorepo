import type { PromptSource, DiscoveredPromptFile } from '../../types/prompt-source';

/** Configuration options for GitHubPromptSource */
export interface GitHubPromptSourceOptions {
  /** Git ref (branch, tag, or commit SHA). Defaults to 'main'. */
  ref?: string;
  /** GitHub personal access token for private repos or to avoid rate limiting. */
  token?: string;
  /** Explicit prompt directories to scan (relative to repo root). Overrides default 'prompts/'. */
  promptDirs?: string[];
}

/** A Git tree entry from the GitHub API */
interface GitTreeEntry {
  path: string;
  type: 'blob' | 'tree';
  sha: string;
}

/** Response from the GitHub Git Trees API */
interface GitTreeResponse {
  sha: string;
  tree: GitTreeEntry[];
}

/**
 * Parse a "owner/repo" string into its parts.
 */
export function parseGitHubSource(source: string): { owner: string; repo: string; ref?: string } {
  // Handle "owner/repo#ref" format
  const hashIndex = source.indexOf('#');
  let ownerRepo = source;
  let ref: string | undefined;

  if (hashIndex !== -1) {
    ownerRepo = source.slice(0, hashIndex);
    ref = source.slice(hashIndex + 1);
  }

  const slashIndex = ownerRepo.indexOf('/');
  if (slashIndex === -1) {
    throw new Error(`Invalid GitHub source format: expected "owner/repo", got "${source}"`);
  }

  return {
    owner: ownerRepo.slice(0, slashIndex),
    repo: ownerRepo.slice(slashIndex + 1),
    ref,
  };
}

/**
 * Discovers .prompt files from a GitHub repository using the Git Trees API.
 *
 * Fetches the repository tree and filters for files matching `prompts/*.prompt`,
 * then fetches each file's content from raw.githubusercontent.com.
 */
export class GitHubPromptSource implements PromptSource {
  private owner: string;
  private repo: string;
  private ref: string;
  private token?: string;
  private promptDirs?: string[];

  constructor(ownerRepo: string, options?: GitHubPromptSourceOptions) {
    const parsed = parseGitHubSource(ownerRepo);
    this.owner = parsed.owner;
    this.repo = parsed.repo;
    this.ref = options?.ref ?? parsed.ref ?? 'main';
    this.token = options?.token;
    this.promptDirs = options?.promptDirs;
  }

  async getPrompts(): Promise<DiscoveredPromptFile[]> {
    const tree = await this.fetchTree();
    const promptEntries = this.filterPromptFiles(tree);

    if (promptEntries.length === 0) {
      return [];
    }

    const results: DiscoveredPromptFile[] = [];
    for (const entry of promptEntries) {
      const content = await this.fetchFileContent(entry.path);
      const filename = entry.path.split('/').pop()!;
      results.push({ filename, content });
    }

    return results;
  }

  private async fetchTree(): Promise<GitTreeEntry[]> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/${this.ref}?recursive=1`;

    let response: Response;
    try {
      response = await fetch(url, { headers: this.getHeaders() });
    } catch (error) {
      throw new Error(
        `Failed to fetch GitHub tree for ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (response.status === 403) {
      const body = await response.json() as { message?: string };
      if (body.message?.toLowerCase().includes('rate limit')) {
        throw new Error(`GitHub API rate limit exceeded for ${this.owner}/${this.repo}`);
      }
      throw new Error(`GitHub API access forbidden for ${this.owner}/${this.repo}: ${body.message ?? 'Unknown error'}`);
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch GitHub tree for ${this.owner}/${this.repo}: HTTP ${response.status}`,
      );
    }

    const data = await response.json() as GitTreeResponse;
    return data.tree;
  }

  private filterPromptFiles(tree: GitTreeEntry[]): GitTreeEntry[] {
    const dirs = this.promptDirs ?? ['prompts'];
    return tree.filter(
      entry => entry.type === 'blob' &&
        entry.path.endsWith('.prompt') &&
        dirs.some(dir => {
          const prefix = dir.endsWith('/') ? dir : `${dir}/`;
          return entry.path.startsWith(prefix);
        }),
    );
  }

  private async fetchFileContent(path: string): Promise<string> {
    const url = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.ref}/${path}`;

    let response: Response;
    try {
      response = await fetch(url, { headers: this.getHeaders() });
    } catch (error) {
      throw new Error(
        `Failed to fetch file ${path} from ${this.owner}/${this.repo}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch file ${path} from ${this.owner}/${this.repo}: HTTP ${response.status}`,
      );
    }

    return response.text();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    return headers;
  }
}
