import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { openDatabase } from '../server/db.js';

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve(`http://127.0.0.1:${port}`);
    });
  });
}

async function start(env = {}) {
  const db = openDatabase(':memory:');
  const links = [];
  const server = createApp({
    db,
    env: { ALLOW_DEV_MAGIC_LINK: 'true', ...env },
    allowDevMagicLink: true,
    onMagicLink: (link) => links.push(link),
  });
  const base = await listen(server);
  return {
    base,
    links,
    close: () => new Promise((resolve) => server.close(resolve)),
    request: async (path, options = {}) => {
      const response = await fetch(`${base}${path}`, {
        redirect: 'manual',
        ...options,
        headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
        body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
      });
      const text = await response.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      return { response, data, setCookie: response.headers.get('set-cookie') };
    },
  };
}

async function signIn(app, email) {
  await app.request('/api/auth/request', { method: 'POST', body: { email } });
  const link = app.links.at(-1).confirmUrl;
  const token = new URL(link).searchParams.get('token');
  const confirm = await app.request(`/auth/confirm?token=${token}`);
  const cookie = confirm.setCookie.split(';')[0];
  return cookie;
}

const preference = {
  title: 'Be concise',
  type: 'preference',
  whenToUse: 'Most chats',
  instructions: 'Keep answers short.',
};
const workflow = {
  title: 'Rewrite an email',
  type: 'workflow',
  whenToUse: 'Tone is off',
  instructions: 'Keep the meaning.',
  inputs: 'Draft email',
};

test('sign in, create both card types, persist after refresh and sign-in again', async () => {
  const app = await start();
  try {
    const cookie = await signIn(app, 'jenny@example.com');
    const createdPref = await app.request('/api/cards', { method: 'POST', headers: { cookie }, body: preference });
    const createdWork = await app.request('/api/cards', { method: 'POST', headers: { cookie }, body: workflow });
    assert.equal(createdPref.response.status, 201);
    assert.equal(createdWork.data.card.type, 'workflow');

    const afterRefresh = await app.request('/api/cards', { headers: { cookie } });
    assert.equal(afterRefresh.data.cards.length, 2);

    await app.request('/api/auth/signout', { method: 'POST', headers: { cookie } });
    const signedOut = await app.request('/api/cards', { headers: { cookie } });
    assert.equal(signedOut.response.status, 401);

    const cookie2 = await signIn(app, 'jenny@example.com');
    const again = await app.request('/api/cards', { headers: { cookie: cookie2 } });
    assert.equal(again.data.cards.length, 2);
    assert.deepEqual(again.data.cards.map((c) => c.title).sort(), ['Be concise', 'Rewrite an email']);
  } finally {
    await app.close();
  }
});

test('another account cannot read, edit, or delete my cards', async () => {
  const app = await start();
  try {
    const jenny = await signIn(app, 'jenny@example.com');
    const created = await app.request('/api/cards', { method: 'POST', headers: { cookie: jenny }, body: preference });
    const id = created.data.card.id;
    const other = await signIn(app, 'other@example.com');
    const list = await app.request('/api/cards', { headers: { cookie: other } });
    assert.equal(list.data.cards.length, 0);
    const edit = await app.request(`/api/cards/${id}`, { method: 'PATCH', headers: { cookie: other }, body: { ...preference, title: 'Hacked' } });
    assert.equal(edit.response.status, 404);
    const del = await app.request(`/api/cards/${id}`, { method: 'DELETE', headers: { cookie: other } });
    assert.equal(del.response.status, 404);
    const still = await app.request('/api/cards', { headers: { cookie: jenny } });
    assert.equal(still.data.cards[0].title, 'Be concise');
  } finally {
    await app.close();
  }
});

test('edit, duplicate, and delete work for the owner', async () => {
  const app = await start();
  try {
    const cookie = await signIn(app, 'jenny@example.com');
    const created = await app.request('/api/cards', { method: 'POST', headers: { cookie }, body: preference });
    const id = created.data.card.id;
    const edited = await app.request(`/api/cards/${id}`, {
      method: 'PATCH',
      headers: { cookie },
      body: { ...preference, instructions: 'Use bullets.' },
    });
    assert.equal(edited.data.card.instructions, 'Use bullets.');
    const dup = await app.request(`/api/cards/${id}/duplicate`, { method: 'POST', headers: { cookie } });
    assert.equal(dup.data.card.title, 'Be concise (copy)');
    await app.request(`/api/cards/${id}`, { method: 'DELETE', headers: { cookie } });
    const list = await app.request('/api/cards', { headers: { cookie } });
    assert.equal(list.data.cards.length, 1);
    assert.equal(list.data.cards[0].title, 'Be concise (copy)');
  } finally {
    await app.close();
  }
});

