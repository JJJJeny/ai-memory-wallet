const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const url = process.env.PROTOTYPE_URL || 'http://127.0.0.1:4173/';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
  for(const viewport of [{width:1440,height:1050},{width:390,height:844}]){
   const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
   await page.getByRole('button',{name:'+ Add',exact:true}).click();
   await page.getByLabel('Category',{exact:true}).selectOption('preference');await page.getByLabel('Title',{exact:true}).fill('My writing style');await page.getByLabel('Instructions or context').fill('Be concise. Preserve my meaning. Do not invent facts.');await page.getByRole('dialog').getByRole('button',{name:'Save to wallet',exact:true}).click();
   await page.reload();assert.match(await page.locator('#item-count').innerText(),/1 saved item/);
   await page.getByRole('button',{name:'Choose context',exact:true}).click();await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Done',exact:true}).click();assert.match(await page.locator('#selection').innerText(),/My writing style/);
   await page.getByRole('button',{name:'+ Add',exact:true}).click();await page.getByLabel('Title',{exact:true}).fill('Unselected skill');await page.getByLabel('Instructions or context').fill('THIS MUST NOT BE SENT');await page.getByRole('dialog').getByRole('button',{name:'Save to wallet',exact:true}).click();
   await page.getByLabel('Message',{exact:true}).fill('Help me draft an email.');await page.getByRole('button',{name:'Send ↑',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(await page.locator('.bubble.assistant').count(),0);
   await page.getByLabel('Your backend URL').fill('https://wallet-test.example');await page.getByLabel('Personal access code (this tab only)').fill('test-only-personal-access-code-1234567890');await page.getByRole('button',{name:'Save connection settings'}).click();
   let sent;let fail=false;
   await page.route('https://wallet-test.example/api/context',route=>{
    sent=route.request().postDataJSON();
    return route.fulfill({status:fail?502:200,contentType:'application/json',body:JSON.stringify(fail?{error:'Test provider unavailable'}:sent.operation==='remember'?{item:{type:'preference',title:'Reviewed style',text:'Use plain language.'},model:'test-only'}:{reply:'Test fixture: who is the email for?',model:'test-only'})});
   });
   await page.getByRole('button',{name:'Send ↑',exact:true}).click();await page.locator('.bubble.assistant').waitFor();assert.equal(sent.context.length,1);assert.equal(sent.context[0].category,'My writing style');assert.ok(!JSON.stringify(sent).includes('THIS MUST NOT BE SENT'));
   await page.locator('.bubble.assistant').getByRole('button',{name:'Save to wallet'}).click();await page.getByRole('dialog').waitFor();await page.getByLabel('Title',{exact:true}).waitFor();assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'Reviewed style');assert.match(await page.locator('#item-count').innerText(),/2 saved items/);await page.getByRole('dialog').getByRole('button',{name:'Save to wallet',exact:true}).click();assert.match(await page.locator('#item-count').innerText(),/3 saved items/);
   page.on('dialog',d=>d.accept());await page.getByRole('button',{name:'New chat ↗'}).click();assert.equal(await page.locator('.bubble').count(),0);assert.match(await page.locator('#selection').innerText(),/My writing style/);
   fail=true;await page.getByLabel('Message',{exact:true}).fill('Try again');await page.getByRole('button',{name:'Send ↑',exact:true}).click();await page.getByRole('button',{name:'Retry',exact:true}).waitFor();assert.equal(await page.locator('.bubble.assistant').count(),0);
   await page.getByRole('button',{name:'New chat ↗'}).click();
   await page.screenshot({path:`test-results/personal-${viewport.width}.png`,fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByText('Storage & backups',{exact:true}).click();const wait=page.waitForEvent('download');await page.getByRole('button',{name:'Export wallet'}).click();const download=await wait;let data='';for await(const chunk of await download.createReadStream())data+=chunk;assert.equal(JSON.parse(data).items.length,3);
   await page.getByLabel('Import a wallet backup').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(data)});assert.match(await page.locator('#item-count').innerText(),/3 saved items/);
   await page.getByRole('button',{name:'Close',exact:true}).click();await page.locator('.category.preference').getByRole('button',{name:'Open →'}).click();await page.getByRole('button',{name:'Edit',exact:true}).first().click();await page.getByLabel('Title',{exact:true}).fill('Updated style');await page.getByRole('dialog').getByRole('button',{name:'Save to wallet',exact:true}).click();assert.match(await page.locator('#selection').innerText(),/Updated style/);
   await page.locator('.category.preference').getByRole('button',{name:'Open →'}).click();await page.getByRole('button',{name:'Delete',exact:true}).first().click();assert.match(await page.locator('#item-count').innerText(),/2 saved items/);assert.equal(await page.locator('#selection .chip').count(),0);
   assert.deepEqual(errors,[]);console.log(`PASS ${viewport.width}: persistence, selected-only payload, review gate, new chat, errors, backup, edit/delete, responsive layout (AI mocked)`);await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
