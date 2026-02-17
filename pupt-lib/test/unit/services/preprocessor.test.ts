/**
 * Tests for the preprocessor module.
 * Tests extension-based preprocessing for .prompt files.
 */
import { describe, expect,it } from 'vitest';

import {
  getAskComponents,
  getAskShorthand,
  getBuiltinComponents,
} from '../../../src/services/component-discovery';
import {
  isPromptFile,
  preprocessSource,
} from '../../../src/services/preprocessor';

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

describe('preprocessSource', () => {
  describe('.prompt files always get preprocessing', () => {
    it('should inject imports for .prompt files', () => {
      const source = '<Prompt name="test" />';
      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain('import {');
      expect(result).toContain("} from '@pupt/lib'");
      expect(result).toContain('Prompt');
    });

    it('should wrap with export default for .prompt files', () => {
      const source = '<Prompt name="test"><Task>Do something</Task></Prompt>';
      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain('export default (');
      expect(result).toContain(source);
      expect(result).toContain(');');
    });

    it('should include all built-in components in imports', () => {
      const source = '<Prompt>Hello</Prompt>';
      const result = preprocessSource(source, { filename: 'test.prompt' });

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

      expect(result).toContain('Ask');
      expect(result).toContain('AskText');
      expect(result).toContain('AskSelect');
    });

    it('should create shorthand aliases for Ask components', () => {
      const source = '<Prompt>Hello</Prompt>';
      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain('const Text = AskText');
      expect(result).toContain('const Select = AskSelect');
      expect(result).toContain('const Number = AskNumber');
    });

    it('should include filename in preprocessed comment', () => {
      const source = '<Prompt />';
      const result = preprocessSource(source, { filename: 'my/path/test.prompt' });

      expect(result).toContain('// Preprocessed from: my/path/test.prompt');
    });
  });

  describe('.prompt files with content that looks like JS (issue #29)', () => {
    it('should still preprocess when content contains Python imports', () => {
      const source = [
        '<Prompt name="test">',
        '  <Task>',
        '    Use the following Python code:',
        '    import hashlib',
        '    import secrets',
        '  </Task>',
        '</Prompt>',
      ].join('\n');

      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain('import {');
      expect(result).toContain("} from '@pupt/lib'");
      expect(result).toContain('export default (');
    });

    it('should still preprocess when content contains JS import examples', () => {
      const source = [
        '<Prompt name="test">',
        '  <Code language="javascript">',
        '    import { useState } from "react";',
        '    export default function App() { return null; }',
        '  </Code>',
        '</Prompt>',
      ].join('\n');

      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain("} from '@pupt/lib'");
      expect(result).toContain('export default (');
    });

    it('should still preprocess when content contains export default examples', () => {
      const source = [
        '<Prompt name="test">',
        '  <Code language="javascript">',
        '    export default function handler(req, res) {',
        '      res.send("hello");',
        '    }',
        '  </Code>',
        '</Prompt>',
      ].join('\n');

      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain("} from '@pupt/lib'");
      expect(result).toContain('export default (');
    });
  });

  describe('non-.prompt files are returned unchanged', () => {
    it('should not preprocess .tsx files', () => {
      const source = `
import { Prompt } from '@pupt/lib';
export default <Prompt />;
      `.trim();

      const result = preprocessSource(source, { filename: 'test.tsx' });

      expect(result).toBe(source);
    });

    it('should not preprocess .ts files', () => {
      const source = 'const x = 1;';
      const result = preprocessSource(source, { filename: 'test.ts' });

      expect(result).toBe(source);
    });

    it('should not preprocess .js files', () => {
      const source = 'export default <div />;';
      const result = preprocessSource(source, { filename: 'test.js' });

      expect(result).toBe(source);
    });
  });

  describe('edge cases', () => {
    it('should handle empty .prompt source', () => {
      const result = preprocessSource('', { filename: 'empty.prompt' });

      expect(result).toContain('import {');
      expect(result).toContain('export default (');
    });

    it('should handle whitespace-only .prompt source', () => {
      const result = preprocessSource('   \n  \n   ', { filename: 'whitespace.prompt' });

      expect(result).toContain('import {');
      expect(result).toContain('export default (');
    });

    it('should handle multi-line JSX in .prompt files', () => {
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

    it('should handle JSX with expressions in .prompt files', () => {
      // eslint-disable-next-line no-template-curly-in-string
      const source = '<Prompt name={`test-${Date.now()}`}><Task>Do {"something"}</Task></Prompt>';
      const result = preprocessSource(source, { filename: 'expr.prompt' });

      expect(result).toContain('import {');
      expect(result).toContain('export default (');
    });

    it('should wrap content in a Fragment', () => {
      const source = '<Prompt name="test" />';
      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain('<>');
      expect(result).toContain('</>');
    });

    it('should include <Uses> inside the Fragment (not extracted)', () => {
      const source = `<Uses component="Foo" from="foo-pkg" />
<Prompt name="test">
  <Task>Hello</Task>
</Prompt>`;
      const result = preprocessSource(source, { filename: 'test.prompt' });

      // <Uses> should remain in the source, inside the Fragment wrapper
      expect(result).toContain('<Uses component="Foo" from="foo-pkg" />');
      expect(result).toContain('<>');
      expect(result).toContain('</>');
    });

    it('should handle multiple <Uses> elements in .prompt files', () => {
      const source = `<Uses component="Foo" from="foo-pkg" />
<Uses component="Bar" from="bar-pkg" />
<Prompt name="test">
  <Task>Hello</Task>
</Prompt>`;
      const result = preprocessSource(source, { filename: 'test.prompt' });

      expect(result).toContain('<Uses component="Foo" from="foo-pkg" />');
      expect(result).toContain('<Uses component="Bar" from="bar-pkg" />');
    });

    it('should not treat <Uses>-like text in prompt content specially', () => {
      const source = `<Prompt name="test">
  <Task>
    To import a component, use:
    <Uses component="X" from="y" />
    This is just example text.
  </Task>
</Prompt>`;
      const result = preprocessSource(source, { filename: 'test.prompt' });

      // The preprocessor should NOT strip this — it just wraps in Fragment.
      // The Babel plugin will handle actual <Uses> elements in the AST.
      expect(result).toContain('<Uses component="X" from="y" />');
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
    expect(shorthand.Text).toBe('AskText');
    expect(shorthand.Number).toBe('AskNumber');
    expect(shorthand.Select).toBe('AskSelect');
    expect(shorthand.Confirm).toBe('AskConfirm');
  });
});
