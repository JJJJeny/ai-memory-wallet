// Generates a separate demo password, never reads the OpenAI key.
const fs=require('node:fs'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const file='.env.demo';
if(!fs.existsSync(file))fs.writeFileSync(file,`DEMO_PASSWORD=${crypto.randomBytes(18).toString('base64url')}\n`,{mode:0o600,flag:'wx'});
const password=fs.readFileSync(file,'utf8').trim().split('=')[1];
if(!password||password.length<20)throw Error('Invalid private demo-password file.');
const result=spawnSync('./node_modules/.bin/wrangler',['secret','put','DEMO_PASSWORD','--config','cloudflare/wrangler.jsonc'],{input:password,encoding:'utf8'});
if(result.status!==0){console.error('Demo-password upload failed. Check your Cloudflare sign-in.');process.exit(1);}
console.log('Demo password stored in Cloudflare. Private local copy: .env.demo (excluded from Git).');
