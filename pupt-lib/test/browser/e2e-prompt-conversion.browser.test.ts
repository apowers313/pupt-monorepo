/**
 * Browser end-to-end tests for .tsx and .prompt file conversion.
 * These tests run in a real Chromium browser via Playwright.
 */
import { describe, expect,it } from 'vitest';

import { ForEach } from '../../components/control/ForEach';
import { If } from '../../components/control/If';
import { Code } from '../../components/data/Code';
import { Example } from '../../components/examples/Example';
import { ExampleInput } from '../../components/examples/ExampleInput';
import { ExampleOutput } from '../../components/examples/ExampleOutput';
import { Examples } from '../../components/examples/Examples';
import { Step } from '../../components/reasoning/Step';
import { Steps } from '../../components/reasoning/Steps';
import { Constraint } from '../../components/structural/Constraint';
import { Context } from '../../components/structural/Context';
import { Prompt } from '../../components/structural/Prompt';
import { Role } from '../../components/structural/Role';
import { Section } from '../../components/structural/Section';
import { Task } from '../../components/structural/Task';
import { Fragment,jsx, jsxs } from '../../src/jsx-runtime';
import { render } from '../../src/render';
import { PROPS } from '../../src/types/symbols';

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
        importSource: '@pupt/lib',
      }],
    ],
  });

  if (!result?.code) {
    throw new Error(`Failed to transform: ${filename}`);
  }

  // Process the transformed code - remove imports and replace export default
  const processedCode = result.code
    .replace(/import\s*\{[^}]*\}\s*from\s*["']@pupt\/lib\/jsx-runtime["'];?/g, '')
    .replace(/import\s*\{[^}]*\}\s*from\s*["']@pupt\/lib["'];?/g, '')
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
    Section,
    Context,
    Constraint,
    If,
    ForEach,
    Code,
    Steps,
    Step,
    Example,
    Examples,
    ExampleInput,
    ExampleOutput,
  };

  // Build and execute the function
  const contextKeys = Object.keys(evalContext);
  const contextValues = Object.values(evalContext);
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const evalFn = new Function(...contextKeys, processedCode);
  evalFn(...contextValues);

  return moduleExports.default;
}

describe('Browser E2E: Basic prompt rendering', () => {
  it('should transform and render a simple prompt', async () => {
    const source = `
      export default (
        <Prompt name="browser-simple">
          <Task>Hello from the browser!</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'simple.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Hello from the browser!');
  });

  it('should handle nested components', async () => {
    const source = `
      export default (
        <Prompt name="browser-nested">
          <Role>Browser Assistant</Role>
          <Task>Help with browser testing</Task>
          <Context>Running in Chromium via Playwright</Context>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'nested.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Browser Assistant');
    expect(result.text).toContain('Help with browser testing');
    expect(result.text).toContain('Chromium');
  });
});

describe('Browser E2E: Control flow', () => {
  it('should handle If component with true condition', async () => {
    const source = `
      export default (
        <Prompt name="browser-if">
          <If when={true}>
            <Task>Visible in browser</Task>
          </If>
          <If when={false}>
            <Task>Hidden in browser</Task>
          </If>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'if.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Visible in browser');
    expect(result.text).not.toContain('Hidden in browser');
  });

  it('should handle ForEach component', async () => {
    const source = `
      export default (
        <Prompt name="browser-foreach">
          <ForEach items={['Chrome', 'Firefox', 'Safari']} as="browser">
            {(browser) => <Task>Test in {browser}</Task>}
          </ForEach>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'foreach.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Chrome');
    expect(result.text).toContain('Firefox');
    expect(result.text).toContain('Safari');
  });
});

describe('Browser E2E: Data components', () => {
  it('should handle Code component', async () => {
    const source = `
      export default (
        <Prompt name="browser-code">
          <Code language="javascript">
            console.log("Hello from browser!");
          </Code>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'code.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('```javascript');
    expect(result.text).toContain('console.log');
  });
});

describe('Browser E2E: Reasoning components', () => {
  it('should handle Steps with auto-numbering', async () => {
    const source = `
      export default (
        <Prompt name="browser-steps">
          <Steps>
            <Step>Open browser</Step>
            <Step>Navigate to page</Step>
            <Step>Run tests</Step>
          </Steps>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'steps.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('1.');
    expect(result.text).toContain('2.');
    expect(result.text).toContain('3.');
    expect(result.text).toContain('Open browser');
  });
});

describe('Browser E2E: Example components', () => {
  it('should handle Examples with multiple examples', async () => {
    const source = `
      export default (
        <Prompt name="browser-examples">
          <Examples>
            <Example>
              <ExampleInput>Browser input 1</ExampleInput>
              <ExampleOutput>Browser output 1</ExampleOutput>
            </Example>
            <Example>
              <ExampleInput>Browser input 2</ExampleInput>
              <ExampleOutput>Browser output 2</ExampleOutput>
            </Example>
          </Examples>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'examples.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Browser input 1');
    expect(result.text).toContain('Browser output 1');
    expect(result.text).toContain('Browser input 2');
    expect(result.text).toContain('Browser output 2');
  });
});

