/**
 * End-to-end tests for .tsx and .prompt file conversion.
 * Tests various patterns, edge cases, and feature combinations.
 */
import { mkdirSync, rmSync,writeFileSync } from 'fs';
import { join } from 'path';
import { afterAll,beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { Component } from '../../src/component';
import { createPrompt,createPromptFromSource } from '../../src/create-prompt';
import { render } from '../../src/render';
import type { PuptNode } from '../../src/types';
import { PROPS } from '../../src/types/symbols';

describe('End-to-End: .prompt file conversion', () => {
  describe('basic .prompt files', () => {
    it('should handle minimal prompt', async () => {
      const source = '<Prompt name="minimal" />';

      const element = await createPromptFromSource(source, 'minimal.prompt');

      expect((element[PROPS] as { name: string }).name).toBe('minimal');
    });

    it('should handle prompt with text content', async () => {
      const source = '<Prompt name="text" bare>Hello, World!</Prompt>';

      const element = await createPromptFromSource(source, 'text.prompt');
      const result = await render(element);

      expect(result.text).toBe('Hello, World!');
    });

    it('should handle prompt with nested components', async () => {
      const source = `
<Prompt name="nested">
  <Role>You are a helpful assistant.</Role>
  <Task>Help the user with their question.</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'nested.prompt');
      const result = await render(element);

      expect(result.text).toContain('helpful assistant');
      expect(result.text).toContain('Help the user');
    });

    it('should handle prompt with all structural components', async () => {
      const source = `
<Prompt name="full-structural">
  <Role>Assistant</Role>
  <Task>Complete the task</Task>
  <Context>Background information here</Context>
  <Constraint type="must">Be concise</Constraint>
  <Format type="markdown">Use bullet points</Format>
  <Audience>Technical users</Audience>
  <Tone>Professional tone</Tone>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'structural.prompt');
      const result = await render(element);

      expect(result.ok).toBe(true);
      expect(result.text).toContain('Assistant');
      expect(result.text).toContain('Complete the task');
    });
  });

  describe('control flow in .prompt files', () => {
    it('should handle If component with true condition', async () => {
      const source = `
<Prompt name="if-true">
  <If when={true}>
    <Task>This should appear</Task>
  </If>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'if.prompt');
      const result = await render(element);

      expect(result.text).toContain('This should appear');
    });

    it('should handle If component with false condition', async () => {
      const source = `
<Prompt name="if-false">
  <If when={false}>
    <Task>This should NOT appear</Task>
  </If>
  <Task>This should appear</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'if.prompt');
      const result = await render(element);

      expect(result.text).not.toContain('should NOT appear');
      expect(result.text).toContain('This should appear');
    });

    it('should handle ForEach component', async () => {
      const source = `
<Prompt name="foreach">
  <ForEach items={['apple', 'banana', 'cherry']} as="fruit">
    {(fruit) => <Task>Process {fruit}</Task>}
  </ForEach>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'foreach.prompt');
      const result = await render(element);

      expect(result.text).toContain('apple');
      expect(result.text).toContain('banana');
      expect(result.text).toContain('cherry');
    });
  });

  describe('data components in .prompt files', () => {
    it('should handle Code component', async () => {
      const source = `
<Prompt name="code">
  <Code language="typescript">
    const greeting = "Hello, World!";
    console.log(greeting);
  </Code>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'code.prompt');
      const result = await render(element);

      expect(result.text).toContain('```typescript');
      expect(result.text).toContain('const greeting');
    });

    it('should handle Json component', async () => {
      const source = `
<Prompt name="json">
  <Json>{{ name: "test", value: 42 }}</Json>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'json.prompt');
      const result = await render(element);

      expect(result.text).toContain('"name"');
      expect(result.text).toContain('"test"');
      expect(result.text).toContain('42');
    });

    it('should handle Data component for structured output', async () => {
      const source = `
<Prompt name="data">
  <Data name="config" format="json">key: value</Data>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'data.prompt');
      const result = await render(element);

      expect(result.text).toContain('key');
      expect(result.text).toContain('value');
    });
  });

  describe('utility components in .prompt files', () => {
    it('should handle UUID component', async () => {
      const source = `
<Prompt name="uuid">
  Request ID: <UUID />
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'uuid.prompt');
      const result = await render(element);

      // Should contain a UUID pattern
      expect(result.text).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    });

    it('should handle DateTime component', async () => {
      const source = `
<Prompt name="datetime">
  Current time: <DateTime />
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'datetime.prompt');
      const result = await render(element);

      // Should contain a date/time string
      expect(result.text).toContain('Current time:');
      expect(result.text.length).toBeGreaterThan('Current time: '.length);
    });
  });

  describe('examples in .prompt files', () => {
    it('should handle Examples with Example components', async () => {
      const source = `
<Prompt name="examples">
  <Examples>
    <Example>
      <ExampleInput>What is 2 + 2?</ExampleInput>
      <ExampleOutput>4</ExampleOutput>
    </Example>
    <Example>
      <ExampleInput>What is 3 + 3?</ExampleInput>
      <ExampleOutput>6</ExampleOutput>
    </Example>
  </Examples>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'examples.prompt');
      const result = await render(element);

      expect(result.text).toContain('2 + 2');
      expect(result.text).toContain('4');
      expect(result.text).toContain('3 + 3');
      expect(result.text).toContain('6');
    });
  });

  describe('reasoning components in .prompt files', () => {
    it('should handle Steps with auto-numbering', async () => {
      const source = `
<Prompt name="steps">
  <Steps>
    <Step>First, analyze the problem</Step>
    <Step>Then, create a solution</Step>
    <Step>Finally, verify the result</Step>
  </Steps>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'steps.prompt');
      const result = await render(element);

      expect(result.text).toContain('1.');
      expect(result.text).toContain('2.');
      expect(result.text).toContain('3.');
      expect(result.text).toContain('analyze the problem');
    });
  });
});

