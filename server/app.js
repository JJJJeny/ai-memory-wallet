import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIMITS } from '../public/wallet-core.js';
import { aiStatus, proposeCard } from './ai.js';
import {
  clearSessionCookie,
  consumeMagicLink,
  requestMagicLink,
  sessionCookie,
  sessionFromCookie,
  signOut,
} from './auth.js';
import {
  commitImport,
  createCard,
  deleteCard,
  duplicateCard,
  listCards,
  previewImport,
  updateCard,
} from './cards.js';
import { openDatabase } from './db.js';
import { personalCards, savePersonal, reserveAIRequest, personalAI } from './personal.js';

const ROOT = resolve(fileURLToPath(new URL('../public', import.meta.url)));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; form-action 'self'",
    ...headers,
  });
  res.end(payload);
}

function fail(res, error, fallback = 400) {
  const status = error.code === 'ai_disabled' ? 503
    : /not found/i.test(error.message) ? 404
    : /wait a minute|expired|invalid/i.test(error.message) ? 400
    : fallback;
  send(res, status, { error: error.message, code: error.code || undefined });
}

async function readBody(req, max) {
  const type = req.headers['content-type'] || '';
  if (!type.includes('application/json')) throw new Error('Send JSON.');
  const declared = Number(req.headers['content-length'] || 0);
  if (declared > max) throw new Error('That request is too large.');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new Error('That request is too large.');
    chunks.push(chunk);
  }
  if (!size) throw new Error('The request was empty.');
  try { return { data: JSON.parse(Buffer.concat(chunks).toString('utf8')), bytes: size }; }
  catch { throw new Error('That JSON could not be read.'); }
}

function requireUser(db, req) {
  const user = sessionFromCookie(db, req.headers.cookie || '');
  if (!user) {
    const error = new Error('Sign in to continue.');
    error.code = 'auth_required';
    throw error;
  }
  return user;
}

function publicOrigin(req, fallbackOrigin) {
  const host = req.headers.host || '127.0.0.1:4173';
  const proto = req.headers['x-forwarded-proto'] === 'https' || fallbackOrigin.startsWith('https') ? 'https' : 'http';
  return `${proto}://${host}`;
}

function safeStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const clean = decoded === '/' ? '/index.html' : decoded;
  const resolved = resolve(join(ROOT, clean));
  if (!resolved.startsWith(ROOT)) return null;
  return resolved;
}

function serveStatic(req, res) {
  let file = safeStaticPath(req.url || '/');
  if (!file) return send(res, 400, { error: 'Invalid path.' });
  if (!existsSync(file)) {
    const asDir = join(file, 'index.html');
    if (existsSync(asDir)) file = asDir;
    else return send(res, 404, { error: 'Not found.' });
  }
  if (statSync(file).isDirectory()) {
    file = join(file, 'index.html');
    if (!existsSync(file)) return send(res, 404, { error: 'Not found.' });
  }
  const type = TYPES[extname(file)] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    'Cache-Control': extname(file) === '.html' ? 'no-store' : 'public, max-age=300',
  });
  createReadStream(file).pipe(res);
}

