import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyImportPlan,
  buildInstructionPackage,
  cardMatchesQuery,
  duplicateTitle,
  EXAMPLE_CARDS,
  exportPayload,
  filterCards,
  parseImportPayload,
  planImport,
  validateCardInput,
  validateProposal,
} from '../public/wallet-core.js';

const preference = validateCardInput({
  title: 'Be concise',
  type: 'preference',
  whenToUse: 'Most chats',
  instructions: 'Keep answers short.',
});
const workflow = validateCardInput({
  title: 'Review a landing page',
  type: 'workflow',
  whenToUse: 'Before publishing',
  instructions: 'List confusing claims.',
  inputs: 'Page URL',
});

test('validates preference and workflow cards', () => {
  assert.equal(preference.type, 'preference');
  assert.equal(preference.inputs, '');
  assert.equal(workflow.inputs, 'Page URL');
  assert.throws(() => validateCardInput({ title: '', type: 'preference', instructions: 'x' }));
  assert.throws(() => validateCardInput({ title: 'x', type: 'note', instructions: 'y' }));
});

test('buildInstructionPackage includes only selected cards', () => {
  const cards = [
    { id: 'p1', ...preference },
    { id: 'w1', ...workflow },
    { id: 'p2', title: 'Skip me', type: 'preference', whenToUse: '', instructions: 'Should not appear', inputs: '' },
  ];
  const text = buildInstructionPackage(cards, ['p1', 'w1']);
  assert.match(text, /Preference: Be concise/);
  assert.match(text, /Workflow: Review a landing page/);
  assert.match(text, /Optional inputs: Page URL/);
  assert.doesNotMatch(text, /Should not appear/);
  assert.equal(buildInstructionPackage(cards, []), '');
});

test('edited preview text is used as-is', () => {
  assert.equal(buildInstructionPackage([], ['x'], { editedText: 'custom' }), 'custom');
});

test('search and tabs filter cards', () => {
  const cards = [
    { id: '1', ...preference },
    { id: '2', ...workflow },
  ];
  assert.equal(filterCards(cards, { tab: 'preference' }).length, 1);
  assert.equal(filterCards(cards, { query: 'landing' }).length, 1);
  assert.equal(cardMatchesQuery(preference, 'concise'), true);
});

test('import never silently overwrites', () => {
  const existing = [{ id: 'card-1', ...preference }];
  const parsed = parseImportPayload({
    version: 1,
    kind: 'ai-memory-wallet',
    cards: [
      { id: 'card-1', ...preference, title: 'Be concise — updated', instructions: 'Shorter.' },
      { id: 'card-2', ...workflow },
    ],
  });
  const plan = planImport(existing, parsed.incoming);
  assert.equal(plan.create.length, 1);
  assert.equal(plan.conflicts.length, 1);
  assert.throws(() => applyImportPlan(plan, {}));
  const skipped = applyImportPlan(plan, { 'card-1': 'skip' });
  assert.equal(skipped.toReplace.length, 0);
  assert.equal(skipped.toCreate.length, 1);
  const replaced = applyImportPlan(plan, { 'card-1': 'replace' });
  assert.equal(replaced.toReplace.length, 1);
  const both = applyImportPlan(plan, { 'card-1': 'keep-both' });
  assert.equal(both.toCreate.length, 2);
});

test('export payload is a supported backup shape', () => {
  const payload = exportPayload([{ id: 'p1', ...preference, createdAt: 't', updatedAt: 't' }]);
  const parsed = parseImportPayload(JSON.stringify(payload));
  assert.equal(parsed.incoming.length, 1);
  assert.throws(() => parseImportPayload('{not json'));
  assert.throws(() => parseImportPayload({ kind: 'other', cards: [] }));
});

test('examples are labeled templates, not personal data', () => {
  assert.ok(EXAMPLE_CARDS.every((card) => card.isTemplate && card.source === 'template'));
  assert.ok(EXAMPLE_CARDS.some((card) => card.type === 'preference'));
  assert.ok(EXAMPLE_CARDS.some((card) => card.type === 'workflow'));
});

test('AI proposals are validated and never trusted raw', () => {
  const proposal = validateProposal({
    title: 'Ask first',
    type: 'preference',
    whenToUse: 'Drafts',
    instructions: 'Ask before rewriting.',
  });
  assert.equal(proposal.source, 'ai-reviewed');
  assert.throws(() => validateProposal({ title: 'x' }));
});

test('duplicate titles stay readable', () => {
  assert.equal(duplicateTitle('Be concise'), 'Be concise (copy)');
});
