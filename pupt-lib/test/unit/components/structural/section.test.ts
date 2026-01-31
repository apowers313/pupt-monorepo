import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx, jsxs } from '../../../../src/jsx-runtime';
import { Section } from '../../../../src/components/structural/Section';
import { Prompt } from '../../../../src/components/structural/Prompt';

describe('Section', () => {
  it('should render with XML delimiters', async () => {
    const element = jsx(Section, {
      name: 'context',
      children: 'Some context here',
    });

    const result = await render(element);
    expect(result.text).toContain('<context>');
    expect(result.text).toContain('</context>');
    expect(result.text).toContain('Some context here');
  });

  it('should support markdown delimiter', async () => {
    const element = jsx(Section, {
      name: 'context',
      delimiter: 'markdown',
      children: 'Some context here',
    });

    const result = await render(element);
    expect(result.text).toContain('## context');
  });

  it('should support no delimiter', async () => {
    const element = jsx(Section, {
      name: 'context',
      delimiter: 'none',
      children: 'Some context here',
    });

    const result = await render(element);
    expect(result.text).not.toContain('<context>');
    expect(result.text).not.toContain('## context');
    expect(result.text).toContain('Some context here');
  });

  it('should render children without undefined tags when name is omitted', async () => {
    const element = jsx(Section, {
      children: 'Hello world',
    });

    const result = await render(element);
    expect(result.text).not.toContain('undefined');
    expect(result.text).toBe('Hello world');
  });

  it('should render children without undefined tags when nested in Prompt', async () => {
    const element = jsxs(Prompt, {
      name: 'test-prompt',
      description: 'Test',
      tags: [],
      children: [
        jsxs(Section, {
          children: ['Hello world'],
        }),
      ],
    });

    const result = await render(element);
    expect(result.text).not.toContain('undefined');
    expect(result.text).toBe('Hello world');
  });

  it('should produce validation error for invalid delimiter value', async () => {
    const element = jsx(Section, {
      name: 'test',
      delimiter: 'invalid' as 'xml',
      children: 'content',
    });

    const result = await render(element);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].prop).toBe('delimiter');
      expect(result.errors[0].component).toBe('Section');
    }
  });
});
