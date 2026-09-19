import test from 'node:test';import assert from 'node:assert/strict';
import {buildAIRequest,personalAI} from '../server/wallet-ai.js';
test('active preferences become instructions, not conversation data',()=>{
 const payload={operation:'chat',messages:[{role:'user',content:'Explain roadmaps'}],context:[{type:'preference',category:'Style',text:'Use Traditional Chinese.'},{type:'knowledge',title:'Project',text:'Reference only'}]};
 const request=buildAIRequest('test',payload);assert.match(request.instructions,/Use Traditional Chinese/);assert.ok(!request.instructions.includes('Reference only'));assert.equal(request.input.at(-1).role,'user');assert.equal(request.store,false);
 const plain=buildAIRequest('test',{...payload,context:[]});assert.ok(!plain.instructions.includes('Traditional Chinese'));assert.equal(plain.input.length,1);
});
test('billing errors are useful but provider internals never leak',async()=>{
 await assert.rejects(()=>personalAI({OPENAI_API_KEY:'test',OPENAI_MODEL:'test'},{operation:'chat',context:[],messages:[]},async()=>Response.json({error:{code:'insufficient_quota',message:'secret diagnostic'}},{status:429})),e=>e.safeMessage.includes('billing')&&!e.message.includes('secret diagnostic'));
});
