import { Component, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

export const usernameSchema = z.object({}).loose();

type UsernameProps = z.infer<typeof usernameSchema>;

export class Username extends Component<UsernameProps> {
    static schema = usernameSchema;

    render(_props: UsernameProps, _resolvedValue: undefined, context: RenderContext): PuptNode {
        // Use the username from runtime config (already handles browser/Node detection)
        return context.env.runtime.username ?? "anonymous";
    }
}
