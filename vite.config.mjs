import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

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
  },
  plugins: [
    {
      name: 'copy-foundry-files',
      writeBundle() {
        const root = process.cwd();
        const distDir = resolve(root, 'dist');
        const srcDir = resolve(root, 'src');
        
        const langDir = resolve(srcDir, 'lang');
        if (fs.existsSync(langDir)) {
          const distLangDir = resolve(distDir, 'lang');
          if (!fs.existsSync(distLangDir)) {
            fs.mkdirSync(distLangDir, { recursive: true });
          }
          const files = fs.readdirSync(langDir);
          for (const file of files) {
            fs.copyFileSync(resolve(langDir, file), resolve(distLangDir, file));
          }
        }

        console.log('✓ Foundry module structure ready in dist/');
      }
    }
  ]
});
