import { describe, expect,it } from 'vitest';
import { z } from 'zod';

import { Component } from '../../src/component';
import { jsx } from '../../src/jsx-runtime';
import { render } from '../../src/render';
import type { PuptNode,RenderContext } from '../../src/types';

describe('Component helper methods', () => {
  describe('getProvider', () => {
    it('should return provider from context', async () => {
      class TestComponent extends Component {
        static schema = z.object({}).loose();
        render(_p: Record<string, unknown>, _rv: void, context: RenderContext): PuptNode {
          return `provider: ${this.getProvider(context)}`;
        }
      }
      const result = await render(jsx(TestComponent, {}), {
        env: { llm: { model: 'claude-3-opus', provider: 'anthropic' } },
      });
      expect(result.ok).toBe(true);
      expect(result.text).toContain('provider: anthropic');
    });

    it('should return unspecified when no provider is set', async () => {
      class TestComponent extends Component {
        static schema = z.object({}).loose();
        render(_p: Record<string, unknown>, _rv: void, context: RenderContext): PuptNode {
          return `provider: ${this.getProvider(context)}`;
        }
      }
      const result = await render(jsx(TestComponent, {}));
      expect(result.ok).toBe(true);
      expect(result.text).toContain('provider: unspecified');
    });

    it('should return google when google provider is set', async () => {
      class TestComponent extends Component {
        static schema = z.object({}).loose();
        render(_p: Record<string, unknown>, _rv: void, context: RenderContext): PuptNode {
          return `provider: ${this.getProvider(context)}`;
        }
      }
      const result = await render(jsx(TestComponent, {}), {
        env: { llm: { provider: 'google' } },
      });
      expect(result.ok).toBe(true);
      expect(result.text).toContain('provider: google');
    });
  });

  describe('getDelimiter', () => {
    it('should return markdown when output format is markdown', async () => {
      class TestComponent extends Component {
        static schema = z.object({}).loose();
        render(_p: Record<string, unknown>, _rv: void, context: RenderContext): PuptNode {
          return `delimiter: ${this.getDelimiter(context)}`;
        }
      }
      const result = await render(jsx(TestComponent, {}), {
        env: { output: { format: 'markdown' } },
      });
      expect(result.ok).toBe(true);
      expect(result.text).toContain('delimiter: markdown');
    });

    it('should return xml when output format is xml', async () => {
      class TestComponent extends Component {
        static schema = z.object({}).loose();
        render(_p: Record<string, unknown>, _rv: void, context: RenderContext): PuptNode {
          return `delimiter: ${this.getDelimiter(context)}`;
        }
      }
      const result = await render(jsx(TestComponent, {}), {
        env: { output: { format: 'xml' } },
      });
      expect(result.ok).toBe(true);
      expect(result.text).toContain('delimiter: xml');
    });

    it('should return xml when output format is unspecified', async () => {
      class TestComponent extends Component {
        static schema = z.object({}).loose();
        render(_p: Record<string, unknown>, _rv: void, context: RenderContext): PuptNode {
          return `delimiter: ${this.getDelimiter(context)}`;
        }
      }
      const result = await render(jsx(TestComponent, {}));
      expect(result.ok).toBe(true);
      expect(result.text).toContain('delimiter: xml');
    });

    it('should return xml for non-markdown formats', async () => {
      class TestComponent extends Component {
        static schema = z.object({}).loose();
        render(_p: Record<string, unknown>, _rv: void, context: RenderContext): PuptNode {
          return `delimiter: ${this.getDelimiter(context)}`;
        }
      }
      const result = await render(jsx(TestComponent, {}), {
        env: { output: { format: 'json' } },
      });
      expect(result.ok).toBe(true);
      expect(result.text).toContain('delimiter: xml');
    });
  });
});
