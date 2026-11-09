import { app } from '../apps/server/src/app';

// Vercel Serverless Function entry point. The Express app is a (req, res) request
// listener, which is exactly the handler signature the Vercel Node runtime invokes.
// Platform routing (vercel.json) forwards /api/*, /uploads/* and /sites/* here while
// the built SPA is served statically. No app.listen() runs in the serverless environment.
export default app;