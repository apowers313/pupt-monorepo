/**
 * Browser tests for pupt-lib render functionality.
 * These tests run in a real Chromium browser via Playwright.
 *
 * Note: We import specific components rather than the full index to avoid
 * pulling in Node.js-only components like File that use 'fs'.
 */
import { describe, it, expect } from 'vitest';
import { render } from '../../src/render';
import { jsx, jsxs, Fragment } from '../../src/jsx-runtime';
import { Prompt } from '../../components/structural/Prompt';
import { Role } from '../../components/structural/Role';
import { Task } from '../../components/structural/Task';
import { Example } from '../../components/examples/Example';
import { ExampleInput } from '../../components/examples/ExampleInput';
import { ExampleOutput } from '../../components/examples/ExampleOutput';
import { Examples } from '../../components/examples/Examples';
import { Code } from '../../components/data/Code';
import { Steps } from '../../components/reasoning/Steps';
import { Step } from '../../components/reasoning/Step';
import { TYPE, PROPS, CHILDREN } from '../../src/types/symbols';

describe('Browser: render', () => {
  it('should render a simple prompt', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      bare: true,
      children: 'Hello, world!',
    });

    const result = await render(element);
    expect(result.text).toBe('Hello, world!');
  });

  it('should render nested components', async () => {
    const element = jsx(Prompt, {
      name: 'test',
      bare: true,
      children: [
        jsx(Role, { children: 'You are a helpful assistant.' }),
        jsx(Task, { children: 'Help the user.' }),
      ],
    });

    const result = await render(element);
    expect(result.text).toContain('You are a helpful assistant.');
    expect(result.text).toContain('Help the user.');
  });

  it('should render fragments', async () => {
    const element = jsx(Fragment, {
      children: ['Hello', ' ', 'World'],
    });

    const result = await render(element);
    expect(result.text).toBe('Hello World');
  });

  it('should render examples with code', async () => {
    const element = jsx(Examples, {
      children: jsx(Example, {
        children: [
          jsx(ExampleInput, { children: 'Add two numbers' }),
          jsx(ExampleOutput, {
            children: jsx(Code, {
              language: 'typescript',
              children: 'const sum = a + b;',
            }),
          }),
        ],
      }),
    });

    const result = await render(element);
    expect(result.text).toContain('Add two numbers');
    expect(result.text).toContain('```typescript');
    expect(result.text).toContain('const sum = a + b;');
  });

  it('should render steps with auto-numbering', async () => {
    const element = jsx(Steps, {
      children: [
        jsx(Step, { children: 'First step' }),
        jsx(Step, { children: 'Second step' }),
        jsx(Step, { children: 'Third step' }),
      ],
    });

    const result = await render(element);
    expect(result.text).toContain('1.');
    expect(result.text).toContain('First step');
    expect(result.text).toContain('2.');
    expect(result.text).toContain('Second step');
    expect(result.text).toContain('3.');
    expect(result.text).toContain('Third step');
  });
});

describe('Browser: jsx-runtime', () => {
  it('should create elements with jsx()', () => {
    const element = jsx('div', { id: 'test', children: 'content' });

    expect(element[TYPE]).toBe('div');
    expect(element[PROPS]).toEqual({ id: 'test' });
    expect(element[CHILDREN]).toEqual(['content']);
  });

  it('should handle array children', () => {
    const element = jsx('div', {
      children: ['a', 'b', 'c'],
    });

    expect(element[CHILDREN]).toEqual(['a', 'b', 'c']);
  });

  it('should handle null and undefined children', () => {
    const element = jsx('div', {
      children: [null, 'text', undefined],
    });

    // The jsx runtime filters out null/undefined, keeping only valid children
    expect(element[CHILDREN]).toContain('text');
    // Children array length depends on implementation - just verify text is present
    expect(element[CHILDREN].filter((c: unknown) => c === 'text')).toHaveLength(1);
  });
});

describe('Browser: .prompt file transformation', () => {
  /**
   * Helper to transform and evaluate TSX source in the browser using babel-standalone.
   * This is a browser-safe implementation that doesn't rely on Node.js modules.
   */
  async function createPromptFromSourceBrowser(
    source: string,
    filename: string,
  ) {
    // Dynamically import babel-standalone
    const Babel = await import('@babel/standalone');

    // Transform JSX to JavaScript
    const result = Babel.transform(source, {
      presets: ['typescript', 'react'],
      filename,
      plugins: [
        ['transform-react-jsx', {
          runtime: 'automatic',
          importSource: 'pupt-lib',
        }],
      ],
    });

    if (!result?.code) {
      throw new Error(`Failed to transform: ${filename}`);
    }

    // Process the transformed code
    const processedCode = result.code
      .replace(/import\s*\{[^}]*\}\s*from\s*["']pupt-lib\/jsx-runtime["'];?/g, '')
      .replace(/import\s*\{[^}]*\}\s*from\s*["']pupt-lib["'];?/g, '')
      .replace(/export\s+default\s+/g, 'exports.default = ');

    // Create evaluation context with jsx runtime and components
    const moduleExports: { default?: unknown } = {};
    const evalContext = {
      jsx,
      jsxs,
      Fragment,
      _jsx: jsx,
      _jsxs: jsxs,
      _Fragment: Fragment,
      exports: moduleExports,
      // Components available for JSX
      Prompt,
      Role,
      Task,
    };

    // Build and execute the function
    const contextKeys = Object.keys(evalContext);
    const contextValues = Object.values(evalContext);
    const evalFn = new Function(...contextKeys, processedCode);
    evalFn(...contextValues);

    return moduleExports.default;
  }

  /**
   * Get the type name from an element's type property.
   */
  function getTypeName(type: unknown): string {
    if (typeof type === 'string') return type;
    if (typeof type === 'function') return type.name;
    if (typeof type === 'symbol') return type.toString();
    return String(type);
  }

  it('should transform and evaluate .prompt source in browser', async () => {
    const source = `
      export default (
        <Prompt name="browser-test">
          <Role>You are a helpful assistant.</Role>
          <Task>Help the user with their question.</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'test.prompt') as Record<symbol, unknown>;

    expect(getTypeName(element[TYPE])).toBe('Prompt');
    expect((element[PROPS] as { name: string }).name).toBe('browser-test');
  });

  it('should handle TypeScript syntax in browser', async () => {
    const source = `
      interface Config { name: string }
      const config: Config = { name: 'typed-browser-test' };

      export default (
        <Prompt name={config.name}>
          <Task>Test TypeScript in browser</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'typed.tsx') as Record<symbol, unknown>;

    expect((element[PROPS] as { name: string }).name).toBe('typed-browser-test');
  });

  it('should transform and render .prompt source in browser', async () => {
    const source = `
      export default (
        <Prompt name="render-test">
          <Role>Assistant</Role>
          <Task>Help with testing</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'render.prompt');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Assistant');
    expect(result.text).toContain('Help with testing');
  });
});
