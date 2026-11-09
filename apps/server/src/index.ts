import { app } from './app';
import { db } from './db';
import { config } from './config';

// Standalone entry point (local dev, Railway, Render). Vercel uses api/index.ts instead.
await db.$connect();
const server = app.listen(config.port, () => console.log(`SITEBUILDER X ULTRA API ready on http://localhost:${config.port}`));
const cleanup = setInterval(() => { const now = new Date(); void db.session.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => undefined); void db.passwordReset.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => undefined); }, 3600000);
cleanup.unref();
let closing = false;
async function shutdown() {
  if (closing) return; closing = true; clearInterval(cleanup);
  server.close(); await db.$disconnect(); process.exit(0);
}
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);