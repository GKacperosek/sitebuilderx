import type { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { User, Session } from '@prisma/client';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { db } from './db';
import { config } from './config';

declare global { namespace Express { interface Request { user?: User; session?: Session } } }
export class HttpError extends Error { constructor(public status: number, message: string, public code?: string) { super(message); } }
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export function constantEqual(a: string, b: string) { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export const cookieName = config.production ? '__Host-sbx-session' : 'sbx-session';
export const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: config.production, path: '/' };
export async function createSession(req: Request, res: Response, userId: string) {
  const raw = token();
  const expiresAt = new Date(Date.now() + config.sessionDays * 86400000);
  await db.session.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  const active = await db.session.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: 19, select: { id: true } });
  if (active.length) await db.session.deleteMany({ where: { id: { in: active.map(s => s.id) } } });
  await db.session.create({ data: { userId, tokenHash: hashToken(raw), userAgent: (req.get('user-agent') || 'Unknown').slice(0, 500), expiresAt } });
  res.cookie(cookieName, raw, { ...cookieOptions, expires: expiresAt });
}
export async function loadSession(req: Request, res: Response, next: NextFunction) {
  try {
    const raw = req.cookies?.[cookieName];
    if (typeof raw === 'string' && /^[A-Za-z0-9_-]{43}$/.test(raw)) {
      const session = await db.session.findUnique({ where: { tokenHash: hashToken(raw) }, include: { user: true } });
      if (session && session.expiresAt > new Date()) {
        req.user = session.user; req.session = session;
        if (Date.now() - session.lastSeenAt.getTime() > 60000) await db.session.updateMany({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
      } else res.clearCookie(cookieName, cookieOptions);
    }
    next();
  } catch (error) { next(error); }
}
export function auth(req: Request, _res: Response, next: NextFunction) { if (!req.user) return next(new HttpError(401, 'Authentication required', 'UNAUTHENTICATED')); next(); }
export function isAllowedOrigin(value: string, extras: string[] = []): boolean {
  try {
    const u = new URL(value);
    if (u.origin !== value || u.username || u.password) return false;
    if ([config.appUrl, config.publicUrl, ...extras].includes(u.origin)) return true;
    return !config.production && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) && ['http:', 'https:'].includes(u.protocol);
  } catch { return false; }
}
export function csrf(req: Request, _res: Response, next: NextFunction) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  // Published forms and telemetry perform their own snapshot/domain origin checks.
  if (req.path.startsWith('/api/public/')) return next();
  let origin = req.get('origin');
  if (!origin && req.get('referer')) { try { origin = new URL(req.get('referer')!).origin; } catch { /* reject below */ } }
  const host = req.get('host');
  const selfOrigin = host ? `${req.protocol}://${host}` : '';
  if (!origin || !isAllowedOrigin(origin, selfOrigin ? [selfOrigin] : []) || req.get('sec-fetch-site') === 'cross-site') return next(new HttpError(403, 'Untrusted request origin', 'CSRF_REJECTED'));
  next();
}
export const apiLimit = rateLimit({ windowMs: 60000, limit: 240, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many requests', code: 'RATE_LIMITED' } });
export const authLimit = rateLimit({ windowMs: 15 * 60000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many authentication attempts', code: 'RATE_LIMITED' } });
export function errorHandler(error: any, _req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;
  if (error instanceof ZodError) { res.status(400).json({ error: error.issues.slice(0, 3).map(i => `${i.path.join('.') || 'body'}: ${i.message}`).join('; '), code: 'VALIDATION_ERROR' }); return; }
  if (error instanceof HttpError) { res.status(error.status).json({ error: error.message, ...(error.code ? { code: error.code } : {}) }); return; }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') { res.status(409).json({ error: 'This value is already in use', code: 'CONFLICT' }); return; }
    if (error.code === 'P2025') { res.status(404).json({ error: 'Not found' }); return; }
    if (error.code === 'P2034') { res.status(409).json({ error: 'Concurrent update; retry your request', code: 'REVISION_CONFLICT' }); return; }
  }
  if (error?.code === 'LIMIT_FILE_SIZE') { res.status(413).json({ error: 'Each file must be at most 10 MB' }); return; }
  if (typeof error?.code === 'string' && error.code.startsWith('LIMIT_')) { res.status(400).json({ error: 'Upload limits exceeded' }); return; }
  if (error?.type === 'entity.too.large') { res.status(413).json({ error: 'Request body too large' }); return; }
  if (error instanceof SyntaxError && 'body' in error) { res.status(400).json({ error: 'Invalid JSON' }); return; }
  console.error('Request failed', error instanceof Error ? error.name : 'Unknown error');
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
