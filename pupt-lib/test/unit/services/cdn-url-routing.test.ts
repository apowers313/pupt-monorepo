import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { Pupt } from '../../../src/api';
import { ModuleLoader } from '../../../src/services/module-loader';
import { NpmRegistryPromptSource } from '../../../src/services/prompt-sources/npm-registry-prompt-source';
import { createTestTarball } from '../../helpers/tarball-helper';

const server = setupServer();

describe('CDN URL routing', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('should route https:// tarball URLs to NpmRegistryPromptSource', async () => {
    const tarball = await createTestTarball([
      { filename: 'greeting.prompt', content: '<Prompt name="greeting"><Task>Hello</Task></Prompt>' },
    ]);

    server.use(
      http.get('https://registry.npmjs.org/mock-prompt-pkg/-/mock-prompt-pkg-1.0.0.tgz', () => {
        return new HttpResponse(tarball, {
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      }),
    );

    const pupt = new Pupt({
      modules: [{ name: 'mock-prompt-pkg', type: 'url' as const, source: 'https://registry.npmjs.org/mock-prompt-pkg/-/mock-prompt-pkg-1.0.0.tgz' }],
    });
    await pupt.init();
    expect(pupt.getPrompts().length).toBeGreaterThan(0);
    expect(pupt.getPrompt('greeting')).toBeDefined();
  });

  it('should route CDN package URLs to NpmRegistryPromptSource', async () => {
    const tarball = await createTestTarball([
      { filename: 'cdn-prompt.prompt', content: '<Prompt name="cdn-prompt"><Task>CDN test</Task></Prompt>' },
    ]);

    // jsdelivr URL — the NpmRegistryPromptSource.fromUrl() will fetch this directly
    server.use(
      http.get('https://cdn.jsdelivr.net/npm/mock-prompt-pkg@1.0.0', () => {
        return new HttpResponse(tarball, {
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      }),
    );

    const pupt = new Pupt({
      modules: [{ name: 'mock-prompt-pkg', type: 'url' as const, source: 'https://cdn.jsdelivr.net/npm/mock-prompt-pkg@1.0.0' }],
    });
    await pupt.init();
    expect(pupt.getPrompts().length).toBeGreaterThan(0);
    expect(pupt.getPrompt('cdn-prompt')).toBeDefined();
  });

  it('should detect tarball URLs by .tgz extension', () => {
    const loader = new ModuleLoader();
    const isTarball = (loader as never)['isTarballOrCdnUrl'].bind(loader);
    expect(isTarball('https://registry.npmjs.org/pkg/-/pkg-1.0.0.tgz')).toBe(true);
    expect(isTarball('https://example.com/random-file.tgz')).toBe(true);
  });

  it('should detect CDN URLs by hostname', () => {
    const loader = new ModuleLoader();
    const isTarball = (loader as never)['isTarballOrCdnUrl'].bind(loader);
    expect(isTarball('https://cdn.jsdelivr.net/npm/pkg@1.0.0')).toBe(true);
    expect(isTarball('https://unpkg.com/pkg@1.0.0')).toBe(true);
    expect(isTarball('https://registry.npmjs.org/pkg')).toBe(true);
  });

  it('should NOT route random URLs to NpmRegistryPromptSource', () => {
    const loader = new ModuleLoader();
    const isTarball = (loader as never)['isTarballOrCdnUrl'].bind(loader);
    expect(isTarball('https://example.com/lib.js')).toBe(false);
    expect(isTarball('https://mysite.com/module')).toBe(false);
  });
});

describe('NpmRegistryPromptSource', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('should fetch package metadata and download tarball', async () => {
    const tarball = await createTestTarball([
      { filename: 'greeting.prompt', content: '<Prompt name="greeting"><Task>Hi</Task></Prompt>' },
    ]);

    server.use(
      http.get('https://registry.npmjs.org/mock-prompt-pkg/1.0.0', () => {
        return HttpResponse.json({
          dist: {
            tarball: 'https://registry.npmjs.org/mock-prompt-pkg/-/mock-prompt-pkg-1.0.0.tgz',
          },
        });
      }),
      http.get('https://registry.npmjs.org/mock-prompt-pkg/-/mock-prompt-pkg-1.0.0.tgz', () => {
        return new HttpResponse(tarball, {
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      }),
    );

    const source = new NpmRegistryPromptSource('mock-prompt-pkg@1.0.0');
    const prompts = await source.getPrompts();
    expect(prompts.length).toBeGreaterThan(0);
    expect(prompts[0].filename).toBe('greeting.prompt');
  });

  it('should handle packages with no prompts/ directory in tarball', async () => {
    // Create tarball with no prompts directory
    const tarball = await createTestTarball([]);

    server.use(
      http.get('https://registry.npmjs.org/no-prompts-pkg/1.0.0', () => {
        return HttpResponse.json({
          dist: {
            tarball: 'https://registry.npmjs.org/no-prompts-pkg/-/no-prompts-pkg-1.0.0.tgz',
          },
        });
      }),
      http.get('https://registry.npmjs.org/no-prompts-pkg/-/no-prompts-pkg-1.0.0.tgz', () => {
        return new HttpResponse(tarball, {
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      }),
    );

    const source = new NpmRegistryPromptSource('no-prompts-pkg@1.0.0');
    const prompts = await source.getPrompts();
    expect(prompts).toEqual([]);
  });

  it('should resolve "latest" when no version specified', async () => {
    const tarball = await createTestTarball([
      { filename: 'latest.prompt', content: '<Prompt name="latest"><Task>Latest</Task></Prompt>' },
    ]);

    server.use(
      http.get('https://registry.npmjs.org/mock-prompt-pkg/latest', () => {
        return HttpResponse.json({
          dist: {
            tarball: 'https://registry.npmjs.org/mock-prompt-pkg/-/mock-prompt-pkg-1.0.0.tgz',
          },
        });
      }),
      http.get('https://registry.npmjs.org/mock-prompt-pkg/-/mock-prompt-pkg-1.0.0.tgz', () => {
        return new HttpResponse(tarball, {
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      }),
    );

    const source = new NpmRegistryPromptSource('mock-prompt-pkg');
    const prompts = await source.getPrompts();
    expect(prompts.length).toBeGreaterThan(0);
  });

  it('should throw on network errors with helpful message', async () => {
    server.use(
      http.get('https://registry.npmjs.org/network-fail-pkg/latest', () => {
        return HttpResponse.error();
      }),
    );

    const source = new NpmRegistryPromptSource('network-fail-pkg');
    await expect(source.getPrompts()).rejects.toThrow(/fetch.*failed/i);
  });

  it('should support direct tarball URL via fromUrl()', async () => {
    const tarball = await createTestTarball([
      { filename: 'direct.prompt', content: '<Prompt name="direct"><Task>Direct</Task></Prompt>' },
    ]);

    server.use(
      http.get('https://registry.npmjs.org/pkg/-/pkg-1.0.0.tgz', () => {
        return new HttpResponse(tarball, {
          headers: { 'Content-Type': 'application/octet-stream' },
        });
      }),
    );

    const source = NpmRegistryPromptSource.fromUrl('https://registry.npmjs.org/pkg/-/pkg-1.0.0.tgz');
    const prompts = await source.getPrompts();
    expect(prompts.length).toBe(1);
    expect(prompts[0].filename).toBe('direct.prompt');
  });
});
