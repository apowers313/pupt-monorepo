import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext, ReviewFileAction } from '../../types';

export const reviewFileSchema = z.object({
  file: z.string(),
  editor: z.string().optional(),
}).passthrough();

type ReviewFileProps = z.infer<typeof reviewFileSchema>;

export class ReviewFile extends Component<ReviewFileProps> {
  static schema = reviewFileSchema;

  render({ file, editor }: ReviewFileProps, _resolvedValue: void, context: RenderContext): PuptNode {
    const action: ReviewFileAction = {
      type: 'reviewFile',
      file,
    };
    if (editor !== undefined) {
      action.editor = editor;
    }
    context.postExecution.push(action);
    return null;
  }
}
