import './config';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// On serverless hosts (Vercel) the filesystem and TCP connection pool are ephemeral,
// so talk to Neon through its HTTP/WebSocket driver adapter instead of a pooled TCP engine.
const connectionString = process.env.DATABASE_URL || '';
const useNeonAdapter = !!process.env.VERCEL || /neon\.tech/i.test(connectionString);
if (useNeonAdapter) neonConfig.webSocketConstructor = ws as any;
export const db = useNeonAdapter && connectionString
  ? new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })
  : new PrismaClient();
export const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
export async function activity(userId: string, action: string, detail = '', projectId?: string) {
  return db.activity.create({ data: { userId, action, detail: detail.slice(0, 500), projectId } });
}