import './config';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { config } from './config';
import { db } from './db';
import { apiLimit, csrf, errorHandler, HttpError, loadSession } from './security';
import { authRoutes, accountRoutes } from './routes/auth';
import { projectRoutes, publicationRoutes } from './routes/projects';
import { mediaRoutes, serveUpload } from './routes/media';
import { aiRoutes } from './routes/ai';
import { domainRoutes } from './routes/domains';
import { analyticsRoutes } from './routes/analytics';
import { submissionRoutes } from './routes/submissions';
import { activityRoutes } from './routes/activity';
import { componentRoutes } from './routes/components';
import { publicRoutes } from './routes/public';
import { publishedByHost, publishedBySlug, serveSite } from './services/public';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', config.production ? 1 : false);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, strictTransportSecurity: config.production ? undefined : false }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(loadSession);

app.get('/api/health', async (_req, res) => { await db.$queryRaw`SELECT 1`; res.json({ status: 'ok', aiConfigured: !!config.geminiKey, smtpConfigured: !!config.smtpHost }); });
app.use('/api', apiLimit, csrf);
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/publications', publicationRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/components', componentRoutes);
app.use('/api/public', publicRoutes);
app.get('/uploads/:filename', serveUpload);

const localHosts = new Set(['localhost', '127.0.0.1', '[::1]', new URL(config.publicUrl).hostname, new URL(config.appUrl).hostname]);
app.use(async (req, res, next) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) return next();
    if (req.path.startsWith('/sites/')) {
      const match = /^\/sites\/([a-z0-9-]+)(\/.*)?$/.exec(req.path);
      if (!match) throw new HttpError(404, 'Published website not found');
      const project = await publishedBySlug(match[1]);
      if (!project) throw new HttpError(404, 'Published website not found');
      serveSite(project, match[2] || '', res, `${req.protocol}://${req.get('host')}/sites/${match[1]}/`);
      return;
    }
    const host = req.hostname.toLowerCase();
    if (!localHosts.has(host)) {
      const project = await publishedByHost(host);
      if (project) { serveSite(project, req.path, res, `${req.protocol}://${req.get('host')}/`); return; }
    }
    next();
  } catch (error) { next(error); }
});

if (existsSync(path.join(config.webDist, 'index.html'))) {
  app.use(express.static(config.webDist, { index: false, maxAge: config.production ? '1h' : 0 }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path.startsWith('/uploads/') || req.path.startsWith('/sites/')) return next();
    res.sendFile(path.join(config.webDist, 'index.html'));
  });
}
app.use((req, res) => { res.status(404).json({ error: req.path.startsWith('/api/') ? 'Endpoint not found' : 'Not found' }); });
app.use(errorHandler);

await mkdir(config.uploads, { recursive: true });
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