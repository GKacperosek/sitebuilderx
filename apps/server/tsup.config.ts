import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'es2022',
  outDir: 'dist',
  splitting: false,
  // The shared package ships TypeScript source; bundle it so the ESM output runs on plain Node.
  noExternal: ['@sitebuilder/shared'],
  clean: true,
});