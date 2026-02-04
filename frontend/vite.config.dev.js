import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    minify: false,
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-dev.js',
        chunkFileNames: 'assets/[name]-dev.js'
      }
    }
  }
});