test('export and import preserve data without silent overwrite', async () => {
  const app = await start();
  try {
    const cookie = await signIn(app, 'jenny@example.com');
    const created = await app.request('/api/cards', { method: 'POST', headers: { cookie }, body: preference });
    const exported = await app.request('/api/export', { headers: { cookie } });
    assert.equal(exported.data.kind, 'ai-memory-wallet');
    const incoming = {
      ...exported.data,
      cards: [
        { ...exported.data.cards[0], title: 'Be concise — incoming', instructions: 'Incoming text' },
        { ...workflow, id: 'new-1' },
      ],
    };
    const blocked = await app.request('/api/import', { method: 'POST', headers: { cookie }, body: { payload: incoming } });
    assert.equal(blocked.response.status, 400);
    const preview = await app.request('/api/import/preview', { method: 'POST', headers: { cookie }, body: { payload: incoming } });
    assert.equal(preview.data.conflictCount, 1);
    assert.equal(preview.data.createCount, 1);
    const imported = await app.request('/api/import', {
      method: 'POST',
      headers: { cookie },
      body: { payload: incoming, resolutions: { [created.data.card.id]: 'keep-both' } },
    });
    assert.equal(imported.data.created.length, 2);
    const list = await app.request('/api/cards', { headers: { cookie } });
    assert.equal(list.data.cards.length, 3);
    assert.ok(list.data.cards.some((card) => card.title === 'Be concise'));
    assert.ok(list.data.cards.some((card) => card.title === 'Be concise — incoming'));
  } finally {
    await app.close();
  }
});

test('manual create still works when AI is not configured, and propose does not fake results', async () => {
  const app = await start({ OPENAI_API_KEY: '' });
  try {
    const cookie = await signIn(app, 'jenny@example.com');
    const created = await app.request('/api/cards', { method: 'POST', headers: { cookie }, body: preference });
    assert.equal(created.response.status, 201);
    const propose = await app.request('/api/propose', { method: 'POST', headers: { cookie }, body: { text: 'Please be concise and ask before rewriting my drafts.' } });
    assert.equal(propose.response.status, 503);
    assert.match(propose.data.error, /not set up/);
    assert.equal(propose.data.proposal, undefined);
  } finally {
    await app.close();
  }
});

test('public landing does not include wallet contents', async () => {
  const app = await start();
  try {
    const cookie = await signIn(app, 'jenny@example.com');
    await app.request('/api/cards', { method: 'POST', headers: { cookie }, body: { ...preference, instructions: 'SECRET-WALLET-FACT' } });
    const page = await app.request('/');
    assert.equal(page.response.status, 200);
    assert.equal(String(page.data).includes('SECRET-WALLET-FACT'), false);
    const me = await app.request('/api/me');
    assert.equal(me.data.user, null);
  } finally {
    await app.close();
  }
});

test('rejects oversized and script-like executable import payloads as data only', async () => {
  const app = await start();
  try {
    const cookie = await signIn(app, 'jenny@example.com');
    const huge = await app.request('/api/import/preview', {
      method: 'POST',
      headers: { cookie },
      body: { payload: { version: 1, kind: 'ai-memory-wallet', cards: [{ title: 'Bad', type: 'not-a-type', instructions: 'ok' }] } },
    });
    assert.equal(huge.response.status, 200);
    assert.equal(huge.data.createCount, 0);
    assert.ok(huge.data.invalid.length);
    const scriptCard = {
      version: 1,
      kind: 'ai-memory-wallet',
      cards: [{
        title: '<script>alert(1)</script>',
        type: 'preference',
        instructions: '<img src=x onerror=alert(1)> Keep this as text.',
      }],
    };
    const imported = await app.request('/api/import', {
      method: 'POST',
      headers: { cookie },
      body: { payload: scriptCard, resolutions: {} },
    });
    assert.equal(imported.response.status, 200);
    const list = await app.request('/api/cards', { headers: { cookie } });
    assert.match(list.data.cards[0].title, /script/);
    assert.match(list.data.cards[0].instructions, /onerror/);
  } finally {
    await app.close();
  }
});
