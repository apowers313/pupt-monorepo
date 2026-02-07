import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { readFileSync } from "fs";

const nodeShim = resolve(__dirname, "src/shims/node.ts");

export default defineConfig({
  root: resolve(__dirname),
  base: "/pupt-react/",
  plugins: [react()],
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
