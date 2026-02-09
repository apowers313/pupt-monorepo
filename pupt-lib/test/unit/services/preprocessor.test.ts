/**
 * Tests for the preprocessor module.
 * Tests import injection, export wrapping, and various edge cases.
 */
import { describe, it, expect } from 'vitest';
import {
  preprocessSource,
  isPromptFile,
  needsImportInjection,
  needsExportWrapper,
  needsPreprocessing,
} from '../../../src/services/preprocessor';
import {
  getBuiltinComponents,
  getAskComponents,
  getAskShorthand,
} from '../../../src/services/component-discovery';

describe('isPromptFile', () => {
  it('should return true for .prompt files', () => {
    expect(isPromptFile('test.prompt')).toBe(true);
    expect(isPromptFile('path/to/my.prompt')).toBe(true);
    expect(isPromptFile('complex-name_123.prompt')).toBe(true);
  });

  it('should return false for non-.prompt files', () => {
    expect(isPromptFile('test.tsx')).toBe(false);
    expect(isPromptFile('test.ts')).toBe(false);
    expect(isPromptFile('test.js')).toBe(false);
    expect(isPromptFile('prompt.txt')).toBe(false);
    expect(isPromptFile('myprompt')).toBe(false);
  });
});

describe('needsImportInjection', () => {
  it('should return true when there are no imports', () => {
    expect(needsImportInjection('<Prompt>Hello</Prompt>')).toBe(true);
    expect(needsImportInjection('export default <div />;')).toBe(true);
    expect(needsImportInjection('const x = 1; export default x;')).toBe(true);
  });

  it('should return false when imports are present', () => {
    expect(needsImportInjection('import { Prompt } from "pupt-lib";')).toBe(false);
    expect(needsImportInjection('import x from "module";\nexport default x;')).toBe(false);
    expect(needsImportInjection('  import { a } from "b";')).toBe(false);
  });

  it('should handle various import statement formats', () => {
    // All should return false (imports present)
    expect(needsImportInjection('import "side-effect";')).toBe(false);
    expect(needsImportInjection('import * as ns from "module";')).toBe(false);
    expect(needsImportInjection('import { a, b, c } from "module";')).toBe(false);
    expect(needsImportInjection('import defaultExport from "module";')).toBe(false);
  });
});

describe('needsExportWrapper', () => {
  it('should return true when there is no export default', () => {
    expect(needsExportWrapper('<Prompt>Hello</Prompt>')).toBe(true);
    expect(needsExportWrapper('const x = <div />;')).toBe(true);
    expect(needsExportWrapper('export const named = 1;')).toBe(true);
  });

  it('should return false when export default is present', () => {
    expect(needsExportWrapper('export default <div />;')).toBe(false);
    expect(needsExportWrapper('export default 42;')).toBe(false);
    expect(needsExportWrapper('const x = 1;\nexport default x;')).toBe(false);
    expect(needsExportWrapper('  export default (\n<div />\n);')).toBe(false);
  });
});

describe('needsPreprocessing (deprecated)', () => {
  it('should return true if import injection OR export wrapper is needed', () => {
    // Needs imports
    expect(needsPreprocessing('<Prompt>Hello</Prompt>')).toBe(true);

    // Needs export
    expect(needsPreprocessing('import { x } from "y";\nconst z = x;')).toBe(true);

    // Needs both
    expect(needsPreprocessing('const x = <div />;')).toBe(true);
  });

  it('should return false if neither is needed', () => {
    expect(needsPreprocessing('import { x } from "y";\nexport default x;')).toBe(false);
  });
});

