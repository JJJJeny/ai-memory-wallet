import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyImportPlan,
  buildInstructionPackage,
  cardMatchesQuery,
  cardTypeLabel,
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
  assert.match(text, /Skill: Review a landing page/);
  assert.match(text, /Optional inputs: Page URL/);
  assert.doesNotMatch(text, /Should not appear/);
  assert.equal(buildInstructionPackage(cards, []), '');
});

test('edited preview text is used as-is', () => {
  assert.equal(buildInstructionPackage([], ['x'], { editedText: 'custom' }), 'custom');
});

test('one mixed list is the default; search filters cards', () => {
  const cards = [
    { id: '1', ...preference },
    { id: '2', ...workflow },
  ];
  const mixed = filterCards(cards);
  assert.equal(mixed.length, 2);
  assert.deepEqual(mixed.map((card) => card.type).sort(), ['preference', 'workflow']);
  assert.equal(filterCards(cards, { query: 'landing' }).length, 1);
  assert.equal(cardMatchesQuery(preference, 'concise'), true);
  assert.equal(cardTypeLabel('preference'), 'Preference');
  assert.equal(cardTypeLabel('workflow'), 'Skill');
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

test('My Wallet UI is one mixed list with select, preview, and copy', () => {
  const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/app.css', import.meta.url), 'utf8');
  assert.match(app, /My Wallet/);
  assert.match(app, /preview-panel/);
  assert.match(app, /id="copy-btn"/);
  assert.match(app, /data-select=/);
  assert.match(app, /data-use=/);
  assert.match(app, /data-edit=/);
  assert.match(app, /id="add-btn"/);
  assert.doesNotMatch(app, /role="tablist"/);
  assert.doesNotMatch(app, /data-tab=/);
  assert.doesNotMatch(app, /Team workspace/);
  assert.doesNotMatch(app, /Connect to (ChatGPT|Claude)/);
  assert.match(css, /\.preview-panel/);
});

function walkFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walkFiles(path, acc);
    else acc.push(path);
  }
  return acc;
}

test('public files do not contain secrets or API keys', () => {
  const publicDir = fileURLToPath(new URL('../public', import.meta.url));
  const inspect = walkFiles(publicDir).filter((path) => {
    const ext = extname(path);
    return ['.js', '.html', '.css', '.json', '.txt', '.md'].includes(ext);
  });
  const secret = /sk-[A-Za-z0-9]{10,}|OPENAI_API_KEY\s*[:=]\s*['"][^'"]+|ANTHROPIC_API_KEY\s*[:=]\s*['"][^'"]+|SESSION_SECRET\s*[:=]\s*['"][^'"]+/;
  for (const path of inspect) {
    const text = readFileSync(path, 'utf8');
    assert.equal(secret.test(text), false, `${path} looks like it contains a secret`);
  }
  const config = readFileSync(join(publicDir, 'config.js'), 'utf8');
  assert.match(config, /apiBase/);
  assert.doesNotMatch(config, /sk-/);
});
