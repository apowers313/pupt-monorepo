/**
 * End-to-end tests for variable passing between components.
 * Based on examples from design/variables-design.md
 */
import { describe, expect,it } from 'vitest';
import { z } from 'zod';

import { Component } from '../../src/component';
import { createPromptFromSource } from '../../src/create-prompt';
import { render } from '../../src/render';
import type { PuptNode, RenderContext } from '../../src/types';

// =============================================================================
// Test Components (simulating real-world components like GitHubUserInfo)
// =============================================================================

/**
 * A component that takes a username and returns structured data.
 * Similar to GitHubUserInfo from the design doc.
 */
class MockUserInfo extends Component<{ username: string; name?: string }, { displayName: string; stars: number; email: string }> {
  static schema = z.object({
    username: z.string(),
    name: z.string().optional(),
  });

  resolve(props: { username: string }): { displayName: string; stars: number; email: string } {
    // Simulate fetching user data
    const {username} = props;
    return {
      displayName: username.charAt(0).toUpperCase() + username.slice(1),
      stars: username.length * 10,
      email: `${username}@example.com`,
    };
  }

  render(props: { username: string }, value: { displayName: string; stars: number; email: string } | undefined, _context: RenderContext): PuptNode {
    if (!value) {return '';}
    return `User: ${value.displayName}, Stars: ${value.stars}`;
  }
}

/**
 * A component that takes a query and returns search results (array).
 */
class MockSearchResults extends Component<{ query: string; name?: string }, Array<{ title: string; score: number }>> {
  static schema = z.object({
    query: z.string(),
    name: z.string().optional(),
  });

  resolve(props: { query: string }): Array<{ title: string; score: number }> {
    // Simulate search results
    return [
      { title: `${props.query} Guide`, score: 95 },
      { title: `Learn ${props.query}`, score: 88 },
      { title: `${props.query} Tutorial`, score: 82 },
    ];
  }

  render(props: { query: string }, value: Array<{ title: string; score: number }> | undefined): PuptNode {
    if (!value) {return '';}
    return `Found ${value.length} results for "${props.query}"`;
  }
}

/**
 * An async component that simulates network delay.
 */
class AsyncDataFetcher extends Component<{ id: string; name?: string }, { data: string; timestamp: number }> {
  static schema = z.object({
    id: z.string(),
    name: z.string().optional(),
  });

