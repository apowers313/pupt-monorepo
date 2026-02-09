/**
 * Tests to improve code coverage for lower-coverage files.
 * Targets specific uncovered branches and edge cases.
 */
import { describe, it, expect } from 'vitest';
import { render } from '../../src/render';
import { jsx } from '../../src/jsx-runtime';
import { Format } from '../../components/structural/Format';
import { Steps, Step } from '../../components/reasoning';
import { createPromptFromSource } from '../../src/create-prompt';
import { TYPE, PROPS, CHILDREN } from '../../src/types/symbols';
import type { PuptElement } from '../../src/types';

describe('Coverage Improvements', () => {
  describe('Format component - delimiter branches', () => {
    it('should render markdown format WITH children', async () => {
      const element = jsx(Format, {
        type: 'json',
        delimiter: 'markdown',
        children: 'Additional format instructions here.',
      });
      const result = await render(element);

      // Markdown delimiter with children should use ## format header
      expect(result.text).toContain('## format');
      expect(result.text).toContain('Output format: json');
      expect(result.text).toContain('Additional format instructions');
      expect(result.text).not.toContain('<format>');
    });

    it('should render none delimiter WITH children', async () => {
      const element = jsx(Format, {
        type: 'text',
        delimiter: 'none',
        children: 'Custom instructions.',
      });
      const result = await render(element);

      // None delimiter with children should have no wrapper
      expect(result.text).toContain('Output format: text');
      expect(result.text).toContain('Custom instructions');
      expect(result.text).not.toContain('<format>');
      expect(result.text).not.toContain('## format');
    });

    it('should render xml delimiter WITH children', async () => {
      const element = jsx(Format, {
        type: 'xml',
        delimiter: 'xml',
        children: 'Use proper nesting.',
      });
      const result = await render(element);

      expect(result.text).toContain('<format>');
      expect(result.text).toContain('Output format: xml');
      expect(result.text).toContain('Use proper nesting');
      expect(result.text).toContain('</format>');
    });

    it('should render markdown format without type but with children', async () => {
      const element = jsx(Format, {
        delimiter: 'markdown',
        children: 'Just custom format description.',
      });
      const result = await render(element);

      expect(result.text).toContain('## format');
      expect(result.text).toContain('Just custom format description');
    });

    it('should render none delimiter without type but with children', async () => {
      const element = jsx(Format, {
        delimiter: 'none',
        children: 'Just custom format description.',
      });
      const result = await render(element);

      expect(result.text).toBe('Just custom format description.');
      expect(result.text).not.toContain('<format>');
    });
  });

  describe('Steps component - legacy Step type detection', () => {
    it('should handle Step elements with function type', async () => {
      // Standard case - Step as function component
      const element = jsx(Steps, {
        children: [
          jsx(Step, { children: 'First step' }),
          jsx(Step, { children: 'Second step' }),
        ],
      });
      const result = await render(element);

      expect(result.text).toContain('1.');
      expect(result.text).toContain('First step');
      expect(result.text).toContain('2.');
      expect(result.text).toContain('Second step');
    });

    it('should handle mixed children with non-Step elements', async () => {
      // Steps should filter out or ignore non-Step children during numbering
      const element = jsx(Steps, {
        children: [
          jsx(Step, { children: 'Valid step' }),
          'Some text that is not a Step',
          jsx(Step, { children: 'Another valid step' }),
        ],
      });
      const result = await render(element);

      expect(result.text).toContain('Valid step');
      expect(result.text).toContain('Another valid step');
    });

    it('should handle legacy string type Step elements', async () => {
      // Create a PuptElement with string type 'Step' (legacy format)
      // This tests the branch at lines 50-52 in Steps.ts that checks for string type 'Step'
      const legacyStepElement: PuptElement = {
        [TYPE]: 'Step' as unknown as PuptElement[typeof TYPE],
        [PROPS]: { children: 'Legacy step content' },
        [CHILDREN]: ['Legacy step content'],
      };

      const element = jsx(Steps, {
        children: [legacyStepElement],
      });

      const result = await render(element);
      // The element is recognized as a Step (for auto-numbering purposes),
      // but string-typed elements don't have a render method so they output
      // their children directly without the number prefix
      expect(result.text).toContain('Legacy step content');
      expect(result.text).toContain('<steps>');
    });

    it('should not treat non-Step string types as steps', async () => {
      // Create a PuptElement with a different string type
      const nonStepElement: PuptElement = {
        [TYPE]: 'NotAStep' as unknown as PuptElement[typeof TYPE],
        [PROPS]: { children: 'Not a step' },
        [CHILDREN]: ['Not a step'],
      };

      const element = jsx(Steps, {
        children: [
          jsx(Step, { children: 'Real step' }),
          nonStepElement,
        ],
      });

      const result = await render(element);
      expect(result.text).toContain('1.');
      expect(result.text).toContain('Real step');
      // The non-Step element should not be auto-numbered
    });

    it('should handle Steps with explicit numbers', async () => {
      const element = jsx(Steps, {
        children: [
          jsx(Step, { number: 5, children: 'Step five' }),
          jsx(Step, { children: 'Step six (auto)' }),
        ],
      });

      const result = await render(element);
      expect(result.text).toContain('5.');
      expect(result.text).toContain('Step five');
      expect(result.text).toContain('6.');
      expect(result.text).toContain('Step six');
    });
  });

  describe('Name hoisting - invalid identifier errors', () => {
    it('should throw error for kebab-case name in Ask component', async () => {
      const source = `
<Prompt name="test">
  <Ask.Text name="my-invalid-name" label="Test" default="value" />
</Prompt>
      `;

      await expect(createPromptFromSource(source, 'test.prompt'))
        .rejects.toThrow(/Invalid variable name.*my-invalid-name/);
    });

    it('should throw error for reserved word as name', async () => {
      const source = `
<Prompt name="test">
  <Ask.Text name="class" label="Test" default="value" />
</Prompt>
      `;

      await expect(createPromptFromSource(source, 'test.prompt'))
        .rejects.toThrow(/Invalid variable name.*class/);
    });

    it('should throw error for name starting with number', async () => {
      const source = `
<Prompt name="test">
  <Ask.Text name="123abc" label="Test" default="value" />
</Prompt>
      `;

      await expect(createPromptFromSource(source, 'test.prompt'))
        .rejects.toThrow(/Invalid variable name.*123abc/);
    });

    it('should accept valid camelCase name', async () => {
      const source = `
<Prompt name="test">
  <Ask.Text name="validName" label="Test" default="value" />
  <Task>Hello {validName}</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'test.prompt');
      const result = await render(element);

      expect(result.text).toContain('Hello value');
    });

    it('should accept name with underscores', async () => {
      const source = `
<Prompt name="test">
  <Ask.Text name="valid_name" label="Test" default="value" />
  <Task>Hello {valid_name}</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'test.prompt');
      const result = await render(element);

      expect(result.text).toContain('Hello value');
    });

    it('should accept name starting with underscore', async () => {
      const source = `
<Prompt name="test">
  <Ask.Text name="_private" label="Test" default="secret" />
  <Task>Value: {_private}</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'test.prompt');
      const result = await render(element);

      expect(result.text).toContain('Value: secret');
    });

    it('should accept name starting with dollar sign', async () => {
      const source = `
<Prompt name="test">
  <Ask.Text name="$value" label="Test" default="money" />
  <Task>Amount: {$value}</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'test.prompt');
      const result = await render(element);

      expect(result.text).toContain('Amount: money');
    });
  });

  describe('Name hoisting - context handling', () => {
    it('should hoist named element that is standalone expression', async () => {
      // This tests the isExpressionStatement branch
      const source = `
<Prompt name="test">
  <Ask.Text name="standalone" label="Test" default="alone" />
  <Task>Value: {standalone}</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'test.prompt');
      const result = await render(element);

      expect(result.text).toContain('Value: alone');
    });

    it('should hoist named element inside JSX parent', async () => {
      // This tests the isJSXElement parent branch
      const source = `
<Prompt name="test">
  <Section>
    <Ask.Text name="nested" label="Test" default="inside" />
    <Task>Nested: {nested}</Task>
  </Section>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'test.prompt');
      const result = await render(element);

      expect(result.text).toContain('Nested: inside');
    });
  });

  describe('Module evaluator - error message extraction', () => {
    it('should provide helpful error for missing package without quotes in error', async () => {
      // Test the case where error message doesn't have a quoted specifier
      const source = `
import { nonExistentExport } from 'definitely-not-a-real-package-xyz-123';
export default nonExistentExport;
      `;

      await expect(createPromptFromSource(source, 'missing-pkg.tsx'))
        .rejects.toThrow(/definitely-not-a-real-package-xyz-123/);
    });
  });
});
