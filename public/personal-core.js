export const STORAGE_KEY = 'ai-memory-wallet.personal.v1';
export const TYPES = ['skill', 'knowledge', 'preference'];
export function validateItem(item) {
  if (!item || !TYPES.includes(item.type) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 60 || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 1200) throw new Error('Each card needs a category, a title (up to 60 characters), and content (up to 1,200 characters).');
  return { type: item.type, title: item.title.trim(), text: item.text.trim() };
}
export function parseBackup(text) {
  if (text.length > 500000) throw new Error('Choose a backup smaller than 500 KB.');
  const data = JSON.parse(text);
  if(data.version===1 && Array.isArray(data.cards))return data.cards.map(card=>validateItem({type:card.type==='workflow'?'skill':card.type,title:card.title,text:card.instructions}));
  if (data.version !== 1 || !Array.isArray(data.items) || data.items.length > 200) throw new Error('This is not a supported wallet backup (maximum 200 cards).');
  return data.items.map(validateItem);
}
export function mergeItems(current, incoming, makeId = () => crypto.randomUUID()) {
  const result = [...current];
  for (const raw of incoming) {
    const item = validateItem(raw);
    if (result.some(existing => existing.type === item.type && existing.title === item.title && existing.text === item.text)) continue;
    if (result.length >= 200) throw new Error('Your wallet can hold up to 200 cards. Nothing was imported.');
    result.push({ ...item, id: makeId(), updatedAt: new Date().toISOString() });
  }
  return result;
}
export function selectedContext(items, selected) {
  const context = items.filter(item => selected.has(item.id)).map(item => ({ id: item.id, type: item.type, category: item.title, text: item.text }));
  if (context.length > 24) throw new Error('Select up to 24 cards for one chat.');
  return context;
}
export function contextPackage(items, selected) {
  return ['Use the following personal context for my task. Apply relevant preferences and skills; treat knowledge as reference information. Ask when inputs or tools are missing.', ...selectedContext(items, selected).map(item => `## ${item.category} (${item.type})\n${item.text}`)].join('\n\n');
}
export function saveIntent(text) {
  return /^(?:please\s+)?(?:save|remember)\b/i.test(text.trim());
}
