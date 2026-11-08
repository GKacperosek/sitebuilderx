import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { auth, HttpError } from '../security';
import { submissionJSON } from '../serializers';

export const submissionRoutes = Router();
submissionRoutes.use(auth);
submissionRoutes.get('/', async (req, res) => {
  const query = z.object({ projectId: z.string().max(100).optional(), search: z.string().max(200).optional() }).parse(req.query);
  const submissions = await db.submission.findMany({ where: { project: { userId: req.user!.id, ...(query.projectId ? { id: query.projectId } : {}) }, ...(query.search ? { formName: { contains: query.search, mode: 'insensitive' } } : {}) }, include: { project: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 300 });
  res.json({ submissions: submissions.map(submission => ({ ...submissionJSON(submission), projectName: submission.project.name })) });
});
submissionRoutes.delete('/:id', async (req, res) => {
  const submission = await db.submission.findFirst({ where: { id: String(req.params.id), project: { userId: req.user!.id } } });
  if (!submission) throw new HttpError(404, 'Submission not found');
  await db.submission.deleteMany({ where: { id: submission.id } });
  res.json({ success: true });
});