describe('Browser E2E: Complex JavaScript patterns', () => {
  it('should handle variables and expressions', async () => {
    const source = `
      const items = [1, 2, 3, 4, 5];
      const sum = items.reduce((a, b) => a + b, 0);
      const message = \`Sum of items: \${sum}\`;

      export default (
        <Prompt name="browser-js">
          <Task>{message}</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'js.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Sum of items: 15');
  });

  it('should handle array map and filter', async () => {
    const source = `
      const fruits = ['apple', 'banana', 'cherry', 'date'];
      const shortFruits = fruits.filter(f => f.length <= 5);
      const upperFruits = shortFruits.map(f => f.toUpperCase());

      export default (
        <Prompt name="browser-arrays">
          <Task>Fruits: {upperFruits.join(', ')}</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'arrays.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('APPLE');
    expect(result.text).toContain('DATE');
    expect(result.text).not.toContain('BANANA');
    expect(result.text).not.toContain('CHERRY');
  });

  it('should handle object destructuring', async () => {
    const source = `
      const config = { name: 'BrowserTest', version: 2, debug: true };
      const { name, ...rest } = config;

      export default (
        <Prompt name={name}>
          <Task>Version: {rest.version}, Debug: {String(rest.debug)}</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'destructure.tsx') as { props: { name: string } };
    const result = await render(element as Parameters<typeof render>[0]);

    expect((element[PROPS] as { name: string }).name).toBe('BrowserTest');
    expect(result.text).toContain('Version: 2');
    expect(result.text).toContain('Debug: true');
  });

  it('should handle sections with dynamic names from variables', async () => {
    const source = `
      const sectionName = "Browser Header";

      export default (
        <Prompt name="browser-components">
          <Section name={sectionName}>
            <Task>Header task for {sectionName}</Task>
          </Section>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'components.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Browser Header');
    expect(result.text).toContain('Header task for Browser Header');
  });

  it('should handle conditional rendering with && operator', async () => {
    const source = `
      const showFirst = true;
      const showSecond = false;

      export default (
        <Prompt name="browser-conditional">
          {showFirst && <Task>First task (visible)</Task>}
          {showSecond && <Task>Second task (hidden)</Task>}
          {!showSecond && <Task>Third task (visible)</Task>}
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'conditional.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('First task (visible)');
    expect(result.text).not.toContain('Second task (hidden)');
    expect(result.text).toContain('Third task (visible)');
  });

  it('should handle ternary expressions', async () => {
    const source = `
      const isProduction = false;
      const environment = isProduction ? 'PROD' : 'DEV';

      export default (
        <Prompt name="browser-ternary">
          <Task>Running in {environment} mode</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'ternary.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Running in DEV mode');
  });
});

describe('Browser E2E: TypeScript features', () => {
  it('should handle TypeScript interfaces (stripped at compile)', async () => {
    const source = `
      interface Config {
        name: string;
        items: string[];
      }

      const config: Config = {
        name: "TypedBrowserTest",
        items: ["item1", "item2"]
      };

      export default (
        <Prompt name={config.name}>
          <Task>Items: {config.items.join(", ")}</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'typescript.tsx') as { props: { name: string } };
    const result = await render(element as Parameters<typeof render>[0]);

    expect((element[PROPS] as { name: string }).name).toBe('TypedBrowserTest');
    expect(result.text).toContain('item1, item2');
  });

  it('should handle TypeScript type annotations', async () => {
    const source = `
      type TaskPriority = 'low' | 'medium' | 'high';

      const priority: TaskPriority = 'high';
      const count: number = 42;
      const active: boolean = true;

      export default (
        <Prompt name="browser-types">
          <Task>Priority: {priority}, Count: {count}, Active: {String(active)}</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'types.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Priority: high');
    expect(result.text).toContain('Count: 42');
    expect(result.text).toContain('Active: true');
  });
});

describe('Browser E2E: Edge cases', () => {
  it('should handle fragments', async () => {
    const source = `
      export default (
        <>
          <Role>Fragment role</Role>
          <Task>Fragment task</Task>
        </>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'fragment.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Fragment role');
    expect(result.text).toContain('Fragment task');
  });

  it('should handle null and undefined children', async () => {
    const source = `
      const maybeContent = null;
      const alsoNull = undefined;

      export default (
        <Prompt name="browser-null">
          {maybeContent}
          {alsoNull}
          <Task>Visible content</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'null.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Visible content');
  });

  it('should handle deeply nested structure', async () => {
    const source = `
      export default (
        <Prompt name="browser-deep">
          <Section name="Level-1">
            <Section name="Level-2">
              <Section name="Level-3">
                <Task>Deep browser task</Task>
              </Section>
            </Section>
          </Section>
        </Prompt>
      );
    `;

    const element = await createPromptFromSourceBrowser(source, 'deep.tsx');
    const result = await render(element as Parameters<typeof render>[0]);

    expect(result.text).toContain('Level-1');
    expect(result.text).toContain('Level-2');
    expect(result.text).toContain('Level-3');
    expect(result.text).toContain('Deep browser task');
  });
});
