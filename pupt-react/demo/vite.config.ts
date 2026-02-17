import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "path";
import { readFileSync } from "fs";
import { createRequire } from "module";

const nodeShim = resolve(__dirname, "src/shims/node.ts");
const require = createRequire(resolve(__dirname, "../package.json"));

/**
 * Reads the installed version of a package from node_modules.
 * Uses createRequire for pnpm-compatible resolution. Resolves the package's
 * main entry point, then walks up to find the package.json (works even when
 * the package's exports map doesn't expose package.json directly).
 */
function getInstalledVersion(pkg: string): string {
  const entryPath = require.resolve(pkg);
  let dir = dirname(entryPath);
  while (dir !== dirname(dir)) {
    try {
      const pkgJsonPath = resolve(dir, "package.json");
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf-8")) as { name?: string; version?: string };
      if (pkgJson.name === pkg) {
        return pkgJson.version!;
      }
    } catch {
      // no package.json at this level, keep walking up
    }
    dir = dirname(dir);
  }
  throw new Error(`Could not find package.json for ${pkg}`);
}

/**
 * Vite plugin that replaces version placeholders in index.html with the
 * actual installed versions from node_modules. This keeps the browser
 * import map (used for dynamic prompt evaluation) in sync with the
 * bundled dependency versions automatically.
 */
function importMapVersionPlugin(): Plugin {
  const versions: Record<string, string> = {
    __PUPT_LIB_VERSION__: getInstalledVersion("@pupt/lib"),
    __ZOD_VERSION__: getInstalledVersion("zod"),
  };

  return {
    name: "import-map-versions",
    transformIndexHtml(html) {
      return Object.entries(versions).reduce(
        (result, [placeholder, version]) => result.replaceAll(placeholder, version),
        html,
      );
    },
  };
}

export default defineConfig({
  root: resolve(__dirname),
  base: "/pupt-monorepo/demo/",
  plugins: [importMapVersionPlugin(), react()],
  resolve: {
    alias: [
      { find: "@pupt/react", replacement: resolve(__dirname, "../src/index.ts") },
      { find: "fs/promises", replacement: nodeShim },
      { find: "fs", replacement: nodeShim },
      { find: "os", replacement: nodeShim },
      { find: "path", replacement: nodeShim },
    ],
  },
  server: {
    host: true,
    fs: {
      allow: [
        resolve(__dirname),
        resolve(__dirname, ".."),
      ],
    },
    ...(process.env.SERVHERD_HOSTNAME ? { allowedHosts: [process.env.SERVHERD_HOSTNAME] } : {}),
    ...(process.env.HTTPS_CERT && process.env.HTTPS_KEY
      ? {
          https: {
            cert: readFileSync(process.env.HTTPS_CERT),
            key: readFileSync(process.env.HTTPS_KEY),
          },
        }
      : {}),
  },
  build: {
    outDir: resolve(__dirname, "../dist-demo"),
    emptyOutDir: true,
  },
});
