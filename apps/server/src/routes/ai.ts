import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { auth } from '../security';
import { parseDocument } from '../validation';
import { aiStatus, generateSection, generateSite, generateText, improveDesign } from '../services/ai';

export const aiRoutes = Router();
aiRoutes.use(auth);
const limit = rateLimit({ windowMs: 60000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'AI request limit reached. Try again in a minute.', code: 'RATE_LIMITED' } });
const prompt = z.string().trim().min(3).max(4000);
const language = z.enum(['pl', 'en']).default('pl');
aiRoutes.get('/status', (_req, res) => res.json(aiStatus()));
aiRoutes.post('/generate', limit, async (req, res) => {
  const body = z.object({ prompt, language, mode: z.enum(['website', 'section']), document: z.unknown().optional() }).strict().parse(req.body);
  res.json(body.mode === 'website' ? await generateSite(body.prompt, body.language) : await generateSection(body.prompt, body.language));
});
aiRoutes.post('/design', limit, async (req, res) => {
  const body = z.object({ prompt, document: z.unknown() }).strict().parse(req.body);
  res.json(await improveDesign(body.prompt, parseDocument(body.document)));
});
aiRoutes.post('/text', limit, async (req, res) => {
  const body = z.object({ prompt, text: z.string().max(20000).default(''), action: z.enum(['generate', 'improve', 'seo']).default('improve'), language }).strict().parse(req.body);
  res.json(await generateText(body.prompt, body.text, body.action, body.language));
});