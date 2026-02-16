import { describe, expect,it } from 'vitest';

import { Step } from '../../../components/reasoning/Step';
import { Role } from '../../../components/structural/Role';
import { Fragment,jsx } from '../../../src/jsx-runtime';
import { findChildrenOfType, isElementOfType,partitionChildren } from '../../../src/utils/children';

describe('findChildrenOfType', () => {
  it('should find direct children by class reference', () => {
    const children = [
      jsx(Step, { children: 'step 1' }),
      jsx(Role, { children: 'role text' }),
      jsx(Step, { children: 'step 2' }),
    ];
    const steps = findChildrenOfType(children, Step);
    expect(steps).toHaveLength(2);
  });

  it('should find children by string name', () => {
    const children = [jsx(Step, { children: 'step 1' })];
    const steps = findChildrenOfType(children, 'Step');
    expect(steps).toHaveLength(1);
  });

  it('should search through Fragments', () => {
    const children = [
      jsx(Fragment, {
        children: [
          jsx(Step, { children: 'step inside fragment' }),
        ],
      }),
    ];
    const steps = findChildrenOfType(children, Step);
    expect(steps).toHaveLength(1);
  });

  it('should return empty array when no matches', () => {
    const children = [jsx(Role, { children: 'text' })];
    const steps = findChildrenOfType(children, Step);
    expect(steps).toHaveLength(0);
  });

  it('should handle single element (not array)', () => {
    const child = jsx(Step, { children: 'step 1' });
    const steps = findChildrenOfType(child, Step);
    expect(steps).toHaveLength(1);
  });

  it('should handle null/undefined/string children', () => {
    expect(findChildrenOfType(null, Step)).toHaveLength(0);
    expect(findChildrenOfType(undefined, Step)).toHaveLength(0);
    expect(findChildrenOfType('plain text', Step)).toHaveLength(0);
    expect(findChildrenOfType(42, Step)).toHaveLength(0);
  });

  it('should find through nested Fragments', () => {
    const children = [
      jsx(Fragment, {
        children: [
          jsx(Fragment, {
            children: [
              jsx(Step, { children: 'deeply nested step' }),
            ],
          }),
        ],
      }),
    ];
    const steps = findChildrenOfType(children, Step);
    expect(steps).toHaveLength(1);
  });
});

describe('partitionChildren', () => {
  it('should split children into matching and non-matching', () => {
    const children = [
      jsx(Step, { children: 'step 1' }),
      jsx(Role, { children: 'role text' }),
      jsx(Step, { children: 'step 2' }),
    ];
    const [steps, rest] = partitionChildren(children, Step);
    expect(steps).toHaveLength(2);
    expect(rest).toHaveLength(1);
  });

  it('should handle no matches', () => {
    const children = [
      jsx(Role, { children: 'role 1' }),
      jsx(Role, { children: 'role 2' }),
    ];
    const [steps, rest] = partitionChildren(children, Step);
    expect(steps).toHaveLength(0);
    expect(rest).toHaveLength(2);
  });

  it('should handle all matching', () => {
    const children = [
      jsx(Step, { children: 'step 1' }),
      jsx(Step, { children: 'step 2' }),
    ];
    const [steps, rest] = partitionChildren(children, Step);
    expect(steps).toHaveLength(2);
    expect(rest).toHaveLength(0);
  });

  it('should preserve non-element children in rest', () => {
    const children = [
      'plain text',
      jsx(Step, { children: 'step 1' }),
      42,
    ];
    const [steps, rest] = partitionChildren(children, Step);
    expect(steps).toHaveLength(1);
    expect(rest).toHaveLength(2);
  });
});

describe('isElementOfType', () => {
  it('should match by class reference', () => {
    const el = jsx(Step, { children: 'text' });
    expect(isElementOfType(el, Step)).toBe(true);
    expect(isElementOfType(el, Role)).toBe(false);
  });

  it('should match by string name', () => {
    const el = jsx(Step, { children: 'text' });
    expect(isElementOfType(el, 'Step')).toBe(true);
    expect(isElementOfType(el, 'Role')).toBe(false);
  });

  it('should handle function components', () => {
    function MyComponent() {
      return 'hello';
    }
    const el = jsx(MyComponent, {});
    expect(isElementOfType(el, MyComponent)).toBe(true);
    expect(isElementOfType(el, 'MyComponent')).toBe(true);
    expect(isElementOfType(el, Step)).toBe(false);
  });
});
