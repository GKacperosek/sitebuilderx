import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { db, activity, json } from '../db';
import { config } from '../config';
import { auth, authLimit, createSession, cookieName, cookieOptions, hashToken, token, HttpError } from '../security';
import { emailSchema, passwordSchema, nameSchema, settingsSchema, safeUrl } from '../validation';
import { userJSON } from '../serializers';
import { assertOwnedAssets } from '../services/projects';

export const authRoutes = Router();
const dummyHash = bcrypt.hashSync(token(), 12);
authRoutes.get('/me', (req, res) => res.json({ user: req.user ? userJSON(req.user) : null }));
authRoutes.post('/register', authLimit, async (req, res) => {
  const body = z.object({ email: emailSchema, password: passwordSchema, name: nameSchema }).strict().parse(req.body);
  const user = await db.user.create({ data: { email: body.email, name: body.name, passwordHash: await bcrypt.hash(body.password, 12) } });
  await createSession(req, res, user.id); await activity(user.id, 'account.registered');
  res.status(201).json({ user: userJSON(user) });
});
authRoutes.post('/login', authLimit, async (req, res) => {
  const body = z.object({ email: emailSchema, password: z.string().min(1).max(200) }).strict().parse(req.body);
  const user = await db.user.findUnique({ where: { email: body.email } });
  const valid = await bcrypt.compare(body.password, user?.passwordHash ?? dummyHash);
  if (!user || !valid) throw new HttpError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  if (req.session) await db.session.deleteMany({ where: { id: req.session.id } });
  await createSession(req, res, user.id); await activity(user.id, 'account.login');
  res.json({ user: userJSON(user) });
});
authRoutes.post('/logout', async (req, res) => {
  if (req.session) await db.session.deleteMany({ where: { id: req.session.id, userId: req.user!.id } });
  res.clearCookie(cookieName, cookieOptions).json({ success: true });
});
authRoutes.post('/forgot-password', authLimit, async (req, res) => {
  const { email } = z.object({ email: emailSchema }).strict().parse(req.body);
  if (!config.smtpHost || !config.smtpFrom || (config.smtpUser && !config.smtpPassword)) throw new HttpError(503, 'Password recovery is unavailable: SMTP is not configured', 'SMTP_UNAVAILABLE');
  const transporter = nodemailer.createTransport({ host: config.smtpHost, port: config.smtpPort, secure: config.smtpPort === 465, requireTLS: config.smtpPort !== 465, auth: config.smtpUser ? { user: config.smtpUser, pass: config.smtpPassword } : undefined, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 });
  try { await transporter.verify(); } catch { throw new HttpError(503, 'Password recovery email service is unavailable', 'SMTP_UNAVAILABLE'); }
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const raw = token();
    const reset = await db.$transaction(async tx => {
      await tx.passwordReset.deleteMany({ where: { userId: user.id } });
      return tx.passwordReset.create({ data: { userId: user.id, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 30 * 60000) } });
    });
    const link = `${config.appUrl}/reset-password?token=${encodeURIComponent(raw)}`;
    try { await transporter.sendMail({ from: config.smtpFrom, to: email, subject: 'SITEBUILDER X ULTRA — password reset / reset hasła', text: `Reset your password / Zresetuj hasło:\n${link}\n\nThis link expires in 30 minutes. / Link wygasa za 30 minut.\nIf you did not request this, ignore this email.` }); }
    catch { await db.passwordReset.deleteMany({ where: { id: reset.id } }); throw new HttpError(503, 'Password recovery email could not be delivered', 'SMTP_UNAVAILABLE'); }
  }
  transporter.close();
  res.json({ success: true, message: 'If an account exists, a recovery link has been sent.' });
});
authRoutes.post('/reset-password', authLimit, async (req, res) => {
  const body = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), password: passwordSchema }).strict().parse(req.body);
  const hashed = await bcrypt.hash(body.password, 12);
  const userId = await db.$transaction(async tx => {
    const reset = await tx.passwordReset.findUnique({ where: { tokenHash: hashToken(body.token) } });
    if (!reset || reset.expiresAt < new Date()) throw new HttpError(400, 'Invalid or expired recovery link', 'INVALID_RESET_TOKEN');
    const consumed = await tx.passwordReset.deleteMany({ where: { id: reset.id, expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) throw new HttpError(400, 'Invalid or expired recovery link');
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash: hashed } });
    await tx.passwordReset.deleteMany({ where: { userId: reset.userId } });
    await tx.session.deleteMany({ where: { userId: reset.userId } });
    return reset.userId;
  });
  await activity(userId, 'account.password-reset');
  res.clearCookie(cookieName, cookieOptions).json({ success: true });
});
authRoutes.post('/change-password', auth, authLimit, async (req, res) => {
  const body = z.object({ currentPassword: z.string().max(200), newPassword: passwordSchema }).strict().parse(req.body);
  if (!await bcrypt.compare(body.currentPassword, req.user!.passwordHash)) throw new HttpError(403, 'Current password is incorrect', 'INVALID_PASSWORD');
  const hashed = await bcrypt.hash(body.newPassword, 12);
  await db.$transaction(async tx => {
    const changed = await tx.user.updateMany({ where: { id: req.user!.id, passwordHash: req.user!.passwordHash }, data: { passwordHash: hashed } });
    if (!changed.count) throw new HttpError(409, 'Password changed concurrently; sign in again');
    await tx.session.deleteMany({ where: { userId: req.user!.id } });
    await tx.passwordReset.deleteMany({ where: { userId: req.user!.id } });
  });
  await createSession(req, res, req.user!.id); await activity(req.user!.id, 'account.password-changed');
  res.json({ success: true });
});
authRoutes.get('/sessions', auth, async (req, res) => {
  const sessions = await db.session.findMany({ where: { userId: req.user!.id, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: 'desc' } });
  res.json({ sessions: sessions.map(s => ({ id: s.id, userAgent: s.userAgent, createdAt: s.createdAt.toISOString(), lastSeenAt: s.lastSeenAt.toISOString(), current: s.id === req.session?.id })) });
});
authRoutes.delete('/sessions/:id', auth, async (req, res) => {
  const deleted = await db.session.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!deleted.count) throw new HttpError(404, 'Session not found');
  if (req.params.id === req.session!.id) res.clearCookie(cookieName, cookieOptions);
  res.json({ success: true });
});

