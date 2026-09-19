import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { normalizeEmail } from '../public/wallet-core.js';

export const COOKIE = 'mw_session';
const LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function randomToken() {
  return randomBytes(32).toString('hex');
}

export function now() {
  return Date.now();
}

export function iso(ms = Date.now()) {
  return new Date(ms).toISOString();
}

function consumeRate(db, key, limit, windowMs, at = now()) {
  const row = db.prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?').get(key);
  if (!row || row.reset_at <= at) {
    db.prepare('INSERT OR REPLACE INTO rate_limits(key, count, reset_at) VALUES (?, ?, ?)').run(key, 1, at + windowMs);
    return;
  }
  if (row.count >= limit) throw new Error('Please wait a minute before requesting another sign-in link.');
  db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').run(key);
}

export function requestMagicLink(db, emailRaw, { at = now() } = {}) {
  const email = normalizeEmail(emailRaw);
  consumeRate(db, `magic:${email}`, 5, LINK_TTL_MS, at);
  const token = randomToken();
  db.prepare('INSERT INTO magic_links(token_hash, email, expires_at) VALUES (?, ?, ?)').run(hashToken(token), email, at + LINK_TTL_MS);
  return { email, token, expiresAt: at + LINK_TTL_MS };
}

export function consumeMagicLink(db, token, { at = now() } = {}) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 128) {
    throw new Error('This sign-in link is invalid.');
  }
  const hash = hashToken(token);
  const row = db.prepare('SELECT email, expires_at, used_at FROM magic_links WHERE token_hash = ?').get(hash);
  if (!row || row.used_at || row.expires_at <= at) throw new Error('This sign-in link is invalid or has expired.');
  db.prepare('UPDATE magic_links SET used_at = ? WHERE token_hash = ?').run(iso(at), hash);
  let user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(row.email);
  if (!user) {
    user = { id: crypto.randomUUID(), email: row.email };
    db.prepare('INSERT INTO users(id, email, created_at) VALUES (?, ?, ?)').run(user.id, user.email, iso(at));
  }
  const sessionToken = randomToken();
  db.prepare('INSERT INTO sessions(token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    hashToken(sessionToken), user.id, at + SESSION_TTL_MS, iso(at)
  );
  return { user, sessionToken, expiresAt: at + SESSION_TTL_MS };
}

export function sessionFromCookie(db, cookieHeader, { at = now() } = {}) {
  const token = readCookie(cookieHeader, COOKIE);
  if (!token) return null;
  const row = db.prepare(`
    SELECT sessions.expires_at AS expires_at, users.id AS id, users.email AS email
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
  `).get(hashToken(token));
  if (!row || row.expires_at <= at) return null;
  return { id: row.id, email: row.email };
}

export function signOut(db, cookieHeader) {
  const token = readCookie(cookieHeader, COOKIE);
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function readCookie(header, name) {
  if (!header) return '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

export function sessionCookie(token, { secure = false, maxAgeSec = SESSION_TTL_MS / 1000 } = {}) {
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAgeSec)}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

export function clearSessionCookie({ secure = false } = {}) {
  return sessionCookie('deleted', { secure, maxAgeSec: 0 });
}

export function cookiesEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}
