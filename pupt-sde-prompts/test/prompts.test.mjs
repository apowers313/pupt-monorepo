import { testAllPrompts } from "@pupt/test/suite";

testAllPrompts("prompts", {
  inputs: {
    "code-review.prompt": {
      codeToReview: "function add(a, b) { return a + b; }",
    },
    "debug-root-cause.prompt": {
      bugDescription:
        "Application crashes on login with null pointer exception",
    },
    "design-architecture.prompt": {
      requirements:
        "Build a real-time chat application with message persistence",
    },
    "documentation.prompt": {
      content: "export function fetchUser(id: string): Promise<User> {}",
      docType: "api",
    },
    "implementation-plan.prompt": {
      input: "Add user authentication with JWT tokens",
    },
    "performance-analysis.prompt": {
      codeToAnalyze:
        "for (let i = 0; i < arr.length; i++) { arr.includes(i); }",
    },
    "pr-description.prompt": {
      gitDiff: "diff --git a/index.js b/index.js\n+const x = 1;",
    },
    "refactor.prompt": {
      code: "function foo() { var x = 1; var y = 2; return x + y; }",
    },
    "requirements-clarification.prompt": {
      requestDescription: "Build a dashboard for monitoring server health",
    },
    "security-audit.prompt": {
      codeToAudit:
        "app.get('/user', (req, res) => res.json(db.query(req.query.id)));",
    },
    "test-generation.prompt": {
      codeToTest: "function multiply(a, b) { return a * b; }",
    },
  },
  expectedSections: ["<role>", "<objective>", "<task>"],
});
