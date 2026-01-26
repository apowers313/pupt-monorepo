// Test fixture library for module loading and API tests
import { Component } from '../../../../src/component';
import { jsx } from '../../../../src/jsx-runtime';
import { Prompt, Section, Task } from '../../../../src/components/structural';
import { Text as AskText } from '../../../../src/components/ask';

// Component exports for hasComponent tests
export class TestComponent extends Component<{ value?: string; children?: unknown }> {
  render(props: { value?: string }): string {
    return `Test: ${props.value ?? 'default'}`;
  }
}

export class SimpleGreeting extends Component<{ name?: string; children?: unknown }> {
  render(props: { name?: string }): string {
    return `Hello, ${props.name ?? 'World'}!`;
  }
}

export class SimpleTask extends Component<{ task: string; children?: unknown }> {
  render(props: { task: string }): string {
    return `Please complete the following task: ${props.task}`;
  }
}

// Prompt exports for discovery tests
// Using JSX to create proper PuptElement structures

// A simple test prompt
export const testPrompt = jsx(Prompt, {
  name: 'test-prompt',
  description: 'A simple test prompt',
  tags: ['test', 'example'],
  children: [
    jsx(Task, {
      children: [
        'Hello, ',
        jsx('span', { children: ['{name}'] }),
        '!',
      ],
    }),
  ],
});

// A prompt for search testing
export const codeReviewPrompt = jsx(Prompt, {
  name: 'code-review',
  description: 'Review code for quality and best practices',
  tags: ['code', 'review'],
  children: [
    jsx(Section, {
      title: 'Code Review',
      children: [
        'Please review the following code for quality, maintainability, and best practices.',
      ],
    }),
  ],
});

// A prompt for search testing
export const bugFixPrompt = jsx(Prompt, {
  name: 'bug-fix',
  description: 'Fix bugs in code',
  tags: ['code', 'debug'],
  children: [
    jsx(Task, {
      children: ['Fix the bugs in the provided code.'],
    }),
  ],
});

// A prompt with inputs for input iterator testing
export const promptWithInputs = jsx(Prompt, {
  name: 'prompt-with-inputs',
  description: 'A prompt that requires user inputs',
  tags: ['interactive', 'example'],
  children: [
    jsx(AskText, {
      name: 'userName',
      label: 'Enter your name',
      required: true,
      children: [],
    }),
    jsx(Task, {
      children: ['Process request for user.'],
    }),
  ],
});

// A prompt for authentication (fuzzy search testing)
export const authPrompt = jsx(Prompt, {
  name: 'authentication',
  description: 'Handle user authentication',
  tags: ['security', 'auth'],
  children: [
    jsx(Task, {
      children: ['Implement secure authentication.'],
    }),
  ],
});

// No dependencies
export const dependencies: string[] = [];
