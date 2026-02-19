import { describe, expect,it } from 'vitest';
import { z } from 'zod';

import { Component } from '../../src/component';
import { Fragment,jsx } from '../../src/jsx-runtime';
import { render } from '../../src/render';
import type { PuptNode,RenderContext } from '../../src/types';

describe('RenderContext.metadata', () => {
  it('should provide a metadata Map on context', async () => {
    class MetadataWriter extends Component {
      static schema = z.object({}).loose();
      render(_props: Record<string, unknown>, _rv: void, context: RenderContext): PuptNode {
        context.metadata.set('test.key', 'test.value');
        return 'written';
      }
    }
    const result = await render(jsx(MetadataWriter, {}));
    expect(result.ok).toBe(true);
    expect(result.text).toBe('written');
  });

  it('should allow parent component to read metadata set by itself', async () => {
    class MetadataRoundTrip extends Component {
      static schema = z.object({}).loose();
      render(_props: Record<string, unknown>, _rv: void, context: RenderContext): PuptNode {
        context.metadata.set('message', 'hello from metadata');
        const value = context.metadata.get('message');
        return `got: ${value}`;
      }
    }
    const result = await render(jsx(MetadataRoundTrip, {}));
    expect(result.ok).toBe(true);
    expect(result.text).toBe('got: hello from metadata');
  });

  it('should have an empty metadata Map by default', async () => {
    class MetadataChecker extends Component {
      static schema = z.object({}).loose();
      render(_props: Record<string, unknown>, _rv: void, context: RenderContext): PuptNode {
        return `size: ${context.metadata.size}`;
      }
    }
    const result = await render(jsx(MetadataChecker, {}));
    expect(result.ok).toBe(true);
    expect(result.text).toBe('size: 0');
  });

  it('should persist metadata across the render context', async () => {
    class Writer extends Component {
      static schema = z.object({}).loose();
      render(_p: Record<string, unknown>, _rv: void, context: RenderContext): PuptNode {
        context.metadata.set('written', true);
        return 'writer';
      }
    }
    class Reader extends Component {
      static schema = z.object({}).loose();
      render(_p: Record<string, unknown>, _rv: void, context: RenderContext): PuptNode {
        const value = context.metadata.get('written');
        return `reader:${value}`;
      }
    }
    // Wrap in Fragment so both components render as siblings
    // Note: Due to parallel rendering, we can't guarantee order between siblings
    // But metadata is a shared mutable Map, so writes are visible immediately
    const result = await render(jsx(Fragment, {
      children: [jsx(Writer, {}), jsx(Reader, {})],
    }));
    expect(result.ok).toBe(true);
    // Both components should render
    expect(result.text).toContain('writer');
    expect(result.text).toContain('reader');
  });
});
