// Run with PLAYWRIGHT_MODULE pointing to Playwright if it is not installed locally.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const url = process.env.PROTOTYPE_URL || 'http://127.0.0.1:4173/';
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      const trigger = page.getByRole('button', { name: 'Connect more', exact: true });
      await trigger.click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      const bounds = await dialog.boundingBox();
      assert(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height);
      assert(await dialog.evaluate(el => el.scrollHeight <= el.clientHeight + 1), 'Dialog contents spill outside container');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
      const next = dialog.getByRole('button', { name: 'Preview handoff →' });
      assert(await next.isVisible());
      await page.keyboard.press('Shift+Tab');
      assert(await next.evaluate(el => el === document.activeElement), 'Focus did not wrap');
      for (const name of ['ChatGPT', 'OpenCode', 'Claude']) {
        await dialog.getByRole('button', { name, exact: true }).click();
        assert.equal(await dialog.getByRole('button', { name, exact: true }).getAttribute('aria-pressed'), 'true');
      }
      for (const checkbox of await dialog.getByRole('checkbox').all()) if (await checkbox.isChecked()) await checkbox.uncheck();
      assert(await next.isDisabled(), 'Empty selection must not continue');
      await dialog.getByRole('checkbox').first().check();
      await next.click();
      assert.match(await dialog.innerText(), /1 context items ready for Claude/);
      assert.match(await dialog.innerText(), /No account connected or data sent/);
      assert.equal(await dialog.locator('.wallet-transfer-body').evaluate(el => el.scrollTop), 0);
      await dialog.getByText('Export options', { exact: true }).click();
      const downloadPromise = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Download JSON' }).click();
      const download = await downloadPromise;
      const stream = await download.createReadStream();
      let text = ''; for await (const chunk of stream) text += chunk;
      const exported = JSON.parse(text);
      assert.equal(exported.items.length, 1);
      assert.equal(exported.destination, 'Claude');
      assert.equal(exported.sample, true);
      const mdPromise = page.waitForEvent('download');
      await dialog.getByRole('button', { name: 'Download Markdown' }).click();
      assert.equal((await mdPromise).suggestedFilename(), 'wallet-context.md');
      await dialog.getByRole('button', { name: 'Back to selection' }).click();
      assert(await dialog.getByRole('checkbox').first().isChecked());
      await page.screenshot({ path: `test-results/transfer-${viewport.width}.png` });
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert(await trigger.evaluate(el => el === document.activeElement), 'Focus was not restored');
      await trigger.click();
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}×${viewport.height}: containment, selection, preview, downloads, focus, close`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
