import 'dotenv/config';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startPostgres } from './postgres.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = (relative) => path.join(root, 'node_modules', relative);
const children = [];
let pg;
let closing = false;
const run = (args) => new Promise((resolve, reject) => { const child = spawn(process.execPath, args, { stdio: 'inherit', env: process.env }); child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${args.join(' ')} exited with ${code}`))); });
async function close(code = 0) { if (closing) return; closing = true; for (const child of children) child.kill('SIGTERM'); if (pg) await pg.stop(); process.exit(code); }
process.on('SIGINT', () => close()); process.on('SIGTERM', () => close());
try {
  pg = await startPostgres();
  await run([bin('prisma/build/index.js'), 'generate', '--schema', 'apps/server/prisma/schema.prisma']);
  await run([bin('prisma/build/index.js'), 'db', 'push', '--schema', 'apps/server/prisma/schema.prisma']);
  const server = spawn(process.execPath, [bin('tsx/dist/cli.mjs'), 'watch', 'apps/server/src/index.ts'], { stdio: 'inherit', env: process.env });
  const web = spawn(process.execPath, [bin('vite/bin/vite.js'), '--host', '0.0.0.0', '--port', process.env.WEB_PORT || '5173'], { cwd: path.join(root, 'apps/web'), stdio: 'inherit', env: process.env });
  children.push(server, web);
  for (const child of children) child.once('exit', code => { if (!closing) close(code || 0); });
} catch (error) { console.error(error); await close(1); }
