#!/bin/zsh
set -e
cd "${0:A:h}"
export CLOUDFLARE_ACCOUNT_ID=da93266d6b219a2c0cd85355c61b1700
print 'AI Memory Wallet — private OpenAI key setup'
print 'Target: your Cloudflare Worker ai-memory-wallet-live'
print 'Paste your OpenAI API key at the hidden prompt, then press Enter.'
print 'This uploads the key to Cloudflare. It does not save it in this project or send it to chat.'
print 'If asked to create the Worker named ai-memory-wallet-live, choose Yes.'
print ''
if ./node_modules/.bin/wrangler secret put OPENAI_API_KEY --config cloudflare/wrangler.jsonc; then
  print ''
  print 'Cloudflare accepted the secret. The website connection still needs to be completed.'
  print 'You can return to Codex and say: key saved.'
else
  print 'Upload did not finish. Do not share the key; tell Codex only the error message.'
fi
read -r '?Press Enter to close this window.'
