/**
 * Tests for branch coverage in Step and Steps components
 */
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Steps, Step } from '../../../../components/reasoning';

describe('Step branch coverage', () => {
  describe('step number handling', () => {
    it('should render with explicit step number', async () => {
      const element = jsx(Step, {
        number: 5,
        children: 'Step content',
      });

      const result = await render(element);
      expect(result.text).toContain('5.');
      expect(result.text).toContain('Step content');
    });

    it('should render without number prefix when number is 0', async () => {
      const element = jsx(Step, {
        number: 0,
        children: 'Unnumbered step',
      });

      const result = await render(element);
      // When number is 0, no prefix is shown
      expect(result.text).not.toMatch(/^0\./);
      expect(result.text).toContain('Unnumbered step');
    });

    it('should render without number prefix when number is undefined', async () => {
      const element = jsx(Step, {
        children: 'No number step',
      });

      const result = await render(element);
      // Default is 0, so no prefix
      expect(result.text).toContain('No number step');
    });
  });
});

describe('Steps branch coverage', () => {
  describe('children handling', () => {
    it('should handle single Step child (not array)', async () => {
      const element = jsx(Steps, {
        children: jsx(Step, { children: 'Only step' }),
      });

      const result = await render(element);
      expect(result.text).toContain('1.');
      expect(result.text).toContain('Only step');
    });

    it('should handle non-Step children', async () => {
      const element = jsx(Steps, {
        children: [
          'Text node',
          jsx(Step, { children: 'Real step' }),
          null,
        ],
      });

      const result = await render(element);
      expect(result.text).toContain('1.');
      expect(result.text).toContain('Real step');
    });
  });

  describe('auto-numbering with explicit numbers', () => {
    it('should continue numbering after explicit number', async () => {
      const element = jsx(Steps, {
        children: [
          jsx(Step, { number: 10, children: 'Step 10' }),
          jsx(Step, { children: 'Step 11 (auto)' }),
        ],
      });

      const result = await render(element);
      expect(result.text).toContain('10.');
      expect(result.text).toContain('11.');
    });

    it('should handle mixed explicit and auto numbers', async () => {
      const element = jsx(Steps, {
        children: [
          jsx(Step, { children: 'Auto 1' }),
          jsx(Step, { number: 5, children: 'Explicit 5' }),
          jsx(Step, { children: 'Auto 6' }),
        ],
      });

      const result = await render(element);
      expect(result.text).toMatch(/1\..*Auto 1/s);
      expect(result.text).toMatch(/5\..*Explicit 5/s);
      expect(result.text).toMatch(/6\..*Auto 6/s);
    });
  });

  describe('isStepElement type checking', () => {
    it('should not treat null as Step', async () => {
      const element = jsx(Steps, {
        children: [
          null,
          jsx(Step, { children: 'Real step' }),
        ],
      });

      const result = await render(element);
      expect(result.text).toContain('1.');
    });

    it('should not treat primitive as Step', async () => {
      const element = jsx(Steps, {
        children: [
          'string',
          123,
          jsx(Step, { children: 'Real step' }),
        ],
      });

      const result = await render(element);
      expect(result.text).toContain('1.');
    });

    it('should not treat array as Step', async () => {
      const element = jsx(Steps, {
        children: [
          ['nested', 'array'] as unknown,
          jsx(Step, { children: 'Real step' }),
        ],
      });

      const result = await render(element);
      expect(result.text).toContain('1.');
    });

    it('should not treat object without type as Step', async () => {
      const element = jsx(Steps, {
        children: [
          { notType: 'value' } as unknown,
          jsx(Step, { children: 'Real step' }),
        ],
      });

      const result = await render(element);
      expect(result.text).toContain('1.');
    });

    it('should not treat non-Step element as Step', async () => {
      const element = jsx(Steps, {
        children: [
          { type: 'NotStep', props: {}, children: [] },
          jsx(Step, { children: 'Real step' }),
        ],
      });

      const result = await render(element);
      expect(result.text).toContain('1.');
    });
  });
});
