import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { If } from '../../../../src/components/control/If';
import '../../../../src/components';

describe('If', () => {
  it('should render children when condition is true', () => {
    const element = jsx(If, {
      when: true,
      children: 'Visible',
    });

    const result = render(element);
    expect(result.text).toBe('Visible');
  });

  it('should not render when condition is false', () => {
    const element = jsx(If, {
      when: false,
      children: 'Hidden',
    });

    const result = render(element);
    expect(result.text).toBe('');
  });

  it('should evaluate Excel formula syntax', () => {
    const element = jsx(If, {
      when: '=count>5',
      children: 'Many items',
    });

    const result = render(element, {
      inputs: { count: 10 },
    });

    expect(result.text).toBe('Many items');
  });

  it('should not render when Excel formula evaluates to false', () => {
    const element = jsx(If, {
      when: '=count>5',
      children: 'Many items',
    });

    const result = render(element, {
      inputs: { count: 3 },
    });

    expect(result.text).toBe('');
  });

  it('should support complex Excel formulas with AND', () => {
    const element = jsx(If, {
      when: '=AND(count>5, userType="admin")',
      children: 'Admin with many items',
    });

    const result = render(element, {
      inputs: { count: 10, userType: 'admin' },
    });

    expect(result.text).toContain('Admin');
  });

  it('should not render when AND condition partially fails', () => {
    const element = jsx(If, {
      when: '=AND(count>5, userType="admin")',
      children: 'Admin with many items',
    });

    const result = render(element, {
      inputs: { count: 10, userType: 'user' },
    });

    expect(result.text).toBe('');
  });

  it('should support OR formulas', () => {
    const element = jsx(If, {
      when: '=OR(role="admin", role="moderator")',
      children: 'Has elevated permissions',
    });

    const result = render(element, {
      inputs: { role: 'moderator' },
    });

    expect(result.text).toContain('elevated');
  });

  it('should support equality check formulas', () => {
    const element = jsx(If, {
      when: '=status="active"',
      children: 'Active user',
    });

    const result = render(element, {
      inputs: { status: 'active' },
    });

    expect(result.text).toBe('Active user');
  });

  it('should handle nested elements as children', () => {
    const element = jsx(If, {
      when: true,
      children: jsx('span', { children: 'Nested content' }),
    });

    // Since 'span' is not a registered component, we just test the structure renders
    const result = render(element);
    expect(result.text).toContain('Nested content');
  });
});
