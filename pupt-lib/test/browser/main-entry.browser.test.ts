/**
 * Browser integration test that imports from the main entry point.
 *
 * This test verifies that the main pupt-lib export can be loaded in a browser
 * without Node.js-specific module errors. It catches regressions where
 * static Node.js imports (os, fs, path) are accidentally included in the bundle.
 *
 * NOTE: This test imports from src/index.ts which Vite transforms for the browser.
 * This simulates what happens when users import from '@pupt/lib' in their browser apps.
 */
import { describe, expect,it } from 'vitest';

// Import from the main entry point - this is what users would do
// If there are static Node.js imports, this will fail in the browser
import {
  Code,
  Component,
  Context,
  createPromptFromSource,
  createRuntimeConfig,
  Example,
  ExampleInput,
  ExampleOutput,
  Examples,
  ForEach,
  If,
  Prompt,
  render,
  Role,
  Section,
  Step,
  Steps,
  Task,
} from '../../src/index';
import { Fragment,jsx, jsxs } from '../../src/jsx-runtime';
import { CHILDREN,TYPE } from '../../src/types/symbols';

describe('Browser: Main Entry Point Import', () => {
  it('should import render function successfully', () => {
    expect(render).toBeDefined();
    expect(typeof render).toBe('function');
  });

  it('should import Component class successfully', () => {
    expect(Component).toBeDefined();
    expect(typeof Component).toBe('function');
  });

  it('should import structural components', () => {
    expect(Prompt).toBeDefined();
    expect(Role).toBeDefined();
    expect(Task).toBeDefined();
    expect(Context).toBeDefined();
    expect(Section).toBeDefined();
  });

  it('should import data components', () => {
    expect(Code).toBeDefined();
  });

  it('should import reasoning components', () => {
    expect(Steps).toBeDefined();
    expect(Step).toBeDefined();
  });

  it('should import control components', () => {
    expect(If).toBeDefined();
    expect(ForEach).toBeDefined();
  });

  it('should import example components', () => {
    expect(Examples).toBeDefined();
    expect(Example).toBeDefined();
    expect(ExampleInput).toBeDefined();
    expect(ExampleOutput).toBeDefined();
  });

  it('should import createPromptFromSource', () => {
    expect(createPromptFromSource).toBeDefined();
    expect(typeof createPromptFromSource).toBe('function');
  });

  it('should import createRuntimeConfig', () => {
    expect(createRuntimeConfig).toBeDefined();
    expect(typeof createRuntimeConfig).toBe('function');
  });

  it('should import jsx runtime functions', () => {
    expect(jsx).toBeDefined();
    expect(jsxs).toBeDefined();
    expect(Fragment).toBeDefined();
  });
});

describe('Browser: Render with Main Entry Components', () => {
  it('should render a prompt using imported components', async () => {
    const element = jsx(Prompt, {
      name: 'browser-entry-test',
      children: [
        jsx(Role, { children: 'You are a helpful assistant.' }),
        jsx(Task, { children: 'Help the user with their request.' }),
      ],
    });

    const result = await render(element);

    expect(result.ok).toBe(true);
    expect(result.text).toContain('helpful assistant');
    expect(result.text).toContain('Help the user');
  });

  it('should render control flow components', async () => {
    const element = jsx(Prompt, {
      name: 'control-test',
      children: jsx(If, {
        when: true,
        children: jsx(Task, { children: 'Visible task' }),
      }),
    });

    const result = await render(element);

    expect(result.ok).toBe(true);
    expect(result.text).toContain('Visible task');
  });

  it('should render with ForEach component', async () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const element = jsx(Prompt, {
      name: 'foreach-test',
      children: jsx(ForEach, {
        items,
        as: 'item',
        children: (item: string) => jsx(Task, { children: item }),
      }),
    });

    const result = await render(element);

    expect(result.ok).toBe(true);
    expect(result.text).toContain('Item 1');
    expect(result.text).toContain('Item 2');
    expect(result.text).toContain('Item 3');
  });

  it('should render Steps with auto-numbering', async () => {
    const element = jsx(Steps, {
      children: [
        jsx(Step, { children: 'First step' }),
        jsx(Step, { children: 'Second step' }),
      ],
    });

    const result = await render(element);

    expect(result.ok).toBe(true);
    expect(result.text).toContain('1.');
    expect(result.text).toContain('First step');
    expect(result.text).toContain('2.');
    expect(result.text).toContain('Second step');
  });

  it('should create runtime config in browser', () => {
    const config = createRuntimeConfig();

    // In browser, these should have browser-specific values
    expect(config.hostname).toBeDefined();
    expect(config.username).toBeDefined();
    expect(config.platform).toBeDefined();
    expect(config.uuid).toBeDefined();
    expect(config.timestamp).toBeDefined();
  });
});

describe('Browser: JSX Transformation', () => {
  it('should create elements with jsx function', () => {
    const element = jsx(Task, { children: 'Test task' });

    expect(element).toBeDefined();
    expect(element[TYPE]).toBe(Task);
    // Children are normalized into an array and stored on the element
    expect(element[CHILDREN]).toContain('Test task');
  });

  it('should create elements with jsxs for multiple children', () => {
    const element = jsxs(Prompt, {
      name: 'test',
      children: [
        jsx(Role, { children: 'Role' }),
        jsx(Task, { children: 'Task' }),
      ],
    });

    expect(element).toBeDefined();
    expect(Array.isArray(element[CHILDREN])).toBe(true);
    expect(element[CHILDREN].length).toBe(2);
  });

  it('should create fragment elements', () => {
    const element = jsx(Fragment, {
      children: [
        jsx(Task, { children: 'Task 1' }),
        jsx(Task, { children: 'Task 2' }),
      ],
    });

    expect(element).toBeDefined();
    expect(element[TYPE]).toBe(Fragment);
  });
});
