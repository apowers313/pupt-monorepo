import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'jsx-runtime/index': resolve(__dirname, 'src/jsx-runtime/index.ts'),
        'jsx-runtime/jsx-dev-runtime': resolve(__dirname, 'src/jsx-runtime/jsx-dev-runtime.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['os', 'crypto', 'fs', 'fs/promises', 'path'],
      output: {
        preserveModules: false,
        entryFileNames: '[name].js',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
  },
  plugins: [
    dts({
      include: ['src/**/*'],
      outDir: 'dist',
    }),
  ],
});
