import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(here, '..');
export const root = path.resolve(serverRoot, '../..');
dotenv.config({ path: path.join(root, '.env') });

function origin(value: string, fallback: string) {
  const parsed = new URL(value || fallback);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Invalid application URL');
  return parsed.origin;
}
const renderUrl = process.env.RENDER_EXTERNAL_URL || '';
export const config = {
  production: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 4000),
  appUrl: origin(process.env.APP_URL || renderUrl, 'http://localhost:5173'),
  publicUrl: origin(process.env.PUBLIC_URL || renderUrl, 'http://localhost:4000'),
  sessionDays: Math.min(90, Math.max(1, Number(process.env.SESSION_DAYS || 30))),
  uploads: path.join(serverRoot, 'storage/uploads'),
  webDist: path.resolve(serverRoot, '../web/dist'),
  geminiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.5-flash',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  smtpFrom: process.env.SMTP_FROM || '',
};
if (config.production && !config.appUrl.startsWith('https://')) throw new Error('APP_URL must use HTTPS in production');
