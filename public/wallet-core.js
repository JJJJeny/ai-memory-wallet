/** Shared wallet rules used by the browser and the server. No secrets here. */

export const LIMITS = {
  title: 120,
  whenToUse: 500,
  instructions: 20000,
  inputs: 4000,
  email: 254,
  paste: 20000,
  cardsPerUser: 200,
  importBytes: 1_000_000,
  jsonBodyBytes: 40_000,
};

export const CARD_TYPES = ['preference', 'workflow'];
export const SOURCES = ['manual', 'ai-reviewed', 'template', 'imported', 'duplicate'];
export const EXPORT_VERSION = 1;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function cleanText(value, max) {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL_CHARS, '').replace(/\r\n/g, '\n').trim().slice(0, max);
}

export function normalizeEmail(value) {
  const email = cleanText(value, LIMITS.email).toLowerCase();
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/i.test(email)) {
    throw new Error('Enter a valid email address.');
  }
  return email;
}

export function validateCardInput(input = {}) {
  const type = input.type;
  if (!CARD_TYPES.includes(type)) throw new Error('Choose Preference or Workflow.');
  const title = cleanText(input.title, LIMITS.title);
  const whenToUse = cleanText(input.whenToUse ?? '', LIMITS.whenToUse);
  const instructions = cleanText(input.instructions, LIMITS.instructions);
  const inputs = cleanText(input.inputs ?? '', LIMITS.inputs);
  if (!title) throw new Error('Add a short title.');
  if (!instructions) throw new Error('Add the instructions you want to reuse.');
  const source = SOURCES.includes(input.source) ? input.source : 'manual';
  return {
    title,
    type,
    whenToUse,
    instructions,
    inputs: type === 'workflow' ? inputs : '',
    source,
    isTemplate: Boolean(input.isTemplate),
  };
}

