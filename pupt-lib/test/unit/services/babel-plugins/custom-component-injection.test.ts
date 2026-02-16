/**
 * Tests for the custom-component-injection Babel plugin.
 * This plugin injects a destructuring declaration for custom components
 * from globalThis into the program body.
 */
import { describe, it, expect } from 'vitest';
import { Transformer } from '../../../../src/services/transformer';

describe('custom-component-injection Babel plugin', () => {
  const transformer = new Transformer();

  async function transform(source: string, componentNames: string[], globalKey = '__TEST_COMPONENTS__'): Promise<string> {
    return transformer.transformSourceAsync(source, 'test.tsx', {
      extraPlugins: [['custom-component-injection', { componentNames, globalKey }]],
    });
  }

  it('should inject destructuring after imports', async () => {
    const source = `
      import { Prompt } from 'pupt-lib';
      export default <Prompt name="test"><MyComp /></Prompt>;
    `;

    const result = await transform(source, ['MyComp']);

    expect(result).toContain('MyComp');
    expect(result).toContain('__TEST_COMPONENTS__');
  });

  it('should inject multiple component names', async () => {
    const source = `
      import { Prompt } from 'pupt-lib';
      export default <Prompt name="test"><A /><B /><C /></Prompt>;
    `;

    const result = await transform(source, ['A', 'B', 'C']);

    expect(result).toContain('__TEST_COMPONENTS__');
  });

  it('should not inject when componentNames is empty', async () => {
    const source = `
      import { Prompt } from 'pupt-lib';
      export default <Prompt name="test">Hello</Prompt>;
    `;

    const result = await transform(source, []);

    expect(result).not.toContain('__TEST_COMPONENTS__');
  });

  it('should inject at the beginning when there are no imports', async () => {
    const source = `
      export default "hello";
    `;

    const result = await transform(source, ['Foo']);

    expect(result).toContain('__TEST_COMPONENTS__');
    expect(result).toContain('Foo');
  });

  it('should use the provided globalKey', async () => {
    const source = `
      import { Prompt } from 'pupt-lib';
      export default <Prompt name="test"><X /></Prompt>;
    `;

    const result = await transform(source, ['X'], '__MY_CUSTOM_KEY__');

    expect(result).toContain('__MY_CUSTOM_KEY__');
    expect(result).not.toContain('__TEST_COMPONENTS__');
  });
});
