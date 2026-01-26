import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Ask } from '../../../../src/components/ask';
import '../../../../src/components';

describe('Ask.Text', () => {
  it('should render placeholder when no input provided', () => {
    const element = jsx(Ask.Text, {
      name: 'username',
      label: 'Enter username',
    });

    const result = render(element);
    expect(result.text).toContain('{username}');
  });

  it('should render input value when provided', () => {
    const element = jsx(Ask.Text, {
      name: 'username',
      label: 'Enter username',
    });

    const result = render(element, {
      inputs: { username: 'alice' },
    });

    expect(result.text).toContain('alice');
    expect(result.text).not.toContain('{username}');
  });

  it('should render only placeholder without label when no input', () => {
    const element = jsx(Ask.Text, {
      name: 'email',
      label: 'Enter your email address',
    });

    const result = render(element);
    // Label is metadata for CLI, not rendered in output
    expect(result.text).toBe('{email}');
  });

  it('should support default value', () => {
    const element = jsx(Ask.Text, {
      name: 'greeting',
      label: 'Greeting',
      default: 'Hello',
    });

    const result = render(element);
    // When no input is provided, default should be shown
    expect(result.text).toContain('Hello');
  });

  it('should render placeholder for required fields same as optional', () => {
    const element = jsx(Ask.Text, {
      name: 'name',
      label: 'Your name',
      required: true,
    });

    const result = render(element);
    // Required is metadata for CLI validation, not rendered in output
    expect(result.text).toBe('{name}');
  });
});
