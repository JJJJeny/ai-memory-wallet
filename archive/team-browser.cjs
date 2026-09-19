const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],posts=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
 const click=action=>page.locator(`[data-action="${action}"]:visible`).last().click();
 const start=async()=>{await page.goto(process.env.TEST_BASE_URL||'http://127.0.0.1:4173');await click('starter');await page.getByRole('button',{name:'Send message',exact:true}).click();await click('choose-new');await click('confirm-context');await page.locator('.draft-document').waitFor();await click('team-check');};
 await start();const original=await page.locator('.draft-content').first().textContent();
 await click('team-risk');await click('close-dialog');await click('team-risk');
 assert.equal(await page.locator('.proposal').filter({hasText:'Unconfirmed engineering risk'}).count(),1);
 await click('confirm-context');assert.equal(await page.locator('.draft-document').count(),2);
 assert.match(await page.locator('.draft-content').last().textContent(),/Risks awaiting confirmation/);
 assert.match(await page.locator('.draft-content').last().textContent(),/MilestoneOctober 15, 2026/);
 await click('team-request');assert.match(await page.locator('.team-update').textContent(),/No message was sent/);
 await page.locator('.team-update').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/team-update-desktop.png'});
 await click('team-confirm');assert.match(await page.locator('.team-update').textContent(),/Your review is still required/);
 await click('team-review');await click('choose-new');await click('confirm-context');
 const latest=await page.locator('.draft-content').last().textContent();assert.match(latest,/MilestoneOctober 22, 2026/);assert.ok(!latest.includes('Unconfirmed engineering risk'));
 assert.equal(await page.locator('.draft-content').first().textContent(),original);
 await click('wiki-review');await click('apply-wiki');assert.match(await page.locator('.wiki-saved').textContent(),/No Confluence page was changed/);
 await click('new-chat');await page.locator('#message').fill('/PRD Certificate Alert Filtering');await page.getByRole('button',{name:'Send message',exact:true}).click();await click('confirm-context');assert.match(await page.locator('.draft-content').textContent(),/MilestoneOctober 22, 2026/);
 await start();await click('team-dismiss');assert.match(await page.locator('.team-update').textContent(),/milestone is unchanged/);assert.equal(await page.locator('.draft-document').count(),1);
 await start();await click('team-request');await click('team-confirm');await click('team-review');await click('choose-old');await click('confirm-context');assert.match(await page.locator('.draft-content').last().textContent(),/MilestoneOctober 15, 2026/);
 await page.setViewportSize({width:390,height:844});await start();await page.locator('.team-update').scrollIntoViewIfNeeded();await page.screenshot({path:'test-results/team-update-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await click('team-request');await click('team-confirm');await click('team-review');await click('choose-new');await click('confirm-context');assert.match(await page.locator('.draft-content').last().textContent(),/MilestoneOctober 22, 2026/);
 assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);
 console.log('PASS: team risk/cancel/retry, simulated request and reply, explicit date review, keep/dismiss, immutable prior drafts, future-chat reuse, wiki preview, mobile; no external messages.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
