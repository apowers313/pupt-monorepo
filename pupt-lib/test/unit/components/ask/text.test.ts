import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Ask } from '../../../../components/ask';
import '../../../../components';

describe('Ask.Text', () => {
  it('should render placeholder when no input provided', async () => {
    const element = jsx(Ask.Text, {
      name: 'username',
      label: 'Enter username',
    });

    const result = await render(element);
    expect(result.text).toContain('{username}');
  });

  it('should render input value when provided', async () => {
    const element = jsx(Ask.Text, {
      name: 'username',
      label: 'Enter username',
    });

    const result = await render(element, {
      inputs: { username: 'alice' },
    });

    expect(result.text).toContain('alice');
    expect(result.text).not.toContain('{username}');
  });

  it('should render only placeholder without label when no input', async () => {
    const element = jsx(Ask.Text, {
      name: 'email',
      label: 'Enter your email address',
    });

    const result = await render(element);
    // Label is metadata for CLI, not rendered in output
    expect(result.text).toBe('{email}');
  });

  it('should support default value', async () => {
    const element = jsx(Ask.Text, {
      name: 'greeting',
      label: 'Greeting',
      default: 'Hello',
    });

    const result = await render(element);
    // When no input is provided, default should be shown
    expect(result.text).toContain('Hello');
  });

  it('should render placeholder for required fields same as optional', async () => {
    const element = jsx(Ask.Text, {
      name: 'name',
      label: 'Your name',
      required: true,
    });

    const result = await render(element);
    // Required is metadata for CLI validation, not rendered in output
    expect(result.text).toBe('{name}');
  });

  it('should render empty string when silent is true', async () => {
    const element = jsx(Ask.Text, {
      name: 'prompt',
      label: 'Enter prompt',
      silent: true,
    });

    const result = await render(element, {
      inputs: { prompt: 'say hello' },
    });

    expect(result.text).toBe('');
  });

  it('should render empty string with silent even when no input provided', async () => {
    const element = jsx(Ask.Text, {
      name: 'prompt',
      label: 'Enter prompt',
      silent: true,
    });

    const result = await render(element);
    expect(result.text).toBe('');
  });

  it('should render empty string with silent even with default value', async () => {
    const element = jsx(Ask.Text, {
      name: 'prompt',
      label: 'Enter prompt',
      silent: true,
      default: 'default value',
    });

    const result = await render(element);
    expect(result.text).toBe('');
  });
});
