import { z } from 'zod';
import { Component } from 'pupt-lib';
import type { PuptNode, RenderContext, RunCommandAction } from 'pupt-lib';

export const runCommandSchema = z.object({
  command: z.string(),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
}).passthrough();

type RunCommandProps = z.infer<typeof runCommandSchema>;

export class RunCommand extends Component<RunCommandProps> {
  static schema = runCommandSchema;

  render({ command, cwd, env }: RunCommandProps, _resolvedValue: void, context: RenderContext): PuptNode {
    const action: RunCommandAction = {
      type: 'runCommand',
      command,
    };
    if (cwd !== undefined) {
      action.cwd = cwd;
    }
    if (env !== undefined) {
      action.env = env;
    }
    context.postExecution.push(action);
    return null;
  }
}
