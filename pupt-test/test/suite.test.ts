import { testAllPrompts,testPrompt } from "../src/suite.js";

// Smoke test: testPrompt generates a describe block that vitest discovers
testPrompt("test/fixtures/simple.prompt", {
  inputs: { message: "Hello from suite test" },
  expectedSections: ["<role>", "<task>"],
});

// Smoke test: testAllPrompts discovers .prompt files in a directory
testAllPrompts("test/fixtures", {
  inputs: {
    "simple.prompt": { message: "Hello from testAllPrompts" },
  },
  expectedSections: ["<role>", "<task>"],
});
