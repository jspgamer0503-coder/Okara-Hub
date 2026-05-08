import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    strictPort: false,   // Allow fallback to next port if 5173 is taken
    host: 'localhost',
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
