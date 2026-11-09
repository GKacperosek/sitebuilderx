import { app } from '../apps/server/dist-vercel/app.js';

// Vercel Serverless Function entry point. The Express app is pre-bundled into a single
// self-contained ESM file by `npm run build:vercel` (tsup) during the Vercel build,
// because the Vercel Node runtime does not transpile extensionless local .ts imports.
// Importing the emitted .js with an explicit extension resolves cleanly at runtime.
// The Express app is a (req, res) listener, exactly the handler signature Vercel invokes.
export default app;