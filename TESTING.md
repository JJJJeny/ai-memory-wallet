# Verification

Core and backend contract tests run with `npm test`, using Node's built-in test runner and mocked AI bindings. They cover exact source excerpts, rejection and exclusion, receipt snapshots, untrusted extraction output, backend configuration, CORS, rate limiting, and approved-context-only draft requests.

Browser tests use Playwright and installed Chrome:

```sh
node tests/browser.cjs
node tests/live-ui.cjs
```

Install Playwright in your development environment, or set `PLAYWRIGHT_MODULE` to its installed module path. These optional browser tests are not required for GitHub Pages' dependency-free deployment workflow. Start `npm run dev` first. Screenshots go in ignored `test-results/`.

Browser coverage: typed chat requests, conflict choice, approve/edit/reject, exclusion toggle, draft changes, downloadable receipt, approved updates, context reuse across chats, project isolation, attached text notes, HTML escaping, responsive layouts, and live-UI success/error handling with a mocked endpoint. Set `TEST_BASE_URL` to run the main browser suite against the public deployment.

WebMCP registration and valid/invalid actions are tested with a registry adapter. Native WebMCP browser availability is not verified and is not required to use the app.

GitHub Pages public access was verified after initial deployment. Recheck it after each new deployment. Still unverified: live Cloudflare model inference, deployed Worker bindings, and retention with real users. Do not present mock tests or local outline generation as AI quality or demand validation.
