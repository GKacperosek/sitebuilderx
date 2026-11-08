import './config';
import { PrismaClient, Prisma } from '@prisma/client';
export const db = new PrismaClient();
export const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
export async function activity(userId: string, action: string, detail = '', projectId?: string) {
  return db.activity.create({ data: { userId, action, detail: detail.slice(0, 500), projectId } });
}
