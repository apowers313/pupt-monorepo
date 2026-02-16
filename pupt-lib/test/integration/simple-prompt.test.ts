import { describe, expect,it } from 'vitest';

import { Constraint, Context, Format,Prompt, Role, Task } from '../../components/structural';
import { jsx } from '../../src/jsx-runtime';
import { render } from '../../src/render';

describe('Simple Prompt Rendering', () => {
  it('should render a complete prompt', async () => {
    const element = jsx(Prompt, {
      name: 'code-review',
      children: [
        jsx(Role, { children: 'You are a senior software engineer.' }),
        jsx(Context, { children: 'The user needs help reviewing TypeScript code.' }),
        jsx(Task, { children: 'Review the provided code for bugs and improvements.' }),
        jsx(Constraint, { type: 'must', children: 'Explain each issue clearly.' }),
        jsx(Format, { type: 'markdown' }),
      ],
    });

    const result = await render(element);

    expect(result.text).toContain('senior software engineer');
    expect(result.text).toContain('TypeScript code');
    expect(result.text).toContain('Review');
    expect(result.text).toContain('Explain');
  });
});
