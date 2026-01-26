/**
 * Tests for branch coverage in Ask.File component
 */
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/render';
import { jsx } from '../../../../src/jsx-runtime';
import { Ask } from '../../../../src/components/ask';

describe('Ask.File branch coverage', () => {
  describe('array value handling', () => {
    it('should render array value as comma-separated list', () => {
      const element = jsx(Ask.File, {
        name: 'files',
        label: 'Select files',
        multiple: true,
      });

      const result = render(element, {
        inputs: { files: ['file1.ts', 'file2.ts', 'file3.ts'] },
      });

      expect(result.text).toBe('file1.ts, file2.ts, file3.ts');
    });

    it('should render single value as string', () => {
      const element = jsx(Ask.File, {
        name: 'file',
        label: 'Select file',
      });

      const result = render(element, {
        inputs: { file: 'single-file.ts' },
      });

      expect(result.text).toBe('single-file.ts');
    });
  });

  describe('array default value handling', () => {
    it('should render array default value as comma-separated list', () => {
      const element = jsx(Ask.File, {
        name: 'files',
        label: 'Select files',
        multiple: true,
        default: ['default1.ts', 'default2.ts'],
      });

      const result = render(element);

      expect(result.text).toBe('default1.ts, default2.ts');
    });

    it('should render single default value as string', () => {
      const element = jsx(Ask.File, {
        name: 'file',
        label: 'Select file',
        default: 'default-file.ts',
      });

      const result = render(element);

      expect(result.text).toBe('default-file.ts');
    });
  });

  describe('placeholder rendering', () => {
    it('should render placeholder when no value or default', () => {
      const element = jsx(Ask.File, {
        name: 'configFile',
        label: 'Select config',
      });

      const result = render(element);

      expect(result.text).toBe('{configFile}');
    });
  });

  describe('all props handling', () => {
    it('should pass all props to requirement', () => {
      const element = jsx(Ask.File, {
        name: 'sourceFiles',
        label: 'Source files',
        description: 'Select TypeScript source files',
        required: true,
        extensions: ['.ts', '.tsx'],
        multiple: true,
        mustExist: true,
        includeContents: true,
      });

      // Just render to ensure all props are handled
      const result = render(element);
      expect(result.text).toBe('{sourceFiles}');
    });
  });
});
