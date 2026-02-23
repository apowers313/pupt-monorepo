import { describe, expect, it } from 'vitest';

import { followPath } from '../../../src/utils/path';

describe('followPath', () => {
  it('should retrieve a simple top-level property', () => {
    expect(followPath({ a: 1 }, ['a'])).toBe(1);
  });

  it('should retrieve nested properties', () => {
    const obj = { user: { profile: { name: 'Alice' } } };
    expect(followPath(obj, ['user', 'profile', 'name'])).toBe('Alice');
  });

  it('should return undefined for null intermediate', () => {
    const obj = { user: null };
    expect(followPath(obj, ['user', 'name'])).toBeUndefined();
  });

  it('should return undefined for undefined intermediate', () => {
    const obj = { user: undefined };
    expect(followPath(obj, ['user', 'name'])).toBeUndefined();
  });

  it('should return undefined for missing key', () => {
    const obj = { a: 1 };
    expect(followPath(obj, ['b'])).toBeUndefined();
  });

  it('should access array elements by numeric index', () => {
    const obj = { items: ['zero', 'one', 'two'] };
    expect(followPath(obj, ['items', 1])).toBe('one');
  });

  it('should return the root object for an empty path', () => {
    const obj = { a: 1 };
    expect(followPath(obj, [])).toEqual({ a: 1 });
  });

  it('should return undefined when the root is null', () => {
    expect(followPath(null, ['a'])).toBeUndefined();
  });

  it('should return undefined when the root is undefined', () => {
    expect(followPath(undefined, ['a'])).toBeUndefined();
  });
});