export const accountRoutes = Router();
accountRoutes.use(auth);
accountRoutes.patch('/', async (req, res) => {
  const body = z.object({ name: nameSchema.optional(), avatar: z.string().max(2000).refine(v => safeUrl(v), 'Unsafe avatar URL').nullable().optional(), language: z.enum(['pl', 'en']).optional(), settings: settingsSchema.optional() }).strict().parse(req.body);
  if (body.avatar) await assertOwnedAssets(req.user!.id, { avatar: body.avatar });
  const user = await db.user.update({ where: { id: req.user!.id }, data: { ...body, settings: body.settings ? json(body.settings) : undefined } });
  await activity(user.id, 'account.updated'); res.json({ user: userJSON(user) });
});
accountRoutes.delete('/', authLimit, async (req, res) => {
  const { password } = z.object({ password: z.string().min(1).max(200) }).strict().parse(req.body);
  if (!await bcrypt.compare(password, req.user!.passwordHash)) throw new HttpError(403, 'Password is incorrect', 'INVALID_PASSWORD');
  const assets = await db.mediaAsset.findMany({ where: { userId: req.user!.id }, select: { filename: true } });
  await db.$transaction(async tx => {
    const removed = await tx.user.deleteMany({ where: { id: req.user!.id, passwordHash: req.user!.passwordHash } });
    if (!removed.count) throw new HttpError(409, 'Account changed; sign in again');
  });
  await Promise.all(assets.map(a => unlink(path.join(config.uploads, a.filename)).catch(() => undefined)));
  res.clearCookie(cookieName, cookieOptions).json({ success: true });
});
