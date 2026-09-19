# Architecture choices

Investigated the existing repository (compiled Figma prototype, team/PRD chat workspace, Cloudflare Worker for PRD extraction). Those pieces could not support a personal card wallet with sign-in and private storage without a new maintainable UI and server. This MVP **extends the same repo**: keeps GitHub Pages for a public **browser-only demo** (localStorage, no private claims), archives the visual prototype under `/prototype/`, and adds a small Node app for the real private wallet.

## Stack

- **Frontend:** vanilla HTML/CSS/JS in `public/`, no build step, no framework. Matches the old repo and is easier for a nontechnical founder to open. Signed-in home is one **My Wallet** list (preferences and skills together) with Select, a Preview panel, and Copy.
- **Server:** Node 22 built-in HTTP + `node:sqlite`. No npm dependencies.
- **Auth:** email magic link. Locally the link is shown on the page and in the terminal. Google sign-in was not already in the repo, so it was not added.
- **Persistence:** SQLite file `data/wallet.db`. Survives refresh and sign-out/sign-in on the same database. Every card query includes `user_id`.
- **Optional AI:** OpenAI or Anthropic, called **only** from `server/ai.js`. Keys stay in environment variables.
- **Analytics:** none.

## Why not Vercel + Supabase for this pass

That pairing is a good later production shape (magic link + Postgres + row-level security). It was not used as the required runtime because:

- This environment and Jenny’s first use need a locally runnable app with no extra accounts.
- There are no Supabase or Vercel credentials in the repo, and a public deploy of real cards is intentionally held.
- Two backends (SQLite and Supabase) would be harder to maintain for one founder.

The server API (`/api/cards`, `/api/auth/*`, `/api/import`) is small enough to put in front of Supabase later if needed.

## Trust boundaries

- `public/` is visible. It must never contain API keys or other people’s cards.
- GitHub Pages publishes `public/` as a browser-only demo. Example templates may ship in JS; visitors’ demo cards stay in their browser, not in the repo. That is not a private database.
- The browser talks only to this app’s `/api`. Model keys are not sent to the browser.
- Imported and pasted text is stored and shown as text (`textContent` / escaped HTML). It is not executed.
- AI output is validated with the same card rules as manual input. Invalid output is an error, not a canned success.

## Limits

See `LIMITS` in `public/wallet-core.js`: title 120, instructions 20,000, 200 cards per account, 1 MB import, 40 KB typical JSON bodies.
