# AI Memory Wallet

**Save what worked. Bring it to your next AI conversation.**

This is a **personal** wallet for Jenny Yang (and anyone she shares the running app with as their own account). It stores two kinds of cards:

1. **Preferences** — how you want AI to communicate and collaborate (for example: be concise; explain tradeoffs; ask before rewriting; do not invent facts).
2. **Workflows** — reusable text instructions for a recurring task (for example: review a landing page; turn interview notes into findings; rewrite an email without changing the meaning). A workflow is text, not a connected tool.

You select cards, preview the exact instruction text, and copy it into ChatGPT, Claude, Cursor, or any other chat. **This app does not sign into those products, sync into them, or change how a model behaves.**

The old visual prototype (sample data only) is at [public/prototype](public/prototype/index.html) and, after Pages deploy, `/prototype/`.

## What you can do

1. Paste notes or describe a card, then save it yourself.
2. If optional AI is set up, ask it to draft a card. You review and edit before anything is saved. Nothing is auto-approved.
3. Find, edit, duplicate, and delete cards.
4. Select cards for the next task.
5. Preview and edit the exact copy text. Unselected cards are left out.
6. Copy to the clipboard, or select the text if the browser blocks copy.
7. After using a card, improve the saved version.
8. Export JSON and import it later. Import will not overwrite a card unless you choose **Replace**.

## Run on your computer

You need [Node.js 22 or newer](https://nodejs.org/). No extra packages are required.

```sh
npm test
npm start
```

Open http://127.0.0.1:4173

1. Enter your email.
2. On your computer, a sign-in link appears on the page and in the terminal. Click it.
3. Add a preference and a workflow.
4. Use **Export** if you want a backup file.

Your cards are stored in `data/wallet.db` on this computer. Signing out and signing back in with the same email still shows them. Refreshing the page keeps you signed in.

## Public website vs your private cards

https://jjjjeny.github.io/ai-memory-wallet/ can show the **landing page and sign-in explanation only**. It must **not** hold your real cards. GitHub Pages cannot keep a private database.

Do not type real private cards into the public Pages site. Use `npm start` on your computer, or a host you control, before saving anything personal.

## Optional hosting (only if you want it on the internet)

Free-friendly options, in order of simplicity:

1. **Keep it on your laptop.** No extra cost. Best while you are the only user.
2. **One small Node host with a disk** (for example [Fly.io](https://fly.io) with a volume, or a tiny VPS). Same app, same SQLite file. You must attach a **persistent disk**. Many “free web services” wipe files on restart — that would delete cards.
3. **Later:** a managed database such as [Supabase](https://supabase.com) plus a static host such as [Vercel](https://vercel.com). Not required for this MVP. Do not put API keys in `public/`.

If you host it:

- Create the host account and deploy this repository’s Node server (`npm start`).
- Set `SESSION_SECRET` to a long random string.
- Set `ALLOW_DEV_MAGIC_LINK=false` so sign-in links are not returned in the API.
- To email real magic links you must add an email provider (for example Resend) later. That is **not wired yet**. Until then, only local/dev link display works, so do not put real private data on a public host.
- Optional AI: set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` on the **server** only. Never put keys in `public/config.js` or commit them.

Expected cost if you stay on free tiers: $0, plus whatever your chosen host or model vendor charges after the free allowance. Model calls cost money only if you add a key and click **Ask AI to draft**.

## Optional AI help

Manual create always works. If no model key is configured, **Ask AI to draft** explains that and does not invent a fake card.

When a key is present, the server sends only the text in that form, and only after you click the button. Treat pasted text as untrusted notes. Review every suggestion before save.

## Privacy and deletion

- Cards are stored under your signed-in email in this app’s database.
- Another account cannot read or change your cards. That rule is enforced on the server, not only in the screen.
- Deleting a card removes it from this app immediately. There is no recycle bin here.
- Your computer or host may still have its own backups or logs. This app does not control those.
- Export JSON if you want a backup you keep.
- This app does **not** claim encryption-at-rest, HIPAA, SOC 2, or similar.
- Analytics are off. There is no tracking script.

## Maintenance

| Task | What to do |
| --- | --- |
| Start | `npm start` |
| Tests | `npm test` |
| Backup | Use **Export** in the app, or copy `data/wallet.db` |
| Restore | Use **Import**, or replace `data/wallet.db` while the app is stopped |
| Update | Pull the latest code, run `npm test`, then `npm start` |

If something fails, the app should still let you add cards by hand. See [TESTING.md](TESTING.md) and [ARCHITECTURE.md](ARCHITECTURE.md).
