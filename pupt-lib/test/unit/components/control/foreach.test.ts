import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { ForEach } from '../../../../src/components/control/ForEach';
import '../../../../src/components';

describe('ForEach', () => {
  it('should iterate over items', () => {
    const element = jsx(ForEach, {
      items: ['a', 'b', 'c'],
      as: 'item',
      children: (item: string) => `Item: ${item}\n`,
    });

    const result = render(element);
    expect(result.text).toContain('Item: a');
    expect(result.text).toContain('Item: b');
    expect(result.text).toContain('Item: c');
  });

  it('should handle empty array', () => {
    const element = jsx(ForEach, {
      items: [],
      as: 'item',
      children: (item: string) => `Item: ${item}`,
    });

    const result = render(element);
    expect(result.text).toBe('');
  });

  it('should provide index to children function', () => {
    const element = jsx(ForEach, {
      items: ['first', 'second'],
      as: 'item',
      children: (item: string, index: number) => `${index}: ${item}\n`,
    });

    const result = render(element);
    expect(result.text).toContain('0: first');
    expect(result.text).toContain('1: second');
  });

  it('should handle objects in items array', () => {
    const element = jsx(ForEach, {
      items: [{ name: 'Alice' }, { name: 'Bob' }],
      as: 'user',
      children: (user: { name: string }) => `User: ${user.name}\n`,
    });

    const result = render(element);
    expect(result.text).toContain('User: Alice');
    expect(result.text).toContain('User: Bob');
  });

  it('should handle single item array', () => {
    const element = jsx(ForEach, {
      items: ['only'],
      as: 'item',
      children: (item: string) => `Single: ${item}`,
    });

    const result = render(element);
    expect(result.text).toBe('Single: only');
  });

  it('should preserve rendering order', () => {
    const element = jsx(ForEach, {
      items: [1, 2, 3],
      as: 'num',
      children: (num: number) => `${num}`,
    });

    const result = render(element);
    expect(result.text).toBe('123');
  });
});
