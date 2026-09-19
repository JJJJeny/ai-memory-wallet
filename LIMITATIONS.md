# Honest limitations

- This is a personal MVP, not a team product. There is no shared workspace, no teammate activity, and no approval queue.
- Portability means **preview, copy, and JSON backup**. The app does not connect to ChatGPT, Claude, or Cursor and does not claim identical model behavior.
- Sign-in on your computer uses a link shown on the page and in the terminal. Real email sending is not built yet. Do not host real private cards on the public internet until that exists and `ALLOW_DEV_MAGIC_LINK` is false.
- GitHub Pages is a public landing page. It cannot keep your wallet private.
- SQLite on a host without a persistent disk will lose cards when the host restarts.
- Optional AI is off until you add a server-side model key. The app will not invent a fake suggestion.
- Deletion is immediate inside this app. We cannot promise that a host, browser, or backup disk has forgotten the data.
- No encryption-at-rest, compliance, or “zero retention” claims.
- Example cards are generic templates. They are labeled and optional. They are not Jenny’s personal data.
- The archived Figma prototype still contains older team-product visuals and sample company data. It is not the working wallet.
