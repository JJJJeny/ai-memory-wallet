import { STORAGE_KEY, TYPES, validateItem, parseBackup, mergeItems, selectedContext, contextPackage, saveIntent } from './personal-core.js';
const $ = selector => document.querySelector(selector);
const names = { skill: 'Skills', knowledge: 'Knowledge', preference: 'Preferences' };
const descriptions = { skill: 'Reusable know-how', knowledge: 'Context worth keeping', preference: 'How you like to work' };
const icons = { skill: '✧', knowledge: '▤', preference: '≋' };
let items = [], selection = new Set(), messages = [], busy = false, token = '', endpoint = '', storageBroken = false, toastTimer;
const node = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
const button = (text, action, cls = '') => { const el = node('button', text, cls); el.type = 'button'; el.addEventListener('click', action); return el; };
function toast(text) { $('#toast').textContent = text; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').textContent = '', 6500); }
try {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) { const parsed = JSON.parse(raw); if (!Array.isArray(parsed) || parsed.length > 200) throw Error(); items = parsed.map(item => { const clean = validateItem(item); if (typeof item.id !== 'string' || item.id.length > 80) throw Error(); return { ...clean, id: item.id, updatedAt: item.updatedAt }; }); if (new Set(items.map(i => i.id)).size !== items.length) throw Error(); }
  endpoint = localStorage.getItem('wallet.personal.endpoint') || window.MEMORY_WALLET_CONFIG?.apiBase || '';
} catch { storageBroken = true; toast('Saved data could not be loaded. It has not been overwritten. Export the original data from Settings before resetting.'); }
function persist(next) {
  if (storageBroken) throw Error('Storage needs recovery in Settings before saving.');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); items = next;
  selection = new Set([...selection].filter(id => items.some(i => i.id === id))); renderCards(); renderSelection();
}
window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) { storageBroken = true; toast('Your wallet changed in another tab. Refresh before editing to avoid overwriting it.'); } });
function modal(title, subtitle = '') {
  const dialog = $('#dialog'); dialog.replaceChildren();
  const head = node('div', undefined, 'dialog-head'), text = node('div');
  const heading = node('h2', title); heading.id = 'dialog-title'; text.append(heading, node('p', subtitle));
  head.append(text, button('×', () => dialog.close(), 'quiet')); head.lastChild.setAttribute('aria-label', 'Close');
  const body = node('div', undefined, 'dialog-body'); dialog.append(head, body);
  if (!dialog.open) dialog.showModal(); return body;
}
$('#dialog').addEventListener('click', event => { if (event.target === $('#dialog')) { const r = $('#dialog').getBoundingClientRect(); if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('#dialog').close(); } });
function field(label, tag = 'input', value = '') {
  const wrapper = node('label', label, 'field'), input = node(tag); input.setAttribute('aria-label', label); input.value = value; wrapper.append(input); return { wrapper, input };
}
function renderCards() {
  $('#item-count').textContent = `${items.length} saved ${items.length === 1 ? 'item' : 'items'} · Your personal way of working`;
  $('#cards').replaceChildren(...TYPES.map(type => {
    const list = items.filter(i => i.type === type), card = node('article', undefined, `category ${type}`), head = node('div', undefined, 'category-head'), title = node('div');
    title.append(node('h2', names[type]), node('p', descriptions[type])); head.append(node('span', icons[type], 'category-icon'), title, node('span', String(list.length), 'count'));
    const preview = node('div', undefined, 'card-preview');
    if (list.length) list.slice(0, 2).forEach(i => preview.append(node('div', `· ${i.title}`))); else preview.append(node('div', type === 'knowledge' ? 'Keep useful context close.' : `Save your first ${type}.`));
    card.append(head, preview, button('Open →', () => openCategory(type), 'link')); return card;
  }));
}
function openCategory(type) {
  const body = modal(names[type], descriptions[type]);
  const tools = node('div', undefined, 'row'); tools.append(button('+ Add new', () => editItem({ type }), 'primary'), button('Use a starter', () => editItem(templates[type])));
  const search = field('Search saved items'); search.input.type = 'search'; search.input.placeholder = 'Find something you saved…';
  const list = node('div'); const draw = () => {
    list.replaceChildren(); const matches = items.filter(i => i.type === type && `${i.title} ${i.text}`.toLowerCase().includes(search.input.value.toLowerCase()));
    if (!matches.length) list.append(node('p', 'No cards here yet. Add your own or edit a starter.', 'empty-list'));
    matches.forEach(item => {
      const row = node('article', undefined, 'item'), actions = node('div', undefined, 'item-actions');
      actions.append(button(selection.has(item.id) ? 'Selected ✓' : 'Use in chat', () => { toggle(item.id); draw(); }), button('Edit', () => editItem(item)), button('Duplicate', () => editItem({ ...item, id: undefined })), button('Delete', () => {
        if (!confirm(`Delete “${item.title}” from this browser? Exported backups are not deleted.`)) return;
        try { persist(items.filter(i => i.id !== item.id)); draw(); toast('Card deleted from this browser.'); } catch(e) { toast(e.message); }
      }, 'danger'));
      row.append(node('h3', item.title), node('p', item.text), actions); list.append(row);
    });
  }; search.input.oninput = draw; body.append(tools, search.wrapper, list); draw();
}
const templates = {
  skill: { type:'skill', title:'Review my landing page', text:'When I provide landing-page copy, review the audience, value proposition, call to action, and accessibility. Explain the three most important improvements first. Ask for missing information. Do not claim to inspect a live page unless you can access it.' },
  knowledge: { type:'knowledge', title:'My current project', text:'Replace this with your project goal, intended users, and important constraints. Only include information you are comfortable sending to an AI provider.' },
  preference: { type:'preference', title:'Clear, concise communication', text:'Be concise and use plain language. Preserve my intended meaning. Explain tradeoffs before recommending changes. Do not invent facts or metrics. Ask before rewriting an entire document.' }
};
function editItem(item = { type:'skill' }, proposal = false) {
  const body = modal(proposal ? 'Review before saving' : item.id ? 'Edit your card' : 'Add to your wallet', proposal ? 'Check the reusable content and remove sensitive or one-off details.' : 'Saved on this device. You choose when to include it in a chat.');
  const form = node('form'), category = field('Category', 'select');
  TYPES.forEach(type => { const option = node('option', names[type]); option.value = type; category.input.append(option); }); category.input.value = item.type;
  const title = field('Title', 'input', item.title || ''), content = field('Instructions or context', 'textarea', item.text || '');
  title.input.maxLength = 60; title.input.required = true; content.input.maxLength = 1200; content.input.required = true;
  const error = node('p', '', 'error'); error.setAttribute('role','alert');
  const save = node('button', 'Save to wallet', 'primary'); save.type = 'submit';
  form.append(category.wrapper, title.wrapper, content.wrapper, node('p', 'Up to 1,200 characters. Saving does not automatically select this card for chat.', 'small'), error, save);
  form.onsubmit = event => {
    event.preventDefault(); try {
      const clean = validateItem({ type: category.input.value, title: title.input.value, text: content.input.value });
      const updated = { ...clean, id: item.id || crypto.randomUUID(), updatedAt: new Date().toISOString() };
      if (!item.id && items.length >= 200) throw Error('Your wallet is full (200 cards). Export a backup before removing cards.');
      persist(item.id ? items.map(i => i.id === item.id ? updated : i) : [...items, updated]); $('#dialog').close(); toast(`Saved to ${names[clean.type]}.`);
    } catch(e) { error.textContent = e.message || 'Could not save. Your existing cards are unchanged.'; }
  }; body.append(form);
}
function toggle(id) { if (busy) { toast('Wait for this response before changing context.'); return; } if (!selection.has(id) && selection.size >= 24) { toast('Choose up to 24 cards.'); return; } selection.has(id) ? selection.delete(id) : selection.add(id); renderSelection(); }
function renderSelection() {
  $('#select-context').textContent = `Choose context${selection.size ? ` · ${selection.size}` : ''}`;
  const strip = $('#selection'); strip.replaceChildren();
  if (!selection.size) strip.append(node('span', 'No wallet context selected', 'small'));
  items.filter(i => selection.has(i.id)).forEach(item => { const chip = button(`${item.title} ×`, () => toggle(item.id), 'chip'); chip.setAttribute('aria-label', `Remove ${item.title} from chat`); strip.append(chip); });
}
function selectContext() {
  const body = modal('Choose context for this chat', 'Only selected cards are included. The current conversation is also sent.');
  if (!items.length) { body.append(node('p', 'Add a card first, or chat without wallet context.'), button('Add a card', () => editItem(), 'primary')); return; }
  items.forEach(item => {
    const label = node('label', undefined, 'select-item'), checkbox = node('input'), text = node('span', item.title); checkbox.type = 'checkbox'; checkbox.checked = selection.has(item.id); checkbox.disabled = busy;
    checkbox.onchange = () => { toggle(item.id); checkbox.checked = selection.has(item.id); }; text.append(node('small', names[item.type])); label.append(checkbox,text); body.append(label);
  });
  body.append(button('Done', () => $('#dialog').close(), 'primary'), button('Preview / copy package', showPackage));
}
async function copy(text) { try { await navigator.clipboard.writeText(text); toast('Copied.'); } catch { const body = modal('Copy your text', 'Automatic copy is unavailable. Select the text below and copy it.'); const area = node('textarea', text); area.style.width='100%'; area.style.minHeight='240px'; body.append(area); area.focus(); area.select(); } }
function showPackage() {
  if (!selection.size) { toast('Select at least one card.'); return; }
  const text = contextPackage(items, selection), body = modal('Your portable context', 'Copy into another assistant with your next task. This does not connect an external account.');
  body.append(node('pre', text, 'package'), button('Copy instructions', () => copy(text), 'primary'));
}
function download(text, filename) { const url = URL.createObjectURL(new Blob([text], {type:'application/json'})); const a = node('a'); a.href=url; a.download=filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function settings() {
  const body = modal('Settings & backup', 'Your wallet works locally. Live chat requires a private backend.');
  body.append(node('div', 'Do not enter an OpenAI API key here. It belongs in the backend’s secret settings. The access code below is a separate personal-demo code.', 'warning'));
  const form = node('form'), url = field('Your backend URL', 'input', endpoint), access = field('Personal access code (this tab only)', 'input', token), error = node('p', '', 'error');
  url.input.placeholder='https://your-worker.workers.dev'; url.input.type='url'; access.input.type='password'; access.input.autocomplete='off';
  const save = node('button', 'Save connection settings', 'primary'); save.type='submit';
  form.append(url.wrapper, access.wrapper, node('p','Sending a message shares it, recent conversation, and selected cards with this backend and its AI provider. Only use a backend you trust. Saving settings does not verify a connection.', 'small'), error, save);
  form.onsubmit = event => { event.preventDefault(); try {
    if (access.input.value.startsWith('sk-')) throw Error('That looks like an API key. Do not put it here. Use the separate personal access code.');
    const target = new URL(url.input.value); if(target.protocol !== 'https:' || target.username || target.password || target.search || target.hash || target.pathname !== '/') throw Error('Enter a trusted HTTPS backend origin, without a path or credentials.');
    localStorage.setItem('wallet.personal.endpoint', target.origin); endpoint=target.origin; token=access.input.value; updateConnection(); $('#dialog').close(); toast('Settings saved. The connection will be checked when you send a message.');
  } catch(e) { error.textContent=e.message; } }; body.append(form, button('Disconnect', () => { token=''; endpoint=''; localStorage.removeItem('wallet.personal.endpoint'); updateConnection(); $('#dialog').close(); }, 'quiet'));
  const backup = node('details', undefined, 'backup'); backup.append(node('summary','Storage & backups'),node('p','Cards are stored in this browser, not in a cloud account. Anyone using this browser profile can access them. Clearing site data removes them. Chats are not saved after refresh. Export regularly; backup files are not encrypted.', 'small'));
  backup.append(button('Export wallet', () => download(JSON.stringify({version:1,items},null,2),'memory-wallet-backup.json')));
  const file = field('Import a wallet backup', 'input'); file.input.type='file'; file.input.accept='.json,application/json';
  file.input.onchange = async () => { try { const f=file.input.files[0]; if(!f)return; if(f.size>500000)throw Error('Choose a file smaller than 500 KB.'); const incoming=parseBackup(await f.text()); if(!confirm(`Import up to ${incoming.length} cards? Exact duplicates will be skipped. Existing cards will not be overwritten.`))return; const next=mergeItems(items,incoming),count=next.length-items.length; persist(next); toast(`Imported ${count} cards.`); } catch(e) { toast(e.message || 'Invalid backup. Nothing was imported.'); } file.input.value=''; }; backup.append(file.wrapper);
  if(storageBroken) backup.append(button('Export original stored data',()=>download(localStorage.getItem(STORAGE_KEY)||'null','wallet-recovery.json')),button('Reset damaged local storage',()=>{if(confirm('Export the original data first. Reset will remove the stored wallet in this browser. Continue?')){localStorage.removeItem(STORAGE_KEY);location.reload();}},'danger'));
  body.append(backup);
}
function updateConnection(verified = false) { $('#connection').textContent=verified ? 'AI · connected' : endpoint && token ? 'Connection configured · not verified' : 'AI not connected'; $('#connection-dot').classList.toggle('ready',verified); }
async function requestAI(payload) {
  if (!endpoint || !token) throw Error('Connect your private AI backend in Settings to get a real response. You can still add, edit, and reuse wallet cards now.');
  const response = await fetch(`${endpoint}/api/context`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`}, body:JSON.stringify(payload), signal:AbortSignal.timeout(55000) });
  let result; try { result=await response.json(); } catch { throw Error('The backend returned an unreadable response. Check its URL in Settings.'); }
  if(!response.ok) throw Error(result.error || 'The request failed. Your cards are unchanged.'); updateConnection(true); return result;
}
function renderMessages() {
  const container = $('#messages'); container.replaceChildren();
  if(!messages.length) {
    const welcome = node('div',undefined,'welcome'); welcome.append(node('div','✧','welcome-icon'),node('h3','Make your next conversation feel familiar.'),node('p','Save what works. Choose what to bring. Start fresh without starting over.'));
    const starters=node('div',undefined,'starters'); starters.append(button('Set my writing style',()=>editItem(templates.preference)),button('Save a useful skill',()=>editItem(templates.skill)),button('Try a task',()=>{$('#prompt').value='Help me write a concise email. Ask me who it is for and what I want to say.';$('#prompt').focus();})); welcome.append(starters); container.append(welcome);
  }
  messages.forEach((message,index)=>{
    const bubble=node('div',message.content,`bubble ${message.role}`);
    if(message.role!=='system') { const actions=node('div',undefined,'message-actions'); actions.append(button('Save to wallet',()=>proposeSave(message.content),'link')); if(message.role==='assistant') actions.append(button('Copy',()=>copy(message.content),'link')); bubble.append(actions); }
    if(message.context) { const receipt=button(`Included in request: ${message.context.length} wallet items`,()=>{const body=modal('Context included in this request','This records what was sent, not a guarantee that every instruction was followed.');message.context.forEach(i=>{body.append(node('h3',i.category),node('p',i.text,'small'));});},'quiet'); bubble.append(receipt); }
    if(message.failed) bubble.append(button('Retry',()=>{messages.splice(index,1);$('#prompt').value=message.retry;send();},'quiet'));
    container.append(bubble);
  });
  if(busy) container.append(node('div','Thinking…','bubble system')); container.scrollTop=container.scrollHeight;
}
function setBusy(value) { busy=value; $('#send').disabled=value; $('#new-chat').disabled=value; $('#select-context').disabled=value; renderMessages(); }
async function proposeSave(text) {
  if(busy)return;
  if(!endpoint || !token) { editItem({type:'skill',title:'',text:text.slice(0,1200)},true); return; }
  setBusy(true); try { const result=await requestAI({operation:'remember',text:text.slice(0,12000)}); editItem(validateItem(result.item),true); } catch(e) { toast(`AI proposal unavailable: ${e.message}`); editItem({type:'skill',title:'',text:text.slice(0,1200)},true); } finally { setBusy(false); }
}
async function send() {
  if(busy)return; const prompt=$('#prompt').value.trim(); if(!prompt)return;
  if(saveIntent(prompt)) { const prior=messages.filter(m=>m.role!=='system').slice(-2).map(m=>`${m.role}: ${m.content}`).join('\n'); await proposeSave(`${prior}\nUser request: ${prompt}`); return; }
  if(!endpoint || !token) { toast('Live chat needs your private AI connection. No message was sent.'); settings(); return; }
  const context=selectedContext(items,selection); const history=messages.filter(m=>['user','assistant'].includes(m.role)).slice(-8).map(({role,content})=>({role,content}));
  // Bound conversation input to the server contract; do not silently truncate messages.
  if(history.some(m=>m.content.length>4000)) { toast('Start a new chat: a previous answer is too long to resend safely.'); return; }
  const payload={operation:'chat',messages:[...history,{role:'user',content:prompt}],context};
  if(new TextEncoder().encode(JSON.stringify(payload)).length>39000){toast('This conversation is too large. Start a new chat or select fewer cards.');return;}
  messages.push({role:'user',content:prompt});$('#prompt').value='';setBusy(true);
  try { const result=await requestAI(payload);if(typeof result.reply!=='string'||!result.reply.trim())throw Error('The AI returned an empty response.'); messages.push({role:'assistant',content:result.reply,context}); }
  catch(e) { messages.pop(); messages.push({role:'system',content:e.name==='TimeoutError'?'The request timed out. Please retry.':e.message,failed:true,retry:prompt}); updateConnection(false); }
  finally { setBusy(false); }
}
$('#settings').onclick=settings; $('#add').onclick=()=>editItem(); $('#select-context').onclick=selectContext;
$('#new-chat').onclick=()=>{if(busy)return;if(messages.length&&!confirm('Start a new chat? This conversation will be cleared. Your wallet and selected cards stay.'))return;messages=[];renderMessages();};
$('#composer').onsubmit=event=>{event.preventDefault();send();}; $('#prompt').onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();send();}};
renderCards(); renderSelection(); renderMessages(); updateConnection();
