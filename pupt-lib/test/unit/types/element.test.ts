import { describe, it, expect } from 'vitest';
import type { PuptElement, PuptNode, ComponentType } from '../../../src/types';

describe('PuptElement', () => {
  it('should have required properties', () => {
    const element: PuptElement = {
      type: 'div',
      props: { className: 'test' },
      children: ['Hello'],
    };

    expect(element.type).toBe('div');
    expect(element.props.className).toBe('test');
    expect(element.children).toEqual(['Hello']);
  });

  it('should allow Component type', () => {
    const MockComponent = () => 'test';
    const element: PuptElement = {
      type: MockComponent,
      props: {},
      children: [],
    };

    expect(typeof element.type).toBe('function');
  });

  it('should allow symbol type', () => {
    const fragmentSymbol = Symbol.for('pupt.Fragment');
    const element: PuptElement = {
      type: fragmentSymbol,
      props: {},
      children: ['content'],
    };

    expect(typeof element.type).toBe('symbol');
    expect(element.children).toEqual(['content']);
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
    const node: PuptNode = { type: 'span', props: {}, children: [] };
    expect(node).toHaveProperty('type', 'span');
  });

  it('should accept array of nodes', () => {
    const nodes: PuptNode = ['hello', 42, { type: 'span', props: {}, children: [] }];
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
