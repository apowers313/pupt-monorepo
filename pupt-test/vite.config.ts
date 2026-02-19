import { resolve } from "path";
import dts from "vite-plugin-dts";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        suite: resolve(__dirname, "src/suite.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "@pupt/lib",
        "vitest",
        "fs",
        "fs/promises",
        "path",
        "url",
      ],
      output: {
        entryFileNames: "[name].js",
      },
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
  },
  plugins: [
    dts({
      include: ["src/**/*"],
      outDir: "dist",
    }),
  ],
});
