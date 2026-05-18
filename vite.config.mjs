import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: resolve(process.cwd(), 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'bundle.js'
    }
  },
  server: {
    open: false,
    watch: {
      usePolling: true
    }
  }
});
