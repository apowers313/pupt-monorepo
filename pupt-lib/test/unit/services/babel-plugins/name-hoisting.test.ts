/**
 * Tests for the name-hoisting Babel plugin.
 * This plugin transforms JSX elements with name attributes into variable declarations.
 *
 * For example:
 *   <Ask.Text name="username" /> → const username = <Ask.Text name="username" />
 */
import { describe, it, expect } from 'vitest';
import { Transformer } from '../../../../src/services/transformer';

describe('name-hoisting Babel plugin', () => {
  const transformer = new Transformer();

  // Helper to transform and check result
  async function transform(source: string): Promise<string> {
    return transformer.transformSourceAsync(source, 'test.tsx');
  }

  describe('basic transformations', () => {
    it('should hoist Ask.Text with name attribute to variable declaration', async () => {
      const source = `
        export default (
          <Prompt>
            <Ask.Text name="username" label="Enter username" />
            <Task>Hello {username}</Task>
          </Prompt>
        );
      `;

      const result = await transform(source);

      // Should create a variable declaration
      expect(result).toMatch(/const\s+username\s*=/);
      // The variable should be used
      expect(result).toContain('username');
    });

    it('should hoist Ask.Number with name attribute', async () => {
      const source = `
        export default (
          <Prompt>
            <Ask.Number name="age" label="Enter age" />
            <Task>Age is {age}</Task>
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result).toMatch(/const\s+age\s*=/);
    });

    it('should hoist Ask.Select with name attribute', async () => {
      const source = `
        export default (
          <Prompt>
            <Ask.Select name="color" label="Pick a color">
              <Ask.Option value="red">Red</Ask.Option>
              <Ask.Option value="blue">Blue</Ask.Option>
            </Ask.Select>
            <Task>Color is {color}</Task>
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result).toMatch(/const\s+color\s*=/);
    });

    it('should hoist custom components with name attribute', async () => {
      const source = `
        export default (
          <Prompt>
            <GitHubUserInfo username="octocat" name="github" />
            <Task>Stars: {github.stars}</Task>
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result).toMatch(/const\s+github\s*=/);
    });
  });

  describe('issue #11: duplicate variable declarations', () => {
    it('should NOT create duplicate declarations when same name is used multiple times', async () => {
      const source = `
        export default (
          <Prompt>
            <Task>
              Write a cover letter for <Ask.Text name="name" label="Your name" required />.
            </Task>
            <Context>
              <Ask.Text name="name" label="Your name" required /> has experience.
            </Context>
          </Prompt>
        );
      `;

      // This should NOT throw a syntax error about duplicate declarations
      const result = await transform(source);

      // Should only have ONE const name declaration
      const matches = result.match(/const\s+name\s*=/g);
      expect(matches).toHaveLength(1);
    });

    it('should replace subsequent occurrences with variable reference', async () => {
      const source = `
        export default (
          <Prompt>
            <Section>
              <Ask.Text name="email" label="Your email" />
            </Section>
            <Section>
              <Ask.Text name="email" label="Your email" />
            </Section>
            <Task>Contact at {email}</Task>
          </Prompt>
        );
      `;

      const result = await transform(source);

      // Should only have ONE const declaration
      const matches = result.match(/const\s+email\s*=/g);
      expect(matches).toHaveLength(1);
    });

    it('should handle multiple different names used multiple times each', async () => {
      const source = `
        export default (
          <Prompt>
            <Task>
              Hello <Ask.Text name="name" /> from <Ask.Text name="city" />.
              <Ask.Text name="name" /> lives in <Ask.Text name="city" />.
            </Task>
          </Prompt>
        );
      `;

      const result = await transform(source);

      // Should have exactly ONE declaration for each name
      const nameMatches = result.match(/const\s+name\s*=/g);
      const cityMatches = result.match(/const\s+city\s*=/g);
      expect(nameMatches).toHaveLength(1);
      expect(cityMatches).toHaveLength(1);
    });

    it('should handle cover letter pattern from issue description', async () => {
      const source = `
        export default (
          <Prompt name="cover-letter">
            <Task>
              Write a cover letter for <Ask.Text name="name" label="Your name" required /> applying
              for the role of <Ask.Text name="role" label="Job title" required />.
            </Task>
            <Context>
              <Ask.Text name="name" label="Your name" required /> has experience...
            </Context>
          </Prompt>
        );
      `;

      // Should not throw
      const result = await transform(source);

      // Verify single declarations
      expect(result.match(/const\s+name\s*=/g)).toHaveLength(1);
      expect(result.match(/const\s+role\s*=/g)).toHaveLength(1);
    });

    it('should handle confirmation pattern (You entered X... Is X correct?)', async () => {
      const source = `
        export default (
          <Prompt>
            <Task>
              You entered <Ask.Text name="value" />.
              Is <Ask.Text name="value" /> correct?
            </Task>
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result.match(/const\s+value\s*=/g)).toHaveLength(1);
    });
  });

  describe('structural components should NOT be hoisted', () => {
    it('should NOT hoist Prompt with name attribute', async () => {
      const source = `
        export default (
          <Prompt name="my-prompt">
            <Task>Do something</Task>
          </Prompt>
        );
      `;

      const result = await transform(source);

      // Should NOT create a variable declaration for "my-prompt"
      expect(result).not.toMatch(/const\s+my-prompt\s*=/);
      // The name should still be a prop on Prompt
      expect(result).toContain('"my-prompt"');
    });

    it('should NOT hoist Section with name attribute', async () => {
      const source = `
        export default (
          <Prompt>
            <Section name="intro">
              Hello
            </Section>
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result).not.toMatch(/const\s+intro\s*=/);
    });

    it('should NOT hoist Role, Task, Context, etc.', async () => {
      const source = `
        export default (
          <Prompt>
            <Role name="assistant">Helper</Role>
            <Task name="main-task">Do X</Task>
            <Context name="background">Info</Context>
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result).not.toMatch(/const\s+assistant\s*=/);
      expect(result).not.toMatch(/const\s+main-task\s*=/);
      expect(result).not.toMatch(/const\s+background\s*=/);
    });
  });

  describe('identifier validation', () => {
    it('should throw error for invalid identifier (starts with number)', async () => {
      const source = `
        export default (
          <Prompt>
            <Ask.Text name="123invalid" />
          </Prompt>
        );
      `;

      await expect(transform(source)).rejects.toThrow(/Invalid variable name.*123invalid/);
    });

    it('should throw error for reserved word (const)', async () => {
      const source = `
        export default (
          <Prompt>
            <Ask.Text name="const" />
          </Prompt>
        );
      `;

      await expect(transform(source)).rejects.toThrow(/Invalid variable name.*const/);
    });

    it('should throw error for reserved word (function)', async () => {
      const source = `
        export default (
          <Prompt>
            <Ask.Text name="function" />
          </Prompt>
        );
      `;

      await expect(transform(source)).rejects.toThrow(/Invalid variable name.*function/);
    });

    it('should allow valid identifiers with underscores', async () => {
      const source = `
        export default (
          <Prompt>
            <Ask.Text name="user_name" />
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result).toMatch(/const\s+user_name\s*=/);
    });

    it('should allow valid identifiers with dollar sign', async () => {
      const source = `
        export default (
          <Prompt>
            <Ask.Text name="$value" />
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result).toMatch(/const\s+\$value\s*=/);
    });
  });

  describe('edge cases', () => {
    it('should handle elements without name attribute', async () => {
      const source = `
        export default (
          <Prompt>
            <Ask.Text label="No name here" />
            <Task>Do something</Task>
          </Prompt>
        );
      `;

      // Should not throw
      const result = await transform(source);

      // Should still have valid JSX output
      expect(result).toContain('jsx');
    });

    it('should handle name attribute with JSX expression syntax', async () => {
      const source = `
        export default (
          <Prompt>
            <Ask.Text name={"username"} label="Enter username" />
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result).toMatch(/const\s+username\s*=/);
    });

    it('should handle deeply nested elements', async () => {
      const source = `
        export default (
          <Prompt>
            <Section>
              <Context>
                <Ask.Text name="deep" />
              </Context>
            </Section>
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result).toMatch(/const\s+deep\s*=/);
    });

    it('should handle multiple Ask components with different types but same name', async () => {
      // This is a valid use case - same input referenced multiple times
      const source = `
        export default (
          <Prompt>
            <Ask.Text name="input" label="First occurrence" />
            <Ask.Text name="input" label="Second occurrence" />
          </Prompt>
        );
      `;

      const result = await transform(source);

      // Should only have ONE declaration
      expect(result.match(/const\s+input\s*=/g)).toHaveLength(1);
    });

    it('should handle Ask components mixed with text content', async () => {
      const source = `
        export default (
          <Prompt>
            <Task>
              Hello <Ask.Text name="user" />, welcome to <Ask.Text name="app" />!
              User <Ask.Text name="user" /> is using <Ask.Text name="app" />.
            </Task>
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result.match(/const\s+user\s*=/g)).toHaveLength(1);
      expect(result.match(/const\s+app\s*=/g)).toHaveLength(1);
    });

    it('should handle short Ask component names (Text, Number, etc.)', async () => {
      // These are aliases that should also be hoisted
      const source = `
        export default (
          <Prompt>
            <Text name="textInput" />
            <Number name="numInput" />
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result).toMatch(/const\s+textInput\s*=/);
      expect(result).toMatch(/const\s+numInput\s*=/);
    });
  });

  describe('scope isolation', () => {
    it('should track names per program scope', async () => {
      // When transformed separately, each file should have its own namespace
      const source1 = `
        export default (
          <Prompt>
            <Ask.Text name="shared" />
          </Prompt>
        );
      `;

      const source2 = `
        export default (
          <Prompt>
            <Ask.Text name="shared" />
          </Prompt>
        );
      `;

      // Both should work independently
      const result1 = await transform(source1);
      const result2 = await transform(source2);

      expect(result1.match(/const\s+shared\s*=/g)).toHaveLength(1);
      expect(result2.match(/const\s+shared\s*=/g)).toHaveLength(1);
    });
  });

  describe('potential name conflicts', () => {
    it('should handle name that shadows an import (but still works at runtime)', async () => {
      // This is a valid scenario - the hoisted variable will shadow the import
      // User should be aware of this, but it shouldn't crash
      const source = `
        import { foo } from 'some-package';
        export default (
          <Prompt>
            <Ask.Text name="foo" label="Foo" />
            <Task>Foo is {foo}</Task>
          </Prompt>
        );
      `;

      // Should not throw - the plugin doesn't check for import conflicts
      // (this would require scope analysis which is complex)
      const result = await transform(source);

      // Should still create the declaration
      expect(result.match(/const\s+foo\s*=/g)).toHaveLength(1);
    });

    it('should handle duplicate names across different component types', async () => {
      // Different component types with same name should still only declare once
      const source = `
        export default (
          <Prompt>
            <Ask.Text name="input" label="Text input" />
            <Ask.Number name="input" label="Number input" />
          </Prompt>
        );
      `;

      const result = await transform(source);

      // Only first occurrence creates declaration
      expect(result.match(/const\s+input\s*=/g)).toHaveLength(1);
    });

    it('should handle name inside conditional JSX', async () => {
      const source = `
        const showExtra = true;
        export default (
          <Prompt>
            <Ask.Text name="field" label="Always" />
            {showExtra && <Ask.Text name="field" label="Conditional" />}
          </Prompt>
        );
      `;

      const result = await transform(source);

      // Should only have one declaration
      expect(result.match(/const\s+field\s*=/g)).toHaveLength(1);
    });

    it('should handle name inside array map', async () => {
      const source = `
        const items = ['a', 'b'];
        export default (
          <Prompt>
            {items.map(item => <Ask.Text name="mapped" key={item} />)}
          </Prompt>
        );
      `;

      const result = await transform(source);

      // The name inside map will still be hoisted once
      expect(result.match(/const\s+mapped\s*=/g)).toHaveLength(1);
    });

    it('should handle duplicate name in sibling elements', async () => {
      const source = `
        export default (
          <>
            <Ask.Text name="sibling" label="First" />
            <Ask.Text name="sibling" label="Second" />
          </>
        );
      `;

      const result = await transform(source);

      expect(result.match(/const\s+sibling\s*=/g)).toHaveLength(1);
    });
  });

  describe('interaction with other plugins', () => {
    it('should work alongside Uses plugin', async () => {
      const source = `
        <Uses component="CustomInput" from="my-inputs" />
        export default (
          <Prompt>
            <CustomInput name="custom" />
            <Ask.Text name="builtin" />
          </Prompt>
        );
      `;

      const result = await transform(source);

      // Both should be hoisted
      expect(result.match(/const\s+custom\s*=/g)).toHaveLength(1);
      expect(result.match(/const\s+builtin\s*=/g)).toHaveLength(1);
      // Import should still be there
      expect(result).toContain('import { CustomInput }');
    });
  });

  describe('complex nesting scenarios', () => {
    it('should handle deeply nested duplicate names', async () => {
      const source = `
        export default (
          <Prompt>
            <Section>
              <Context>
                <Ask.Text name="deep" label="Level 3" />
              </Context>
            </Section>
            <Section>
              <Task>
                <Ask.Text name="deep" label="Another Level 3" />
              </Task>
            </Section>
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result.match(/const\s+deep\s*=/g)).toHaveLength(1);
    });

    it('should handle mixed nesting with duplicates', async () => {
      const source = `
        export default (
          <Prompt>
            <Ask.Text name="outer" />
            <Section>
              <Ask.Text name="outer" />
              <Ask.Text name="inner" />
            </Section>
            <Ask.Text name="inner" />
          </Prompt>
        );
      `;

      const result = await transform(source);

      expect(result.match(/const\s+outer\s*=/g)).toHaveLength(1);
      expect(result.match(/const\s+inner\s*=/g)).toHaveLength(1);
    });

    it('should handle three or more occurrences of the same name', async () => {
      const source = `
        export default (
          <Prompt>
            <Task>Hello <Ask.Text name="x" /></Task>
            <Context>For <Ask.Text name="x" /></Context>
            <Section>About <Ask.Text name="x" /></Section>
            <Constraint>Regarding <Ask.Text name="x" /></Constraint>
          </Prompt>
        );
      `;

      const result = await transform(source);

      // Should only have ONE declaration, no matter how many occurrences
      expect(result.match(/const\s+x\s*=/g)).toHaveLength(1);
    });
  });
});
