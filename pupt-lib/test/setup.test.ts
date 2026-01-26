import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index';
import { Fragment, jsx, jsxs } from '../src/jsx-runtime/index';
import { jsxDEV } from '../src/jsx-runtime/jsx-dev-runtime';
import puptBabelPreset from '../src/babel/preset';

describe('Test Infrastructure', () => {
  it('should run tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support TypeScript', () => {
    const value: string = 'hello';
    expect(typeof value).toBe('string');
  });
});

describe('Main Entry Point', () => {
  it('should export VERSION', () => {
    expect(VERSION).toBe('0.0.0-development');
  });
});

describe('JSX Runtime', () => {
  it('should export Fragment symbol', () => {
    expect(typeof Fragment).toBe('symbol');
    expect(Fragment.toString()).toBe('Symbol(pupt.Fragment)');
  });

  it('should export jsx function', () => {
    expect(typeof jsx).toBe('function');
    const element = jsx('div', { id: 'test' });
    expect(element).toHaveProperty('type', 'div');
    expect(element).toHaveProperty('props');
  });

  it('should export jsxs function', () => {
    expect(typeof jsxs).toBe('function');
    const element = jsxs('span', { className: 'test' });
    expect(element).toHaveProperty('type', 'span');
  });
});

describe('JSX Dev Runtime', () => {
  it('should export jsxDEV function', () => {
    expect(typeof jsxDEV).toBe('function');
    const element = jsxDEV(
      'div',
      { id: 'test' },
      undefined,
      false,
      { fileName: 'test.tsx', lineNumber: 1, columnNumber: 1 },
      null,
    );
    expect(element).toHaveProperty('type', 'div');
  });
});

describe('Babel Preset', () => {
  it('should export default preset function', () => {
    expect(typeof puptBabelPreset).toBe('function');
    // Create a mock Babel API object with cache method
    const mockApi = {
      cache: {
        using: () => {},
      },
    };
    const preset = puptBabelPreset(mockApi as Parameters<typeof puptBabelPreset>[0]);
    expect(preset).toHaveProperty('plugins');
    expect(Array.isArray(preset.plugins)).toBe(true);
  });
});
