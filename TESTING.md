# Test report

Automated tests: `npm test` (Node’s built-in runner). No extra install.

## Passed

| Requirement | How it was checked |
| --- | --- |
| Sign in | Magic-link request + confirm sets an HTTP-only session cookie |
| Create a preference and a workflow | `POST /api/cards` for both types |
| Persist after refresh | Same cookie, `GET /api/cards` returns both cards |
| Persist after sign-out and sign-in | New magic link for the same email returns the same cards |
| Another account cannot read or change my cards | Second email sees zero cards; PATCH/DELETE of Jenny’s id returns 404; Jenny’s card is unchanged |
| Edit and delete | PATCH updates instructions; DELETE removes the card; duplicate keeps a copy |
| Select / preview / unselected excluded | `buildInstructionPackage` unit tests; mixed list is the default filter |
| Copy with fallback | Unit of package text plus UI fallback (`execCommand` / select text) in `public/app.js` |
| Export / import without silent overwrite | Import without resolutions fails; preview reports conflicts; keep-both adds a new card and leaves the original |
| API failure does not block manual use | With no model key, `POST /api/cards` still works; `POST /api/propose` returns 503 and no fake proposal |
| Public page does not include server wallet contents | `GET /` after creating a secret card does not contain that text; `/api/me` without cookie is signed out |
| Browser-only demo store | Demo wallet create/select package/import/session tests in `tests/wallet.test.js` |
| No secrets in frontend | `public/config.js` has no keys; grep of `public/` for typical secret names |
| Imported markup is stored as text | `<script>` / `onerror` remain data, not executed by the API |

## Failed

None in the automated suite at the time this file was written. Re-run `npm test` after changes.

## Untested / limited

| Item | Why |
| --- | --- |
| Real email delivery | No email provider is configured. Local mode shows the link. |
| Live OpenAI / Anthropic | No keys in this environment. Propose path is tested only for the disabled/error case. |
| Hosted production with `ALLOW_DEV_MAGIC_LINK=false` | Not deployed; do not put real private data on a public host until email sending exists. |
| Browser clipboard permission dialog | Automated API tests do not click a real browser prompt. The fallback path is implemented. |
| Desktop and mobile layout | Implemented with a single-column mobile layout and 44px targets. Confirm in a real browser after `npm start`. |
| GitHub Pages after this change | Workflow still publishes `public/`. Confirm the live demo shows the honest banner and does not show anyone else’s server cards. |
| Old Figma / team / PRD prototype | Archived; not part of the personal MVP. |

## Manual check (about 5 minutes)

1. `npm start` and open http://127.0.0.1:4173
2. Sign in with your email using the on-page link.
3. Add one preference and one workflow.
4. Refresh. Both cards are still there.
5. On one My Wallet list (no Preference / Skill tabs), select only one card, confirm Preview shows that card’s exact text and not the other, copy.
6. Export, change a title in the JSON, import, choose **Keep both**.
7. Sign out, sign in again, cards remain.
8. Narrow the window to phone width and repeat Add / Use.

## Static Pages demo (no Node API)

```sh
npx serve public
```

1. Open the printed URL. You should land in **My Wallet** with the banner: **Demo — cards stay in this browser only; not private / not the full server wallet**.
2. Click **Add labeled examples**.
3. **Select** one card. Confirm **Preview** shows that card’s exact text and not the others.
4. Click **Copy**. If the clipboard is blocked, the text is selected so you can copy it yourself.
5. Do not type real private cards into this demo.
