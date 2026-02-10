import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptToolError } from '../../src/utils/errors.js';

// Mock dependencies before importing the module under test
vi.mock('../../src/services/pupt-service.js');
vi.mock('../../src/services/input-collector.js');
vi.mock('../../src/ui/interactive-search.js');
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    write: vi.fn(),
  },
}));
vi.mock('fs-extra', () => ({
  default: {
    ensureDir: vi.fn().mockResolvedValue(undefined),
  },
}));

import { resolvePrompt } from '../../src/services/prompt-resolver.js';
import { PuptService } from '../../src/services/pupt-service.js';
import { collectInputs } from '../../src/services/input-collector.js';
import { InteractiveSearch } from '../../src/ui/interactive-search.js';
import { logger } from '../../src/utils/logger.js';
import fs from 'fs-extra';

describe('prompt-resolver coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Helper to set up a standard mock for PuptService, collectInputs, and render.
   * Returns the mock objects so tests can customize them.
   */
  function setupMocks(overrides?: {
    findPromptReturn?: unknown;
    adaptedPrompts?: unknown[];
    renderResult?: { text: string; postExecution?: unknown[] };
    collectInputsReturn?: Map<string, unknown>;
  }) {
    const renderResult = overrides?.renderResult ?? {
      text: 'Rendered output',
      postExecution: [],
    };

    const mockDiscoveredPrompt = {
      getInputIterator: vi.fn().mockReturnValue({ some: 'iterator' }),
      render: vi.fn().mockResolvedValue(renderResult),
    };

    // The "raw" JSX prompt object that findPrompt returns
    const mockJsxPrompt = overrides?.findPromptReturn !== undefined
      ? overrides.findPromptReturn
      : { name: 'test-prompt' };

    // The adapted prompt whose _source matches the JSX prompt
    const defaultAdapted = {
      title: 'Test Prompt',
      path: '/prompts/test.prompt',
      content: 'Test content',
      summary: 'A test prompt',
      _source: mockDiscoveredPrompt,
    };

    const adaptedPrompts = overrides?.adaptedPrompts ?? [defaultAdapted];

    // Wire up _source on the default adapted prompt to match findPrompt's return
    // so that `p._source === jsxPrompt` passes when using strict equality
    if (mockJsxPrompt && adaptedPrompts === undefined) {
      // default case: make _source point to the findPrompt return
    }

    const mockInit = vi.fn().mockResolvedValue(undefined);
    const mockFindPrompt = vi.fn().mockReturnValue(mockJsxPrompt);
    const mockGetPromptsAsAdapted = vi.fn().mockReturnValue(adaptedPrompts);

    vi.mocked(PuptService).mockImplementation(() => ({
      init: mockInit,
      findPrompt: mockFindPrompt,
      getPromptsAsAdapted: mockGetPromptsAsAdapted,
      getPrompts: vi.fn().mockReturnValue([]),
      getPrompt: vi.fn(),
      getPromptPath: vi.fn(),
    } as unknown as PuptService));

    const collectInputsReturn = overrides?.collectInputsReturn ?? new Map([['name', 'World']]);
    vi.mocked(collectInputs).mockResolvedValue(collectInputsReturn);

    return {
      mockJsxPrompt,
      mockDiscoveredPrompt,
      defaultAdapted,
      adaptedPrompts,
      mockInit,
      mockFindPrompt,
      mockGetPromptsAsAdapted,
      renderResult,
    };
  }

  describe('promptName provided and prompt found (lines 54-63)', () => {
    it('should find the prompt by name and return resolved prompt', async () => {
      // The key is that findPrompt returns an object, and the adapted prompt's
      // _source must be the SAME object reference (=== comparison)
      const jsxPromptObj = { name: 'my-prompt' };
      const discoveredPrompt = {
        getInputIterator: vi.fn().mockReturnValue({}),
        render: vi.fn().mockResolvedValue({ text: 'Hello World', postExecution: [] }),
      };

      const adaptedPrompt = {
        title: 'My Prompt',
        path: '/prompts/my-prompt.prompt',
        content: 'Hello {{name}}',
        summary: 'My prompt summary',
        _source: jsxPromptObj, // _source must === the findPrompt return for the .find() to match
      };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(jsxPromptObj),
        getPromptsAsAdapted: vi.fn().mockReturnValue([adaptedPrompt]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      // After the prompt is selected, _source is used for getInputIterator/render.
      // But adaptedPrompt._source is jsxPromptObj (the identity match object).
      // The code does: `const dp = selected._source!;` then calls dp.getInputIterator().
      // So we need _source on the selected adapted prompt to have those methods.
      // Re-assign _source to the discoveredPrompt object that has the methods,
      // BUT for the find() to work, _source === jsxPromptObj must be true during getPromptsAsAdapted().
      //
      // The trick: getPromptsAsAdapted is called once (for the find), then _source is accessed.
      // We need _source to be jsxPromptObj for the find, but then dp = selected._source!
      // also needs getInputIterator/render. We can make jsxPromptObj have those methods.
      Object.assign(jsxPromptObj, {
        getInputIterator: discoveredPrompt.getInputIterator,
        render: discoveredPrompt.render,
      });

      const inputs = new Map<string, unknown>([['name', 'World']]);
      vi.mocked(collectInputs).mockResolvedValue(inputs);

      const result = await resolvePrompt({
        promptDirs: ['/prompts'],
        promptName: 'my-prompt',
      });

      expect(result.text).toBe('Hello World');
      expect(result.templateInfo.templatePath).toBe('/prompts/my-prompt.prompt');
      expect(result.templateInfo.templateContent).toBe('Hello {{name}}');
      expect(result.templateInfo.title).toBe('My Prompt');
      expect(result.templateInfo.summary).toBe('My prompt summary');
      expect(result.templateInfo.variables).toBe(inputs);
      expect(result.templateInfo.finalPrompt).toBe('Hello World');
    });

    it('should log the prompt name and location when found', async () => {
      const jsxPromptObj = {
        name: 'log-test',
        getInputIterator: vi.fn().mockReturnValue({}),
        render: vi.fn().mockResolvedValue({ text: 'output', postExecution: [] }),
      };

      const adaptedPrompt = {
        title: 'Log Test Prompt',
        path: '/prompts/log-test.prompt',
        content: 'content',
        summary: 'summary',
        _source: jsxPromptObj,
      };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(jsxPromptObj),
        getPromptsAsAdapted: vi.fn().mockReturnValue([adaptedPrompt]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      vi.mocked(collectInputs).mockResolvedValue(new Map());

      await resolvePrompt({
        promptDirs: ['/prompts'],
        promptName: 'log-test',
      });

      expect(logger.log).toHaveBeenCalledTimes(2);
      // First call: "Using prompt: ..."
      const firstCallArg = vi.mocked(logger.log).mock.calls[0][0] as string;
      expect(firstCallArg).toContain('Using prompt:');
      expect(firstCallArg).toContain('Log Test Prompt');
      // Second call: "Location: ..."
      const secondCallArg = vi.mocked(logger.log).mock.calls[1][0] as string;
      expect(secondCallArg).toContain('Location:');
      expect(secondCallArg).toContain('/prompts/log-test.prompt');
    });

    it('should pass startTimestamp to templateInfo', async () => {
      const jsxPromptObj = {
        name: 'ts-test',
        getInputIterator: vi.fn().mockReturnValue({}),
        render: vi.fn().mockResolvedValue({ text: 'output', postExecution: [] }),
      };

      const adaptedPrompt = {
        title: 'Timestamp Test',
        path: '/prompts/ts-test.prompt',
        content: 'content',
        summary: 'summary',
        _source: jsxPromptObj,
      };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(jsxPromptObj),
        getPromptsAsAdapted: vi.fn().mockReturnValue([adaptedPrompt]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      vi.mocked(collectInputs).mockResolvedValue(new Map());

      const timestamp = new Date('2025-01-15T10:00:00Z');
      const result = await resolvePrompt({
        promptDirs: ['/prompts'],
        promptName: 'ts-test',
        startTimestamp: timestamp,
      });

      expect(result.templateInfo.timestamp).toBe(timestamp);
    });
  });

  describe('promptName provided but prompt NOT found (lines 58-59)', () => {
    it('should throw promptNotFound when findPrompt returns undefined', async () => {
      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(undefined),
        getPromptsAsAdapted: vi.fn().mockReturnValue([]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      await expect(
        resolvePrompt({
          promptDirs: ['/prompts'],
          promptName: 'nonexistent-prompt',
        }),
      ).rejects.toThrow(PromptToolError);

      await expect(
        resolvePrompt({
          promptDirs: ['/prompts'],
          promptName: 'nonexistent-prompt',
        }),
      ).rejects.toThrow("Prompt 'nonexistent-prompt' not found");
    });

    it('should throw promptNotFound when findPrompt returns null', async () => {
      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(null),
        getPromptsAsAdapted: vi.fn().mockReturnValue([]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      await expect(
        resolvePrompt({
          promptDirs: ['/prompts'],
          promptName: 'missing-prompt',
        }),
      ).rejects.toThrow(PromptToolError);
    });
  });

  describe('promptName provided, findPrompt returns object but no adapted match (lines 55-57)', () => {
    it('should throw promptNotFound when no adapted prompt has matching _source', async () => {
      const jsxPromptObj = { name: 'found-prompt' };
      const differentObj = { name: 'different-prompt' };

      const adaptedPrompt = {
        title: 'Different Prompt',
        path: '/prompts/different.prompt',
        content: 'content',
        summary: 'summary',
        _source: differentObj, // Different object reference, so === will fail
      };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(jsxPromptObj),
        getPromptsAsAdapted: vi.fn().mockReturnValue([adaptedPrompt]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      await expect(
        resolvePrompt({
          promptDirs: ['/prompts'],
          promptName: 'found-prompt',
        }),
      ).rejects.toThrow(PromptToolError);

      await expect(
        resolvePrompt({
          promptDirs: ['/prompts'],
          promptName: 'found-prompt',
        }),
      ).rejects.toThrow("Prompt 'found-prompt' not found");
    });

    it('should throw promptNotFound when adapted list is empty but findPrompt returns something', async () => {
      const jsxPromptObj = { name: 'orphan-prompt' };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(jsxPromptObj),
        getPromptsAsAdapted: vi.fn().mockReturnValue([]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      await expect(
        resolvePrompt({
          promptDirs: ['/prompts'],
          promptName: 'orphan-prompt',
        }),
      ).rejects.toThrow("Prompt 'orphan-prompt' not found");
    });
  });

  describe('no promptName, interactive search flow', () => {
    it('should use InteractiveSearch to select a prompt', async () => {
      const discoveredPrompt = {
        getInputIterator: vi.fn().mockReturnValue({}),
        render: vi.fn().mockResolvedValue({ text: 'Interactive output', postExecution: [] }),
      };

      const adaptedPrompt = {
        title: 'Interactive Prompt',
        path: '/prompts/interactive.prompt',
        content: 'Interactive content',
        summary: 'Interactive summary',
        _source: discoveredPrompt,
      };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn(),
        getPromptsAsAdapted: vi.fn().mockReturnValue([adaptedPrompt]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      const mockSelectPrompt = vi.fn().mockResolvedValue(adaptedPrompt);
      vi.mocked(InteractiveSearch).mockImplementation(() => ({
        selectPrompt: mockSelectPrompt,
      } as unknown as InteractiveSearch));

      vi.mocked(collectInputs).mockResolvedValue(new Map());

      const result = await resolvePrompt({
        promptDirs: ['/prompts'],
        // no promptName
      });

      expect(mockSelectPrompt).toHaveBeenCalledWith([adaptedPrompt]);
      expect(result.text).toBe('Interactive output');
      expect(result.templateInfo.title).toBe('Interactive Prompt');

      // Should log "Processing:" not "Using prompt:"
      const firstCallArg = vi.mocked(logger.log).mock.calls[0][0] as string;
      expect(firstCallArg).toContain('Processing:');
    });
  });

  describe('no prompts found', () => {
    it('should throw noPromptsFound when getPromptsAsAdapted returns empty without promptName', async () => {
      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn(),
        getPromptsAsAdapted: vi.fn().mockReturnValue([]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      await expect(
        resolvePrompt({
          promptDirs: ['/prompts', '/other-prompts'],
        }),
      ).rejects.toThrow(PromptToolError);

      await expect(
        resolvePrompt({
          promptDirs: ['/prompts', '/other-prompts'],
        }),
      ).rejects.toThrow('No prompts found');
    });
  });

  describe('reviewFiles extraction from postExecution', () => {
    it('should extract reviewFile entries from postExecution', async () => {
      const jsxPromptObj = {
        name: 'review-test',
        getInputIterator: vi.fn().mockReturnValue({}),
        render: vi.fn().mockResolvedValue({
          text: 'Review output',
          postExecution: [
            { type: 'reviewFile', file: '/src/app.ts' },
            { type: 'reviewFile', file: '/src/index.ts' },
            { type: 'other', path: '/ignore.ts' },
          ],
        }),
      };

      const adaptedPrompt = {
        title: 'Review Test',
        path: '/prompts/review.prompt',
        content: 'content',
        summary: 'summary',
        _source: jsxPromptObj,
      };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(jsxPromptObj),
        getPromptsAsAdapted: vi.fn().mockReturnValue([adaptedPrompt]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      vi.mocked(collectInputs).mockResolvedValue(new Map());

      const result = await resolvePrompt({
        promptDirs: ['/prompts'],
        promptName: 'review-test',
      });

      expect(result.templateInfo.reviewFiles).toEqual([
        { name: '/src/app.ts', value: '/src/app.ts' },
        { name: '/src/index.ts', value: '/src/index.ts' },
      ]);
    });

    it('should use path as fallback for name when name is missing', async () => {
      const jsxPromptObj = {
        name: 'review-fallback',
        getInputIterator: vi.fn().mockReturnValue({}),
        render: vi.fn().mockResolvedValue({
          text: 'Fallback output',
          postExecution: [
            { type: 'reviewFile', file: '/src/util.ts' },
          ],
        }),
      };

      const adaptedPrompt = {
        title: 'Review Fallback',
        path: '/prompts/fallback.prompt',
        content: 'content',
        summary: 'summary',
        _source: jsxPromptObj,
      };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(jsxPromptObj),
        getPromptsAsAdapted: vi.fn().mockReturnValue([adaptedPrompt]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      vi.mocked(collectInputs).mockResolvedValue(new Map());

      const result = await resolvePrompt({
        promptDirs: ['/prompts'],
        promptName: 'review-fallback',
      });

      expect(result.templateInfo.reviewFiles).toEqual([
        { name: '/src/util.ts', value: '/src/util.ts' },
      ]);
    });

    it('should return empty string for name and value when both are missing', async () => {
      const jsxPromptObj = {
        name: 'review-empty',
        getInputIterator: vi.fn().mockReturnValue({}),
        render: vi.fn().mockResolvedValue({
          text: 'Empty output',
          postExecution: [
            { type: 'reviewFile' },
          ],
        }),
      };

      const adaptedPrompt = {
        title: 'Review Empty',
        path: '/prompts/empty.prompt',
        content: 'content',
        summary: 'summary',
        _source: jsxPromptObj,
      };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(jsxPromptObj),
        getPromptsAsAdapted: vi.fn().mockReturnValue([adaptedPrompt]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      vi.mocked(collectInputs).mockResolvedValue(new Map());

      const result = await resolvePrompt({
        promptDirs: ['/prompts'],
        promptName: 'review-empty',
      });

      expect(result.templateInfo.reviewFiles).toEqual([
        { name: '', value: '' },
      ]);
    });

    it('should handle undefined postExecution', async () => {
      const jsxPromptObj = {
        name: 'no-post',
        getInputIterator: vi.fn().mockReturnValue({}),
        render: vi.fn().mockResolvedValue({
          text: 'No post output',
          // no postExecution field
        }),
      };

      const adaptedPrompt = {
        title: 'No Post',
        path: '/prompts/no-post.prompt',
        content: 'content',
        summary: 'summary',
        _source: jsxPromptObj,
      };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(jsxPromptObj),
        getPromptsAsAdapted: vi.fn().mockReturnValue([adaptedPrompt]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      vi.mocked(collectInputs).mockResolvedValue(new Map());

      const result = await resolvePrompt({
        promptDirs: ['/prompts'],
        promptName: 'no-post',
      });

      expect(result.templateInfo.reviewFiles).toBeUndefined();
    });
  });

  describe('fs.ensureDir and PuptService initialization', () => {
    it('should call ensureDir for each prompt directory', async () => {
      const jsxPromptObj = {
        name: 'ensure-dir-test',
        getInputIterator: vi.fn().mockReturnValue({}),
        render: vi.fn().mockResolvedValue({ text: 'output', postExecution: [] }),
      };

      const adaptedPrompt = {
        title: 'EnsureDir Test',
        path: '/prompts/ensure.prompt',
        content: 'content',
        summary: 'summary',
        _source: jsxPromptObj,
      };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(jsxPromptObj),
        getPromptsAsAdapted: vi.fn().mockReturnValue([adaptedPrompt]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      vi.mocked(collectInputs).mockResolvedValue(new Map());

      await resolvePrompt({
        promptDirs: ['/dir1', '/dir2', '/dir3'],
        promptName: 'ensure-dir-test',
      });

      expect(fs.ensureDir).toHaveBeenCalledTimes(3);
      expect(fs.ensureDir).toHaveBeenCalledWith('/dir1');
      expect(fs.ensureDir).toHaveBeenCalledWith('/dir2');
      expect(fs.ensureDir).toHaveBeenCalledWith('/dir3');
    });

    it('should pass libraries and environment to PuptService constructor', async () => {
      const jsxPromptObj = {
        name: 'config-test',
        getInputIterator: vi.fn().mockReturnValue({}),
        render: vi.fn().mockResolvedValue({ text: 'output', postExecution: [] }),
      };

      const adaptedPrompt = {
        title: 'Config Test',
        path: '/prompts/config.prompt',
        content: 'content',
        summary: 'summary',
        _source: jsxPromptObj,
      };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(jsxPromptObj),
        getPromptsAsAdapted: vi.fn().mockReturnValue([adaptedPrompt]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      vi.mocked(collectInputs).mockResolvedValue(new Map());

      const envConfig = { llm: { model: 'gpt-4', provider: 'openai' } };
      await resolvePrompt({
        promptDirs: ['/prompts'],
        libraries: ['lib1', 'lib2'],
        promptName: 'config-test',
        environment: envConfig,
      });

      expect(PuptService).toHaveBeenCalledWith({
        promptDirs: ['/prompts'],
        libraries: ['lib1', 'lib2'],
        environment: envConfig,
      });
    });

    it('should pass noInteractive to collectInputs', async () => {
      const jsxPromptObj = {
        name: 'no-input-test',
        getInputIterator: vi.fn().mockReturnValue({ iter: true }),
        render: vi.fn().mockResolvedValue({ text: 'output', postExecution: [] }),
      };

      const adaptedPrompt = {
        title: 'No Input Test',
        path: '/prompts/no-input.prompt',
        content: 'content',
        summary: 'summary',
        _source: jsxPromptObj,
      };

      vi.mocked(PuptService).mockImplementation(() => ({
        init: vi.fn().mockResolvedValue(undefined),
        findPrompt: vi.fn().mockReturnValue(jsxPromptObj),
        getPromptsAsAdapted: vi.fn().mockReturnValue([adaptedPrompt]),
        getPrompts: vi.fn().mockReturnValue([]),
        getPrompt: vi.fn(),
        getPromptPath: vi.fn(),
      } as unknown as PuptService));

      vi.mocked(collectInputs).mockResolvedValue(new Map());

      await resolvePrompt({
        promptDirs: ['/prompts'],
        promptName: 'no-input-test',
        noInteractive: true,
      });

      expect(collectInputs).toHaveBeenCalledWith({ iter: true }, true);
    });
  });
});
