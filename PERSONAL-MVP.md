# Personal wallet implementation

The main page now follows the supplied personal-wallet screenshot: Skills, Knowledge, Preferences, and one chat area. The previous Figma interface remains at `figma.html`; `legacy-chat.html` is unchanged.

## Working without a backend

Add/edit/duplicate/delete cards; optional editable starters; search; select context; copy a portable instruction package; JSON export/import; refresh persistence. Data is local to the browser and not encrypted or synchronized. The UI explicitly discloses this. Chat history is in memory and clears on refresh.

## Live-chat preparation

`backend/worker.js` calls OpenAI through a server-side adapter, with a separate personal access code and per-location throttling. It supports chat and structured save proposals, both wired to the frontend. Follow `backend/OPENAI-SETUP.md` to configure accounts and secrets. Never enter the API key in the site.

The deployment is disabled by default. A public frontend deployment is not a live-AI deployment. No live provider request has been verified. Browser tests intercept test-only requests; they verify wiring, not model quality. A production account system, private cloud storage, and a durable global usage cap remain out of scope of this local-first delivery.

## Verification

Run `npm test` for validation and backend contract tests. Run `scripts/test-personal-ui.cjs` with Playwright available via `PLAYWRIGHT_MODULE`; optionally set `PROTOTYPE_URL`. The browser tests exercise persistence, context selection, reviewed save, new chat, failure, backups, editing, deletion, and mobile layout with mocked AI only.

GitHub Pages publishes `public/`; no backend secret is part of that artifact.
