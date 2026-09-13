// Keep the original Figma export intact. Replace only its transfer component.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/figma-assets/index-BlGutucc.js'), 'utf8');
const start = source.lastIndexOf('function tt({items:e,initialSelection:t,onClose:n})');
const end = source.indexOf('var F=`/workspaces/default/.publishing/src/components/ReceiptDrawer.tsx`;', start);
if (start < 0 || end < start) throw new Error('Figma export changed: inspect transfer component before building.');
const replacement = 'function tt(props){return renderTransferDialog(_,props,{destinations:y,compatibility:$e,download:et,instruction:Qe})}';
fs.writeFileSync(path.join(root, 'public/figma-assets/index-wallet.js'), 'import {renderTransferDialog} from "../transfer-dialog.js";\n' + source.slice(0, start) + replacement + source.slice(end));
