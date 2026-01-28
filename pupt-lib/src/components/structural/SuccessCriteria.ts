import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export const successCriteriaSchema = z.object({
  delimiter: z.enum(['xml', 'markdown', 'none']).optional(),
}).passthrough();

type SuccessCriteriaProps = z.infer<typeof successCriteriaSchema> & { children: PuptNode };

export class SuccessCriteria extends Component<SuccessCriteriaProps> {
  static schema = successCriteriaSchema;

  render({ delimiter = 'xml', children }: SuccessCriteriaProps, _context: RenderContext): PuptNode {
    const childContent = Array.isArray(children) ? children : children;

    switch (delimiter) {
      case 'xml':
        return ['<success-criteria>\n', childContent, '\n</success-criteria>'];
      case 'markdown':
        return ['## success-criteria\n\n', childContent];
      case 'none':
        return childContent;
    }
  }
}
