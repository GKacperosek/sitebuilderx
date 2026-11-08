import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { auth } from '../security';

export const analyticsRoutes = Router();
analyticsRoutes.use(auth);
analyticsRoutes.get('/', async (req, res) => {
  const query = z.object({ projectId: z.string().max(100).optional(), days: z.coerce.number().int().min(1).max(365).optional() }).parse(req.query);
  const projects = await db.project.findMany({ where: { userId: req.user!.id, deletedAt: null, ...(query.projectId ? { id: query.projectId } : {}) }, select: { id: true, name: true, publishedSlug: true } });
  const ids = projects.map(project => project.id);
  const since = query.days ? new Date(Date.now() - query.days * 86400000).toISOString().slice(0, 10) : undefined;
  const where = { projectId: { in: ids }, ...(since ? { date: { gte: since } } : {}) };
  const [views, visitorGroups, submissions, daily, pageGroups, deviceGroups, projectGroups] = await Promise.all([
    db.pageView.count({ where }),
    db.pageView.groupBy({ by: ['visitorHash'], where }),
    db.submission.count({ where: { projectId: { in: ids } } }),
    db.pageView.groupBy({ by: ['date'], where, _count: { id: true }, orderBy: { date: 'asc' } }),
    db.pageView.groupBy({ by: ['path'], where, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 10 }),
    db.pageView.groupBy({ by: ['device'], where, _count: { id: true } }),
    db.pageView.groupBy({ by: ['projectId'], where, _count: { id: true } }),
  ]);
  const dailyVisitors = await db.pageView.groupBy({ by: ['date', 'visitorHash'], where });
  const visitorsByDate = new Map<string, number>();
  for (const row of dailyVisitors) visitorsByDate.set(row.date, (visitorsByDate.get(row.date) || 0) + 1);
  res.json({
    totals: { views, visitors: visitorGroups.length, submissions, published: projects.filter(project => project.publishedSlug).length },
    daily: daily.map(row => ({ date: row.date, views: row._count.id, visitors: visitorsByDate.get(row.date) || 0 })),
    pages: pageGroups.map(row => ({ path: row.path, views: row._count.id })),
    devices: deviceGroups.map(row => ({ device: row.device, views: row._count.id })),
    projects: projectGroups.map(row => ({ id: row.projectId, name: projects.find(project => project.id === row.projectId)?.name || 'Project', views: row._count.id })),
  });
});