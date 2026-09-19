# AI Memory Wallet

**Save what worked. Bring it to your next AI conversation.**

This is a **personal** wallet for Jenny Yang (and anyone she shares the running app with as their own account). **My Wallet** is one list of cards — preferences and skills mixed together, with a quiet type label on each card. There are no Preference / Skill tabs and no Team workspace.

1. **Preferences** — how you want AI to communicate and collaborate (for example: be concise; explain tradeoffs; ask before rewriting; do not invent facts).
2. **Skills** — reusable text instructions for a recurring task (for example: review a landing page; turn interview notes into findings; rewrite an email without changing the meaning). A skill is text, not a connected tool. The saved type is still `workflow` in the API.

You **Select** cards, **Preview** the exact instruction text, and **Copy** it into ChatGPT, Claude, Cursor, or any other chat. **This app does not sign into those products, sync into them, or change how a model behaves.** Connecting those apps is a later idea — tonight the path is copy and paste.

The public GitHub Pages site is a **browser-only demo** of that same loop. It is not a private wallet. The old visual prototype (sample data only) is at [public/prototype](public/prototype/index.html) and, after Pages deploy, `/prototype/`.

## What you can do

1. **Add** a preference or a skill (a few fields is enough).
2. **Edit** a card when the saved text should change.
3. **Use** a card: Select it, see the Preview panel, Copy the exact text.
4. Unselected cards are left out of the copied package.
5. If the browser blocks the clipboard, the text is selected so you can copy it yourself.
6. After using a card, you can improve the saved version.
7. Export JSON and import it later. Import will not overwrite a card unless you choose **Replace**.
8. If optional AI is set up, ask it to draft a card. You review and edit before anything is saved.

## Run on your computer

You need [Node.js 22 or newer](https://nodejs.org/). No extra packages are required.

```sh
npm test
npm start
```

Open http://127.0.0.1:4173

### 60-second demo (private wallet on your computer)

1. Enter your email. A sign-in link appears on the page and in the terminal. Click it.
2. **Add** one Preference and one Skill, or click **Add labeled examples**.
3. Both cards appear in one **My Wallet** list.
4. **Select** only one card (checkbox), or click **Use** on it.
5. The **Preview** panel shows the exact copyable instruction text. The other card is not included.
6. Click **Copy**. Paste into a real Claude or ChatGPT chat.

Your cards are stored in `data/wallet.db` on this computer. Signing out and signing back in with the same email still shows them. Refreshing the page keeps you signed in. Use **Export** if you want a backup file.

The public Pages URL uses the same Select → Preview → Copy UI, but cards stay in that browser only. See below.

## Public website vs your private cards

https://jjjjeny.github.io/ai-memory-wallet/ is a **public browser-only demo**. GitHub Pages deploys only the `public/` folder. It cannot run the Node + SQLite server.

On that URL you can Add labeled examples, Select, Preview, and Copy. Cards stay in **this browser** (localStorage when available). They are **not private** and this is **not the full server wallet**. Anyone with access to the browser can see them. Clearing site data deletes them.

**Do not put real private cards on Pages.** Use `npm start` on your computer, or a host you control, before saving anything personal.

Banner on the demo:

> Demo — cards stay in this browser only; not private / not the full server wallet

To try the same static demo locally (no Node API):

```sh
npx serve public
```

Then open the URL it prints (often http://127.0.0.1:3000). You should see **My Wallet**, the demo banner, **Add labeled examples**, Select, Preview, and Copy.

The old Figma/team prototype is only at `/prototype/`. It is not the homepage.

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
