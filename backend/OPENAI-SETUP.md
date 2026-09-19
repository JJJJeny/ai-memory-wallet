# OpenAI backend preparation

Status: the personal frontend is wired to this API contract; deployment and credentials are not configured. Tests use mocks and incur no OpenAI charges. Live inference is NOT verified.

## Architecture

GitHub Pages serves public frontend files. A Cloudflare Worker calls the OpenAI Responses API using a server-side secret. The browser receives generated text and a snapshot of the selected context. It never receives the OpenAI key. This does not connect anyone's ChatGPT or Claude account, provide an MCP endpoint, monitor GitHub, or implement multi-user team authorization.

## Account setup before deployment

1. The new personal interface is editable source in `public/personal.js`; no Figma source export is needed. Cards are stored in the current browser, not a cloud account. Do not enter confidential data on a shared browser profile.
2. Create or select an OpenAI API project with billing and appropriate usage controls. Choose an available Responses-compatible text model. Do not paste credentials in chat.
3. Authenticate the Cloudflare deployment CLI to your own account.
4. In `backend/wrangler.jsonc`, set `AI_PROVIDER` to `openai` and `OPENAI_MODEL` to the chosen model ID. Leave `API_ENABLED` false during setup.
5. Set `OPENAI_API_KEY` with `wrangler secret put OPENAI_API_KEY`, running from `backend/`. Enter the key only in the secure CLI prompt.
6. Set a separate randomly generated tester invitation secret of at least 32 characters using `wrangler secret put PROTOTYPE_ACCESS_TOKEN`. This is not the OpenAI key. Supply it privately to testers, never in public source or frontend configuration.
7. Keep the frontend publicly accessible, but require this separate invitation code for paid AI requests. The personal frontend now has the access-code input, disclosure, error states, and request adapter. The invitation code stays in tab memory, never localStorage. Re-enter it after refresh.
8. Verify allowed origins and rate-limit bindings, then deploy the disabled Worker. Enter its HTTPS origin in the website's Settings, along with the separate invitation code. The URL is saved locally; do not put the OpenAI key in this form.
9. With cost controls and frontend consent in place, enable `API_ENABLED` and test a minimal real request. Publishing the frontend alone does not enable inference.

Current rate limits are per visitor and per Cloudflare location. They are not a global monetary cap. A shared tester code is a prototype gate, not production user authentication. Rotate it if exposed. Real shared team data needs server-side accounts, membership checks, and durable storage before claiming enforced Private/Team/Public visibility.

## Frontend contract

`POST /api/context`, headers `Content-Type: application/json` and `Authorization: Bearer <tester invitation code>`.

```json
{
  "operation": "chat",
  "messages": [{"role": "user", "content": "Review this form..."}],
  "context": [{"id": "skill-1", "type": "skill", "category": "Accessibility review", "text": "Inspect keyboard navigation and error recovery."}]
}
```

Send only the selected context after explicit user consent. Allowed item types: skill, preference, knowledge, decision. The server accepts up to 10 messages, 24 items, and a 40 KB request. The last message must be from the user. The response includes `reply`, `model`, and `receipt`. No raw sources or private metadata are sent unless explicitly selected as item text. Existing `extract` and `draft` operations remain available.

Display the actual model provider as OpenAI. Do not label OpenAI output as a real Claude or OpenCode account response. Do not silently substitute canned answers after API errors.

`POST /api/context` also accepts `{"operation":"remember","text":"an excerpt to turn into a reusable card"}` and returns `item: {type,title,text}`. The frontend must review and confirm before saving. It does not perform any server-side wallet write.

## What this version does not implement

- No account sign-in or cloud wallet database. Local cards are not encrypted; clearing site data removes them. JSON backup/import is available in Settings.
- No durable global spend cutoff. Do not open the paid endpoint to general public use. The separate invitation code is for personal testing only. Before wider access, add real user authentication and a durable usage ledger with an enforced quota.
- No external assistant account integration or cross-device sync. Portable context is copy/export.
- `AI not connected` is intentional until the backend is set up. Saving connection settings does not verify credentials; only a successful request does.

`store:false` disables storage of the Response for later API retrieval. It is not a promise of zero retention across all provider systems.

References: https://developers.openai.com/api/docs/guides/text and https://developers.openai.com/api/reference/overview#authentication
