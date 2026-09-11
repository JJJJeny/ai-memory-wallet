# Verification

Core and backend contract tests run with `npm test`, using Node's built-in test runner and mocked AI bindings. They cover exact source excerpts, rejection and exclusion, receipt snapshots, untrusted extraction output, backend configuration, CORS, rate limiting, and approved-context-only draft requests.

Browser tests use Playwright and installed Chrome:

```sh
node tests/browser.cjs
node tests/live-ui.cjs
node tests/team-browser.cjs
```

Install Playwright in your development environment, or set `PLAYWRIGHT_MODULE` to its installed module path. These optional browser tests are not required for GitHub Pages' dependency-free deployment workflow. Start `npm run dev` first. Screenshots go in ignored `test-results/`.

Browser coverage: exact natural-language PRD/reference/wiki request, source-name matching and missing references, popup selection/edit/conflict resolution, draft contents, downloadable receipt, wiki cancel/approve/versioning, context reuse across chats, project isolation, pasted notes, HTML escaping, desktop/mobile layouts, and AI retry with a mocked endpoint. The local-mode suite verifies no POST requests or external wiki writes. Set `TEST_BASE_URL` to run the main browser suite against the public deployment.

Native WebMCP browser availability and a live Confluence MCP connector are not verified. They are not required for the local wiki preview flow.

The teammate-update scenario is available after a CloudShield draft includes the sample October 15 milestone: choose **Check teammate updates**. Test adding an explicitly unconfirmed risk, asking for confirmation, simulating the owner reply, reviewing the date change, and drafting again. Dismiss and keep-current preserve the existing milestone. Prior draft receipts remain snapshots. The teammate and owner are seeded examples; no messages are sent and no real agent activity is monitored. Refresh resets this session.

GitHub Pages public access was verified after initial deployment. Recheck it after each new deployment. Still unverified: live Cloudflare model inference, deployed Worker bindings, and retention with real users. Do not present mock tests or local outline generation as AI quality or demand validation.
