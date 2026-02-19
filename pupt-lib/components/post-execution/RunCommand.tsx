import { Component, type PuptNode, type RenderContext, type RunCommandAction } from "@pupt/lib";
import { z } from "zod";

export const runCommandSchema = z
    .object({
        command: z.string(),
        cwd: z.string().optional(),
        env: z.object({}).catchall(z.string()).optional(),
    })
    .loose();

type RunCommandProps = z.infer<typeof runCommandSchema>;

export class RunCommand extends Component<RunCommandProps> {
    static schema = runCommandSchema;

    render({ command, cwd, env }: RunCommandProps, _resolvedValue: undefined, context: RenderContext): PuptNode {
        const action: RunCommandAction = {
            type: "runCommand",
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
