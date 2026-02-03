import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPrompt, createPromptFromSource, CUSTOM_COMPONENTS_GLOBAL } from '../../src/create-prompt';
import { Component } from '../../src/component';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import type { PuptNode, RenderContext, PuptElement } from '../../src/types';
import { TYPE, PROPS, CHILDREN } from '../../src/types/symbols';

/**
 * Get the type name from an element's type property.
 * Since the new system keeps component references instead of strings,
 * we need to extract the name from functions/classes.
 */
function getTypeName(type: unknown): string {
  if (typeof type === 'string') return type;
  if (typeof type === 'function') return type.name;
  if (typeof type === 'symbol') return type.toString();
  return String(type);
}

// Helper to get props with proper typing
function getProps(element: PuptElement): Record<string, unknown> {
  return element[PROPS] as Record<string, unknown>;
}

// Helper to get children with proper typing
function getChildren(element: PuptElement): PuptNode[] {
  return element[CHILDREN];
}

// Helper to get type with proper typing
function getType(element: PuptElement): unknown {
  return element[TYPE];
}

describe('createPromptFromSource', () => {
  it('should create element from TSX source', async () => {
    const source = `
      export default (
        <Prompt name="test">
          <Role>Assistant</Role>
          <Task>Help user</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSource(source, 'test.tsx');

    expect(getTypeName(getType(element))).toBe('Prompt');
    expect(getProps(element).name).toBe('test');
  });

  it('should handle simple JSX without imports', async () => {
    const source = `
      export default <div>Hello World</div>;
    `;

    const element = await createPromptFromSource(source, 'test.tsx');

    expect(getType(element)).toBe('div');
    expect(getChildren(element)).toContain('Hello World');
  });

  it('should handle JSX with props', async () => {
    const source = `
      export default <Section title="Test" priority={1}>Content</Section>;
    `;

    const element = await createPromptFromSource(source, 'test.tsx');

    expect(getTypeName(getType(element))).toBe('Section');
    expect(getProps(element).title).toBe('Test');
    expect(getProps(element).priority).toBe(1);
  });

  it('should handle nested JSX elements', async () => {
    const source = `
      export default (
        <Prompt name="nested">
          <Role>Assistant</Role>
          <Task>Do task</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSource(source, 'test.tsx');

    expect(getTypeName(getType(element))).toBe('Prompt');
    expect(getChildren(element).length).toBe(2);
  });

  it('should handle TypeScript syntax', async () => {
    const source = `
      interface Props { name: string }
      const config: Props = { name: 'typed-test' };

      export default (
        <Prompt name={config.name}>
          <Task>Test</Task>
        </Prompt>
      );
    `;

    const element = await createPromptFromSource(source, 'typed.tsx');

    expect(getProps(element).name).toBe('typed-test');
  });

  it('should handle fragments', async () => {
    const source = `
      export default (
        <>
          <Role>Assistant</Role>
          <Task>Help</Task>
        </>
      );
    `;

    const element = await createPromptFromSource(source, 'test.tsx');

    // Fragment returns children array
    expect(getChildren(element).length).toBe(2);
  });

  it('should handle control flow components', async () => {
    const source = `
      export default (
        <Prompt name="conditional">
          <If when={true}>
            <Task>Visible task</Task>
          </If>
        </Prompt>
      );
    `;

    const element = await createPromptFromSource(source, 'test.tsx');

    expect(getTypeName(getType(element))).toBe('Prompt');
    expect(getChildren(element).length).toBe(1);
    expect(getTypeName(getType(getChildren(element)[0] as PuptElement))).toBe('If');
  });

  it('should handle data components', async () => {
    const source = `
      export default (
        <Prompt name="with-code">
          <Code language="typescript">const x = 1;</Code>
        </Prompt>
      );
    `;

    const element = await createPromptFromSource(source, 'test.tsx');

    expect(getTypeName(getType(element))).toBe('Prompt');
    expect(getTypeName(getType(getChildren(element)[0] as PuptElement))).toBe('Code');
  });

  it('should auto-wrap raw JSX without export default', async () => {
    const source = `
      <Prompt name="auto-wrapped">
        <Task>This is auto-wrapped</Task>
      </Prompt>
    `;

    const element = await createPromptFromSource(source, 'test.prompt');

    expect(getTypeName(getType(element))).toBe('Prompt');
    expect(getProps(element).name).toBe('auto-wrapped');
  });

  it('should auto-wrap simple raw JSX', async () => {
    const source = '<Task>Just a task</Task>';

    const element = await createPromptFromSource(source, 'test.prompt');

    expect(getTypeName(getType(element))).toBe('Task');
  });

  it('should throw helpful error for undefined component (Ask.FooBar)', async () => {
    const source = `
      <Prompt>
        <Ask.FooBar name="features" label="Features" />
      </Prompt>
    `;

    await expect(createPromptFromSource(source, 'test.prompt')).rejects.toThrow(
      /element type is undefined.*component that doesn't exist/i,
    );
  });

  it('should throw helpful error for typos in component names', async () => {
    const source = `
      <Prompt>
        <Ask.Selec name="color" label="Color" />
      </Prompt>
    `;

    await expect(createPromptFromSource(source, 'test.prompt')).rejects.toThrow(
      /element type is undefined/i,
    );
  });

  it('should support custom components via options', async () => {
    // Define a custom component
    class MyCustomHeader extends Component<{ title: string; children?: PuptNode }> {
      static schema = z.object({
        title: z.string(),
        children: z.any().optional(),
      });

      render(props: { title: string; children?: PuptNode }, _context: RenderContext): PuptNode {
        return `=== ${props.title} ===`;
      }
    }

    const source = `
      <Prompt name="custom-test">
        <MyCustomHeader title="Welcome" />
        <Task>Help user</Task>
      </Prompt>
    `;

    const element = await createPromptFromSource(source, 'test.prompt', {
      components: {
        MyCustomHeader,
      },
    });

    expect(getTypeName(getType(element))).toBe('Prompt');
    expect(getChildren(element).length).toBe(2);
    expect(getTypeName(getType(getChildren(element)[0] as PuptElement))).toBe('MyCustomHeader');
    expect(getProps(getChildren(element)[0] as PuptElement).title).toBe('Welcome');
  });

  it('should support multiple custom components', async () => {
    class CustomHeader extends Component<{ text: string }> {
      static schema = z.object({ text: z.string() });
      render(props: { text: string }): PuptNode {
        return `# ${props.text}`;
      }
    }

    class CustomFooter extends Component<{ text: string }> {
      static schema = z.object({ text: z.string() });
      render(props: { text: string }): PuptNode {
        return `-- ${props.text} --`;
      }
    }

    const source = `
      <Prompt name="multi-custom">
        <CustomHeader text="Top" />
        <Task>Middle</Task>
        <CustomFooter text="Bottom" />
      </Prompt>
    `;

    const element = await createPromptFromSource(source, 'test.prompt', {
      components: {
        CustomHeader,
        CustomFooter,
      },
    });

    expect(getChildren(element).length).toBe(3);
    expect(getTypeName(getType(getChildren(element)[0] as PuptElement))).toBe('CustomHeader');
    expect(getTypeName(getType(getChildren(element)[2] as PuptElement))).toBe('CustomFooter');
  });

  it('should clean up custom components global after successful evaluation', async () => {
    class TempComponent extends Component<{ children?: PuptNode }> {
      static schema = z.object({ children: z.any().optional() });
      render(props: { children?: PuptNode }): PuptNode {
        return props.children ?? '';
      }
    }

    const source = `
      <Prompt name="cleanup-test">
        <TempComponent>Test</TempComponent>
      </Prompt>
    `;

    // Before: global should not exist
    expect(globalThis[CUSTOM_COMPONENTS_GLOBAL]).toBeUndefined();

    await createPromptFromSource(source, 'test.prompt', {
      components: { TempComponent },
    });

    // After: global should be cleaned up
    expect(globalThis[CUSTOM_COMPONENTS_GLOBAL]).toBeUndefined();
  });

  it('should clean up custom components global even on error', async () => {
    class ErrorComponent extends Component<Record<string, never>> {
      static schema = z.object({});
      render(): PuptNode {
        throw new Error('Intentional error');
      }
    }

    const source = `
      <Prompt name="error-test">
        <ErrorComponent />
      </Prompt>
    `;

    // Before: global should not exist
    expect(globalThis[CUSTOM_COMPONENTS_GLOBAL]).toBeUndefined();

    // This will throw because the source has a syntax issue with ErrorComponent
    // The component is defined but the JSX will fail to evaluate
    try {
      await createPromptFromSource(source, 'test.prompt', {
        components: { ErrorComponent },
      });
    } catch {
      // Expected to throw
    }

    // After: global should still be cleaned up
    expect(globalThis[CUSTOM_COMPONENTS_GLOBAL]).toBeUndefined();
  });
});

describe('createPrompt', () => {
  const tmpDir = join(__dirname, '../../tmp/create-prompt-test');

  beforeAll(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should load and transform .tsx file', async () => {
    const filePath = join(tmpDir, 'prompt.tsx');
    writeFileSync(filePath, `
      export default (
        <Prompt name="tsx-test">
          <Task>Do something</Task>
        </Prompt>
      );
    `);

    const element = await createPrompt(filePath);

    expect(getProps(element).name).toBe('tsx-test');
  });

  it('should handle file with TypeScript types', async () => {
    const filePath = join(tmpDir, 'typed-prompt.tsx');
    writeFileSync(filePath, `
      interface PromptProps {
        name: string;
      }

      const props: PromptProps = { name: "typed-test" };

      export default (
        <Prompt name={props.name}>
          <Task>Test</Task>
        </Prompt>
      );
    `);

    const element = await createPrompt(filePath);

    expect(getProps(element).name).toBe('typed-test');
  });

  it('should handle file with inline function components', async () => {
    const filePath = join(tmpDir, 'func-prompt.tsx');
    writeFileSync(filePath, `
      // Function component defined inline and used immediately
      const MySection = ({ title, children }: { title: string; children: any }) => (
        <Section title={title}>{children}</Section>
      );

      export default (
        <Prompt name="func-test">
          <MySection title="Test">Content</MySection>
        </Prompt>
      );
    `);

    const element = await createPrompt(filePath);

    expect(getProps(element).name).toBe('func-test');
  });

  it('should load and transform .prompt file (same as .tsx)', async () => {
    // .prompt files use the EXACT same Babel parser as .tsx
    const filePath = join(tmpDir, 'greeting.prompt');
    writeFileSync(filePath, `
      export default (
        <Prompt name="prompt-test">
          <Role>Assistant</Role>
          <Task>Help user</Task>
        </Prompt>
      );
    `);

    const element = await createPrompt(filePath);

    expect(getProps(element).name).toBe('prompt-test');
  });

  it('should throw error for non-existent file', async () => {
    await expect(createPrompt('/non/existent/file.tsx')).rejects.toThrow();
  });

  it('should auto-wrap raw JSX .prompt file without export default', async () => {
    const filePath = join(tmpDir, 'raw.prompt');
    writeFileSync(filePath, `<Prompt name="raw-test">
  <Task>Raw JSX content</Task>
</Prompt>`);

    const element = await createPrompt(filePath);

    expect(getTypeName(getType(element))).toBe('Prompt');
    expect(getProps(element).name).toBe('raw-test');
  });
});
