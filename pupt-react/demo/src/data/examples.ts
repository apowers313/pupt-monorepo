export type ExampleFormat = "jsx" | "prompt";

export interface PromptExample {
  name: string;
  description: string;
  format: ExampleFormat;
  source: string;
}

export const EXAMPLES: PromptExample[] = [
  {
    name: "Simple Greeting (.prompt)",
    description: "A basic prompt with a single task",
    format: "prompt",
    source: `<Prompt name="greeting">
  <Task>Say hello to the user in a friendly way.</Task>
</Prompt>`,
  },
  {
    name: "Simple TSX (.tsx)",
    description: "Use JavaScript data and logic in prompts",
    format: "jsx",
    // Full source - components are available in scope, no imports needed
    source: `// Simulate fetching user data from an API
const userData = {
  name: "Alice Johnson",
  role: "Senior Developer",
  department: "Engineering",
  recentProjects: ["Auth System", "Dashboard v2", "API Gateway"],
  skills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
};

// Build dynamic context from the data
const projectList = userData.recentProjects.map(p => "• " + p).join("\\n");
const skillList = userData.skills.join(", ");

export default (
  <Prompt name="performance-review">
    <Task>
      Write a performance review summary for {userData.name}.
    </Task>
    <Context>
      Employee: {userData.name}
      Role: {userData.role}
      Department: {userData.department}

      Recent Projects:
      {projectList}

      Technical Skills: {skillList}
    </Context>
    <Constraint>Highlight specific achievements from the projects listed</Constraint>
    <Constraint>Keep the review professional and balanced</Constraint>
    <Format>
      Use these sections:
      - Overview
      - Key Accomplishments
      - Areas of Strength
      - Growth Opportunities
    </Format>
  </Prompt>
);`,
  },
  {
    name: "With Ask Inputs (.prompt)",
    description: "A prompt that collects user input",
    format: "prompt",
    source: `<Prompt name="cover-letter">
  <Task>
    Write a cover letter for <Ask.Text name="name" label="Your name" required /> applying
    for the role of <Ask.Text name="role" label="Job title" required /> at <Ask.Text name="company" label="Company name" required />.
  </Task>
  <Context>
    <Ask.Text name="name" label="Your name" required /> has <Ask.Number name="years" label="Years of experience" /> years of experience
    and is passionate about the mission of <Ask.Text name="company" label="Company name" required />.
  </Context>
  <Constraint>Keep it under 200 words</Constraint>
  <Constraint>Use a professional but enthusiastic tone</Constraint>
</Prompt>`,
  },
  {
    name: "Conditional Logic (.prompt)",
    description: "Use If statements to conditionally include content",
    format: "prompt",
    source: `<Prompt name="adaptive-guide">
  <Task>Create a guide about React state management.</Task>
  <Context>
    Target audience: <Ask.Select name="audience" label="Target audience" default="developer">
      <Ask.Option value="developer">Software Developer</Ask.Option>
      <Ask.Option value="designer">UI/UX Designer</Ask.Option>
      <Ask.Option value="manager">Engineering Manager</Ask.Option>
      <Ask.Option value="student">Student</Ask.Option>
    </Ask.Select>
    <Ask.Confirm name="includeCode" label="Include code examples?" silent />
    <Ask.Confirm name="senior" label="Senior-level audience?" silent />
  </Context>
  <If when="=includeCode">
    <Constraint>Include code examples in TypeScript.</Constraint>
  </If>
  <If when="=NOT(includeCode)">
    <Constraint>Keep examples conceptual, no code.</Constraint>
  </If>
  <If when="=senior">
    <Constraint>Assume familiarity with advanced patterns.</Constraint>
  </If>
  <If when="=NOT(senior)">
    <Constraint>Explain concepts from first principles.</Constraint>
  </If>
  <Constraint>Focus on practical, real-world scenarios</Constraint>
  <Format>
    Structure the guide as:
    1. Introduction
    2. Core Concepts
    3. Best Practices
    4. Common Pitfalls
  </Format>
</Prompt>`,
  },
  {
    name: "GitHub API with Variable (.tsx)",
    description: "Async component that fetches from GitHub API",
    format: "jsx",
    source: `import { Prompt, Task, Context, Constraint, Component, Ask } from 'pupt-lib';
import { z } from 'zod';

// Define an async component that fetches GitHub user data
class GitHubUserInfo extends Component {
  // Schema is required for all custom components
  static schema = z.object({
    username: z.string().optional(),
  });

  async render({ username = "octocat" }) {
    const res = await fetch(\`https://api.github.com/users/\${username}\`);
    const user = await res.json();
    const joinDate = new Date(user.created_at).toLocaleDateString();

    return \`Username: @\${user.login}
Name: \${user.name || "Not specified"}
Company: \${user.company || "Not specified"}
Location: \${user.location || "Not specified"}
Bio: \${user.bio || "No bio"}
Member since: \${joinDate}
Repos: \${user.public_repos} | Followers: \${user.followers}\`;
  }
}

// Ask.Text with name="username" creates a variable that can be referenced as {username}
// The {username} variable is passed as a prop to GitHubUserInfo
export default (
  <Prompt name="github-profile">
    <Task>
      Write a professional summary for <Ask.Text name="username" label="GitHub username" default="octocat" />'s GitHub profile.
    </Task>
    <Context>
      <GitHubUserInfo username={username} />
    </Context>
    <Constraint>Keep it under 100 words</Constraint>
  </Prompt>
);`,
  },
  {
    name: "GitHub API with Child Prompt (.tsx)",
    description: "Component that uses Ask.Text child for input",
    format: "jsx",
    source: `import { Prompt, Task, Context, Constraint, Component, Ask } from 'pupt-lib';
import { z } from 'zod';

// Component that accepts Ask.Text as a child to get the username
class GitHubUserInfo extends Component {
  static schema = z.object({
    children: z.any().optional(),
  });

  async render({ children }, _resolved, context) {
    // Default username
    let username = "octocat";

    // Check if we have an Ask.Text child - look for its value in inputs
    // The child's "name" prop determines which input to look up
    if (children && children.length > 0) {
      const child = children[0];
      // Access props via symbol key (PuptElement uses Symbol.for('pupt.props'))
      const PROPS = Symbol.for('pupt.props');
      const childProps = (child && typeof child === 'object' && child[PROPS]) || {};
      const inputName = childProps.name;

      if (inputName && context.inputs.has(inputName)) {
        username = String(context.inputs.get(inputName));
      } else if (typeof childProps.default === 'string') {
        username = childProps.default;
      }
    }

    const res = await fetch("https://api.github.com/users/" + encodeURIComponent(username));
    const user = await res.json();
    const joinDate = new Date(user.created_at).toLocaleDateString();

    return "Username: @" + user.login + "\\n" +
      "Name: " + (user.name || "Not specified") + "\\n" +
      "Company: " + (user.company || "Not specified") + "\\n" +
      "Location: " + (user.location || "Not specified") + "\\n" +
      "Bio: " + (user.bio || "No bio") + "\\n" +
      "Member since: " + joinDate + "\\n" +
      "Repos: " + user.public_repos + " | Followers: " + user.followers;
  }
}

// The Ask.Text is a CHILD of GitHubUserInfo, not a prop
// The component extracts the input value from context.inputs
export default (
  <Prompt name="github-profile">
    <Task>Write a professional summary for this GitHub user's profile.</Task>
    <Context>
      <GitHubUserInfo>
        <Ask.Text name="username" label="What is the GitHub username?" default="octocat" />
      </GitHubUserInfo>
    </Context>
    <Constraint>Keep it under 100 words</Constraint>
  </Prompt>
);`,
  },
];

export const DEFAULT_EXAMPLE = EXAMPLES[0]!;
