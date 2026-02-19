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
                // Semantic release plugins (used by nx release and child packages)
                "@semantic-release/changelog",
                "@semantic-release/git",
                "semantic-release",
                // Commitizen tools (used via git cz / npm run commit)
                "conventional-changelog-conventionalcommits",
            ],
        },

        // @pupt/lib - core JSX prompt library
        "pupt-lib": {
            entry: ["src/index.ts", "src/jsx-runtime/index.ts", "test/**/*.test.ts"],
            project: ["src/**/*.ts", "components/**/*.tsx", "test/**/*.ts"],
            ignore: ["dist/**", "coverage/**", "node_modules/**", "test/fixtures/**"],
            ignoreDependencies: [
                // Mock package used in tests
                "fake-npm-package",
            ],
        },

        // @pupt/cli - CLI tool
        pupt: {
            entry: ["test/**/*.test.ts"],
            project: ["src/**/*.ts", "test/**/*.ts"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: [
                // Dynamically loaded by pino as a transport target string
                "pino-pretty",
            ],
        },

        // @pupt/react - React component library
        "pupt-react": {
            entry: ["test/**/*.test.ts", "test/**/*.test.tsx"],
            project: ["src/**/*.ts", "src/**/*.tsx", "test/**/*.ts", "test/**/*.tsx"],
            ignore: ["dist/**", "coverage/**", "node_modules/**", "demo/**"],
            // Disable vite plugin (demo/vite.config.ts has deps not in this workspace)
            vite: false,
            ignoreDependencies: [
                // Used in demo/ which is excluded from knip
                "@monaco-editor/react",
                "@tabler/icons-react",
                // Used in vite.config.ts
                "vite-plugin-dts",
            ],
        },

        // @pupt/sde-prompts - SDE prompt collection
        "pupt-sde-prompts": {
            entry: ["test/**/*.test.mjs"],
            project: ["test/**/*.mjs"],
            ignore: ["node_modules/**"],
        },

        // @pupt/test - Testing utilities
        "pupt-test": {
            entry: ["test/**/*.test.ts"],
            project: ["src/**/*.ts", "test/**/*.ts"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: [
                // vitest is an optional peer dep - suite.ts imports it for consumers
                "vitest",
            ],
        },
    },

    // Global ignore patterns
    ignore: ["**/dist/**", "**/coverage/**", "**/node_modules/**", "**/.nx/**", "**/docs/**"],

    // Exclude issue types that aren't meaningful for this codebase:
    // - exports/types: libraries expose public API for external consumers
    // - enumMembers: enum values are part of the API surface
    exclude: ["exports", "types", "enumMembers"],

    // Don't report exports that are used within the same file
    ignoreExportsUsedInFile: {
        enum: true,
        type: true,
        interface: true,
    },
};

export default config;
