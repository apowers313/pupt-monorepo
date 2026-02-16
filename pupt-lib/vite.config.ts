import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  resolve: {
    alias: {
      '@pupt/lib/jsx-runtime': resolve(__dirname, 'src/jsx-runtime/index.ts'),
      '@pupt/lib': resolve(__dirname, 'src/index.ts'),
    },
  },
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
      external: ['os', 'crypto', 'fs', 'fs/promises', 'path', 'url', 'module'],
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
      include: ['src/**/*', 'components/**/*'],
      outDir: 'dist',
    }),
  ],
});
