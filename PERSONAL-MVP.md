# Personal wallet implementation

The main page follows the personal-wallet screenshot: Skills, Knowledge, Preferences, and one chat area. Cursor's database, account APIs, and advanced manager remain in use. The previous list UI is available at `manage.html`, and the Figma interface is at `prototype/`.

## Working without a backend

Add/edit/duplicate/delete cards; optional editable starters; search; select context; copy a portable instruction package; JSON export/import; refresh persistence. Data is local to the browser and not encrypted or synchronized. The UI explicitly discloses this. Chat history is in memory and clears on refresh.

## Live-chat preparation

Run `Start Private Wallet.command` yourself in Terminal. Enter your OpenAI key using the hidden prompt and enter a Responses-compatible model ID available to your project. The key is passed to the local Node server in memory, never written to the public app or a file. Close Terminal to stop it. Open `http://127.0.0.1:4174`. Local development sign-in displays a link instead of sending email; do not expose it publicly. No Cloudflare account is required for this local version.

`server/personal.js` implements account-owned card access, transactional updates with stale-snapshot checks, Responses API chat, and reviewed card proposals. Selected IDs are resolved from the authenticated user's database records on the server. SQLite request quotas limit personal AI endpoints to 50 calls per account and 100 calls globally each UTC day, including failures; each response has a 1,800-token output limit. These are request limits, not an exact monetary cap. The older extraction endpoint shares the request quota. API use may incur charges.

The public GitHub Pages site stores cards in the browser. The local Node app stores cards in SQLite and preserves them across sign-in and restart. A public frontend deployment is not a live-AI deployment. Live model responses have NOT been verified; tests use mocks. Public hosting of the private app requires persistent hosting, HTTPS, and real email delivery/production authentication. Never deploy development magic-link sign-in publicly.

## Verification

Run `npm test` for 24 validation and private API tests. Run `scripts/test-personal-ui.cjs` with Playwright available via `PLAYWRIGHT_MODULE`; optionally set `PROTOTYPE_URL` to a static preview. Browser tests exercise persistence, context selection, reviewed save, new chat, failure, backups, editing, deletion, and mobile layout with mocked AI only. A separate private browser check verified local sign-in, SQLite persistence, selected context, and the no-key error.

GitHub Pages publishes `public/`; no backend secret is part of that artifact.
