import { Component, type PuptNode, type RenderContext, type ReviewFileAction } from "@pupt/lib";
import { z } from "zod";

export const reviewFileSchema = z
    .object({
        file: z.string(),
        editor: z.string().optional(),
    })
    .passthrough();

type ReviewFileProps = z.infer<typeof reviewFileSchema>;

export class ReviewFile extends Component<ReviewFileProps> {
    static schema = reviewFileSchema;
    static hoistName = true;

    render({ file, editor }: ReviewFileProps, _resolvedValue: undefined, context: RenderContext): PuptNode {
        const action: ReviewFileAction = {
            type: "reviewFile",
            file,
        };
        if (editor !== undefined) {
            action.editor = editor;
        }
        context.postExecution.push(action);
        return null;
    }
}
