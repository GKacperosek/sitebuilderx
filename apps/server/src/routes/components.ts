import { Router } from 'express';
import { z } from 'zod';
import { db, activity } from '../db';
import { auth, HttpError } from '../security';
import { componentJSON } from '../serializers';
import { nameSchema, parseSpec } from '../validation';

export const componentRoutes = Router();
componentRoutes.use(auth);
componentRoutes.get('/', async (req, res) => {
  const components = await db.savedComponent.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' } });
  res.json({ components: components.map(componentJSON) });
});
componentRoutes.post('/', async (req, res) => {
  const body = z.object({ name: nameSchema, spec: z.unknown() }).strict().parse(req.body);
  const spec = parseSpec(body.spec);
  if (await db.savedComponent.count({ where: { userId: req.user!.id } }) >= 200) throw new HttpError(422, 'Maximum 200 saved components');
  const component = await db.savedComponent.create({ data: { userId: req.user!.id, name: body.name, spec: JSON.parse(JSON.stringify(spec)) } });
  await activity(req.user!.id, 'component.saved', body.name);
  res.status(201).json({ component: componentJSON(component) });
});
componentRoutes.delete('/:id', async (req, res) => {
  const deleted = await db.savedComponent.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  if (!deleted.count) throw new HttpError(404, 'Component not found');
  res.json({ success: true });
});