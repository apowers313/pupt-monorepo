export default [
  {
    files: ["test/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "no-undef": "error",
      eqeqeq: ["error", "always"],
      "no-constant-condition": "error",
      "no-debugger": "error",
      "no-duplicate-case": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-extra-semi": "error",
      "no-unreachable": "error",
      "no-var": "error",
      "prefer-const": "error",
    },
  },
];
