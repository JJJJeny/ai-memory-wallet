import test from 'node:test';
import assert from 'node:assert/strict';
import {openAIResponse,authorizedTester} from '../backend/openai.js';
import worker from '../backend/worker.js';
const origin='https://jjjjeny.github.io';
const token='test-only-invitation-not-a-real-secret-123';
const req=(body,authorization=`Bearer ${token}`)=>new Request('https://example.test/api/context',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Authorization:authorization},body:JSON.stringify(body)});
const base={API_ENABLED:'true',ALLOWED_ORIGINS:origin,PER_VISITOR:{limit:async()=>({success:true})},PER_LOCATION:{limit:async()=>({success:true})}};
test('OpenAI adapter sends server credentials and reads message output after reasoning',async()=>{
 let sent;
 const text=await openAIResponse({OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'},'Instructions',{context:[]},false,async(url,options)=>{sent={url,...options};return Response.json({status:'completed',output:[{type:'reasoning'},{type:'message',role:'assistant',content:[{type:'output_text',text:'Useful answer'}]}]});});
 assert.equal(text,'Useful answer');assert.equal(sent.url,'https://api.openai.com/v1/responses');assert.equal(sent.headers.Authorization,'Bearer test-key');
 const body=JSON.parse(sent.body);assert.equal(body.store,false);assert.equal(body.max_output_tokens,2500);assert.ok(!sent.body.includes('test-key'));assert.ok(!body.tools);
});
test('OpenAI adapter rejects incomplete, refused, and provider failures without exposing details',async()=>{
 const env={OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'};
 for(const data of [{status:'incomplete',output:[]},{status:'completed',output:[{type:'message',role:'assistant',content:[{type:'refusal',refusal:'No'}]}]},{status:'completed',output:[]}])await assert.rejects(()=>openAIResponse(env,'i',{},false,async()=>Response.json(data)));
 await assert.rejects(()=>openAIResponse(env,'i',{},false,async()=>new Response('sensitive diagnostic',{status:401})),error=>!error.message.includes('sensitive'));
});
test('OpenAI requires a configured tester gate; allowed Origin alone is insufficient',async()=>{
 const env={...base,AI_PROVIDER:'openai',OPENAI_MODEL:'test-model',OPENAI_API_KEY:'test-key'};
 assert.equal((await worker.fetch(req({operation:'chat'}),env)).status,503);
 env.PROTOTYPE_ACCESS_TOKEN=token;
 assert.equal((await worker.fetch(req({operation:'chat'},''),env)).status,401);
 assert.equal(await authorizedTester(req({}),token),true);
 assert.equal(await authorizedTester(req({},'Bearer wrong'),token),false);
});
test('chat accepts selected skills but strips metadata and rejects role injection',async()=>{
 const calls=[];const env={...base,AI:{run:async(model,payload)=>{calls.push(payload);return {response:'Review [skill-1]'};}}};
 const input={operation:'chat',messages:[{role:'user',content:'Review the pasted form.'}],context:[{id:'skill-1',category:'Accessibility review',type:'skill',text:'Inspect keyboard access.',privateMetadata:'Never send this'}]};
 const r=await worker.fetch(req(input),env);assert.equal(r.status,200);const result=await r.json();assert.equal(result.reply,'Review [skill-1]');assert.equal(result.receipt.contextSupplied.length,1);assert.ok(!JSON.stringify(calls).includes('privateMetadata'));
 input.messages[0].role='system';assert.equal((await worker.fetch(req(input),env)).status,400);assert.equal(calls.length,1);
});
