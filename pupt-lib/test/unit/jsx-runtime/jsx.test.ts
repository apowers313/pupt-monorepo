import { describe, it, expect } from 'vitest';
import { jsx, jsxs, Fragment } from '../../../src/jsx-runtime';
import { TYPE, PROPS, CHILDREN } from '../../../src';

describe('jsx()', () => {
  it('should create element with single child', () => {
    const element = jsx('div', { id: 'test', children: 'Hello' });

    expect(element[TYPE]).toBe('div');
    expect((element[PROPS] as { id: string }).id).toBe('test');
    expect(element[CHILDREN]).toEqual(['Hello']);
  });

  it('should handle null children', () => {
    const element = jsx('span', { children: null });
    expect(element[CHILDREN]).toEqual([]);
  });

  it('should handle undefined children', () => {
    const element = jsx('span', { children: undefined });
    expect(element[CHILDREN]).toEqual([]);
  });

  it('should handle no children prop', () => {
    const element = jsx('span', {});
    expect(element[CHILDREN]).toEqual([]);
  });

  it('should separate children from other props', () => {
    const element = jsx('div', { id: 'test', className: 'foo', children: 'Hello' });

    expect(element[PROPS]).toEqual({ id: 'test', className: 'foo' });
    expect(element[PROPS]).not.toHaveProperty('children');
  });

  it('should handle number children', () => {
    const element = jsx('span', { children: 42 });
    expect(element[CHILDREN]).toEqual([42]);
  });

  it('should handle nested element as child', () => {
    const child = jsx('span', { children: 'nested' });
    const parent = jsx('div', { children: child });

    expect(parent[CHILDREN]).toHaveLength(1);
    expect(parent[CHILDREN][0]).toEqual(child);
  });
});

describe('jsxs()', () => {
  it('should create element with multiple children', () => {
    const element = jsxs('div', {
      children: ['Hello', ' ', 'World'],
    });

    expect(element[CHILDREN]).toEqual(['Hello', ' ', 'World']);
  });

  it('should flatten nested arrays', () => {
    const element = jsxs('div', {
      children: ['A', ['B', 'C'], 'D'],
    });

    expect(element[CHILDREN]).toEqual(['A', 'B', 'C', 'D']);
  });

  it('should filter out falsy values except 0', () => {
    const element = jsxs('div', {
      children: ['A', null, 'B', undefined, 'C', false, 'D', 0],
    });

    // 0 should be kept, other falsy values filtered
    expect(element[CHILDREN]).toEqual(['A', 'B', 'C', 'D', 0]);
  });

  it('should handle deeply nested arrays', () => {
    const element = jsxs('div', {
      children: ['A', [['B', ['C']]], 'D'],
    });

    expect(element[CHILDREN]).toEqual(['A', 'B', 'C', 'D']);
  });
});

describe('Fragment', () => {
  it('should be a symbol', () => {
    expect(typeof Fragment).toBe('symbol');
  });

  it('should have correct description', () => {
    expect(Fragment.toString()).toBe('Symbol(pupt.Fragment)');
  });

  it('should work as element type', () => {
    const element = jsx(Fragment, { children: 'content' });
    expect(element[TYPE]).toBe(Fragment);
    expect(element[CHILDREN]).toEqual(['content']);
  });

  it('should work with multiple children', () => {
    const element = jsxs(Fragment, { children: ['a', 'b', 'c'] });
    expect(element[TYPE]).toBe(Fragment);
    expect(element[CHILDREN]).toEqual(['a', 'b', 'c']);
  });
});
