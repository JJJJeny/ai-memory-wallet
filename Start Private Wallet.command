#!/bin/zsh
# Run this yourself in Terminal. Secret input is not echoed or written to a file.
set -e
cd "${0:A:h}"
print 'AI Memory Wallet — private local app'
print 'Your API key will stay in memory for this run. Close this terminal to stop the app.'
read -r -s 'OPENAI_API_KEY?OpenAI API key (hidden; Enter to skip live AI): '
print ''
if [[ -n "$OPENAI_API_KEY" ]]; then
  read -r 'OPENAI_MODEL?Your OpenAI model ID: '
  if [[ -z "$OPENAI_MODEL" ]]; then
    print 'A model ID is required for live AI. Restart when you have selected one.'
    exit 1
  fi
fi
export OPENAI_API_KEY OPENAI_MODEL
export HOST=127.0.0.1 PORT=4174 ALLOW_DEV_MAGIC_LINK=true
print 'Open http://127.0.0.1:4174 in your browser. Live AI calls may incur API charges.'
print 'The app limits personal AI calls to 50 per account and 100 total each UTC day.'
exec node server/index.js