export function createApp(options = {}) {
  const db = options.db || openDatabase(options.dbPath || ':memory:');
  const env = options.env || process.env;
  const allowDevLink = options.allowDevMagicLink ?? env.ALLOW_DEV_MAGIC_LINK !== 'false';
  const secureCookie = options.secureCookie ?? env.NODE_ENV === 'production';
  const fallbackOrigin = options.origin || env.PUBLIC_ORIGIN || 'http://127.0.0.1:4173';

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const path = url.pathname;

      if (req.method === 'GET' && path === '/api/status') {
        return send(res, 200, {
          ok: true,
          ai: aiStatus(env),
          auth: { magicLink: true, google: false },
          persistence: 'sqlite',
          analytics: false,
          personal: true,
          localSignIn: allowDevLink,
        });
      }

      if (req.method === 'GET' && path === '/api/me') {
        const user = sessionFromCookie(db, req.headers.cookie || '');
        return send(res, 200, { user: user ? { email: user.email } : null });
      }

      if (req.method === 'POST' && path === '/api/auth/request') {
        const { data } = await readBody(req, LIMITS.jsonBodyBytes);
        const link = requestMagicLink(db, data.email);
        const confirmUrl = `${publicOrigin(req, fallbackOrigin)}/auth/confirm?token=${encodeURIComponent(link.token)}`;
        const payload = {
          ok: true,
          email: link.email,
          message: allowDevLink
            ? 'Local mode: use the link below. In production, this would arrive by email.'
            : 'If that email can sign in here, a link was created. Check your email.',
        };
        if (allowDevLink) payload.devConfirmUrl = confirmUrl;
        if (options.onMagicLink) options.onMagicLink({ email: link.email, confirmUrl });
        return send(res, 200, payload);
      }

      if (req.method === 'GET' && path === '/auth/confirm') {
        const { sessionToken } = consumeMagicLink(db, url.searchParams.get('token') || '');
        res.writeHead(302, {
          Location: '/?signed-in=1',
          'Set-Cookie': sessionCookie(sessionToken, { secure: secureCookie }),
          'Cache-Control': 'no-store',
        });
        return res.end();
      }

      if (req.method === 'POST' && path === '/api/auth/signout') {
        signOut(db, req.headers.cookie || '');
        return send(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie({ secure: secureCookie }) });
      }

      if (path === '/api/cards' && req.method === 'GET') {
        const user = requireUser(db, req);
        return send(res, 200, { cards: listCards(db, user.id) });
      }

      if (path === '/api/cards' && req.method === 'POST') {
        const user = requireUser(db, req);
        const { data } = await readBody(req, LIMITS.jsonBodyBytes);
        return send(res, 201, { card: createCard(db, user.id, data) });
      }

      if (path.startsWith('/api/cards/') && req.method === 'PATCH') {
        const user = requireUser(db, req);
        const id = decodeURIComponent(path.slice('/api/cards/'.length));
        const { data } = await readBody(req, LIMITS.jsonBodyBytes);
        return send(res, 200, { card: updateCard(db, user.id, id, data) });
      }

      if (path.startsWith('/api/cards/') && path.endsWith('/duplicate') && req.method === 'POST') {
        const user = requireUser(db, req);
        const id = decodeURIComponent(path.slice('/api/cards/'.length, -'/duplicate'.length));
        return send(res, 201, { card: duplicateCard(db, user.id, id) });
      }

      if (path.startsWith('/api/cards/') && req.method === 'DELETE') {
        const user = requireUser(db, req);
        const id = decodeURIComponent(path.slice('/api/cards/'.length));
        deleteCard(db, user.id, id);
        return send(res, 200, { ok: true });
      }

      if (path === '/api/export' && req.method === 'GET') {
        const user = requireUser(db, req);
        const { exportPayload } = await import('../public/wallet-core.js');
        return send(res, 200, exportPayload(listCards(db, user.id)));
      }

      if (path === '/api/import/preview' && req.method === 'POST') {
        const user = requireUser(db, req);
        const { data, bytes } = await readBody(req, LIMITS.importBytes);
        const preview = previewImport(db, user.id, data.payload ?? data, bytes);
        return send(res, 200, {
          createCount: preview.plan.create.length,
          conflictCount: preview.plan.conflicts.length,
          invalid: preview.invalid,
          create: preview.plan.create,
          conflicts: preview.plan.conflicts,
        });
      }

      if (path === '/api/import' && req.method === 'POST') {
        const user = requireUser(db, req);
        const { data, bytes } = await readBody(req, LIMITS.importBytes);
        const result = commitImport(db, user.id, data.payload ?? data, bytes, data.resolutions || {});
        return send(res, 200, result);
      }

      if (path === '/api/propose' && req.method === 'POST') {
        const user = requireUser(db, req);
        const { data } = await readBody(req, LIMITS.jsonBodyBytes);
        try {
          reserveAIRequest(db,user.id);
          const proposal = await proposeCard(data.text, env);
          return send(res, 200, { proposal, notice: 'Review this suggestion before saving. Nothing was stored yet.' });
        } catch (error) {
          return fail(res, error, error.code === 'ai_disabled' ? 503 : 502);
        }
      }

      if (path === '/api/personal/wallet') {
        const user=requireUser(db,req);
        if(req.method==='GET')return send(res,200,{items:personalCards(db,user.id)});
        if(req.method==='PUT'){
          const {data}=await readBody(req,1000000);
          return send(res,200,{items:savePersonal(db,user.id,data.items,data.previous)});
        }
      }
      if(path==='/api/personal/chat'&&req.method==='POST'){
        const user=requireUser(db,req);const {data}=await readBody(req,LIMITS.jsonBodyBytes);
        if(!['chat','remember'].includes(data.operation))throw Error('Invalid operation.');
        if(data.operation==='remember'){
          if(typeof data.text!=='string'||!data.text.trim()||data.text.length>12000)throw Error('Invalid excerpt.');
          reserveAIRequest(db,user.id);return send(res,200,await personalAI(env,{operation:'remember',text:data.text}));
        }
        if(!Array.isArray(data.messages)||!data.messages.length||data.messages.length>10||data.messages.at(-1).role!=='user'||data.messages.some(m=>!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>4000))throw Error('Invalid conversation.');
        if(!Array.isArray(data.selectedIds)||data.selectedIds.length>24||new Set(data.selectedIds).size!==data.selectedIds.length)throw Error('Invalid selection.');
        const owned=personalCards(db,user.id);const context=data.selectedIds.map(id=>{const item=owned.find(i=>i.id===id);if(!item)throw Error('Selected card not found.');return item;});
        reserveAIRequest(db,user.id);return send(res,200,await personalAI(env,{operation:'chat',messages:data.messages.map(({role,content})=>({role,content})),context}));
      }
      if (path.startsWith('/api/')) return send(res, 404, { error: 'Not found.' });
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Use GET.' });
      return serveStatic(req, res);
    } catch (error) {
      if (error.code === 'auth_required') return send(res, 401, { error: error.message, code: error.code });
      return fail(res, error);
    }
  });
}
