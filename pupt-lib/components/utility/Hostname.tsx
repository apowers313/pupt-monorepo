import { Component, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

export const hostnameSchema = z.object({}).loose();

type HostnameProps = z.infer<typeof hostnameSchema>;

export class Hostname extends Component<HostnameProps> {
    static schema = hostnameSchema;

    render(_props: HostnameProps, _resolvedValue: undefined, context: RenderContext): PuptNode {
        // Use the hostname from runtime config (already handles browser/Node detection)
        return context.env.runtime.hostname ?? "unknown";
    }
}
