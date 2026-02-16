import { z } from 'zod';
import { Component, wrapWithDelimiter } from 'pupt-lib';
import { EDGE_CASE_PRESETS } from '../presets';
import type { PuptNode, RenderContext } from 'pupt-lib';

export const edgeCasesSchema = z.object({
  extend: z.boolean().optional(),
  preset: z.enum(['standard', 'minimal']).optional(),
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type EdgeCasesProps = z.infer<typeof edgeCasesSchema> & { children?: PuptNode };

/**
 * Container component for handling edge cases explicitly.
 * Groups When children that describe condition → action pairs.
 *
 * Usage:
 * <EdgeCases>
 *   <When condition="input is empty">Ask for input</When>
 * </EdgeCases>
 * <EdgeCases preset="standard" />
 */
export class EdgeCases extends Component<EdgeCasesProps> {
  static schema = edgeCasesSchema;

  render(props: EdgeCasesProps, _resolvedValue: void, _context: RenderContext): PuptNode {
    const { preset, delimiter = 'xml', children } = props;

    const parts: PuptNode[] = [];

    // Add preset edge cases
    if (preset) {
      const presetCases = EDGE_CASE_PRESETS[preset];
      if (presetCases) {
        for (const { condition, action } of presetCases) {
          parts.push(`When ${condition}: ${action}`);
          parts.push('\n');
        }
      }
    }

    // Add children (When components)
    if (this.hasContent(children)) {
      parts.push(children);
    }

    if (parts.length === 0) {
      return '';
    }

    return wrapWithDelimiter(parts, 'edge-cases', delimiter);
  }
}
