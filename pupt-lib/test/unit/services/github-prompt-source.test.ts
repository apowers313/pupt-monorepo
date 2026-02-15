import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitHubPromptSource } from '../../../src/services/prompt-sources/github-prompt-source';

// Mock data for GitHub API responses
const mockTreeResponse = {
  sha: 'abc123',
  tree: [
    { path: 'README.md', type: 'blob', sha: 'sha1' },
    { path: 'prompts', type: 'tree', sha: 'sha2' },
    { path: 'prompts/greeting.prompt', type: 'blob', sha: 'sha3' },
    { path: 'prompts/review.prompt', type: 'blob', sha: 'sha4' },
    { path: 'src/index.ts', type: 'blob', sha: 'sha5' },
  ],
};

const mockTreeNoPrompts = {
  sha: 'def456',
  tree: [
    { path: 'README.md', type: 'blob', sha: 'sha1' },
    { path: 'src/index.ts', type: 'blob', sha: 'sha2' },
  ],
};

const greetingContent = `<Prompt name="greeting" description="A greeting prompt" tags={["test"]}>
  <Role>You are friendly.</Role>
  <Task>Greet the user.</Task>
</Prompt>`;

const reviewContent = `<Prompt name="review" description="A review prompt" tags={["code"]}>
  <Role>You are a reviewer.</Role>
  <Task>Review the code.</Task>
</Prompt>`;

describe('GitHubPromptSource', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should discover .prompt files using Git Trees API', async () => {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/git/trees/')) {
        return new Response(JSON.stringify(mockTreeResponse), { status: 200 });
      }
      if (url.includes('greeting.prompt')) {
        return new Response(greetingContent, { status: 200 });
      }
      if (url.includes('review.prompt')) {
        return new Response(reviewContent, { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    });

    const source = new GitHubPromptSource('user/repo');
    const prompts = await source.getPrompts();

    expect(prompts).toHaveLength(2);
    expect(prompts[0].filename).toBe('greeting.prompt');
    expect(prompts[0].content).toContain('<Prompt');
    expect(prompts[1].filename).toBe('review.prompt');
  });

  it('should support ref (branch/tag)', async () => {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/git/trees/v1.0.0')) {
        return new Response(JSON.stringify(mockTreeResponse), { status: 200 });
      }
      if (url.includes('v1.0.0')) {
        if (url.includes('greeting.prompt')) {
          return new Response(greetingContent, { status: 200 });
        }
        if (url.includes('review.prompt')) {
          return new Response(reviewContent, { status: 200 });
        }
      }
      return new Response('Not found', { status: 404 });
    });

    const source = new GitHubPromptSource('user/repo', { ref: 'v1.0.0' });
    const prompts = await source.getPrompts();

    expect(prompts).toHaveLength(2);

    // Verify the API was called with the correct ref
    const treeCall = fetchSpy.mock.calls.find(
      call => call[0].toString().includes('/git/trees/'),
    );
    expect(treeCall?.[0].toString()).toContain('/git/trees/v1.0.0');
  });

  it('should default to master branch', async () => {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/git/trees/master')) {
        return new Response(JSON.stringify(mockTreeResponse), { status: 200 });
      }
      if (url.includes('/master/')) {
        if (url.includes('greeting.prompt')) {
          return new Response(greetingContent, { status: 200 });
        }
        if (url.includes('review.prompt')) {
          return new Response(reviewContent, { status: 200 });
        }
      }
      return new Response('Not found', { status: 404 });
    });

    const source = new GitHubPromptSource('user/repo');
    const prompts = await source.getPrompts();

    expect(prompts).toHaveLength(2);

    // Verify default ref is 'master'
    const treeCall = fetchSpy.mock.calls.find(
      call => call[0].toString().includes('/git/trees/'),
    );
    expect(treeCall?.[0].toString()).toContain('/git/trees/master');
  });

  it('should return empty array for repos without prompts/ directory', async () => {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/git/trees/')) {
        return new Response(JSON.stringify(mockTreeNoPrompts), { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    });

    const source = new GitHubPromptSource('user/no-prompts-repo');
    const prompts = await source.getPrompts();

    expect(prompts).toEqual([]);
  });

  it('should handle rate limiting gracefully', async () => {
    fetchSpy.mockImplementation(async () => {
      return new Response(
        JSON.stringify({ message: 'API rate limit exceeded' }),
        { status: 403 },
      );
    });

    const source = new GitHubPromptSource('user/rate-limited-repo');
    await expect(source.getPrompts()).rejects.toThrow(/rate limit/i);
  });

  it('should support optional auth token', async () => {
    fetchSpy.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();
      // Verify the token is sent in the Authorization header
      const headers = init?.headers as Record<string, string> | undefined;
      if (!headers?.['Authorization']?.includes('token ghp_test123')) {
        return new Response('Unauthorized', { status: 401 });
      }

      if (url.includes('/git/trees/')) {
        return new Response(JSON.stringify(mockTreeResponse), { status: 200 });
      }
      if (url.includes('greeting.prompt')) {
        return new Response(greetingContent, { status: 200 });
      }
      if (url.includes('review.prompt')) {
        return new Response(reviewContent, { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    });

    const source = new GitHubPromptSource('user/repo', { token: 'ghp_test123' });
    const prompts = await source.getPrompts();

    expect(prompts).toHaveLength(2);
  });

  it('should handle network errors with helpful message', async () => {
    fetchSpy.mockRejectedValue(new Error('Network request failed'));

    const source = new GitHubPromptSource('user/repo');
    await expect(source.getPrompts()).rejects.toThrow(/fetch.*failed|network/i);
  });

  it('should handle 404 from Git Trees API', async () => {
    fetchSpy.mockImplementation(async () => {
      return new Response(
        JSON.stringify({ message: 'Not Found' }),
        { status: 404 },
      );
    });

    const source = new GitHubPromptSource('user/nonexistent-repo');
    await expect(source.getPrompts()).rejects.toThrow();
  });

  it('should only include .prompt files from prompts/ directory', async () => {
    const treeWithMixed = {
      sha: 'abc123',
      tree: [
        { path: 'prompts/valid.prompt', type: 'blob', sha: 'sha1' },
        { path: 'prompts/readme.md', type: 'blob', sha: 'sha2' },
        { path: 'prompts/subdir', type: 'tree', sha: 'sha3' },
        { path: 'src/code.prompt', type: 'blob', sha: 'sha4' }, // not in prompts/
      ],
    };

    fetchSpy.mockImplementation(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.includes('/git/trees/')) {
        return new Response(JSON.stringify(treeWithMixed), { status: 200 });
      }
      if (url.includes('valid.prompt')) {
        return new Response(greetingContent, { status: 200 });
      }
      return new Response('Not found', { status: 404 });
    });

    const source = new GitHubPromptSource('user/repo');
    const prompts = await source.getPrompts();

    expect(prompts).toHaveLength(1);
    expect(prompts[0].filename).toBe('valid.prompt');
  });
});
