import 'dotenv/config';
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import pgClient from 'pg';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const portOpen = (port) => new Promise(resolve => { const socket = net.connect({ host: '127.0.0.1', port }); socket.once('connect', () => { socket.destroy(); resolve(true); }); socket.once('error', () => resolve(false)); });
async function reuseExisting(dbUrl, databaseDir) {
  const client = new pgClient.Client({ host: '127.0.0.1', port: Number(dbUrl.port || 55432), user: decodeURIComponent(dbUrl.username), password: decodeURIComponent(dbUrl.password), database: 'postgres', connectionTimeoutMillis: 4000 });
  try {
    await client.connect();
    const { rows } = await client.query("SELECT setting FROM pg_settings WHERE name='data_directory'");
    const running = path.resolve(String(rows[0]?.setting || ''));
    if (running !== path.resolve(databaseDir)) throw new Error(`Port ${dbUrl.port} is used by another PostgreSQL instance (data dir: ${running}). Stop it or change DATABASE_URL.`);
    const database = dbUrl.pathname.slice(1);
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [database]);
    if (!exists.rows.length) await client.query(`CREATE DATABASE "${database.replace(/"/g, '""')}"`);
    console.log(`Reusing PostgreSQL already running on 127.0.0.1:${dbUrl.port}`);
    return { stop: async () => {} };
  } finally { await client.end().catch(() => {}); }
}
export async function startPostgres() {
  const dbUrl = new URL(process.env.DATABASE_URL || 'postgresql://sitebuilder:sitebuilder_local_dev@127.0.0.1:55432/sitebuilder');
  const databaseDir = path.join(root, 'apps/server/storage/postgres');
  const port = Number(dbUrl.port || 55432);
  if (await portOpen(port)) return reuseExisting(dbUrl, databaseDir);
  const pg = new EmbeddedPostgres({ databaseDir, port, user: decodeURIComponent(dbUrl.username), password: decodeURIComponent(dbUrl.password), persistent: true, authMethod: 'scram-sha-256', autoRehydrateSymlinks: true, initdbFlags: ['--encoding=UTF8', '--locale=C'], postgresFlags: ['-h', '127.0.0.1'], onLog: message => { if (/ready to accept|database system is shut down/.test(String(message))) console.log(`[postgres] ${String(message).trim()}`); }, onError: message => console.error(`[postgres] ${String(message).trim()}`) });
  if (!existsSync(path.join(databaseDir, 'PG_VERSION'))) await pg.initialise();
  await pg.start();
  const client = pg.getPgClient(); await client.connect();
  try { const database = dbUrl.pathname.slice(1); const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [database]); if (!rows.length) await pg.createDatabase(database); } finally { await client.end(); }
  console.log(`PostgreSQL ready on 127.0.0.1:${dbUrl.port}`);
  return pg;
}
if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const pg = await startPostgres(); let closing = false;
  const close = async () => { if (closing) return; closing = true; await pg.stop(); process.exit(0); };
  process.on('SIGINT', close); process.on('SIGTERM', close);
}
