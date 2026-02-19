import { Component, type PuptNode, type RenderContext } from "@pupt/lib";
import { z } from "zod";

export const postExecutionSchema = z.object({}).loose();

type PostExecutionProps = z.infer<typeof postExecutionSchema> & { children: PuptNode };

export class PostExecution extends Component<PostExecutionProps> {
    static schema = postExecutionSchema;

    render({ children }: PostExecutionProps, _resolvedValue: undefined, _context: RenderContext): PuptNode {
        // PostExecution is a container - children will add their actions to the context
        return children;
    }
}
