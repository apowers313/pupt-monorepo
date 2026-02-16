import { describe, expect,it } from 'vitest';

import { CHILDREN, isPuptElement,PROPS, TYPE } from '../../src';
import { Fragment,jsx } from '../../src/jsx-runtime';

describe('Element symbols', () => {
  it('should use symbols for internal properties', () => {
    const element = jsx('div', { id: 'test' });
    expect(element[TYPE]).toBe('div');
    expect(element[PROPS]).toEqual({ id: 'test' });
    expect(element[CHILDREN]).toEqual([]);
  });

  it('should identify PuptElements correctly', () => {
    const element = jsx('div', {});
    expect(isPuptElement(element)).toBe(true);
    expect(isPuptElement({})).toBe(false);
    expect(isPuptElement(null)).toBe(false);
  });

  it('should handle elements with children', () => {
    const element = jsx('div', { id: 'parent', children: 'Hello' });
    expect(element[TYPE]).toBe('div');
    expect(element[PROPS]).toEqual({ id: 'parent' });
    expect(element[CHILDREN]).toEqual(['Hello']);
  });

  it('should handle component types', () => {
    const MockComponent = () => 'test';
    const element = jsx(MockComponent, { foo: 'bar' });
    expect(element[TYPE]).toBe(MockComponent);
    expect(element[PROPS]).toEqual({ foo: 'bar' });
  });

  it('should handle Fragment type', () => {
    const element = jsx(Fragment, { children: ['a', 'b'] });
    expect(element[TYPE]).toBe(Fragment);
    expect(element[CHILDREN]).toEqual(['a', 'b']);
  });

  it('should not identify plain objects as PuptElements', () => {
    expect(isPuptElement({ type: 'div', props: {}, children: [] })).toBe(false);
  });

  it('should not identify undefined or primitives as PuptElements', () => {
    expect(isPuptElement(undefined)).toBe(false);
    expect(isPuptElement('string')).toBe(false);
    expect(isPuptElement(42)).toBe(false);
    expect(isPuptElement(true)).toBe(false);
  });
});
