export type ExampleFormat = "jsx" | "prompt";

export interface PromptExample {
  format: ExampleFormat;
  source: string;
}

export const EXAMPLES: PromptExample[] = [
  {
    format: "prompt",
    source: `<Prompt
  name="greeting"
  title="Hello World (.prompt)"
  description="A basic prompt with a single task — auto-generates Role, Format, Constraints, and Guardrails"
>
  <Task>Say hello to the user in a friendly way.</Task>
</Prompt>`,
  },
  {
    format: "prompt",
    source: `<Prompt
  name="indexing-guide"
  title="Role & Audience (.prompt)"
  description="Tailored role, audience level, and tone for targeted content"
  noRole
>
  <Role preset="engineer" experience="senior" domain="databases" />
  <Task>
    Explain database indexing strategies — covering B-tree, hash,
    and composite indexes — with practical guidance on when to use each.
  </Task>
  <Audience level="beginner" type="technical">
    New backend developers who understand SQL basics but have not
    yet optimized query performance.
  </Audience>
  <Tone type="friendly" formality="informal" />
  <Constraint>Use simple analogies to explain index data structures</Constraint>
  <Constraint>Include a "when to avoid indexing" section</Constraint>
  <Format>
    Structure as:
    1. What is an index?
    2. Index types (with pros/cons table)
    3. Choosing the right index
    4. Common mistakes
  </Format>
</Prompt>`,
  },
  {
    format: "prompt",
    source: `<Prompt
  name="sentiment-classifier"
  title="Few-Shot Examples (.prompt)"
  description="Teach a model by example — positive and negative few-shot patterns"
  noRole
>
  <Task>
    Classify the sentiment of the given text as POSITIVE, NEGATIVE, or NEUTRAL.
    Return only the label — no explanation.
  </Task>
  <Examples>
    <Example>
      <ExampleInput>I absolutely love this product! Best purchase ever.</ExampleInput>
      <ExampleOutput>POSITIVE</ExampleOutput>
    </Example>
    <Example>
      <ExampleInput>The delivery was late and the item arrived damaged.</ExampleInput>
      <ExampleOutput>NEGATIVE</ExampleOutput>
    </Example>
    <Example>
      <ExampleInput>The package arrived on Tuesday.</ExampleInput>
      <ExampleOutput>NEUTRAL</ExampleOutput>
    </Example>
  </Examples>
  <NegativeExample reason="Labels must be one of POSITIVE, NEGATIVE, or NEUTRAL — no hedging">
    Input: "It was okay I guess."
    Output: SOMEWHAT POSITIVE
  </NegativeExample>
  <Constraint>Output exactly one word: POSITIVE, NEGATIVE, or NEUTRAL</Constraint>
</Prompt>`,
  },
  {
    format: "prompt",
    source: `<Prompt
  name="architecture-eval"
  title="Step-by-Step Reasoning (.prompt)"
  description="Structured reasoning with objectives, steps, and chain-of-thought"
  noRole
>
  <Role preset="architect" />
  <Task>
    Evaluate the proposed migration from a monolithic Node.js application
    to a microservices architecture.
  </Task>
  <Context>
    Current system: E-commerce platform serving 50K daily active users.
    Pain points: 6-minute build times, single PostgreSQL database bottleneck
    during flash sales, entire app must redeploy for minor checkout changes.
    Team: 12 developers across 3 squads (catalog, checkout, fulfillment).
    Infrastructure: AWS, single RDS PostgreSQL instance, deployed as a
    Docker monolith on ECS.
  </Context>
  <Objective
    primary="Determine whether microservices are the right choice for this system"
    secondary={["Identify migration risks", "Estimate complexity"]}
  />
  <Steps>
    <Step>Analyze current monolith pain points and scaling bottlenecks</Step>
    <Step>Identify natural service boundaries from the domain model</Step>
    <Step>Assess team readiness and operational maturity</Step>
    <Step>Compare total cost of ownership: monolith vs microservices</Step>
    <Step>Deliver a go / no-go recommendation with rationale</Step>
  </Steps>
  <ChainOfThought style="structured" />
  <Constraint preset="no-hallucination" />
  <Constraint preset="cite-sources" />
  <Constraint>Base the evaluation on the 12-factor app methodology</Constraint>
</Prompt>`,
  },
  {
    format: "prompt",
    source: `<Prompt
  name="travel-planner"
  title="Rich Inputs (.prompt)"
  description="Collect diverse user inputs — text, select, date, rating, and conditionals"
>
  <Task>
    Create a travel itinerary for a trip to
    <Ask.Text name="destination" label="Destination" required />.
  </Task>
  <Context>
    Traveler: <Ask.Text name="traveler" label="Who is traveling? (e.g. couple, family with kids, solo)" required />
    Travel dates: <Ask.Date name="start" label="Departure date" /> to <Ask.Date name="end" label="Return date" />
    Activity level: <Ask.Rating name="intensity" label="Desired pace (1=relaxed, 5=packed schedule)" />

    Interests: <Ask.MultiSelect name="interests" label="What interests you?">
      <Ask.Option value="history">History &amp; culture</Ask.Option>
      <Ask.Option value="food">Food &amp; dining</Ask.Option>
      <Ask.Option value="nature">Nature &amp; outdoors</Ask.Option>
      <Ask.Option value="shopping">Shopping &amp; markets</Ask.Option>
    </Ask.MultiSelect>

    Travel style: <Ask.Select name="style" label="Budget level" default="mid-range">
      <Ask.Option value="budget">Budget</Ask.Option>
      <Ask.Option value="mid-range">Mid-range</Ask.Option>
      <Ask.Option value="luxury">Luxury</Ask.Option>
    </Ask.Select>
    <Ask.Confirm name="includePacking" label="Include packing suggestions?" silent />
  </Context>
  <If when="=includePacking">
    <Constraint>End with a packing checklist tailored to the destination and activities</Constraint>
  </If>
  <Constraint>Organize the itinerary day by day</Constraint>
  <Format>
    For each day include:
    - Morning, afternoon, and evening activities
    - Restaurant or food recommendations
    - Estimated costs in local currency
  </Format>
</Prompt>`,
  },
  {
    format: "prompt",
    source: `<Prompt
  name="adaptive-guide"
  title="Conditional Logic (.prompt)"
  description="Use If statements to conditionally include content"
>
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
    format: "jsx",
    source: `import { Prompt, Task, Context, Section, Code, Data, ForEach, Component, Constraint, Format } from '@pupt/lib';
import { z } from 'zod';

// A custom component that processes its children and formats them
class IssueList extends Component {
  static schema = z.object({
    severity: z.string().optional(),
    children: z.any().optional(),
  });

  render({ severity = "all", children }) {
    return [
      severity !== "all" ? "Severity filter: " + severity + "\\n" : "",
      "<issues>\\n",
      children,
      "</issues>\\n",
    ];
  }
}

const codeSnippet = \`export function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}\`;

export default (
  <Prompt
    name="code-review"
    title="Data & Iteration (.tsx)"
    description="ForEach loops, Code blocks, Data sections, and a custom child-processing component"
  >
    <Task>
      Review the pull request "Add user authentication middleware" and provide actionable feedback.
    </Task>
    <Context>
      <Section>
        Changed files:
        <ForEach items={["src/middleware/auth.ts (+45 / -3)", "src/routes/login.ts (+28 / -0)", "test/auth.test.ts (+62 / -0)"]} as="file">
          {(file) => "- " + file + "\\n"}
        </ForEach>
      </Section>
      <Section>
        Key code to review:
        <Code language="typescript">
          {codeSnippet}
        </Code>
      </Section>
      <Section>
        <Data name="pr-metadata" format="json">
          {JSON.stringify({ title: "Add user authentication middleware", totalFiles: 3 }, null, 2)}
        </Data>
      </Section>
    </Context>
    <IssueList severity="high">
      <Code language="typescript">
        {codeSnippet}
      </Code>
    </IssueList>
    <Constraint>Focus on security, error handling, and test coverage</Constraint>
    <Format>
      For each issue found:
      1. File and line reference
      2. Severity (high / medium / low)
      3. Suggested fix
    </Format>
  </Prompt>
);`,
  },
  {
    format: "prompt",
    source: `<Prompt
  name="medical-info"
  title="Guardrails & Safety (.prompt)"
  description="Layered safety with guardrails, edge cases, fallbacks, and success criteria"
  noRole
  noGuardrails
  noConstraints
  noSuccessCriteria
>
  <Role title="Medical Information Assistant"
        expertise={["general health literacy", "evidence-based medicine"]}
        experience="senior" />
  <Task>
    Answer the user's health-related question with accurate,
    evidence-based information.
  </Task>
  <Guardrails preset="strict"
    prohibit={["Diagnose specific conditions", "Recommend prescription medications", "Contradict a doctor's advice"]}
    require={["Include a disclaimer to consult a healthcare provider", "Cite reputable medical sources"]}
  />
  <EdgeCases preset="standard">
    <When condition="user describes an emergency" then="Urge them to call emergency services immediately" />
    <When condition="question involves mental health crisis" then="Provide crisis hotline numbers and encourage professional help" />
  </EdgeCases>
  <Fallbacks preset="standard">
    <Fallback when="question is outside medical scope" then="Explain limitations and suggest an appropriate specialist" />
  </Fallbacks>
  <WhenUncertain action="acknowledge">
    If the evidence is mixed or insufficient, say so explicitly
    and recommend the user discuss it with their doctor.
  </WhenUncertain>
  <SuccessCriteria>
    <Criterion>Response cites at least one reputable source</Criterion>
    <Criterion>Disclaimer is present in every answer</Criterion>
    <Criterion>No specific diagnosis or prescription is given</Criterion>
  </SuccessCriteria>
</Prompt>`,
  },
  {
    format: "jsx",
    source: `import { Prompt, Task, Context, Constraint, Component, Ask, Style } from '@pupt/lib';
import { z } from 'zod';

// Async component that fetches live data from the GitHub API
class GitHubProfile extends Component {
  static schema = z.object({
    username: z.string().optional(),
  });

  async render({ username }) {
    username = username || "octocat";
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

// Ask.Text with name="username" creates a variable
// that is passed as a prop to GitHubProfile
export default (
  <Prompt
    name="github-summary"
    title="Custom Component (.tsx)"
    description="Async component with GitHub API, Ask.Text variable binding, and Style"
  >
    <Task>
      Write a professional developer profile summary for
      <Ask.Text name="username" label="GitHub username" default="octocat" />.
    </Task>
    <Context>
      <GitHubProfile username={username} />
    </Context>
    <Style type="concise" verbosity="minimal" />
    <Constraint>Keep it under 100 words</Constraint>
    <Constraint>Highlight open-source contributions and expertise areas</Constraint>
  </Prompt>
);`,
  },
  {
    format: "jsx",
    source: `import { Prompt, Task, Context, Role, Constraint, Format, Specialization, References, Reference } from '@pupt/lib';

export default (
  <Prompt
    name="api-doc-generator"
    title="Production Prompt (.tsx)"
    version="2.1.0"
    description="Generates REST API documentation from endpoint specifications"
    tags={["documentation", "api", "openapi"]}
    noRole
  >
    <Role
      title="API Documentation Specialist"
      expertise={["REST API design", "OpenAPI 3.x", "developer experience"]}
      experience="expert"
      style="professional"
    />
    <Specialization areas={["API documentation", "developer portals"]} level="expert" />
    <Task>
      Generate comprehensive API documentation for the endpoint described below.
      Include request/response schemas, error codes, and usage examples.
    </Task>
    <Context>
      Endpoint: POST /api/v2/users
      Authentication: Bearer token (OAuth 2.0)
      Rate limit: 100 requests/minute
      Request body: JSON with fields name (string, required), email (string, required), role (enum: admin|user|viewer)
      Success response: 201 Created with user object
      Error responses: 400 Bad Request, 401 Unauthorized, 409 Conflict (duplicate email), 429 Too Many Requests
    </Context>
    <References>
      <Reference
        title="OpenAPI 3.1 Specification"
        url="https://spec.openapis.org/oas/v3.1.0"
        description="Follow this specification for schema definitions"
      />
      <Reference
        title="REST API Design Guidelines"
        url="https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design"
      />
    </References>
    <Constraint type="must" category="content">Include curl examples for every endpoint</Constraint>
    <Constraint type="must" category="format">Follow OpenAPI 3.1 schema conventions</Constraint>
    <Constraint type="should" category="content">Include SDK examples in Python and JavaScript</Constraint>
    <Constraint type="must-not" category="accuracy">Do not invent query parameters not listed in the spec</Constraint>
    <Format>
      Structure the documentation as:
      1. Endpoint overview
      2. Authentication
      3. Request (headers, path params, body schema)
      4. Response (success + error schemas)
      5. Code examples (curl, Python, JavaScript)
      6. Rate limiting notes
    </Format>
  </Prompt>
);`,
  },
];

export const DEFAULT_EXAMPLE = EXAMPLES[0]!;
