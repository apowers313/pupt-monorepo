import { Component } from '../../component';
import type { PuptNode, RenderContext, RunCommandAction } from '../../types';

interface RunCommandProps {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

export class RunCommand extends Component<RunCommandProps> {
  render({ command, cwd, env }: RunCommandProps, context: RenderContext): PuptNode {
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