  async resolve(props: { id: string }): Promise<{ data: string; timestamp: number }> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 10));
    return {
      data: `Data for ${props.id}`,
      timestamp: 12345,
    };
  }

  render(_props: { id: string }, value: { data: string; timestamp: number } | undefined): PuptNode {
    if (!value) {return '';}
    return value.data;
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('Variable Passing: Basic Patterns', () => {
  describe('String values from Ask components', () => {
    it('should use Ask.Text value in template', async () => {
      // From design doc: Basic String Value example
      const source = `
<Prompt name="greetingPrompt">
  <Ask.Text name="username" label="Your name" default="World" />
  <Task>Write a greeting for {username}.</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'greeting.prompt');
      const result = await render(element);

      expect(result.text).toContain('Write a greeting for World');
    });

    it('should use Ask.Text value with provided input', async () => {
      const source = `
<Prompt name="greetingPrompt">
  <Ask.Text name="username" label="Your name" default="World" />
  <Task>Write a greeting for {username}.</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'greeting.prompt');
      const result = await render(element, {
        inputs: new Map([['username', 'Alice']]),
      });

      expect(result.text).toContain('Write a greeting for Alice');
    });

    it('should handle multiple Ask components', async () => {
      const source = `
<Prompt name="multiInputPrompt">
  <Ask.Text name="firstName" label="firstName" default="John" />
  <Ask.Text name="lastName" label="lastName" default="Doe" />
  <Task>Greet {firstName} {lastName}.</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'multi.prompt');
      const result = await render(element);

      expect(result.text).toContain('Greet John Doe');
    });
  });

  describe('Passing values between components', () => {
    it('should pass Ask value to custom component', async () => {
      // From design doc: Passing Values Between Components
      const source = `
<Prompt name="userProfilePrompt">
  <Ask.Text name="username" label="GitHub username" default="octocat" />
  <MockUserInfo username={username} name="userInfo" />
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'profile.prompt', {
        components: { MockUserInfo },
      });
      const result = await render(element);

      expect(result.text).toContain('User: Octocat');
      expect(result.text).toContain('Stars: 70'); // "octocat".length * 10
    });

    it('should pass value with custom input', async () => {
      const source = `
<Prompt name="userProfilePrompt">
  <Ask.Text name="username" label="username" default="octocat" />
  <MockUserInfo username={username} />
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'profile.prompt', {
        components: { MockUserInfo },
      });
      const result = await render(element, {
        inputs: new Map([['username', 'alice']]),
      });

      expect(result.text).toContain('User: Alice');
      expect(result.text).toContain('Stars: 50'); // "alice".length * 10
    });
  });
});

describe('Variable Passing: Property Access', () => {
  describe('Accessing object properties', () => {
    it('should access resolved object properties', async () => {
      // From design doc: Accessing Object Properties
      const source = `
<Prompt name="objectAccessPrompt">
  <MockUserInfo username="octocat" name="github" />
  <Task>Stars: {github.stars}</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'object.prompt', {
        components: { MockUserInfo },
      });
      const result = await render(element);

      expect(result.text).toContain('Stars: 70');
    });

    it('should access multiple properties from same object', async () => {
      const source = `
<Prompt name="multiPropPrompt">
  <MockUserInfo username="testuser" name="user" />
  <Context>
    Name: {user.displayName}
    Stars: {user.stars}
    Email: {user.email}
  </Context>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'multi-prop.prompt', {
        components: { MockUserInfo },
      });
      const result = await render(element);

      expect(result.text).toContain('Name: Testuser');
      expect(result.text).toContain('Stars: 80');
      expect(result.text).toContain('Email: testuser@example.com');
    });
  });

  describe('Accessing array elements', () => {
    it('should access array length', async () => {
      // From design doc: Accessing Array Elements
      const source = `
<Prompt name="arrayAccessPrompt">
  <MockSearchResults query="react" name="results" />
  <Task>Found {results.length} results</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'array.prompt', {
        components: { MockSearchResults },
      });
      const result = await render(element);

      expect(result.text).toContain('Found 3 results');
    });

    it('should access array element properties', async () => {
      const source = `
<Prompt name="arrayElementPrompt">
  <MockSearchResults query="typescript" name="results" />
  <Task>Top result: {results[0].title}</Task>
</Prompt>
      `;

      const element = await createPromptFromSource(source, 'array-element.prompt', {
        components: { MockSearchResults },
      });
      const result = await render(element);

      expect(result.text).toContain('Top result: typescript Guide');
    });
  });
});

describe('Variable Passing: Multiple Instances', () => {
  it('should handle multiple component instances with different names', async () => {
    // From design doc: Multiple Instances example
    const source = `
<Prompt name="compareUsersPrompt">
  <Ask.Text name="user1" label="First username" default="alice" />
  <Ask.Text name="user2" label="Second username" default="bob" />

  <MockUserInfo username={user1} name="profile1" />
  <MockUserInfo username={user2} name="profile2" />

  <Task>Compare these two profiles.</Task>

  <Context>
    User 1: {profile1.displayName} with {profile1.stars} stars
    User 2: {profile2.displayName} with {profile2.stars} stars
  </Context>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'compare.prompt', {
      components: { MockUserInfo },
    });
    const result = await render(element);

    expect(result.text).toContain('User 1: Alice with 50 stars');
    expect(result.text).toContain('User 2: Bob with 30 stars');
  });

  it('should pass same Ask value to multiple components', async () => {
    const source = `
<Prompt name="sharedInputPrompt">
  <Ask.Text name="query" label="query" default="javascript" />

  <MockUserInfo username={query} name="userFromQuery" />
  <MockSearchResults query={query} name="searchResults" />

  <Context>
    User: {userFromQuery.displayName}
    Results: {searchResults.length}
  </Context>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'shared.prompt', {
      components: { MockUserInfo, MockSearchResults },
    });
    const result = await render(element);

    expect(result.text).toContain('User: Javascript');
    expect(result.text).toContain('Results: 3');
  });
});

describe('Variable Passing: Async Components', () => {
  it('should handle async component resolution', async () => {
    // From design doc: Async Components example
    const source = `
<Prompt name="asyncExamplePrompt">
  <Ask.Text name="itemId" label="itemId" default="item-123" />
  <AsyncDataFetcher id={itemId} name="fetched" />
  <Task>Data: {fetched.data}</Task>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'async.prompt', {
      components: { AsyncDataFetcher },
    });
    const result = await render(element);

    expect(result.text).toContain('Data: Data for item-123');
  });

  it('should handle multiple async components', async () => {
    const source = `
<Prompt name="multiAsyncPrompt">
  <AsyncDataFetcher id="first" name="data1" />
  <AsyncDataFetcher id="second" name="data2" />
  <Task>
    First: {data1.data}
    Second: {data2.data}
  </Task>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'multi-async.prompt', {
      components: { AsyncDataFetcher },
    });
    const result = await render(element);

    expect(result.text).toContain('First: Data for first');
    expect(result.text).toContain('Second: Data for second');
  });
});

