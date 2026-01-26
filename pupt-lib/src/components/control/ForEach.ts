import { Component } from '../../component';
import type { PuptNode, RenderContext } from '../../types';

export interface ForEachProps<T = unknown> {
  items: T[];
  as: string;
  children?: ((item: T, index: number) => PuptNode) | PuptNode | PuptNode[];
}

export class ForEach<T = unknown> extends Component<ForEachProps<T>> {
  render({ items, children }: ForEachProps<T>, _context: RenderContext): PuptNode {
    if (!items || items.length === 0) {
      return null;
    }

    // When passed through JSX, children may be wrapped in an array
    // Extract the actual child function or value
    let childContent = children;
    if (Array.isArray(children) && children.length === 1) {
      childContent = children[0];
    }

    if (typeof childContent === 'function') {
      // Children is a render function
      const results: PuptNode[] = items.map((item, index) =>
        (childContent as (item: T, index: number) => PuptNode)(item, index),
      );
      return results;
    }

    // If children is not a function, repeat it for each item
    return items.map(() => childContent);
  }
}
