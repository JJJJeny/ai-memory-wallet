// Reads the separate local demo password, never the OpenAI key. Uses synthetic text only.
const fs=require('node:fs');
(async()=>{
 const base='https://ai-memory-wallet-live.yajenn91.workers.dev',origin='https://jjjjeny.github.io';
 const password=fs.readFileSync('.env.demo','utf8').trim().split('=')[1];
 const headers={Origin:origin,'Content-Type':'application/json'};
 const unlock=await fetch(`${base}/api/unlock`,{method:'POST',headers,body:JSON.stringify({password})});const session=await unlock.json();if(!unlock.ok)throw Error(session.error);
 const prompt='Explain what a product roadmap is to a beginner.';
 const call=async context=>{const r=await fetch(`${base}/api/context`,{method:'POST',headers:{...headers,Authorization:`Bearer ${session.token}`},body:JSON.stringify({operation:'chat',messages:[{role:'user',content:prompt}],context})});const data=await r.json();if(!r.ok)throw Error(`HTTP ${r.status}: ${data.error}`);return data.reply;};
 const baseline=await call([]),personalized=await call([{id:'test-style',type:'preference',category:'My communication style',text:'Always reply in Traditional Chinese, using exactly three short bullet points. Do not add an introduction or conclusion.'}]);
 console.log(JSON.stringify({baseline,personalized,changed:baseline!==personalized,traditionalChinesePresent:/[\u4e00-\u9fff]/.test(personalized)},null,2));
 if(baseline===personalized||!/[\u4e00-\u9fff]/.test(personalized))throw Error('Preference difference not demonstrated.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