describe('Variable Passing: Inline vs Named', () => {
  it('should handle inline element (no variable)', async () => {
    // From design doc: Inline vs Named - inline version
    // Note: name and label are required by Ask components, but the element is passed directly
    // as a prop value without being hoisted to a variable
    const source = `
<Prompt name="inlinePrompt">
  <MockUserInfo username={<Ask.Text name="_inline" label="Username" default="inlineuser" />} />
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'inline.prompt', {
      components: { MockUserInfo },
    });
    const result = await render(element);

    expect(result.text).toContain('User: Inlineuser');
  });

  it('should handle named element for reuse', async () => {
    // From design doc: Inline vs Named - named version
    const source = `
<Prompt name="namedPrompt">
  <Ask.Text name="username" label="username" default="nameduser" />
  <MockUserInfo username={username} />
  <Task>Processing user: {username}</Task>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'named.prompt', {
      components: { MockUserInfo },
    });
    const result = await render(element);

    expect(result.text).toContain('User: Nameduser');
    expect(result.text).toContain('Processing user: nameduser');
  });
});

describe('Variable Passing: Number and Boolean Values', () => {
  it('should pass Ask.Number value to component', async () => {
    const source = `
<Prompt name="numberPassingPrompt">
  <Ask.Number name="count" label="Count" default={5} />
  <Task>You selected {count} items.</Task>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'number.prompt');
    const result = await render(element);

    expect(result.text).toContain('You selected 5 items');
  });

  it('should pass Ask.Confirm value to component', async () => {
    const source = `
<Prompt name="confirmPassingPrompt">
  <Ask.Confirm name="agreed" label="Agreed" default={true} />
  <Task>Agreement status: {agreed}</Task>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'confirm.prompt');
    const result = await render(element);

    // The variable {agreed} contains the resolved value (boolean true),
    // which is stringified to "true". The AskConfirm component renders as "Yes",
    // but the variable reference uses the underlying resolved value.
    expect(result.text).toContain('Agreement status: true');
  });
});

describe('Variable Passing: Select Components', () => {
  it('should pass Ask.Select value to component', async () => {
    const source = `
<Prompt name="selectPassingPrompt">
  <Ask.Select name="color" label="Color" default="blue">
    <Ask.Option value="red" label="Red" />
    <Ask.Option value="blue" label="Blue" />
    <Ask.Option value="green" label="Green" />
  </Ask.Select>
  <Task>Selected color: {color}</Task>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'select.prompt');
    const result = await render(element);

    expect(result.text).toContain('Selected color: blue');
  });

  it('should pass Ask.MultiSelect values', async () => {
    const source = `
<Prompt name="multiselectPassingPrompt">
  <Ask.MultiSelect name="features" label="Features" default={["auth", "api"]}>
    <Ask.Option value="auth" label="Authentication" />
    <Ask.Option value="api" label="API" />
    <Ask.Option value="ui" label="UI" />
  </Ask.MultiSelect>
  <Task>Selected features: {features}</Task>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'multiselect.prompt');
    const result = await render(element);

    expect(result.text).toContain('Selected features: auth,api');
  });
});

describe('Variable Passing: Chained Dependencies', () => {
  it('should handle chained component dependencies', async () => {
    // Component A's output feeds into Component B
    const source = `
<Prompt name="chainedPrompt">
  <Ask.Text name="rawInput" label="rawInput" default="test" />
  <MockUserInfo username={rawInput} name="userInfo" />
  <MockSearchResults query={userInfo.displayName} name="searchResults" />
  <Task>
    Input: {rawInput}
    User: {userInfo.displayName}
    Search found: {searchResults.length} results
  </Task>
</Prompt>
    `;

    const element = await createPromptFromSource(source, 'chained.prompt', {
      components: { MockUserInfo, MockSearchResults },
    });
    const result = await render(element);

    expect(result.text).toContain('Input: test');
    expect(result.text).toContain('User: Test');
    expect(result.text).toContain('Search found: 3 results');
  });
});
