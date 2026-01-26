import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Transformer } from '../../../src/services/transformer';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Transformer', () => {
  const tmpDir = join(__dirname, '../../../tmp/transformer-test');
  const transformer = new Transformer();

  beforeAll(async () => {
    mkdirSync(tmpDir, { recursive: true });
    // Pre-load Babel so sync methods work
    await transformer.transformSourceAsync('const x = 1;', 'init.ts');
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should transform source string', () => {
    const transformer = new Transformer();
    const source = 'const el = <div>Hello</div>;';

    const result = transformer.transformSource(source, 'test.tsx');

    expect(result).toContain('jsx(');
  });

  it('should throw error when calling sync transform before Babel is loaded', async () => {
    // Reset the module to clear the BabelInstance
    vi.resetModules();

    // Import fresh module where Babel hasn't been loaded yet
    const { Transformer: FreshTransformer } = await import('../../../src/services/transformer');
    const freshTransformer = new FreshTransformer();

    expect(() => {
      freshTransformer.transformSource('const x = 1;', 'test.ts');
    }).toThrow('Babel not loaded');

    // Reset modules back so other tests work
    vi.resetModules();
  });

  it('should transform file', async () => {
    const transformer = new Transformer();
    const filePath = join(tmpDir, 'test.tsx');

    writeFileSync(filePath, 'export const el = <span>Test</span>;');

    const result = await transformer.transformFile(filePath);

    expect(result).toContain('jsx(');
    expect(result).toContain('"span"');
  });

  it('should include pupt-lib jsx-runtime import', () => {
    const transformer = new Transformer();
    const source = 'const el = <div>Hello</div>;';

    const result = transformer.transformSource(source, 'test.tsx');

    expect(result).toContain('pupt-lib/jsx-runtime');
  });

  it('should handle TypeScript interfaces', () => {
    const transformer = new Transformer();
    const source = `
      interface Props { name: string }
      const el = <div>Hello</div>;
    `;

    const result = transformer.transformSource(source, 'test.tsx');

    expect(result).not.toContain('interface Props');
    expect(result).toContain('jsx(');
  });

  it('should throw error for invalid JSX', () => {
    const transformer = new Transformer();
    const source = 'const el = <div>unclosed';

    expect(() => transformer.transformSource(source, 'test.tsx')).toThrow();
  });

  it('should handle complex nested elements', () => {
    const transformer = new Transformer();
    const source = `
      const el = (
        <Prompt name="test">
          <Role>Assistant</Role>
          <Task>Help</Task>
        </Prompt>
      );
    `;

    const result = transformer.transformSource(source, 'test.tsx');

    expect(result).toContain('Prompt');
    expect(result).toContain('Role');
    expect(result).toContain('Task');
  });

  it('should transform file and preserve used imports', async () => {
    const transformer = new Transformer();
    const filePath = join(tmpDir, 'with-imports.tsx');

    // Note: Babel correctly removes unused imports
    // We use the import to ensure it's preserved
    writeFileSync(filePath, `
      import { someValue } from 'some-module';
      export const el = <div>{someValue}</div>;
    `);

    const result = await transformer.transformFile(filePath);

    expect(result).toContain('jsx(');
    expect(result).toContain('some-module');
    expect(result).toContain('someValue');
  });
});
