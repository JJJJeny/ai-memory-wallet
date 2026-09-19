import {personalAI} from '../server/wallet-ai.js';
import {validateItem} from '../public/personal-core.js';
import {DurableObject} from 'cloudflare:workers';
const encoder=new TextEncoder();
const hash=async text=>new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text)));
async function equal(a,b){const x=await hash(a),y=await hash(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
async function signature(secret,value){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function validToken(secret,token){const [expires,nonce,sig,...extra]=token.split('.');if(extra.length||!expires||!nonce||!sig||Number(expires)<Date.now()||Number(expires)>Date.now()+13*3600000)return false;return equal(sig,await signature(secret,`${expires}.${nonce}`));}
async function body(req){if(!req.headers.get('Content-Type')?.includes('application/json'))throw Error('Please send a JSON request.');let size=0,parts=[];const reader=req.body?.getReader();if(!reader)throw Error('Empty request.');while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>40000){await reader.cancel();throw Error('This conversation is too large. Start a new chat.');}parts.push(value);}const data=new Uint8Array(size);let at=0;for(const p of parts){data.set(p,at);at+=p.length;}return JSON.parse(new TextDecoder().decode(data));}
export class WalletBudget extends DurableObject{
 constructor(ctx,env){super(ctx,env);this.sql=ctx.storage.sql;this.sql.exec('CREATE TABLE IF NOT EXISTS counts (key TEXT PRIMARY KEY, n INTEGER NOT NULL, expires INTEGER NOT NULL)');}
 reserve(){return this.ctx.storage.transactionSync(()=>{const now=Date.now();this.sql.exec('DELETE FROM counts WHERE expires < ?',now);const day=`day:${new Date(now).toISOString().slice(0,10)}`,minute=`minute:${Math.floor(now/60000)}`;
  for(const [key,max] of [[day,100],[minute,10]]){const row=[...this.sql.exec('SELECT n FROM counts WHERE key=?',key)][0];if((row?.n||0)>=max)return {error:key===day?'The demo has reached its daily AI limit. Please come back tomorrow.':'Please wait a minute before sending another message.'};}
  for(const [key,ttl] of [[day,86400000],[minute,60000]])this.sql.exec('INSERT INTO counts(key,n,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET n=n+1',key,now+ttl);
  return {ok:true};});
 }
}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 const respond=(data,status=200)=>Response.json(data,{status,headers});
 if(origin!==env.ALLOWED_ORIGIN)return respond({error:'This site is not allowed.'},403);
 Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 const path=new URL(request.url).pathname,ready=Boolean(env.OPENAI_API_KEY&&env.OPENAI_MODEL&&env.DEMO_PASSWORD?.length>=20);
 if(path==='/api/status'&&request.method==='GET')return respond({ready});
 if(!ready)return respond({error:'AI setup is not finished yet. You can still save and organize your wallet.'},503);
 if(request.method!=='POST')return respond({error:'Not found.'},404);
 try{
  if(path==='/api/unlock'){
   if(!env.LOGIN_LIMIT||!(await env.LOGIN_LIMIT.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'})).success)return respond({error:'Too many attempts. Please wait a minute.'},429);
   const data=await body(request);if(typeof data.password!=='string'||data.password.length>200||!await equal(data.password,env.DEMO_PASSWORD))return respond({error:'That demo password is not correct.'},401);
   const value=`${Date.now()+12*3600000}.${crypto.randomUUID()}`;return respond({token:`${value}.${await signature(env.DEMO_PASSWORD,value)}`});
  }
  if(path!=='/api/context')return respond({error:'Not found.'},404);
  if(!await validToken(env.DEMO_PASSWORD,(request.headers.get('Authorization')||'').replace(/^Bearer /,'')))return respond({error:'Please unlock AI again. Your demo session expired.'},401);
  const data=await body(request);
  let payload;
  if(data.operation==='remember'){if(typeof data.text!=='string'||!data.text.trim()||data.text.length>12000)throw Error('Please shorten the text to save.');payload={operation:'remember',text:data.text};}
  else if(data.operation==='chat'){
   if(!Array.isArray(data.messages)||!data.messages.length||data.messages.length>10||data.messages.at(-1)?.role!=='user'||data.messages.some(m=>!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>4000))throw Error('Please start a new chat or shorten your message.');
   if(!Array.isArray(data.context)||data.context.length>24)throw Error('Choose up to 24 cards.');
   const context=data.context.map(c=>validateItem({type:c.type,title:c.category,text:c.text}));
   payload={operation:'chat',messages:data.messages.map(({role,content})=>({role,content})),context};
  }else throw Error('Unsupported action.');
  const budget=await env.BUDGET.getByName(`demo-budget:${new Date().toISOString().slice(0,10)}`).reserve();if(!budget.ok)return respond(budget,429);
  try{return respond(await personalAI(env,payload));}catch(e){return respond({error:e.safeMessage||'The AI response could not be completed. Please retry; your wallet has not changed.'},502);}
 }catch(e){return respond({error:e instanceof SyntaxError?'That request could not be read.':e.message},400);}
}};