describe('End-to-End: .tsx file conversion', () => {
  describe('complex JavaScript patterns', () => {
    it('should handle variables and expressions', async () => {
      const source = `
        import { Prompt, Task } from '@pupt/lib';

        const name = "Dynamic Prompt";
        const items = [1, 2, 3];
        const sum = items.reduce((a, b) => a + b, 0);

        export default (
          <Prompt name={name}>
            <Task>The sum is {sum}</Task>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'vars.tsx');
      const result = await render(element);

      expect((element[PROPS] as { name: string }).name).toBe('Dynamic Prompt');
      expect(result.text).toContain('The sum is 6');
    });

    it('should handle functions and closures', async () => {
      const source = `
        import { Prompt, Task, Context } from '@pupt/lib';

        function formatTask(task: string): string {
          return task.toUpperCase();
        }

        const createGreeting = (name: string) => \`Hello, \${name}!\`;

        export default (
          <Prompt name="functions">
            <Task>{formatTask("lowercase task")}</Task>
            <Context>{createGreeting("World")}</Context>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'funcs.tsx');
      const result = await render(element);

      expect(result.text).toContain('LOWERCASE TASK');
      expect(result.text).toContain('Hello, World!');
    });

    it('should handle classes and inheritance', async () => {
      const source = `
        import { Prompt, Task } from '@pupt/lib';

        class Config {
          constructor(public name: string, public version: number) {}
          toString() {
            return \`\${this.name} v\${this.version}\`;
          }
        }

        const config = new Config("MyApp", 2);

        export default (
          <Prompt name="classes">
            <Task>Configure {config.toString()}</Task>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'classes.tsx');
      const result = await render(element);

      expect(result.text).toContain('Configure MyApp v2');
    });

    it('should handle async/await patterns', async () => {
      const source = `
        import { Prompt, Task } from '@pupt/lib';

        // Simulate async data (resolved immediately for testing)
        const data = await Promise.resolve({ message: "Async data loaded" });

        export default (
          <Prompt name="async">
            <Task>{data.message}</Task>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'async.tsx');
      const result = await render(element);

      expect(result.text).toContain('Async data loaded');
    });

    it('should handle destructuring and spread', async () => {
      const source = `
        import { Prompt, Task } from '@pupt/lib';

        const config = { name: "test", version: 1, debug: true };
        const { name, ...rest } = config;
        const extended = { ...rest, extra: "value" };

        export default (
          <Prompt name={name}>
            <Task>Version: {extended.version}, Debug: {String(extended.debug)}, Extra: {extended.extra}</Task>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'destructure.tsx');
      const result = await render(element);

      expect((element[PROPS] as { name: string }).name).toBe('test');
      expect(result.text).toContain('Version: 1');
      expect(result.text).toContain('Debug: true');
      expect(result.text).toContain('Extra: value');
    });

    it('should handle array methods', async () => {
      const source = `
        import { Prompt, Task } from '@pupt/lib';

        const items = ['apple', 'banana', 'cherry'];
        const mapped = items.map(item => item.toUpperCase());
        const filtered = items.filter(item => item.startsWith('a') || item.startsWith('b'));
        const joined = filtered.join(', ');

        export default (
          <Prompt name="arrays">
            <Task>Items: {joined}</Task>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'arrays.tsx');
      const result = await render(element);

      expect(result.text).toContain('apple, banana');
    });

    it('should handle template literals with expressions', async () => {
      const source = `
        import { Prompt, Task } from '@pupt/lib';

        const user = { name: "Alice", age: 30 };
        const message = \`User \${user.name} is \${user.age} years old and will be \${user.age + 10} in 10 years.\`;

        export default (
          <Prompt name="templates">
            <Task>{message}</Task>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'templates.tsx');
      const result = await render(element);

      expect(result.text).toContain('Alice is 30 years old');
      expect(result.text).toContain('will be 40 in 10 years');
    });
  });

  describe('TypeScript features', () => {
    it('should handle interfaces and types', async () => {
      const source = `
        import { Prompt, Task } from '@pupt/lib';

        interface PromptConfig {
          name: string;
          tasks: string[];
        }

        type TaskRenderer = (task: string) => string;

        const config: PromptConfig = {
          name: "typed-prompt",
          tasks: ["Task 1", "Task 2"]
        };

        const renderTask: TaskRenderer = (task) => \`- \${task}\`;

        export default (
          <Prompt name={config.name}>
            <Task>{config.tasks.map(renderTask).join('\\n')}</Task>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'types.tsx');
      const result = await render(element);

      expect((element[PROPS] as { name: string }).name).toBe('typed-prompt');
      expect(result.text).toContain('- Task 1');
      expect(result.text).toContain('- Task 2');
    });

    it('should handle generics', async () => {
      const source = `
        import { Prompt, Task } from '@pupt/lib';

        function identity<T>(value: T): T {
          return value;
        }

        const numResult = identity<number>(42);
        const strResult = identity<string>("hello");

        export default (
          <Prompt name="generics">
            <Task>Number: {numResult}, String: {strResult}</Task>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'generics.tsx');
      const result = await render(element);

      expect(result.text).toContain('Number: 42');
      expect(result.text).toContain('String: hello');
    });

    it('should handle enums', async () => {
      const source = `
        import { Prompt, Task } from '@pupt/lib';

        enum Priority {
          Low = "low",
          Medium = "medium",
          High = "high"
        }

        const taskPriority = Priority.High;

        export default (
          <Prompt name="enums">
            <Task>Priority: {taskPriority}</Task>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'enums.tsx');
      const result = await render(element);

      expect(result.text).toContain('Priority: high');
    });
  });

  describe('local component definitions', () => {
    it('should handle variables used in JSX expressions', async () => {
      const source = `
        import { Prompt, Section, Task } from '@pupt/lib';

        const headerTitle = "My Header";
        const contentText = "Header content for " + headerTitle;

        export default (
          <Prompt name="inline-expressions">
            <Section name={headerTitle}>
              <Task>{contentText}</Task>
            </Section>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'inline.tsx');
      const result = await render(element);

      expect(result.text).toContain('Header content for My Header');
    });

    it('should handle array mapping in JSX', async () => {
      const source = `
        import { Prompt, Role, Task } from '@pupt/lib';

        const name = "User";
        const tasks = ["Do this", "Do that", "Do the other"];

        export default (
          <Prompt name="array-mapping">
            <Role>Hello, {name}!</Role>
            {tasks.map((task, i) => (
              <Task key={i}>{task}</Task>
            ))}
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'multi.tsx');
      const result = await render(element);

      expect(result.text).toContain('Hello, User!');
      expect(result.text).toContain('Do this');
      expect(result.text).toContain('Do that');
    });

    it('should handle nested sections with dynamic names', async () => {
      const source = `
        import { Prompt, Section, Task } from '@pupt/lib';

        const sectionName = "Section A";

        export default (
          <Prompt name="nested-dynamic">
            <Section name={sectionName}>
              <Task>Task inside wrapper</Task>
            </Section>
          </Prompt>
        );
      `;

      const element = await createPromptFromSource(source, 'children.tsx');
      const result = await render(element);

      expect(result.text).toContain('Section A');
      expect(result.text).toContain('Task inside wrapper');
    });
  });
});

describe('End-to-End: <Uses> component transformation', () => {
  it('should transform Uses to import (integration with transformer)', async () => {
    // This tests that Uses is properly transformed, but since we can't
    // actually import from a fake module, we use the built-in pupt-lib.
    // Note: .prompt files get auto-wrapped with export default, so we
    // don't include one here.
    const source = `
      <Uses component="Prompt, Role, Task" from="@pupt/lib" />
      <Prompt name="uses-test">
        <Role>Test role</Role>
        <Task>Test task</Task>
      </Prompt>
    `;

    const element = await createPromptFromSource(source, 'uses.prompt');
    const result = await render(element);

    expect(result.text).toContain('Test role');
    expect(result.text).toContain('Test task');
  });
});

describe('End-to-End: Custom components via options', () => {
  it('should support custom class components', async () => {
    class CustomBanner extends Component<{ text: string }> {
      static schema = z.object({ text: z.string() });
      render(props: { text: string }): PuptNode {
        return `*** ${props.text} ***`;
      }
    }

    const source = `
      <Prompt name="custom-class">
        <CustomBanner text="Important Message" />
        <Task>Do something</Task>
      </Prompt>
    `;

    const element = await createPromptFromSource(source, 'custom.prompt', {
      components: { CustomBanner },
    });
    const result = await render(element);

    expect(result.text).toContain('*** Important Message ***');
    expect(result.text).toContain('Do something');
  });

  it('should support multiple custom components together', async () => {
    class Alert extends Component<{ level: string; children?: PuptNode }> {
      static schema = z.object({ level: z.string(), children: z.any().optional() });
      render(props: { level: string; children?: PuptNode }): PuptNode {
        return `[${props.level.toUpperCase()}] ${props.children || ''}`;
      }
    }

    class Divider extends Component<Record<string, never>> {
      static schema = z.object({});
      render(): PuptNode {
        return '---';
      }
    }

    const source = `
      <Prompt name="multi-custom">
        <Alert level="warning">Be careful!</Alert>
        <Divider />
        <Task>Proceed with caution</Task>
      </Prompt>
    `;

    const element = await createPromptFromSource(source, 'multi.prompt', {
      components: { Alert, Divider },
    });
    const result = await render(element);

    expect(result.text).toContain('[WARNING] Be careful!');
    expect(result.text).toContain('---');
    expect(result.text).toContain('Proceed with caution');
  });
});

describe('End-to-End: File-based prompts', () => {
  const tmpDir = join(__dirname, '../../tmp/e2e-test');

  beforeAll(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should load and render a .prompt file from disk', async () => {
    const filePath = join(tmpDir, 'disk.prompt');
    writeFileSync(filePath, `
<Prompt name="from-disk">
  <Role>File-loaded assistant</Role>
  <Task>Process data from file</Task>
</Prompt>
    `);

    const element = await createPrompt(filePath);
    const result = await render(element);

    expect((element[PROPS] as { name: string }).name).toBe('from-disk');
    expect(result.text).toContain('File-loaded assistant');
  });

  it('should load and render a .tsx file from disk', async () => {
    const filePath = join(tmpDir, 'disk.tsx');
    writeFileSync(filePath, `
      import { Prompt, Task } from '@pupt/lib';

      const config = { name: "tsx-from-disk", version: 1 };

      export default (
        <Prompt name={config.name}>
          <Task>Version {config.version}</Task>
        </Prompt>
      );
    `);

    const element = await createPrompt(filePath);
    const result = await render(element);

    expect((element[PROPS] as { name: string }).name).toBe('tsx-from-disk');
    expect(result.text).toContain('Version 1');
  });

  it('should handle complex multi-component .tsx file', async () => {
    const filePath = join(tmpDir, 'complex.tsx');
    writeFileSync(filePath, `
      import { Prompt, Role, Context, Task, If, Constraint } from '@pupt/lib';

      // Complex prompt with multiple features
      interface TaskConfig {
        title: string;
        priority: number;
      }

      const tasks: TaskConfig[] = [
        { title: "Setup environment", priority: 1 },
        { title: "Write tests", priority: 2 },
        { title: "Deploy", priority: 3 },
      ];

      export default (
        <Prompt name="complex-tsx">
          <Role>Project Manager Assistant</Role>
          <Context>Managing a software project</Context>
          {tasks.map((task, i) => (
            <Task key={i}>[P{task.priority}] {task.title}</Task>
          ))}
          <If when={tasks.length > 2}>
            <Constraint>Focus on high-priority items first</Constraint>
          </If>
        </Prompt>
      );
    `);

    const element = await createPrompt(filePath);
    const result = await render(element);

    expect(result.text).toContain('Project Manager Assistant');
    expect(result.text).toContain('[P1] Setup environment');
    expect(result.text).toContain('[P2] Write tests');
    expect(result.text).toContain('[P3] Deploy');
    expect(result.text).toContain('high-priority');
  });
});

describe('End-to-End: Edge cases', () => {
  it('should handle deeply nested components', async () => {
    const source = `
<Prompt name="deep">
  <Section name="Level-1">
    <Section name="Level-2">
      <Section name="Level-3">
        <Task>Deep task</Task>
      </Section>
    </Section>
  </Section>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'deep.prompt');
    const result = await render(element);

    expect(result.text).toContain('Level-1');
    expect(result.text).toContain('Level-2');
    expect(result.text).toContain('Level-3');
    expect(result.text).toContain('Deep task');
  });

  it('should handle fragments at root level', async () => {
    const source = `
      import { Role, Task } from '@pupt/lib';

      export default (
        <>
          <Role>Part 1</Role>
          <Task>Part 2</Task>
        </>
      );
    `;

    const element = await createPromptFromSource(source, 'fragment.tsx');
    const result = await render(element);

    expect(result.text).toContain('Part 1');
    expect(result.text).toContain('Part 2');
  });

  it('should handle empty children', async () => {
    const source = `
<Prompt name="empty">
  <Task></Task>
  <Role />
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'empty.prompt');
    const result = await render(element);

    expect(result.ok).toBe(true);
  });

  it('should handle special characters in content', async () => {
    const source = `
<Prompt name="special">
  <Task>Handle "quotes", 'apostrophes', &amp; ampersands, and {'{'} braces {'}'}</Task>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'special.prompt');
    const result = await render(element);

    expect(result.text).toContain('quotes');
    expect(result.text).toContain('apostrophes');
  });

  it('should handle multiline strings', async () => {
    const source = `
<Prompt name="multiline">
  <Task>
    This is a multiline task.
    It spans multiple lines.
    Each line should be preserved.
  </Task>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'multiline.prompt');
    const result = await render(element);

    expect(result.text).toContain('multiline task');
    expect(result.text).toContain('spans multiple lines');
  });

  it('should handle conditional rendering with null/undefined', async () => {
    const source = `
      import { Prompt, Task } from '@pupt/lib';

      const maybeContent = null;
      const alsoMaybe = undefined;

      export default (
        <Prompt name="nullable">
          {maybeContent}
          {alsoMaybe}
          <Task>This should appear</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSource(source, 'nullable.tsx');
    const result = await render(element);

    expect(result.text).toContain('This should appear');
  });

  it('should handle boolean expressions in JSX', async () => {
    const source = `
      import { Prompt, Task } from '@pupt/lib';

      const showExtra = true;
      const hideThis = false;

      export default (
        <Prompt name="boolean">
          {showExtra && <Task>Extra task</Task>}
          {hideThis && <Task>Hidden task</Task>}
          {!hideThis && <Task>Visible task</Task>}
        </Prompt>
      );
    `;

    const element = await createPromptFromSource(source, 'boolean.tsx');
    const result = await render(element);

    expect(result.text).toContain('Extra task');
    expect(result.text).not.toContain('Hidden task');
    expect(result.text).toContain('Visible task');
  });
});
