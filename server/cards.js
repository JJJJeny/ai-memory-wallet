import {
  applyImportPlan,
  duplicateTitle,
  LIMITS,
  parseImportPayload,
  planImport,
  publicCard,
  validateCardInput,
} from '../public/wallet-core.js';
import { rowToCard } from './db.js';
import { iso } from './auth.js';

function countCards(db, userId) {
  return db.prepare('SELECT COUNT(*) AS n FROM cards WHERE user_id = ?').get(userId).n;
}

function insertCard(db, userId, input, { id = crypto.randomUUID(), createdAt, updatedAt } = {}) {
  const card = validateCardInput(input);
  if (countCards(db, userId) >= LIMITS.cardsPerUser) {
    throw new Error(`You can save up to ${LIMITS.cardsPerUser} cards. Delete one or export a backup first.`);
  }
  const now = iso();
  const row = {
    id,
    user_id: userId,
    title: card.title,
    type: card.type,
    when_to_use: card.whenToUse,
    instructions: card.instructions,
    inputs: card.inputs,
    source: card.source,
    is_template: card.isTemplate ? 1 : 0,
    created_at: createdAt || now,
    updated_at: updatedAt || now,
  };
  db.prepare(`
    INSERT INTO cards(id, user_id, title, type, when_to_use, instructions, inputs, source, is_template, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(row.id, row.user_id, row.title, row.type, row.when_to_use, row.instructions, row.inputs, row.source, row.is_template, row.created_at, row.updated_at);
  return publicCard(rowToCard(row));
}

export function listCards(db, userId) {
  const rows = db.prepare('SELECT * FROM cards WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
  return rows.map((row) => publicCard(rowToCard(row)));
}

export function getOwnedCard(db, userId, cardId) {
  const row = db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(cardId, userId);
  if (!row) throw new Error('That card was not found.');
  return publicCard(rowToCard(row));
}

export function createCard(db, userId, input) {
  return insertCard(db, userId, input);
}

export function updateCard(db, userId, cardId, input) {
  getOwnedCard(db, userId, cardId);
  const card = validateCardInput(input);
  const updatedAt = iso();
  const result = db.prepare(`
    UPDATE cards
    SET title = ?, type = ?, when_to_use = ?, instructions = ?, inputs = ?, source = ?, is_template = ?, updated_at = ?
    WHERE id = ? AND user_id = ?
  `).run(card.title, card.type, card.whenToUse, card.instructions, card.inputs, card.source, card.isTemplate ? 1 : 0, updatedAt, cardId, userId);
  if (!result.changes) throw new Error('That card was not found.');
  return getOwnedCard(db, userId, cardId);
}

export function deleteCard(db, userId, cardId) {
  const result = db.prepare('DELETE FROM cards WHERE id = ? AND user_id = ?').run(cardId, userId);
  if (!result.changes) throw new Error('That card was not found.');
}

export function duplicateCard(db, userId, cardId) {
  const card = getOwnedCard(db, userId, cardId);
  return insertCard(db, userId, {
    ...card,
    title: duplicateTitle(card.title),
    source: 'duplicate',
    isTemplate: false,
  });
}

export function previewImport(db, userId, raw, byteLength) {
  const parsed = parseImportPayload(raw, byteLength);
  const existing = listCards(db, userId);
  const plan = planImport(existing, parsed.incoming);
  return { ...parsed, plan, existingCount: existing.length };
}

export function commitImport(db, userId, raw, byteLength, resolutions) {
  const { incoming, invalid } = parseImportPayload(raw, byteLength);
  if (!incoming.length) throw new Error(invalid[0]?.reason || 'No usable cards were found in that file.');
  const existing = listCards(db, userId);
  const plan = planImport(existing, incoming);
  const applied = applyImportPlan(plan, resolutions);
  if (existing.length + applied.toCreate.length > LIMITS.cardsPerUser) {
    throw new Error(`Importing these cards would go over the ${LIMITS.cardsPerUser}-card limit.`);
  }
  const created = [];
  const replaced = [];
  db.exec('BEGIN');
  try {
    for (const card of applied.toCreate) {
      created.push(insertCard(db, userId, card));
    }
    for (const conflict of applied.toReplace) {
      replaced.push(updateCard(db, userId, conflict.existing.id, {
        ...conflict.incoming,
        source: 'imported',
      }));
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return { created, replaced, skipped: applied.skipped.length, invalid };
}
