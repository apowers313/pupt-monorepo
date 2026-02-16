import { describe, expect,it } from 'vitest';
import { z } from 'zod';

import { Component } from '../../../src/component';
import { getComponentName,getSchema, validateProps } from '../../../src/services/prop-validator';

describe('prop-validator', () => {
  describe('validateProps', () => {
    const schema = z.object({
      name: z.string(),
      count: z.number().optional(),
      mode: z.enum(['fast', 'slow']).optional(),
    }).passthrough();

    it('should return empty array for valid props', () => {
      const errors = validateProps('TestComp', { name: 'hello' }, schema);
      expect(errors).toEqual([]);
    });

    it('should return empty array when all optional props provided', () => {
      const errors = validateProps('TestComp', { name: 'hello', count: 5, mode: 'fast' }, schema);
      expect(errors).toEqual([]);
    });

    it('should return error for missing required prop', () => {
      const errors = validateProps('TestComp', {}, schema);
      expect(errors).toHaveLength(1);
      expect(errors[0].component).toBe('TestComp');
      expect(errors[0].prop).toBe('name');
      expect(errors[0].code).toBe('invalid_type');
      expect(errors[0].message).toBeDefined();
    });

    it('should return error for wrong type', () => {
      const errors = validateProps('TestComp', { name: 123 }, schema);
      expect(errors).toHaveLength(1);
      expect(errors[0].component).toBe('TestComp');
      expect(errors[0].prop).toBe('name');
      expect(errors[0].code).toBe('invalid_type');
    });

    it('should return error for invalid enum value', () => {
      const errors = validateProps('TestComp', { name: 'hello', mode: 'turbo' }, schema);
      expect(errors).toHaveLength(1);
      expect(errors[0].prop).toBe('mode');
      expect(errors[0].code).toBe('invalid_enum_value');
    });

    it('should strip children before validation', () => {
      const strictSchema = z.object({ name: z.string() });
      // children should not cause a validation error even on a strict schema
      const errors = validateProps('TestComp', { name: 'hello', children: ['some', 'content'] }, strictSchema);
      expect(errors).toEqual([]);
    });

    it('should return multiple errors for multiple issues', () => {
      const errors = validateProps('TestComp', { count: 'not-a-number', mode: 'invalid' }, schema);
      expect(errors.length).toBeGreaterThanOrEqual(2);
      const props = errors.map(e => e.prop);
      expect(props).toContain('name');
    });

    it('should include path in error', () => {
      const errors = validateProps('TestComp', { name: 123 }, schema);
      expect(errors[0].path).toEqual(['name']);
    });
  });

  describe('getSchema', () => {
    it('should extract schema from class component', () => {
      const testSchema = z.object({ x: z.string() });
      class TestComp extends Component {
        static schema = testSchema;
        render() { return null; }
      }
      expect(getSchema(TestComp)).toBe(testSchema);
    });

    it('should extract schema from function with schema property', () => {
      const testSchema = z.object({ x: z.string() });
      const fn = () => null;
      (fn as unknown as { schema: unknown }).schema = testSchema;
      expect(getSchema(fn)).toBe(testSchema);
    });

    it('should return undefined for component without schema', () => {
      const fn = () => null;
      expect(getSchema(fn)).toBeUndefined();
    });

    it('should return undefined for non-function', () => {
      expect(getSchema('string')).toBeUndefined();
      expect(getSchema(null)).toBeUndefined();
      expect(getSchema(undefined)).toBeUndefined();
    });
  });

  describe('getComponentName', () => {
    it('should return function name', () => {
      function MyComponent() { return null; }
      expect(getComponentName(MyComponent)).toBe('MyComponent');
    });

    it('should return class name', () => {
      class MyClass extends Component {
        static schema = z.object({});
        render() { return null; }
      }
      expect(getComponentName(MyClass)).toBe('MyClass');
    });

    it('should return string type as-is', () => {
      expect(getComponentName('Section')).toBe('Section');
    });

    it('should return Unknown for non-function non-string', () => {
      expect(getComponentName(42)).toBe('Unknown');
      expect(getComponentName(null)).toBe('Unknown');
    });
  });
});
