import { z } from 'zod';
import { Component } from '../../component';
import type { PuptNode, RenderContext, OpenUrlAction } from '../../types';

export const openUrlSchema = z.object({
  url: z.string(),
  browser: z.string().optional(),
}).passthrough();

type OpenUrlProps = z.infer<typeof openUrlSchema>;

export class OpenUrl extends Component<OpenUrlProps> {
  static schema = openUrlSchema;

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