describe('preprocessSource', () => {
  describe('no preprocessing needed', () => {
    it('should return source unchanged when imports and export default exist', () => {
      const source = `
import { Prompt } from 'pupt-lib';
export default <Prompt />;
      `.trim();

      const result = preprocessSource(source, { filename: 'test.tsx' });

      expect(result).toBe(source);
    });
  });

  describe('import injection', () => {
    it('should inject imports when missing', () => {
      const source = 'export default <Prompt name="test" />;';

      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain('import {');
      expect(result).toContain("} from 'pupt-lib'");
      expect(result).toContain('Prompt');
    });

    it('should include all built-in components in imports', () => {
      const source = '<Prompt>Hello</Prompt>';

      const result = preprocessSource(source, { filename: 'test.prompt' });

      // Check for some key built-in components
      for (const comp of ['Prompt', 'Role', 'Task', 'Section', 'If', 'ForEach']) {
        expect(result).toContain(comp);
      }
    });

    it('should include Component base class in imports for custom components', () => {
      const source = '<Prompt>Hello</Prompt>';

      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain('Component');
    });

    it('should include Ask components in imports', () => {
      const source = '<Prompt>Hello</Prompt>';

      const result = preprocessSource(source, { filename: 'test.prompt' });

      // Check for Ask namespace and components
      expect(result).toContain('Ask');
      expect(result).toContain('AskText');
      expect(result).toContain('AskSelect');
    });

    it('should create shorthand aliases for Ask components', () => {
      const source = '<Prompt>Hello</Prompt>';

      const result = preprocessSource(source, { filename: 'test.prompt' });

      // Check for shorthand aliases
      expect(result).toContain('const Text = AskText');
      expect(result).toContain('const Select = AskSelect');
      expect(result).toContain('const Number = AskNumber');
    });
  });

  describe('export wrapper', () => {
    it('should wrap raw JSX with export default', () => {
      const source = '<Prompt name="test"><Task>Do something</Task></Prompt>';

      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain('export default (');
      expect(result).toContain(source);
      expect(result).toContain(');');
    });

    it('should not double-wrap when export default exists', () => {
      const source = 'export default <div />;';

      const result = preprocessSource(source, { filename: 'test.prompt' });

      // Should not have double export default
      const exportDefaultCount = (result.match(/export default/g) || []).length;
      expect(exportDefaultCount).toBe(1);
    });
  });

  describe('combined preprocessing', () => {
    it('should inject imports AND wrap export when both are needed', () => {
      const source = '<Prompt name="test" />';

      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain('import {');
      expect(result).toContain('export default (');
    });

    it('should only inject imports when export default exists', () => {
      const source = 'export default <Prompt name="test" />;';

      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain('import {');
      // Original source should be preserved
      expect(result).toContain('export default <Prompt name="test" />;');
      // Should not have wrapped export
      expect(result).not.toContain('export default (\nexport default');
    });

    it('should include filename in preprocessed comment', () => {
      const source = '<Prompt />';

      const result = preprocessSource(source, { filename: 'my/path/test.prompt' });

      expect(result).toContain('// Preprocessed from: my/path/test.prompt');
    });
  });

  describe('edge cases', () => {
    it('should handle empty source', () => {
      const source = '';

      const result = preprocessSource(source, { filename: 'empty.prompt' });

      // Empty source gets wrapped and imports added
      expect(result).toContain('import {');
      expect(result).toContain('export default (');
    });

    it('should handle whitespace-only source', () => {
      const source = '   \n  \n   ';

      const result = preprocessSource(source, { filename: 'whitespace.prompt' });

      expect(result).toContain('import {');
      expect(result).toContain('export default (');
    });

    it('should handle multi-line JSX', () => {
      const source = `
<Prompt name="multi-line">
  <Role>
    You are an assistant.
  </Role>
  <Task>
    Help the user.
  </Task>
</Prompt>
      `.trim();

      const result = preprocessSource(source, { filename: 'multiline.prompt' });

      expect(result).toContain('import {');
      expect(result).toContain('export default (');
      expect(result).toContain(source);
    });

    it('should handle JSX with expressions', () => {
      const source = '<Prompt name={`test-${Date.now()}`}><Task>Do {"something"}</Task></Prompt>';

      const result = preprocessSource(source, { filename: 'expr.prompt' });

      expect(result).toContain('import {');
      expect(result).toContain('export default (');
    });
  });
});

describe('component discovery', () => {
  it('getBuiltinComponents should contain all structural components', () => {
    const structural = ['Prompt', 'Section', 'Role', 'Task', 'Context', 'Constraint', 'Format'];
    const builtins = getBuiltinComponents();
    for (const comp of structural) {
      expect(builtins).toContain(comp);
    }
  });

  it('getBuiltinComponents should contain Component base class for custom components', () => {
    expect(getBuiltinComponents()).toContain('Component');
  });

  it('getBuiltinComponents should contain control flow components', () => {
    const builtins = getBuiltinComponents();
    expect(builtins).toContain('If');
    expect(builtins).toContain('ForEach');
  });

  it('getAskComponents should contain all Ask-related components', () => {
    const askComps = ['Ask', 'AskText', 'AskNumber', 'AskSelect', 'AskConfirm'];
    const discovered = getAskComponents();
    for (const comp of askComps) {
      expect(discovered).toContain(comp);
    }
  });

  it('getAskShorthand should map shorthand names to full names', () => {
    const shorthand = getAskShorthand();
    expect(shorthand['Text']).toBe('AskText');
    expect(shorthand['Number']).toBe('AskNumber');
    expect(shorthand['Select']).toBe('AskSelect');
    expect(shorthand['Confirm']).toBe('AskConfirm');
  });
});
