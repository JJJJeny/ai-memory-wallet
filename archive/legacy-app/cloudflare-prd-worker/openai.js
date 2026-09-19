// Server-only adapter. Never import this module into the public frontend.
export async function openAIResponse(env, instructions, payload, json=false, fetchImpl=fetch) {
  if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) throw new Error('OpenAI is not configured.');
  const response=await fetchImpl('https://api.openai.com/v1/responses', {
    method:'POST',
    headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
    signal:AbortSignal.timeout(45000),
    body:JSON.stringify({
      model:env.OPENAI_MODEL,
      instructions,
      input:JSON.stringify(payload),
      store:false,
      max_output_tokens:2500,
      ...(json?{text:{format:{type:'json_object'}}}:{})
    })
  });
  // Never echo provider errors, secrets, or raw request data to a browser.
  if (!response.ok) throw new Error('The AI provider could not complete this request.');
  const result=await response.json();
  if (result.status!=='completed' || !Array.isArray(result.output)) throw new Error('The AI response is incomplete.');
  const messages=result.output.filter(item=>item.type==='message'&&item.role==='assistant');
  if (messages.some(item=>item.content?.some(part=>part.type==='refusal'))) throw new Error('The AI declined this request.');
  const text=messages.flatMap(item=>item.content||[]).filter(part=>part.type==='output_text'&&typeof part.text==='string').map(part=>part.text).join('\n').trim();
  if (!text) throw new Error('The AI returned no text.');
  return text;
}

export async function authorizedTester(request,secret) {
  if(typeof secret!=='string'||secret.length<32)return false;
  const provided=request.headers.get('Authorization')||'';
  if(provided.length>300)return false;
  const encode=new TextEncoder();
  const [actual,expected]=await Promise.all([provided,`Bearer ${secret}`].map(value=>crypto.subtle.digest('SHA-256',encode.encode(value))));
  const a=new Uint8Array(actual),b=new Uint8Array(expected);let mismatch=0;
  for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];
  return mismatch===0;
}
