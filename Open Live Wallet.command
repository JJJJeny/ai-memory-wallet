#!/bin/zsh
set -e
cd "${0:A:h}"
print 'Open your live AI Memory Wallet'
print 'This copies your private demo password to the clipboard (replacing its current contents).'
read -r '?Press Enter to continue, or Ctrl+C to cancel.'
node -e 'const fs=require("node:fs"),{spawnSync}=require("node:child_process");const value=fs.readFileSync(".env.demo","utf8").trim().split("=")[1];if(!value)throw Error("Demo password is missing");const result=spawnSync("pbcopy",[],{input:value});if(result.status)process.exit(1);'
open 'https://jjjjeny.github.io/ai-memory-wallet/?v=cloud-live-1'
print 'On the website, click Unlock AI, paste, and confirm.'
print 'This is a demo password, NOT your OpenAI key. Share it only with invited testers.'
read -r '?Press Enter to close.'
