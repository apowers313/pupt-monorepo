import { describe, it, expect } from 'vitest';
import { jsx, jsxs, Fragment } from '../../../src/jsx-runtime';

describe('jsx()', () => {
  it('should create element with single child', () => {
    const element = jsx('div', { id: 'test', children: 'Hello' });

    expect(element.type).toBe('div');
    expect(element.props.id).toBe('test');
    expect(element.children).toEqual(['Hello']);
  });

  it('should handle null children', () => {
    const element = jsx('span', { children: null });
    expect(element.children).toEqual([]);
  });

  it('should handle undefined children', () => {
    const element = jsx('span', { children: undefined });
    expect(element.children).toEqual([]);
  });

  it('should handle no children prop', () => {
    const element = jsx('span', {});
    expect(element.children).toEqual([]);
  });

  it('should separate children from other props', () => {
    const element = jsx('div', { id: 'test', className: 'foo', children: 'Hello' });

    expect(element.props).toEqual({ id: 'test', className: 'foo' });
    expect(element.props).not.toHaveProperty('children');
  });

  it('should handle number children', () => {
    const element = jsx('span', { children: 42 });
    expect(element.children).toEqual([42]);
  });

  it('should handle nested element as child', () => {
    const child = jsx('span', { children: 'nested' });
    const parent = jsx('div', { children: child });

    expect(parent.children).toHaveLength(1);
    expect(parent.children[0]).toEqual(child);
  });
});

describe('jsxs()', () => {
  it('should create element with multiple children', () => {
    const element = jsxs('div', {
      children: ['Hello', ' ', 'World'],
    });

    expect(element.children).toEqual(['Hello', ' ', 'World']);
  });

  it('should flatten nested arrays', () => {
    const element = jsxs('div', {
      children: ['A', ['B', 'C'], 'D'],
    });

    expect(element.children).toEqual(['A', 'B', 'C', 'D']);
  });

  it('should filter out falsy values except 0', () => {
    const element = jsxs('div', {
      children: ['A', null, 'B', undefined, 'C', false, 'D', 0],
    });

    // 0 should be kept, other falsy values filtered
    expect(element.children).toEqual(['A', 'B', 'C', 'D', 0]);
  });

  it('should handle deeply nested arrays', () => {
    const element = jsxs('div', {
      children: ['A', [['B', ['C']]], 'D'],
    });

    expect(element.children).toEqual(['A', 'B', 'C', 'D']);
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
    expect(element.type).toBe(Fragment);
    expect(element.children).toEqual(['content']);
  });

  it('should work with multiple children', () => {
    const element = jsxs(Fragment, { children: ['a', 'b', 'c'] });
    expect(element.type).toBe(Fragment);
    expect(element.children).toEqual(['a', 'b', 'c']);
  });
});
