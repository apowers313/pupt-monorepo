import { describe, expect,it } from 'vitest';

import { Pupt } from '../../src/api';

describe('Full Workflow', () => {
  it('should load, discover, collect inputs, and render', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    // Discover
    const prompts = pupt.getPrompts();
    expect(prompts.length).toBeGreaterThan(0);

    // Search
    const results = pupt.searchPrompts('test');
    expect(results.length).toBeGreaterThan(0);

    // Select and render
    const prompt = prompts[0];
    const result = await prompt.render({
      inputs: { name: 'World' },
    });

    expect(result.text).toBeDefined();
    expect(result.postExecution).toBeDefined();
  });

  it('should support full discovery and search workflow', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    // List all tags
    const tags = pupt.getTags();
    expect(tags.length).toBeGreaterThan(0);

    // Filter by tag
    const codePrompts = pupt.getPromptsByTag('code');
    expect(codePrompts.length).toBeGreaterThan(0);

    // Search for specific functionality
    const reviewResults = pupt.searchPrompts('review');
    expect(reviewResults.length).toBeGreaterThan(0);

    // Render the found prompt
    const reviewPrompt = pupt.getPrompt('code-review');
    expect(reviewPrompt).toBeDefined();

    const result = await reviewPrompt!.render({});
    expect(result.text).toBeDefined();
  });

  it('should handle prompts with input requirements', async () => {
    const pupt = new Pupt({
      modules: [{ name: 'test-lib', type: 'local' as const, source: './test/fixtures/libraries/test-lib' }],
    });

    await pupt.init();

    // Get prompt with inputs
    const prompt = pupt.getPrompt('prompt-with-inputs');
    expect(prompt).toBeDefined();

    // Get input iterator
    const iterator = prompt!.getInputIterator();
    await iterator.start();

    // Should have at least one input requirement
    const firstInput = iterator.current();
    expect(firstInput).toBeDefined();
    expect(firstInput?.name).toBe('userName');

    // Submit value and advance
    await iterator.submit('TestUser');
    await iterator.advance();

    // Now render with collected values
    const result = await prompt!.render({
      inputs: Object.fromEntries(iterator.getValues()),
    });
    expect(result.text).toBeDefined();
  });
});
