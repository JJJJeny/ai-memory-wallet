import {
  buildInstructionPackage,
  cardTypeLabel,
  EXAMPLE_CARDS,
  exportPayload,
  filterCards,
} from './wallet-core.js';

const root = document.getElementById('app');
const toastEl = document.getElementById('toast');
const apiBase = (window.MEMORY_WALLET_CONFIG?.apiBase || '').replace(/\/$/, '');

const state = {
  ready: false,
  apiUp: false,
  status: null,
  user: null,
  cards: [],
  query: '',
  selected: new Set(),
  dialog: null,
  notice: '',
  error: '',
  loading: false,
};

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && typeof options.body !== 'string') {
    headers['Content-Type'] = 'application/json';
    options = { ...options, body: JSON.stringify(options.body) };
  }
  const response = await fetch(`${apiBase}${path}`, { credentials: 'same-origin', ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

async function refreshCards() {
  const data = await api('/api/cards');
  state.cards = data.cards;
}

function filtered() {
  return filterCards(state.cards, { query: state.query });
}

function previewText() {
  return buildInstructionPackage(state.cards, [...state.selected]);
}

function openDialog(dialog) {
  state.dialog = dialog;
  render();
  queueMicrotask(() => document.querySelector('.dialog [data-focus]')?.focus());
}

function closeDialog() {
  state.dialog = null;
  render();
}

function cardForm(card = {}, extras = '') {
  return `
    <form id="card-form">
      <div class="field">
        <label for="source-text">Paste notes or describe the card</label>
        <textarea id="source-text" name="sourceText" data-focus placeholder="Example: Be concise. Ask before rewriting. Or paste a conversation snippet.">${escapeHtml(card.sourceText || '')}</textarea>
        <p class="hint">Saving stores only the fields below. Asking AI to draft sends this text to the model you configured on the server.</p>
      </div>
      <div class="field">
        <label for="title">Title</label>
        <input id="title" name="title" type="text" maxlength="120" required value="${escapeHtml(card.title || '')}">
      </div>
      <div class="field">
        <span class="label">Type</span>
        <div class="row">
          <label class="choice"><input type="radio" name="type" value="preference" ${card.type !== 'workflow' ? 'checked' : ''}> Preference — how AI should work with me</label>
          <label class="choice"><input type="radio" name="type" value="workflow" ${card.type === 'workflow' ? 'checked' : ''}> Skill — reusable steps for a recurring task</label>
        </div>
      </div>
      <div class="field">
        <label for="whenToUse">When to use</label>
        <input id="whenToUse" name="whenToUse" type="text" maxlength="500" value="${escapeHtml(card.whenToUse || '')}">
      </div>
      <div class="field">
        <label for="instructions">Instructions</label>
        <textarea id="instructions" name="instructions" required maxlength="20000">${escapeHtml(card.instructions || '')}</textarea>
      </div>
      <div class="field">
        <label for="inputs">Optional inputs for a workflow</label>
        <input id="inputs" name="inputs" type="text" maxlength="4000" value="${escapeHtml(card.inputs || '')}" placeholder="For example: draft email, interview notes">
      </div>
      ${extras}
      <p class="error" id="form-error" hidden></p>
      <div class="row">
        <button class="btn btn-primary" type="submit">${card.id ? 'Save changes' : 'Save card'}</button>
        <button class="btn" type="button" id="ask-ai">Ask AI to draft</button>
        <button class="btn btn-ghost" type="button" id="cancel-dialog">Cancel</button>
      </div>
    </form>
  `;
}

function readForm(form) {
  const data = new FormData(form);
  return {
    sourceText: data.get('sourceText') || '',
    title: data.get('title') || '',
    type: data.get('type'),
    whenToUse: data.get('whenToUse') || '',
    instructions: data.get('instructions') || '',
    inputs: data.get('inputs') || '',
  };
}

function fillForm(form, card) {
  form.title.value = card.title || '';
  form.querySelector(`input[name="type"][value="${card.type}"]`)?.click();
  form.whenToUse.value = card.whenToUse || '';
  form.instructions.value = card.instructions || '';
  form.inputs.value = card.inputs || '';
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return { ok: true, method: 'clipboard' };
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    if (ok) return { ok: true, method: 'fallback' };
    return { ok: false, method: 'manual' };
  }
}

function landing(apiMissing) {
  return `
    <header class="top">
      <div class="brand"><strong>AI Memory Wallet</strong><span>Personal · copy and paste</span></div>
      <a class="btn" href="./prototype/">Old visual prototype</a>
    </header>
    <main id="main" class="main">
      <section class="hero">
        <h1>Save what worked. Bring it to your next AI conversation.</h1>
        <p>Keep two kinds of cards: preferences for how you want AI to work with you, and skills for recurring tasks. Select the ones you need, preview the exact text, and copy it into ChatGPT, Claude, or any other chat.</p>
        <p>This is a personal wallet. It does not create a team workspace, connect to those assistants, or change how a model behaves by itself.</p>
      </section>
      ${apiMissing ? `
        <div class="notice">
          This public page is only a landing page. It cannot store your private cards.
          Run the app on your computer or a host you control so sign-in and storage stay yours.
          Setup is in the README.
        </div>
      ` : `
        <div class="panel">
          <h2>Sign in with email</h2>
          <p class="hint">We send a one-time link. Locally, the link also appears on this page and in the server log.</p>
          <form id="signin-form">
            <div class="field">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" autocomplete="username" required data-focus>
            </div>
            <button class="btn btn-primary" type="submit">Email me a sign-in link</button>
          </form>
          <p id="signin-status" class="notice" hidden></p>
        </div>
      `}
      <ul class="landing-list">
        <li>Add a card yourself in a few fields. Nothing is auto-approved.</li>
        <li>If AI help is configured, it can suggest a card you still review and edit.</li>
        <li>Export JSON backups. Import never overwrites a card unless you choose replace.</li>
      </ul>
    </main>
  `;
}

function wallet() {
  const cards = filtered();
  const text = previewText();
  const selectedCount = state.selected.size;
  return `
    <header class="top">
      <div class="brand">
        <strong>My Wallet</strong>
        <span class="account">${escapeHtml(state.user.email)}</span>
      </div>
      <div class="row">
        <button class="btn" id="export-btn" type="button">Export</button>
        <button class="btn" id="import-btn" type="button">Import</button>
        <button class="btn" id="privacy-btn" type="button">Privacy</button>
        <button class="btn" id="signout-btn" type="button">Sign out</button>
      </div>
    </header>
    <main id="main" class="main wallet-main">
      ${state.notice ? `<p class="success">${escapeHtml(state.notice)}</p>` : ''}
      ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ''}
      <div class="toolbar">
        <p class="lede">Select cards, preview the exact text, then copy it into Claude or ChatGPT. Unselected cards stay out.</p>
        <div class="row toolbar-actions">
          <input class="search" type="search" id="search" placeholder="Search cards" value="${escapeHtml(state.query)}" aria-label="Search cards">
          <button class="btn btn-primary" id="add-btn" type="button">Add</button>
        </div>
      </div>
      <div class="wallet-layout">
        <section class="wallet-list" aria-label="My cards">
          ${!state.cards.length ? `
            <div class="empty">
              <p>Your wallet is empty. Add a preference or a skill, or add labeled examples you can delete anytime.</p>
              <div class="row">
                <button class="btn btn-primary" id="empty-add" type="button">Add</button>
                <button class="btn" id="add-examples" type="button">Add labeled examples</button>
              </div>
            </div>
          ` : cards.length ? `
            <div class="cards">
              ${cards.map((card) => `
                <article class="card ${state.selected.has(card.id) ? 'selected' : ''}">
                  <label class="select-row">
                    <input type="checkbox" data-select="${escapeHtml(card.id)}" ${state.selected.has(card.id) ? 'checked' : ''}>
                    <span>Select</span>
                  </label>
                  <div class="row">
                    <span class="pill ${card.type === 'preference' ? 'pill-pref' : 'pill-work'}">${cardTypeLabel(card.type)}</span>
                    ${card.isTemplate ? '<span class="pill pill-example">Example — not your data</span>' : ''}
                  </div>
                  <h2>${escapeHtml(card.title)}</h2>
                  <p>${escapeHtml(card.whenToUse || 'No “when to use” note yet')}</p>
                  <div class="card-actions">
                    <button class="btn" data-edit="${escapeHtml(card.id)}" type="button">Edit</button>
                    <button class="btn btn-primary" data-use="${escapeHtml(card.id)}" type="button">Use</button>
                    <button class="btn" data-dup="${escapeHtml(card.id)}" type="button">Duplicate</button>
                    <button class="btn btn-danger" data-del="${escapeHtml(card.id)}" type="button">Delete</button>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : `<div class="empty">No cards match this search.</div>`}
        </section>
        <aside class="preview-panel" id="preview-panel" aria-label="Preview">
          <div class="preview-head">
            <h2>Preview</h2>
            <p class="hint">${selectedCount
              ? `${selectedCount} selected · this is the exact text you will copy`
              : 'Select a card to see the exact text you will copy'}</p>
          </div>
          <textarea class="preview" id="package-text" ${text ? '' : 'disabled'} placeholder="Select one or more cards. Unselected cards are left out of this package.">${escapeHtml(text)}</textarea>
          <p class="notice" id="copy-status" hidden></p>
          <div class="row preview-actions">
            <button class="btn btn-primary" id="copy-btn" type="button" ${text ? '' : 'disabled'}>Copy</button>
            ${selectedCount ? `<button class="btn" id="improve-btn" type="button">Improve a saved card</button>` : ''}
          </div>
        </aside>
      </div>
    </main>
    <footer class="main footer">
      ${state.status?.ai?.enabled
        ? 'AI drafting is on. It only runs when you click Ask AI to draft, and it sends the text in that box.'
        : 'AI drafting is off. You can still add, edit, and copy cards by hand.'}
      Analytics are off. Connecting ChatGPT or Claude is a later idea — tonight, copy and paste.
    </footer>
  `;
}

function dialogHtml() {
  const dialog = state.dialog;
  if (!dialog) return '';
  if (dialog.type === 'card') {
    return `<div class="overlay" id="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="d-title">
      <h2 id="d-title">${dialog.card?.id ? 'Edit card' : 'Add card'}</h2>
      <p class="hint">Cards are saved only after you review the fields and click save.</p>
      ${cardForm(dialog.card || {})}
    </section></div>`;
  }
  if (dialog.type === 'improve') {
    return `<div class="overlay" id="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="d-title">
      <h2 id="d-title">Improve a card you just used</h2>
      <p class="hint">Change the saved card so the next copy is better. Nothing is sent anywhere.</p>
      <div class="choices">
        ${dialog.cards.map((card) => `<button class="btn" data-edit="${escapeHtml(card.id)}" type="button">${escapeHtml(card.title)}</button>`).join('')}
      </div>
      <div class="row"><button class="btn btn-ghost" id="cancel-dialog" type="button">Not now</button></div>
    </section></div>`;
  }
  if (dialog.type === 'import') {
    return `<div class="overlay" id="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="d-title">
      <h2 id="d-title">Import backup</h2>
      <p class="hint">Import never overwrites a card unless you choose Replace. Keep both makes a new card.</p>
      ${dialog.preview ? `
        <p>${dialog.preview.createCount} new cards can be added. ${dialog.preview.conflictCount} match cards you already have.</p>
        ${dialog.preview.conflicts.map((conflict) => `
          <fieldset class="field">
            <legend>${escapeHtml(conflict.existing.title)}</legend>
            <p class="hint">Incoming: ${escapeHtml(conflict.incoming.title)}</p>
            <label class="choice"><input type="radio" name="res-${escapeHtml(conflict.existing.id)}" value="skip" checked> Keep mine, skip import</label>
            <label class="choice"><input type="radio" name="res-${escapeHtml(conflict.existing.id)}" value="replace"> Replace mine</label>
            <label class="choice"><input type="radio" name="res-${escapeHtml(conflict.existing.id)}" value="keep-both"> Keep both</label>
          </fieldset>
        `).join('')}
        <div class="row">
          <button class="btn btn-primary" id="confirm-import" type="button">Import</button>
          <button class="btn btn-ghost" id="cancel-dialog" type="button">Cancel</button>
        </div>
      ` : `
        <input id="import-file" type="file" accept="application/json,.json">
        <div class="row"><button class="btn btn-ghost" id="cancel-dialog" type="button">Cancel</button></div>
      `}
    </section></div>`;
  }
  if (dialog.type === 'privacy') {
    return `<div class="overlay" id="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="d-title">
      <h2 id="d-title">Privacy and deletion</h2>
      <p>Your cards are stored in the database on the computer or host running this app, under your signed-in email. Another signed-in account cannot read or change them.</p>
      <p>Deleting a card removes it from this app’s database immediately. There is no recycle bin here. Your host may still have its own backups or logs. Export a JSON copy if you want your own backup.</p>
      <p>This app does not claim encryption-at-rest, SOC 2, HIPAA, or other compliance badges. Analytics are off. Optional AI runs only after you click Ask AI to draft.</p>
      <button class="btn" id="cancel-dialog" type="button">Close</button>
    </section></div>`;
  }
  return '';
}

function render() {
  if (!state.ready) {
    root.innerHTML = '<p class="banner">Loading…</p>';
    return;
  }
  root.innerHTML = (state.apiUp && state.user ? wallet() : landing(!state.apiUp)) + dialogHtml();
}

function bind() {
  document.getElementById('signin-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = document.getElementById('signin-status');
    status.hidden = false;
    status.textContent = 'Creating a sign-in link…';
    try {
      const result = await api('/api/auth/request', { method: 'POST', body: { email: event.target.email.value } });
      status.innerHTML = result.devConfirmUrl
        ? `${escapeHtml(result.message)} <a href="${escapeHtml(result.devConfirmUrl)}">Open sign-in link</a>`
        : escapeHtml(result.message);
    } catch (error) {
      status.className = 'error';
      status.textContent = error.message;
    }
  });

  document.getElementById('search')?.addEventListener('input', (event) => {
    state.query = event.target.value;
    const active = document.activeElement === event.target;
    render();
    if (active) {
      const next = document.getElementById('search');
      next?.focus();
      next?.setSelectionRange(state.query.length, state.query.length);
    }
  });

  document.getElementById('add-btn')?.addEventListener('click', () => openDialog({ type: 'card', card: {} }));
  document.getElementById('empty-add')?.addEventListener('click', () => openDialog({ type: 'card', card: {} }));
  document.getElementById('export-btn')?.addEventListener('click', async () => {
    const payload = exportPayload(state.cards);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ai-memory-wallet.json';
    link.click();
    URL.revokeObjectURL(url);
    toast('Exported a JSON backup to your downloads.');
  });
  document.getElementById('import-btn')?.addEventListener('click', () => openDialog({ type: 'import' }));
  document.getElementById('privacy-btn')?.addEventListener('click', () => openDialog({ type: 'privacy' }));
  document.getElementById('signout-btn')?.addEventListener('click', async () => {
    await api('/api/auth/signout', { method: 'POST' });
    state.user = null;
    state.cards = [];
    render();
  });
  document.getElementById('add-examples')?.addEventListener('click', async () => {
    try {
      for (const example of EXAMPLE_CARDS) await api('/api/cards', { method: 'POST', body: example });
      await refreshCards();
      state.notice = 'Added labeled examples. They are not your personal data. Delete any you do not want.';
      render();
    } catch (error) {
      state.error = error.message;
      render();
    }
  });

  document.querySelectorAll('[data-select]').forEach((box) => box.addEventListener('change', () => {
    if (box.checked) state.selected.add(box.dataset.select);
    else state.selected.delete(box.dataset.select);
    render();
  }));
  document.querySelectorAll('[data-use]').forEach((button) => button.addEventListener('click', () => {
    state.selected.add(button.dataset.use);
    render();
    document.getElementById('preview-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    document.getElementById('copy-btn')?.focus();
  }));
  document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => {
    const card = state.cards.find((item) => item.id === button.dataset.edit);
    if (card) openDialog({ type: 'card', card: { ...card } });
  }));
  document.querySelectorAll('[data-dup]').forEach((button) => button.addEventListener('click', async () => {
    await api(`/api/cards/${button.dataset.dup}/duplicate`, { method: 'POST' });
    await refreshCards();
    toast('Duplicated.');
    render();
  }));
  document.querySelectorAll('[data-del]').forEach((button) => button.addEventListener('click', async () => {
    const card = state.cards.find((item) => item.id === button.dataset.del);
    if (!card || !confirm(`Delete “${card.title}”? This removes it from this app immediately. Export first if you want a backup.`)) return;
    await api(`/api/cards/${button.dataset.del}`, { method: 'DELETE' });
    state.selected.delete(button.dataset.del);
    await refreshCards();
    toast('Deleted.');
    render();
  }));

  document.getElementById('overlay')?.addEventListener('mousedown', (event) => {
    if (event.target.id === 'overlay') closeDialog();
  });
  document.getElementById('cancel-dialog')?.addEventListener('click', closeDialog);
  document.getElementById('copy-btn')?.addEventListener('click', async () => {
    const text = document.getElementById('package-text').value;
    const result = await copyText(text);
    const status = document.getElementById('copy-status');
    status.hidden = false;
    if (result.ok) status.textContent = result.method === 'clipboard'
      ? 'Copied. Paste it into your next AI chat yourself. This app does not send it there.'
      : 'Copied using a backup method. Paste it into your next AI chat yourself.';
    else {
      status.className = 'notice';
      status.textContent = 'Copy permission was denied. The text is selected below — copy it with your keyboard.';
      document.getElementById('package-text').focus();
      document.getElementById('package-text').select();
    }
  });
  document.getElementById('improve-btn')?.addEventListener('click', () => {
    const used = state.cards.filter((card) => state.selected.has(card.id));
    if (used.length) openDialog({ type: 'improve', cards: used });
  });
  document.getElementById('card-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = readForm(event.target);
    const errorEl = document.getElementById('form-error');
    try {
      const current = state.dialog.card || {};
      if (current.id) await api(`/api/cards/${current.id}`, { method: 'PATCH', body: { ...values, source: current.source, isTemplate: current.isTemplate } });
      else await api('/api/cards', { method: 'POST', body: { ...values, source: 'manual' } });
      await refreshCards();
      closeDialog();
      toast('Card saved.');
    } catch (error) {
      errorEl.hidden = false;
      errorEl.textContent = error.message;
    }
  });
  document.getElementById('ask-ai')?.addEventListener('click', async () => {
    const form = document.getElementById('card-form');
    const errorEl = document.getElementById('form-error');
    errorEl.hidden = false;
    errorEl.className = 'notice';
    errorEl.textContent = 'Asking AI for a draft. Review it before saving. Nothing is stored yet.';
    try {
      const result = await api('/api/propose', { method: 'POST', body: { text: form.sourceText.value || form.instructions.value } });
      fillForm(form, result.proposal);
      errorEl.textContent = result.notice;
    } catch (error) {
      errorEl.className = 'error';
      errorEl.textContent = error.message;
    }
  });
  document.getElementById('import-file')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const preview = await api('/api/import/preview', { method: 'POST', body: { payload: JSON.parse(text) } });
      state.dialog = { type: 'import', preview, payload: JSON.parse(text) };
      render();
    } catch (error) {
      toast(error.message);
    }
  });
  document.getElementById('confirm-import')?.addEventListener('click', async () => {
    const resolutions = {};
    for (const conflict of state.dialog.preview.conflicts) {
      resolutions[conflict.existing.id] = document.querySelector(`input[name="res-${conflict.existing.id}"]:checked`)?.value;
    }
    try {
      const result = await api('/api/import', { method: 'POST', body: { payload: state.dialog.payload, resolutions } });
      await refreshCards();
      closeDialog();
      toast(`Imported ${result.created.length} new card(s). Replaced ${result.replaced.length}. Skipped ${result.skipped}.`);
    } catch (error) {
      toast(error.message);
    }
  });
}

const _render = render;
render = function patched() {
  _render();
  bind();
};

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.dialog) closeDialog();
});

async function boot() {
  try {
    state.status = await api('/api/status');
    state.apiUp = true;
    const me = await api('/api/me');
    state.user = me.user;
    if (state.user) await refreshCards();
    if (new URLSearchParams(location.search).get('signed-in') === '1') {
      state.notice = 'Signed in. Your cards stay on this host, not on the public landing page.';
      history.replaceState({}, '', '/');
    }
  } catch {
    state.apiUp = false;
  }
  state.ready = true;
  render();
}

boot();
