import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {port: Number(process.env.WEB_PORT || 5173), strictPort: true, fs: {allow: [path.resolve('../..')]}, proxy: {'/api': 'http://127.0.0.1:4000', '/uploads': 'http://127.0.0.1:4000', '/sites': 'http://127.0.0.1:4000'}},
  build: {outDir: 'dist', chunkSizeWarningLimit: 1800},
});
