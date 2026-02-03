import { describe, it, expect } from 'vitest';
import type { PuptElement, PuptNode, ComponentType } from '../../../src/types';
import { TYPE, PROPS, CHILDREN, isPuptElement } from '../../../src';

describe('PuptElement', () => {
  it('should have required properties with symbols', () => {
    const element: PuptElement = {
      [TYPE]: 'div',
      [PROPS]: { className: 'test' },
      [CHILDREN]: ['Hello'],
    };

    expect(element[TYPE]).toBe('div');
    expect((element[PROPS] as { className: string }).className).toBe('test');
    expect(element[CHILDREN]).toEqual(['Hello']);
  });

  it('should allow Component type', () => {
    const MockComponent = () => 'test';
    const element: PuptElement = {
      [TYPE]: MockComponent,
      [PROPS]: {},
      [CHILDREN]: [],
    };

    expect(typeof element[TYPE]).toBe('function');
  });

  it('should allow symbol type', () => {
    const fragmentSymbol = Symbol.for('pupt.Fragment');
    const element: PuptElement = {
      [TYPE]: fragmentSymbol,
      [PROPS]: {},
      [CHILDREN]: ['content'],
    };

    expect(typeof element[TYPE]).toBe('symbol');
    expect(element[CHILDREN]).toEqual(['content']);
  });
});

describe('PuptNode', () => {
  it('should accept string', () => {
    const node: PuptNode = 'hello';
    expect(node).toBe('hello');
  });

  it('should accept number', () => {
    const node: PuptNode = 42;
    expect(node).toBe(42);
  });

  it('should accept null', () => {
    const node: PuptNode = null;
    expect(node).toBeNull();
  });

  it('should accept undefined', () => {
    const node: PuptNode = undefined;
    expect(node).toBeUndefined();
  });

  it('should accept boolean', () => {
    const node: PuptNode = true;
    expect(node).toBe(true);
  });

  it('should accept element', () => {
    const node: PuptNode = { [TYPE]: 'span', [PROPS]: {}, [CHILDREN]: [] };
    expect(isPuptElement(node)).toBe(true);
    expect((node as PuptElement)[TYPE]).toBe('span');
  });

  it('should accept array of nodes', () => {
    const nodes: PuptNode = ['hello', 42, { [TYPE]: 'span', [PROPS]: {}, [CHILDREN]: [] }];
    expect(Array.isArray(nodes)).toBe(true);
    expect(nodes).toHaveLength(3);
  });
});

describe('ComponentType', () => {
  it('should accept function component', () => {
    const FnComponent: ComponentType = (props) => `Hello ${props.name}`;
    expect(typeof FnComponent).toBe('function');
  });
});

describe('isPuptElement', () => {
  it('should return true for PuptElements', () => {
    const element: PuptElement = {
      [TYPE]: 'div',
      [PROPS]: {},
      [CHILDREN]: [],
    };
    expect(isPuptElement(element)).toBe(true);
  });

  it('should return false for plain objects', () => {
    expect(isPuptElement({ type: 'div', props: {}, children: [] })).toBe(false);
  });

  it('should return false for null and undefined', () => {
    expect(isPuptElement(null)).toBe(false);
    expect(isPuptElement(undefined)).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isPuptElement('string')).toBe(false);
    expect(isPuptElement(42)).toBe(false);
    expect(isPuptElement(true)).toBe(false);
  });
});
