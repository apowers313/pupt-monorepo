import { Component } from '../../component';
import type { PuptNode, RenderContext, OpenUrlAction } from '../../types';

interface OpenUrlProps {
  url: string;
  browser?: string;
}

export class OpenUrl extends Component<OpenUrlProps> {
  render({ url, browser }: OpenUrlProps, context: RenderContext): PuptNode {
    const action: OpenUrlAction = {
      type: 'openUrl',
      url,
    };
    if (browser !== undefined) {
      action.browser = browser;
    }
    context.postExecution.push(action);
    return null;
  }
}
