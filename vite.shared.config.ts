// Shared Vite configuration for the monorepo
// Package-specific configs should import and extend this

import { resolve } from "path";
import { defineConfig } from "vite";
import type { UserConfig } from "vite";

// Fixed port assignments to avoid conflicts (ports 9000-9099)
const PORT_ASSIGNMENTS: Record<string, number> = {
    "pupt-lib": 9000,
    "@pupt/lib": 9000,
    pupt: 9010,
    "@pupt/cli": 9010,
    "pupt-react": 9020,
    "@pupt/react": 9020,
};

export interface ViteConfigOptions {
    packageName: string;
    packagePath: string;
    entry?: string;
    external?: string[];
    globals?: Record<string, string>;
    port?: number;
}

export function createViteConfig(options: ViteConfigOptions): UserConfig {
    const {
        packageName,
        packagePath,
        entry = "src/index.ts",
        external = [],
        globals = {},
        port = PORT_ASSIGNMENTS[packageName] ?? 9090,
    } = options;

    return defineConfig({
        build: {
            lib: {
                entry: resolve(packagePath, entry),
                name: packageName,
                formats: ["es"],
                fileName: (format) => `${packageName}.${format === "es" ? "js" : "umd.js"}`,
            },
            rollupOptions: {
                external: [...external],
                output: {
                    globals: {
                        ...globals,
                    },
                },
            },
            sourcemap: true,
            target: "es2022",
            outDir: resolve(packagePath, "dist"),
        },
        server: {
            port,
            open: true,
        },
    });
}
