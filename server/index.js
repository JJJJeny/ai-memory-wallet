import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from './app.js';
import { openDatabase } from './db.js';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);
const dataDir = resolve(process.env.DATA_DIR || new URL('../data', import.meta.url).pathname);
mkdirSync(dataDir, { recursive: true });

if (!process.env.SESSION_SECRET) {
  const secretFile = resolve(dataDir, '.session-secret');
  if (existsSync(secretFile)) process.env.SESSION_SECRET = readFileSync(secretFile, 'utf8').trim();
  else {
    process.env.SESSION_SECRET = crypto.randomUUID() + crypto.randomUUID();
    writeFileSync(secretFile, process.env.SESSION_SECRET, { mode: 0o600 });
  }
}

const db = openDatabase(process.env.DATABASE_PATH || resolve(dataDir, 'wallet.db'));
const server = createApp({
  db,
  allowDevMagicLink: process.env.ALLOW_DEV_MAGIC_LINK !== 'false',
  onMagicLink: ({ email, confirmUrl }) => {
    console.log(`Sign-in link for ${email}: ${confirmUrl}`);
  },
});

server.listen(port, host, () => {
  console.log(`AI Memory Wallet is running at http://${host}:${port}`);
  console.log('Cards stay on this computer or host. The public page does not include them.');
});
