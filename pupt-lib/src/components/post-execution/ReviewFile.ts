import { Component } from '../../component';
import type { PuptNode, RenderContext, ReviewFileAction } from '../../types';

interface ReviewFileProps {
  file: string;
  editor?: string;
}

export class ReviewFile extends Component<ReviewFileProps> {
  render({ file, editor }: ReviewFileProps, context: RenderContext): PuptNode {
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
