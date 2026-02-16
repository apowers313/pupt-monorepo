/**
 * Knip configuration for pupt monorepo
 *
 * Knip finds unused files, dependencies, and exports across the codebase.
 * Run with: pnpm run lint:knip
 *
 * @see https://knip.dev/overview/configuration
 */

import type { KnipConfig } from "knip";

const config: KnipConfig = {
    workspaces: {
        // Root workspace - shared configs
        ".": {
            entry: ["vite.shared.config.ts", "vitest.shared.config.ts"],
            project: ["*.ts", "*.js", "tools/**/*.{ts,js,sh}"],
            ignore: ["**/dist/**", "**/coverage/**", "**/node_modules/**"],
            ignoreDependencies: [
                // Nx plugins are used dynamically
                "@nx/eslint",
                // Coverage merging (used in tools/merge-coverage.sh via pnpm exec)
                "lcov-result-merger",
                // Semantic release plugins (used by nx release and child packages)
                "@semantic-release/changelog",
                "@semantic-release/git",
                "semantic-release",
                // Coverage provider (used by child packages)
                "@vitest/coverage-v8",
                // Commitizen tools (used via git cz / npm run commit)
                "commitizen",
                "conventional-changelog-conventionalcommits",
            ],
        },

        // @pupt/lib - core JSX prompt library
        "pupt-lib": {
            entry: ["src/index.ts", "src/jsx-runtime/index.ts", "test/**/*.test.ts"],
            project: ["src/**/*.ts", "src/**/*.tsx", "components/**/*.tsx", "test/**/*.ts"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: [
                // Playwright for browser tests
                "playwright",
            ],
        },

        // @pupt/cli - CLI tool
        pupt: {
            entry: ["src/index.ts", "src/cli.ts", "test/**/*.test.ts"],
            project: ["src/**/*.ts", "test/**/*.ts"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
        },

        // @pupt/react - React component library
        "pupt-react": {
            entry: ["src/index.ts", "test/**/*.test.ts", "test/**/*.test.tsx"],
            project: ["src/**/*.ts", "src/**/*.tsx", "test/**/*.ts", "test/**/*.tsx"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: [
                // Playwright for browser tests
                "playwright",
            ],
        },

        // @pupt/sde - SDE prompt collection
        "pupt-sde": {
            entry: ["test/**/*.test.mjs"],
            project: ["test/**/*.mjs"],
            ignore: ["node_modules/**"],
        },
    },

    // Global ignore patterns
    ignore: ["**/dist/**", "**/coverage/**", "**/node_modules/**", "**/.nx/**", "**/docs/**"],
};

export default config;
