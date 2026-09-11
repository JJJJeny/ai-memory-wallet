# AI Memory Wallet workspace

A public, vendor-neutral product-manager workflow: existing work → proposed context → review → draft → Context Receipt → reviewed update.

GitHub repository: `JJJJeny/ai-memory-wallet`. Public workspace: https://jjjjeny.github.io/ai-memory-wallet/

## Run locally

Use Node.js 22 or newer and Python 3:

```sh
npm test
npm run dev
```

Open http://127.0.0.1:4173. No frontend installation is necessary.

## What works

- A simple chat workspace: type a natural request such as `/PRD Help me draft a PRD for "Certificate Alert Filtering". Please reference September launch decision and Engineering handoff, and update the wiki in Confluence.`
- A compact context popup appears automatically. Select relevant facts, inspect sources, resolve conflicts, edit wording, and approve the selected context in one action. The context side panel stays closed by default.
- Explicit source names are matched to project documents. Missing references are requested from the user rather than invented. The starter fills the composer; the user chooses when to send it.
- The draft appears in the conversation with a receipt and a **Review wiki update** action. Review current versus proposed content, approve the update, and open the resulting wiki preview. Canceling does not write anything.
- **Confluence is not connected.** Wiki updates are real state changes in a local session preview, not external MCP calls. Preview pages have versions and immutable result snapshots. The optional connection details explain where a production MCP connector would fit.
- Separate projects, multiple conversations, and reuse of approved project context across new chats in the same browser session.
- Example CloudShield source documents, conflict resolution, approve/edit/reject, inclusion controls, and exact source excerpts.
- Paste personal project notes or attach `.txt`/`.md` files. Local extraction works by line and produces a **template outline**, visibly labeled as local drafting. Free-form rewriting requires live AI.
- Proposed changes to approved decisions must be reviewed; accepting an update supersedes the old decision for future drafts. Earlier receipts remain snapshots.
- Optional live AI backend: extraction with source-substring validation and one draft receiving only approved context. Raw source notes are not sent during drafting.
- Draft, context, receipt, and local session-event downloads. Refresh clears the session; no external analytics collection.

Company integrations, enterprise identity, agent permissions, and Confluence publishing are simulated. Receipt snapshots record what was supplied to the generator; they do not prove which facts influenced a model. Review is explicitly attributed to the visitor in the current browser session, not to a verified company owner. Opening the local HTML file directly redirects to the public site, because module scripts require an HTTP server.

## Publish GitHub Pages

The public `JJJJeny/ai-memory-wallet` repository and GitHub Pages configuration already exist. Reuse them.

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
6. Test real extraction, invalid source rejection, drafting, revisions, and failure messages. Live inference is not verified until this is done.

Backend stores no application data and does not log request bodies. The hosting and AI providers can have their own retention policies; do not claim universal zero retention. Limits are coarse per-IP/per-location throttles, **not** authentication or a global spending cap. Keep a public demo on a bounded account plan and use non-confidential test notes.

Cloudflare references:
- https://developers.cloudflare.com/workers-ai/configuration/bindings/
- https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## User test

Ask a PM to bring a short non-confidential note, correct or reject at least one fact, create a draft, inspect its receipt, then change a decision and regenerate. Ask whether the review effort was worth the corrections saved. Session downloads let the researcher inspect actions locally; refresh clears the session. Returning unprompted for a later update remains an unvalidated retention hypothesis.

Test the normal chat workflow. To evaluate incremental value, independently compare its live results against the same model given the source documents directly. The interface does not claim measured improvements.
