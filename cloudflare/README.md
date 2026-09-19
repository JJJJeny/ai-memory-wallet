# GitHub Pages + Cloudflare live AI

Public UI: https://jjjjeny.github.io/ai-memory-wallet/
Worker: https://ai-memory-wallet-live.yajenn91.workers.dev

OpenAI credentials exist only in the Cloudflare `OPENAI_API_KEY` secret. `DEMO_PASSWORD` is a separate invite gate, stored as a Worker secret. `.env.demo` is a private, ignored local copy of that demo password, not an OpenAI key. The `Open Live Wallet.command` launcher copies it with explicit consent and opens the public website.

Wallet data remains browser-local on GitHub Pages; the Cloudflare backend receives only activated cards and the current conversation segment. It does not synchronize accounts. Sessions are signed, valid for 12 hours, kept in sessionStorage, and invalidated when the demo password is rotated. The shared gate is for invited prototype testers, not production multi-user authentication.

SQLite-backed Durable Objects reserve quota before AI calls: 100 calls per UTC day across the demo and 10 per minute. Failed provider calls also consume quota. A single budget object per UTC day coordinates the small shared demo budget, not wallet content or generation. Calls have 40 KB input and 1,800 output-token limits. These limit usage, not exact dollar spend. Minimal sampled infrastructure logs/traces are enabled; application code never logs keys, passwords, messages, or wallet content.

Preference changes create a new conversation segment. Previous replies remain visible but are excluded from subsequent model input until users explicitly include relevant information again. Active preferences are sent as model instructions; knowledge is reference data. This avoids reusing the old response style when preferences are removed. Instruction compliance is probabilistic, not a guarantee.

Deploy with the pinned local Wrangler: `npx wrangler deploy --config cloudflare/wrangler.jsonc`. `public/config.js` contains only the public backend URL. Do not publish secret files or use user-provided backend URLs.

Verification: `npm test`; `scripts/test-live-ui.cjs` for mocked desktop/mobile flows; `scripts/check-live-wallet.cjs` makes up to two real synthetic AI requests and may incur charges. A successful deployment or unlock does not establish that provider billing/model access is usable.
