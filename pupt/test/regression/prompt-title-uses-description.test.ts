/**
 * Regression test: Prompt title should use description (human-friendly) not name (kebab-case)
 *
 * The prompt's `name` attribute is kebab-case (e.g., "ad-hoc") for identification,
 * while `description` contains the human-friendly name (e.g., "Ad Hoc").
 *
 * For display in search results and history, we should use description as the title.
 *
 * Example of correct display:
 *   425. [2026-01-30 08:38] Ad Hoc
 *      prompt: "say hello"
 *
 * Example of incorrect display:
 *   425. [2026-01-30 08:38] ad-hoc
 *      prompt: "say hello"
 */

import os from 'node:os';
import path from 'node:path';

import type { DiscoveredPromptWithMethods } from '@pupt/lib';
import { LocalPromptSource } from '@pupt/lib';
import fs from 'fs-extra';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { fromDiscoveredPrompt } from '../../src/types/prompt.js';

describe('Prompt title uses description regression', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pt-title-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should use description as title when available', () => {
    const dp = {
      name: 'ad-hoc',
      description: 'Ad Hoc',
      tags: [],
      library: '',
      element: {} as any,
      render: () => ({ text: '', postExecution: [] }),
      getInputIterator: () => ({} as any),
    } as DiscoveredPromptWithMethods;

    const prompt = fromDiscoveredPrompt(dp, '/path/to/ad-hoc.prompt', '/path/to');

    // Title should be the human-friendly description, not kebab-case name
    expect(prompt.title).toBe('Ad Hoc');
    expect(prompt.title).not.toBe('ad-hoc');
  });

  it('should fall back to name when description is empty', () => {
    const dp = {
      name: 'simple-test',
      description: '',
      tags: [],
      library: '',
      element: {} as any,
      render: () => ({ text: '', postExecution: [] }),
      getInputIterator: () => ({} as any),
    } as DiscoveredPromptWithMethods;

    const prompt = fromDiscoveredPrompt(dp);

    // Fall back to name when no description
    expect(prompt.title).toBe('simple-test');
  });

  it('should display real prompts with human-friendly titles', async () => {
    // Import PuptService dynamically
    const { PuptService } = await import('../../src/services/pupt-service.js');

    // Create a test prompt file
    const promptDir = path.join(tempDir, 'prompts');
    await fs.ensureDir(promptDir);
    await fs.writeFile(
      path.join(promptDir, 'code-review.prompt'),
      `<Prompt name="code-review" description="Code Review" tags={["dev"]}>
  <Task>Review the code</Task>
</Prompt>`
    );

    const service = new PuptService({ modules: [new LocalPromptSource(promptDir)] });
    await service.init();

    const prompts = service.getPromptsAsAdapted();
    expect(prompts).toHaveLength(1);
    expect(prompts[0].title).toBe('Code Review'); // Human-friendly, not "code-review"
  });

  it('should preserve filename separately from title', () => {
    const dp = {
      name: 'my-prompt',
      description: 'My Awesome Prompt',
      tags: [],
      library: '',
      element: {} as any,
      render: () => ({ text: '', postExecution: [] }),
      getInputIterator: () => ({} as any),
    } as DiscoveredPromptWithMethods;

    const prompt = fromDiscoveredPrompt(dp, '/path/to/my-prompt.prompt', '/path/to');

    // Title uses description
    expect(prompt.title).toBe('My Awesome Prompt');
    // Filename is preserved for search/matching by kebab-case name
    expect(prompt.filename).toBe('my-prompt.prompt');
  });
});
