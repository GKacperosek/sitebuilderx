import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { auth } from '../security';
import { activityJSON } from '../serializers';

export const activityRoutes = Router();
activityRoutes.use(auth);
activityRoutes.get('/', async (req, res) => {
  const query = z.object({ limit: z.coerce.number().int().min(1).max(200).default(60), search: z.string().max(200).optional() }).parse(req.query);
  const activities = await db.activity.findMany({ where: { userId: req.user!.id, ...(query.search ? { OR: [{ detail: { contains: query.search, mode: 'insensitive' } }, { action: { contains: query.search, mode: 'insensitive' } }] } : {}) }, orderBy: { createdAt: 'desc' }, take: query.limit });
  res.json({ activities: activities.map(activityJSON) });
});