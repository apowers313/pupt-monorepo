/**
 * Tests for the uses-to-import Babel plugin.
 * This plugin transforms <Uses> JSX elements into import declarations.
 */
import { describe, expect,it } from 'vitest';

import { Transformer } from '../../../../src/services/transformer';

describe('uses-to-import Babel plugin', () => {
  const transformer = new Transformer();

  // Helper to transform and check result
  async function transform(source: string): Promise<string> {
    return transformer.transformSourceAsync(source, 'test.tsx');
  }

  describe('basic transformations', () => {
    it('should transform <Uses component="X" from="source" />', async () => {
      const source = `
        <Uses component="MyComponent" from="my-package" />
        export default <div>Test</div>;
      `;

      const result = await transform(source);

      expect(result).toContain('import { MyComponent } from "my-package"');
      expect(result).not.toContain('<Uses');
    });

    it('should transform default imports with <Uses default="X" from="source" />', async () => {
      const source = `
        <Uses default="DefaultExport" from="my-package" />
        export default <div><DefaultExport /></div>;
      `;

      const result = await transform(source);

      expect(result).toContain('import DefaultExport from "my-package"');
    });

    it('should transform aliased imports with <Uses component="X" as="Y" from="source" />', async () => {
      const source = `
        <Uses component="Original" as="Aliased" from="my-package" />
        export default <div><Aliased /></div>;
      `;

      const result = await transform(source);

      expect(result).toContain('import { Original as Aliased } from "my-package"');
    });

    it('should transform multiple comma-separated components', async () => {
      const source = `
        <Uses component="A, B, C" from="my-package" />
        export default <div><A /><B /><C /></div>;
      `;

      const result = await transform(source);

      expect(result).toContain('import { A, B, C } from "my-package"');
    });
  });

  describe('attribute value formats', () => {
    it('should handle JSX expression container with string: component={"X"}', async () => {
      const source = `
        <Uses component={"MyComponent"} from={"my-package"} />
        export default <div><MyComponent /></div>;
      `;

      const result = await transform(source);

      expect(result).toContain('import { MyComponent } from "my-package"');
    });

    it('should handle single quotes in attribute values', async () => {
      const source = `
        <Uses component='MyComponent' from='my-package' />
        export default <div><MyComponent /></div>;
      `;

      const result = await transform(source);

      expect(result).toContain('import { MyComponent } from "my-package"');
    });
  });

  describe('multiple Uses elements', () => {
    it('should transform multiple <Uses> elements', async () => {
      const source = `
        <>
          <Uses component="CompA" from="package-a" />
          <Uses component="CompB" from="package-b" />
          <Uses default="DefaultC" from="package-c" />
        </>
        export default <div><CompA /><CompB /><DefaultC /></div>;
      `;

      const result = await transform(source);

      expect(result).toContain('import { CompA } from "package-a"');
      expect(result).toContain('import { CompB } from "package-b"');
      expect(result).toContain('import DefaultC from "package-c"');
    });
  });

  describe('error handling', () => {
    it('should throw error when "from" attribute is missing', async () => {
      const source = `
        <Uses component="X" />
        export default <div />;
      `;

      await expect(transform(source)).rejects.toThrow(/requires a "from" attribute/);
    });

    it('should throw error when both "component" and "default" are missing', async () => {
      const source = `
        <Uses from="my-package" />
        export default <div />;
      `;

      await expect(transform(source)).rejects.toThrow(/requires either a "component" or "default" attribute/);
    });
  });

  describe('edge cases', () => {
    it('should ignore non-Uses JSX elements', async () => {
      const source = `
        export default <div><span>Hello</span></div>;
      `;

      const result = await transform(source);

      expect(result).toContain('jsx');
      expect(result).toContain('"div"');
      expect(result).toContain('"span"');
    });

    it('should handle Uses inside nested JSX (removed from output)', async () => {
      const source = `
        export default (
          <div>
            <Uses component="Child" from="child-pkg" />
            <Child />
          </div>
        );
      `;

      const result = await transform(source);

      expect(result).toContain('import { Child } from "child-pkg"');
      expect(result).not.toContain('<Uses');
    });

    it('should handle whitespace in comma-separated components', async () => {
      const source = `
        <Uses component="  A  ,  B  ,  C  " from="pkg" />
        export default <div />;
      `;

      const result = await transform(source);

      // Should trim whitespace
      expect(result).toContain('import { A, B, C } from "pkg"');
    });

    it('should ignore "as" when multiple components are specified', async () => {
      const source = `
        <Uses component="A, B" as="Aliased" from="pkg" />
        export default <div><A /><B /></div>;
      `;

      const result = await transform(source);

      // "as" should only apply when there's a single component
      expect(result).toContain('import { A, B } from "pkg"');
      expect(result).not.toContain('Aliased');
    });

    it('should handle scoped package names', async () => {
      const source = `
        <Uses component="Comp" from="@org/package" />
        export default <div><Comp /></div>;
      `;

      const result = await transform(source);

      expect(result).toContain('import { Comp } from "@org/package"');
    });

    it('should handle package subpath imports', async () => {
      const source = `
        <Uses component="Sub" from="package/subpath" />
        export default <div><Sub /></div>;
      `;

      const result = await transform(source);

      expect(result).toContain('import { Sub } from "package/subpath"');
    });
  });
});
