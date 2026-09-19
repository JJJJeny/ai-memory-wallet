import test from 'node:test';
import assert from 'node:assert/strict';
import {validateItem,parseBackup,mergeItems,selectedContext,contextPackage,saveIntent} from '../public/personal-core.js';
import worker from '../backend/worker.js';
const card={id:'a',type:'preference',title:'My style',text:'Be concise.'};
test('personal cards validate, whitelist properties and reject oversized input',()=>{
 assert.deepEqual(validateItem({...card,secret:'not copied'}),{type:'preference',title:'My style',text:'Be concise.'});
 for(const bad of [{...card,type:'system'},{...card,text:' '},{...card,text:'x'.repeat(1201)},{...card,title:'x'.repeat(61)}])assert.throws(()=>validateItem(bad));
});
test('backup merge preserves existing cards and skips exact duplicates',()=>{
 const imported=parseBackup(JSON.stringify({version:1,items:[card,{...card,text:'Use plain language.'}]}));
 const merged=mergeItems([card],imported,()=> 'b');assert.equal(merged.length,2);assert.equal(merged[0],card);assert.equal(merged[1].id,'b');
 assert.throws(()=>parseBackup('{"version":2,"items":[]}'));assert.throws(()=>parseBackup('{"version":1,"items":[{}]}'));
});
test('only selected context enters chat and portable package',()=>{
 const cards=[card,{...card,id:'private',text:'Never selected'}];const selected=new Set(['a']);
 assert.equal(selectedContext(cards,selected).length,1);assert.ok(!contextPackage(cards,selected).includes('Never selected'));assert.equal(saveIntent('Save this as a preference'),true);assert.equal(saveIntent('Help me write an email'),false);
});
test('remember returns a validated proposal, not a persistence claim',async()=>{
 const origin='https://jjjjeny.github.io'; const env={API_ENABLED:'true',ALLOWED_ORIGINS:origin,PER_VISITOR:{limit:async()=>({success:true})},PER_LOCATION:{limit:async()=>({success:true})},AI:{run:async()=>({response:JSON.stringify(card)})}};
 const request=()=>new Request('https://example.test/api/context',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({operation:'remember',text:'Save my preference to be concise.'})});
 const response=await worker.fetch(request(),env);assert.equal(response.status,200);assert.deepEqual((await response.json()).item,validateItem(card));
 env.AI.run=async()=>({response:'{"type":"system","title":"bad","text":"bad"}'});assert.equal((await worker.fetch(request(),env)).status,502);
});
