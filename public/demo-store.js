/** Browser-only demo storage. No secrets. Not a private wallet. */

import {
  applyImportPlan,
  duplicateTitle,
  LIMITS,
  parseImportPayload,
  planImport,
  publicCard,
  validateCardInput,
} from './wallet-core.js';

export const DEMO_STORAGE_KEY = 'ai-memory-wallet-demo-v1';
export const DEMO_SESSION_KEY = 'ai-memory-wallet-demo-open';
export const DEMO_BANNER = 'Demo — cards stay in this browser only; not private / not the full server wallet';

export function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    removeItem(key) {
      delete data[key];
    },
  };
}

export function detectStorage(preferred) {
  if (preferred) return preferred;
  try {
    const storage = globalThis.localStorage;
    if (!storage) return memoryStorage();
    const probe = `${DEMO_STORAGE_KEY}-probe`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return memoryStorage();
  }
}

function now() {
  return new Date().toISOString();
}

function sortCards(cards) {
  return [...cards].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

function readCards(storage) {
  try {
    const raw = storage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.cards)) return [];
    return data.cards.filter((card) => card && typeof card === 'object' && typeof card.id === 'string');
  } catch {
    return [];
  }
}

function writeCards(storage, cards) {
  storage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ version: 1, cards }));
}

export function isDemoSessionOpen(storage) {
  return storage.getItem(DEMO_SESSION_KEY) !== '0';
}

export function setDemoSessionOpen(storage, open) {
  storage.setItem(DEMO_SESSION_KEY, open ? '1' : '0');
}

export class DemoWallet {
  constructor(storage) {
    this.storage = detectStorage(storage);
    this.cards = readCards(this.storage);
  }

  persist() {
    try {
      writeCards(this.storage, this.cards);
      return true;
    } catch {
      return false;
    }
  }

  list() {
    return sortCards(this.cards);
  }

  create(input) {
    if (this.cards.length >= LIMITS.cardsPerUser) {
      throw new Error(`You can save up to ${LIMITS.cardsPerUser} cards. Delete one or export a backup first.`);
    }
    const validated = validateCardInput(input);
    const timestamp = now();
    const card = publicCard({
      id: crypto.randomUUID(),
      ...validated,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    this.cards = [card, ...this.cards];
    this.persist();
    return card;
  }

  update(id, input) {
    const index = this.cards.findIndex((card) => card.id === id);
    if (index === -1) throw new Error('That card was not found.');
    const validated = validateCardInput({
      ...this.cards[index],
      ...input,
    });
    const card = publicCard({
      ...this.cards[index],
      ...validated,
      id,
      createdAt: this.cards[index].createdAt || now(),
      updatedAt: now(),
    });
    this.cards = this.cards.map((item, i) => (i === index ? card : item));
    this.persist();
    return card;
  }

  remove(id) {
    const next = this.cards.filter((card) => card.id !== id);
    if (next.length === this.cards.length) throw new Error('That card was not found.');
    this.cards = next;
    this.persist();
  }

  duplicate(id) {
    const card = this.cards.find((item) => item.id === id);
    if (!card) throw new Error('That card was not found.');
    return this.create({
      ...card,
      title: duplicateTitle(card.title),
      source: 'duplicate',
      isTemplate: false,
    });
  }

  previewImport(raw, byteLength = 0) {
    const parsed = parseImportPayload(raw, byteLength);
    const plan = planImport(this.list(), parsed.incoming);
    return {
      createCount: plan.create.length,
      conflictCount: plan.conflicts.length,
      invalid: parsed.invalid,
      create: plan.create,
      conflicts: plan.conflicts,
      plan,
    };
  }

  commitImport(raw, resolutions = {}, byteLength = 0) {
    const parsed = parseImportPayload(raw, byteLength);
    if (!parsed.incoming.length) {
      throw new Error(parsed.invalid[0]?.reason || 'No usable cards were found in that file.');
    }
    const plan = planImport(this.list(), parsed.incoming);
    const applied = applyImportPlan(plan, resolutions);
    if (this.cards.length + applied.toCreate.length > LIMITS.cardsPerUser) {
      throw new Error(`Importing these cards would go over the ${LIMITS.cardsPerUser}-card limit.`);
    }
    const created = applied.toCreate.map((card) => this.create({ ...card, source: 'imported' }));
    const replaced = applied.toReplace.map((conflict) => this.update(conflict.existing.id, {
      ...conflict.incoming,
      source: 'imported',
    }));
    return {
      created,
      replaced,
      skipped: applied.skipped.length,
      invalid: parsed.invalid,
    };
  }

  isOpen() {
    return isDemoSessionOpen(this.storage);
  }

  open() {
    setDemoSessionOpen(this.storage, true);
  }

  close() {
    setDemoSessionOpen(this.storage, false);
  }
}