export function publicCard(row) {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    whenToUse: row.whenToUse,
    instructions: row.instructions,
    inputs: row.inputs || '',
    source: row.source,
    isTemplate: Boolean(row.isTemplate),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function cardMatchesQuery(card, query) {
  const q = cleanText(query ?? '', 200).toLowerCase();
  if (!q) return true;
  return [card.title, card.type, card.whenToUse, card.instructions, card.inputs]
    .join('\n')
    .toLowerCase()
    .includes(q);
}

export function filterCards(cards, { tab = 'all', query = '' } = {}) {
  return cards.filter((card) => {
    if (tab !== 'all' && card.type !== tab) return false;
    return cardMatchesQuery(card, query);
  });
}

export function buildInstructionPackage(cards, selectedIds, { editedText } = {}) {
  if (typeof editedText === 'string') return editedText;
  const selected = selectedIds
    .map((id) => cards.find((card) => card.id === id))
    .filter(Boolean);
  if (!selected.length) return '';
  const lines = [
    'Use the following saved preferences and workflows for this task.',
    'Follow them unless I say otherwise. Do not invent facts I did not provide.',
    '',
  ];
  for (const card of selected) {
    const kind = card.type === 'preference' ? 'Preference' : 'Workflow';
    lines.push(`## ${kind}: ${card.title}`);
    if (card.whenToUse) lines.push(`When to use: ${card.whenToUse}`);
    if (card.inputs) lines.push(`Optional inputs: ${card.inputs}`);
    lines.push(card.instructions);
    lines.push('');
  }
  return lines.join('\n').trim() + '\n';
}

export const EXAMPLE_CARDS = [
  {
    title: 'Be concise',
    type: 'preference',
    whenToUse: 'Most conversations, unless I ask for a deep dive',
    instructions: 'Keep answers short. Lead with the answer. Use bullets for options. Skip filler and repeated caveats.',
    inputs: '',
    source: 'template',
    isTemplate: true,
  },
  {
    title: 'Do not invent facts',
    type: 'preference',
    whenToUse: 'Research, writing, or anything I may publish',
    instructions: 'If you are not sure, say so. Do not invent names, numbers, quotes, or sources. Ask me before treating a guess as a fact.',
    inputs: '',
    source: 'template',
    isTemplate: true,
  },
  {
    title: 'Ask before rewriting',
    type: 'preference',
    whenToUse: 'When I share a draft I already care about',
    instructions: 'Do not replace my draft unless I ask. First tell me what you would change and why, then wait.',
    inputs: '',
    source: 'template',
    isTemplate: true,
  },
  {
    title: 'Review a landing page',
    type: 'workflow',
    whenToUse: 'Before publishing a marketing or product page',
    instructions: 'Review the page for clarity, promise vs. proof, and next step. List what is confusing, what feels overclaimed, and the smallest edits that would help. Do not rewrite the whole page unless I ask.',
    inputs: 'Page URL or draft copy',
    source: 'template',
    isTemplate: true,
  },
  {
    title: 'Turn interview notes into findings',
    type: 'workflow',
    whenToUse: 'After a user or stakeholder interview',
    instructions: 'Turn the notes into: key findings, supporting quotes, tensions, and open questions. Separate what the person said from my interpretation. Do not add people or quotes that are not in the notes.',
    inputs: 'Interview notes',
    source: 'template',
    isTemplate: true,
  },
  {
    title: 'Rewrite an email, keep the meaning',
    type: 'workflow',
    whenToUse: 'When a draft is clear but the tone is off',
    instructions: 'Rewrite for clarity and a calm, direct tone. Keep the meaning, commitments, and facts. Mark any place you had to guess.',
    inputs: 'Draft email and who it is for',
    source: 'template',
    isTemplate: true,
  },
];

export function exportPayload(cards, { exportedAt = new Date().toISOString() } = {}) {
  return {
    version: EXPORT_VERSION,
    kind: 'ai-memory-wallet',
    exportedAt,
    cards: cards.map((card) => ({
      id: card.id,
      title: card.title,
      type: card.type,
      whenToUse: card.whenToUse,
      instructions: card.instructions,
      inputs: card.inputs || '',
      source: card.source,
      isTemplate: Boolean(card.isTemplate),
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    })),
  };
}

export function parseImportPayload(raw, byteLength = 0) {
  if (byteLength > LIMITS.importBytes) throw new Error('That file is too large. Use a JSON export under 1 MB.');
  let data = raw;
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw); }
    catch { throw new Error('That file is not valid JSON.'); }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('That file is not a wallet export.');
  }
  if (data.kind && data.kind !== 'ai-memory-wallet') {
    throw new Error('That JSON is not an AI Memory Wallet export.');
  }
  if (data.version !== undefined && data.version !== EXPORT_VERSION) {
    throw new Error('This export version is not supported.');
  }
  const list = Array.isArray(data.cards) ? data.cards : Array.isArray(data) ? data : null;
  if (!list) throw new Error('The export needs a cards list.');
  if (list.length > LIMITS.cardsPerUser) {
    throw new Error(`An export can include at most ${LIMITS.cardsPerUser} cards.`);
  }
  const incoming = [];
  const invalid = [];
  list.forEach((item, index) => {
    try {
      if (!item || typeof item !== 'object') throw new Error('Card is not an object.');
      const card = validateCardInput({
        title: item.title,
        type: item.type,
        whenToUse: item.whenToUse,
        instructions: item.instructions,
        inputs: item.inputs,
        source: 'imported',
        isTemplate: Boolean(item.isTemplate),
      });
      incoming.push({
        ...card,
        importId: typeof item.id === 'string' && item.id.trim() ? item.id.trim().slice(0, 80) : `import-${index + 1}`,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
      });
    } catch (error) {
      invalid.push({ index, reason: error.message });
    }
  });
  if (!incoming.length && !invalid.length) throw new Error('No usable cards were found in that file.');
  return { incoming, invalid };
}

export function planImport(existingCards, incomingCards) {
  const byId = new Map(existingCards.map((card) => [card.id, card]));
  const create = [];
  const conflicts = [];
  for (const card of incomingCards) {
    const existing = byId.get(card.importId);
    if (existing) conflicts.push({ incoming: card, existing });
    else create.push(card);
  }
  return { create, conflicts };
}

export const RESOLUTION_ACTIONS = ['skip', 'replace', 'keep-both'];

export function applyImportPlan(plan, resolutions = {}) {
  const toCreate = [...plan.create];
  const toReplace = [];
  const skipped = [];
  for (const conflict of plan.conflicts) {
    const action = resolutions[conflict.incoming.importId] || resolutions[conflict.existing.id];
    if (!RESOLUTION_ACTIONS.includes(action)) {
      throw new Error('Choose skip, replace, or keep both for each matching card. Nothing was changed.');
    }
    if (action === 'skip') skipped.push(conflict);
    else if (action === 'replace') toReplace.push(conflict);
    else toCreate.push({ ...conflict.incoming, importId: undefined });
  }
  return { toCreate, toReplace, skipped };
}

export function validateProposal(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('The suggestion was empty.');
  return validateCardInput({
    title: raw.title,
    type: raw.type,
    whenToUse: raw.whenToUse,
    instructions: raw.instructions,
    inputs: raw.inputs,
    source: 'ai-reviewed',
    isTemplate: false,
  });
}

export function duplicateTitle(title) {
  const base = cleanText(title, LIMITS.title);
  const suffix = ' (copy)';
  if (base.endsWith(suffix)) return base.slice(0, LIMITS.title);
  return (base + suffix).slice(0, LIMITS.title);
}
