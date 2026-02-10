import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { readFileSync } from "fs";

const nodeShim = resolve(__dirname, "src/shims/node.ts");

/**
 * Reads the installed version of a package from node_modules.
 */
function getInstalledVersion(pkg: string): string {
  const pkgPath = resolve(__dirname, `../node_modules/${pkg}/package.json`);
  return JSON.parse(readFileSync(pkgPath, "utf-8")).version as string;
}

/**
 * Vite plugin that replaces version placeholders in index.html with the
 * actual installed versions from node_modules. This keeps the browser
 * import map (used for dynamic prompt evaluation) in sync with the
 * bundled dependency versions automatically.
 */
function importMapVersionPlugin(): Plugin {
  const versions: Record<string, string> = {
    __PUPT_LIB_VERSION__: getInstalledVersion("pupt-lib"),
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
  base: "/pupt-react/",
  plugins: [importMapVersionPlugin(), react()],
  resolve: {
    alias: [
      { find: "pupt-react", replacement: resolve(__dirname, "../src/index.ts") },
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
