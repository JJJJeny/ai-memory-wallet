# Figma interactive prototype publication

The default public page now serves the owner's published Figma Make prototype from https://sheen-press-84937274.figma.site/ using local copies of its JS and CSS assets. Relative asset paths support the GitHub Pages /ai-memory-wallet/ project path. The optional Figma community banner is not required to run the app.

The original chat prototype remains at `public/legacy-chat.html`. This publication does not enable a paid model API, external account connections, real team synchronization, or enterprise access controls. The Figma app's sample-data and simulated-tool labels remain intact.

These are compiled Figma assets, not editable React source files. Prefer the Figma Make source export for future application changes. Backend OpenAI preparation is separate from this static publication and remains disabled.

## Connect more fix

The transfer dialog is maintained in `public/transfer-dialog.js` and `public/transfer-dialog.css`. Run `node scripts/build-transfer-fix.cjs` to generate `public/figma-assets/index-wallet.js` from the untouched original export. Only the transfer component is replaced.

The dialog uses a bounded scrolling body with a visible header/footer, keyboard focus containment and restoration, and a two-step selection/preview flow. Export options appear only in the preview. Destination compatibility filters apply to both preview and downloads; this is prototype behavior, not enterprise access enforcement. No external account is connected.
