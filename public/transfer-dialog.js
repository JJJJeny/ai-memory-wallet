// Readable replacement for the exported Figma transfer dialog.
export function renderTransferDialog(React, { items, initialSelection, onClose }, { destinations, compatibility, download, instruction }) {
  const h = React.createElement;
  const [destination, setDestination] = React.useState('Claude');
  const [selection, setSelection] = React.useState(() => new Set(initialSelection ?? items.filter(item => item.scope === 'personal').map(item => item.id)));
  const [preview, setPreview] = React.useState(false);
  const [copyStatus, setCopyStatus] = React.useState('');
  const dialog = React.useRef(null);
  React.useEffect(() => {
    dialog.current?.querySelector('.wallet-transfer-body')?.scrollTo(0, 0);
  }, [preview]);
  React.useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('button')?.focus();
    const keydown = event => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const focusable = [...dialog.current.querySelectorAll('button:not(:disabled), input:not(:disabled), summary')].filter(el => el.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown); previousFocus?.focus(); };
  }, [onClose]);
  const rows = items.map(item => ({ item, check: compatibility(item, destination) }));
  const included = rows.filter(({ item, check }) => selection.has(item.id) && check.level !== 'blocked');
  const markdown = ['# Wallet context package', '', `Sample prototype data · Destination: ${destination}`, '', instruction, '', ...included.map(({ item, check }) => `## ${item.title} (v${item.version})\nOwner: ${item.owner} · Visibility: ${item.visibility}\nSource: ${item.source}\n\n${item.content ?? ''}${item.skill ? `\n\nInstructions: ${item.skill.instructions}\nRequired tools: ${item.skill.requiredTools}` : ''}${check.level === 'partial' ? `\nCompatibility: ${check.message}` : ''}`)].join('\n\n');
  const toggle = id => { setSelection(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; }); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(instruction); setCopyStatus('Instruction copied'); }
    catch { setCopyStatus('Copy unavailable. Select the instruction above and copy it manually.'); }
  };
  const button = (text, onClick, props = {}) => h('button', { type: 'button', onClick, ...props }, text);
  return h('div', { className: 'wallet-transfer-overlay', onMouseDown: event => { if (event.target === event.currentTarget) onClose(); } },
    h('section', { className: 'wallet-transfer', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'transfer-title', ref: dialog },
      h('header', { className: 'wallet-transfer-header' },
        h('div', null, h('h2', { id: 'transfer-title' }, preview ? `Your context in ${destination}` : 'Use your wallet in another tool'),
          h('p', null, preview ? 'Preview what the assistant would receive.' : 'Choose a destination and the context you want to bring.')),
        button('×', onClose, { className: 'wallet-close', 'aria-label': 'Close' })),
      h('div', { className: 'wallet-transfer-body' },
        preview ? h('div', { className: 'wallet-preview' },
          h('div', { className: 'wallet-notice' }, 'Simulated handoff · No account connected or data sent.'),
          h('h3', { tabIndex: -1 }, `${included.length} context items ready for ${destination}`),
          h('p', null, 'These are the instructions and knowledge the assistant would receive, not an AI-generated response.'),
          ...included.map(({ item, check }) => h('article', { className: 'wallet-preview-item', key: item.id },
            h('h4', null, item.title), h('small', null, `v${item.version} · ${item.owner} · ${item.visibility}`),
            h('p', { className: 'wallet-context-text' }, item.content),
            item.skill && h('div', null, h('strong', null, 'Instructions'), h('p', { className: 'wallet-context-text' }, item.skill.instructions), h('small', null, `Required tools: ${item.skill.requiredTools}`)),
            h('small', null, `Source: ${item.source}`),
            check.level === 'partial' && h('p', { className: 'wallet-warning' }, check.message))),
          h('details', { className: 'wallet-export' }, h('summary', null, 'Export options'),
            h('p', null, 'Download the selected context, then attach it in your assistant. Downloaded files are outside this wallet’s access controls.'),
            h('div', { className: 'wallet-export-buttons' },
              button('Download Markdown', () => download('wallet-context.md', markdown, 'text/markdown')),
              button('Download JSON', () => download('wallet-context.json', JSON.stringify({ destination, sample: true, instruction, items: included.map(({ item }) => item) }, null, 2), 'application/json'))),
            h('p', null, 'Use this instruction with your attached file:'), h('blockquote', null, instruction),
            button('Copy instruction', copy), h('p', { role: 'status' }, copyStatus)))
        : h(React.Fragment, null,
          h('fieldset', { className: 'wallet-destinations' }, h('legend', null, '1. Choose a tool'),
            h('div', null, ...destinations.map(tool => button(tool.label, () => setDestination(tool.id), { key: tool.id, 'aria-pressed': destination === tool.id })))),
          h('fieldset', { className: 'wallet-context-list' }, h('legend', null, '2. Choose context'),
            h('p', null, 'Only selected, permitted items are included.'),
            ...rows.map(({ item, check }) => h('label', { className: `wallet-context-row${check.level === 'blocked' ? ' is-blocked' : ''}`, key: item.id },
              h('input', { type: 'checkbox', checked: selection.has(item.id) && check.level !== 'blocked', disabled: check.level === 'blocked', onChange: () => toggle(item.id) }),
              h('span', null, h('strong', null, item.title), h('small', null, `${item.type.replaceAll('_', ' ')} · ${item.owner} · ${item.visibility}`),
                check.level === 'blocked' ? h('span', { className: 'wallet-warning' }, check.message) : selection.has(item.id) && check.level === 'partial' ? h('span', { className: 'wallet-warning' }, check.message) : null))))),
      ),
      h('footer', { className: 'wallet-transfer-footer' },
        preview ? button('Back to selection', () => setPreview(false)) : h('span', { role: 'status' }, `${included.length} items selected`),
        button(preview ? 'Done' : 'Preview handoff →', preview ? onClose : () => setPreview(true), { className: 'wallet-primary', disabled: !preview && included.length === 0 }))));
}
