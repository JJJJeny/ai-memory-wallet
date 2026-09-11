# AI Memory Wallet prototype

A public, vendor-neutral product-manager workflow: existing work → proposed context → review → draft → Context Receipt → reviewed update.

GitHub destination: `JJJJeny/ai-memory-wallet`. Intended production URL: `https://JJJJeny.github.io/ai-memory-wallet/`. This URL is not live until the GitHub Pages deployment succeeds.

## Run locally

Use Node.js 22 or newer and Python 3:

```sh
npm test
npm run dev
```

Open http://127.0.0.1:4173. No frontend installation is necessary.

## What works

- Guided CloudShield demo with six context cards, a conflicting scope decision, approve/edit/reject, inclusion controls, PRD comparison, exact source excerpts, receipt download, and successive approved updates.
- Custom notes: actual local extraction by line, review, and a generated **template outline**. This is explicitly labeled as local processing, not AI.
- Optional live AI backend: extraction with source-substring validation and two drafts using the same model and task. Baseline sees the raw note; reviewed draft sees only approved context. No guarantee the reviewed result wins.
- Draft, context, receipt, and local test-session event downloads. No note or session persistence across refresh, and no external analytics collection.

Company integrations, enterprise identity, agent permissions, and Confluence publishing are simulated. Receipt snapshots record what was supplied to the generator; they do not prove which facts influenced a model. Review is explicitly attributed to the visitor in the current browser session, not to a verified company owner.

## Publish GitHub Pages

After signing into GitHub as JJJJeny, create a **new** public repository named `ai-memory-wallet`. If a repository with this name already exists, inspect it before changing anything.

Commit this project (not the parent workspace), push the `main` branch, and set repository **Settings → Pages → Source → GitHub Actions**. The included workflow tests the app and publishes only `public/`. It excludes the backend and local test outputs from the website.

Verify the resulting production URL in an incognito browser without GitHub sign-in. Do not submit a localhost URL or a URL containing `yourusername`.

GitHub’s official workflow reference: https://docs.github.com/en/get-started/start-your-journey/deploying-your-website-automatically

## Enable live AI later

GitHub Pages cannot execute the AI backend. The provided Cloudflare Worker uses Workers AI; it needs a Cloudflare account with Workers AI access. No provider key belongs in the frontend.

1. Install Cloudflare's Wrangler CLI and authenticate using its browser login.
2. Review `backend/wrangler.jsonc`: API is disabled by default; allowed browser origins are JJJJeny's GitHub Pages and the local preview. Confirm the rate-limit namespace IDs do not conflict with existing account bindings.
3. Deploy with `npx wrangler deploy --config backend/wrangler.jsonc`.
4. After checking the account's usage controls, enable `API_ENABLED` and redeploy. This may incur AI usage charges according to Cloudflare's account and pricing terms.
5. Set `apiBase` in `public/config.js` to the Worker origin (without `/api/context`) and publish the frontend again. No secret is needed in this file.
6. Test real extraction, invalid source rejection, both drafts, and failure messages. Live inference is not verified until this is done.

Backend stores no application data and does not log request bodies. The hosting and AI providers can have their own retention policies; do not claim universal zero retention. Limits are coarse per-IP/per-location throttles, **not** authentication or a global spending cap. Keep a public demo on a bounded account plan and use non-confidential test notes.

Cloudflare references:
- https://developers.cloudflare.com/workers-ai/configuration/bindings/
- https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## User test

Ask a PM to bring a short non-confidential note, correct or reject at least one fact, create a draft, inspect its receipt, then change a decision and regenerate. Ask whether the review effort was worth the corrections saved. Session downloads let the researcher inspect actions locally; refresh clears the session. Returning unprompted for a later update remains an unvalidated retention hypothesis.

The scripted guided comparison is for explanation. Use live mode with the same raw input to evaluate incremental value over giving an AI the documents directly.
