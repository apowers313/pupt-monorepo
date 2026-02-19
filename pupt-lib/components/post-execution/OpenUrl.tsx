import { Component, type OpenUrlAction, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

export const openUrlSchema = z
    .object({
        url: z.string(),
        browser: z.string().optional(),
    })
    .loose();

type OpenUrlProps = z.infer<typeof openUrlSchema>;

export class OpenUrl extends Component<OpenUrlProps> {
    static schema = openUrlSchema;

    render({ url, browser }: OpenUrlProps, _resolvedValue: undefined, context: RenderContext): PuptNode {
        const action: OpenUrlAction = {
            type: "openUrl",
            url,
        };
        if (browser !== undefined) {
            action.browser = browser;
        }
        context.postExecution.push(action);
        return null;
    }
}
