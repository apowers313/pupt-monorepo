// Root ESLint configuration for pupt-monorepo
// This config focuses on ERROR PREVENTION, not stylistic rules
// Formatting is handled by Prettier (.prettierrc)

import eslint from "@eslint/js";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
    // ============================================
    // IGNORE PATTERNS
    // ============================================
    {
        ignores: [
            "**/dist/**",
            "**/node_modules/**",
            "**/coverage/**",
            "**/tmp/**",
            // Config files are typically JS and don't need strict type checking
            "**/*.config.js",
            "**/*.config.ts",
            "**/*.config.mjs",
            "**/vite.config.ts",
            "**/vitest.config.ts",
            "**/vitest.config.mjs",
            "**/commitlint.config.js",
            // Example files are for demonstration, not production
            "**/examples/**",
            // Build scripts
            "**/scripts/**",
            // VitePress cache and generated files
            "**/.vitepress/cache/**",
            "**/.vitepress/dist/**",
            // Docs directories
            "docs/**",
            "**/docs/**",
            // pupt-sde tests are .mjs (no TypeScript)
            "pupt-sde/test/**",
        ],
    },

    // ============================================
    // BASE JAVASCRIPT RULES
    // ============================================
    eslint.configs.recommended,

    // ============================================
    // TYPESCRIPT STRICT RULES (for .ts/.tsx files)
    // ============================================
    {
        files: ["**/*.ts", "**/*.tsx"],
        extends: [...tseslint.configs.strictTypeChecked],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
            globals: {
                ...globals.browser,
                ...globals.es2022,
            },
        },
        plugins: {
            "simple-import-sort": simpleImportSort,
        },
        rules: {
            // ==========================================
            // ERROR PREVENTION - Type Safety
            // ==========================================
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/explicit-function-return-type": [
                "error",
                {
                    allowExpressions: true,
                    allowIIFEs: true,
                },
            ],
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/no-unnecessary-type-assertion": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-non-null-assertion": "error",
            // TODO: Re-enable these rules and fix issues incrementally
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/restrict-template-expressions": [
                "error",
                {
                    allowNumber: true,
                    allowBoolean: true,
                    allowAny: false,
                    allowNullish: false,
                },
            ],

            // ==========================================
            // ERROR PREVENTION - Logic Safety
            // ==========================================
            eqeqeq: ["error", "always"],
            curly: "error",
            "no-var": "error",
            "prefer-const": "error",
            "consistent-return": "error",
            "no-template-curly-in-string": "error",
            "no-else-return": "error",
            "no-nested-ternary": "error",
            "no-unneeded-ternary": "error",
            "prefer-template": "error",
            "dot-notation": "error",
            "default-case": "error",
            "default-param-last": "error",
            yoda: ["error", "never"],

            // ==========================================
            // CODE QUALITY
            // ==========================================
            "no-console": ["error", { allow: ["warn", "error"] }],
            "no-duplicate-imports": "error",
            "no-useless-constructor": "error",
            "no-useless-rename": "error",
            "no-useless-computed-key": "error",
            "prefer-destructuring": ["error", { object: true, array: false }],
            "prefer-rest-params": "error",
            "prefer-spread": "error",
            camelcase: ["error", { properties: "always" }],

            // ==========================================
            // IMPORT SORTING
            // ==========================================
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
        },
    },

    // ============================================
    // RELAXED RULES FOR TEST FILES
    // ============================================
    {
        files: [
            "**/*.test.ts",
            "**/*.test.tsx",
            "**/*.spec.ts",
            "**/*.spec.tsx",
            "**/test/**/*.ts",
            "**/test/**/*.tsx",
            "**/__tests__/**/*.ts",
            "**/__tests__/**/*.tsx",
        ],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/explicit-function-return-type": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/unbound-method": "off",
            "@typescript-eslint/restrict-template-expressions": "off",
            "@typescript-eslint/no-deprecated": "off",
            "@typescript-eslint/no-confusing-void-expression": "off",
            "@typescript-eslint/restrict-plus-operands": "off",
            "@typescript-eslint/no-redundant-type-constituents": "off",
            "no-console": "off",
        },
    },

    // ============================================
    // RELAXED RULES FOR JAVASCRIPT FILES
    // ============================================
    {
        files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
        rules: {
            "@typescript-eslint/explicit-function-return-type": "off",
        },
    },
);
