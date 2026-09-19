import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../server/db.js';
import {personalCards,savePersonal,reserveAIRequest,personalAI} from '../server/personal.js';
const setup=()=>{const db=openDatabase(':memory:');for(const id of ['a','b'])db.prepare('INSERT INTO users(id,email,created_at) VALUES(?,?,?)').run(id,`${id}@example.test`,new Date().toISOString());return db;};
test('personal account writes are isolated, transactional and reject stale snapshots',()=>{
 const db=setup();try{const items=savePersonal(db,'a',[{id:'local',type:'knowledge',title:'Project',text:'My context'}],[]);assert.equal(items.length,1);assert.equal(personalCards(db,'b').length,0);assert.throws(()=>savePersonal(db,'a',[],[]),/changed/);assert.equal(personalCards(db,'a').length,1);savePersonal(db,'a',[],items);assert.equal(personalCards(db,'a').length,0);}finally{db.close();}
});
test('AI quotas persist in database and fail closed at the daily ceiling',()=>{const db=setup();try{for(let i=0;i<50;i++)reserveAIRequest(db,'a',0);assert.throws(()=>reserveAIRequest(db,'a',0),/limit/);reserveAIRequest(db,'b',0);}finally{db.close();}});
test('OpenAI adapter sends only supplied payload and keeps key server-side',async()=>{
 let body;const result=await personalAI({OPENAI_API_KEY:'test-key',OPENAI_MODEL:'test-model'},{operation:'chat',messages:[{role:'user',content:'Hello'}],context:[]},async(url,options)=>{body=JSON.parse(options.body);assert.equal(options.headers.Authorization,'Bearer test-key');return Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:'Hello back'}]}]});});assert.equal(result.reply,'Hello back');assert.equal(body.store,false);assert.equal(body.max_output_tokens,1800);assert.ok(!JSON.stringify(body).includes('test-key'));
});
