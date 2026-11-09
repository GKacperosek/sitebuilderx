import { defineConfig } from 'tsup';

// Builds the Express app (no listen side effects) into ONE self-contained ESM file
// for the Vercel Serverless Function. Run from apps/server so tsup externalizes this
// package's node_modules dependencies (express, prisma, ...) and only bundles our
// workspace TypeScript (@sitebuilder/shared). The Vercel Node runtime does not
// transpile extensionless local .ts imports, so api/index.ts imports this emitted .js.
export default defineConfig({
  entry: { app: 'src/app.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist-vercel',
  splitting: false,
  noExternal: ['@sitebuilder/shared'],
  clean: true,
  dts: false,
  sourcemap: false,
});