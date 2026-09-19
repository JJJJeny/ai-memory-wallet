import { createCard, listCards, updateCard, deleteCard, getOwnedCard } from './cards.js';
import { validateItem } from '../public/personal-core.js';
export function personalCards(db, userId) {
  return listCards(db,userId).map(card=>({id:card.id,type:card.type==='workflow'?'skill':card.type,title:card.title,text:card.instructions,updatedAt:card.updatedAt}));
}
export function savePersonal(db,userId,next,previous) {
  if(!Array.isArray(next)||next.length>200||!Array.isArray(previous))throw Error('Invalid wallet.');
  const current=personalCards(db,userId);
  const canonical=rows=>JSON.stringify([...rows].sort((a,b)=>a.id.localeCompare(b.id)));
  if(canonical(current)!==canonical(previous))throw Error('Your wallet changed. Refresh before saving.');
  const ids=new Set();
  for(const item of next){if(!item||typeof item.id!=='string'||item.id.length>80||ids.has(item.id))throw Error('Invalid card ID.');const old=current.find(c=>c.id===item.id);if(!old||old.type!==item.type||old.title!==item.title||old.text!==item.text)validateItem(item);ids.add(item.id);}
  db.exec('BEGIN');try{
    for(const item of current)if(!ids.has(item.id))deleteCard(db,userId,item.id);
    for(const item of next){
      const old=current.find(c=>c.id===item.id);if(old&&old.type===item.type&&old.title===item.title&&old.text===item.text)continue;
      const original=old?getOwnedCard(db,userId,item.id):{};
      const input={...original,type:item.type==='skill'?'workflow':item.type,title:item.title,instructions:item.text};
      old?updateCard(db,userId,item.id,input):createCard(db,userId,input);
    }
    db.exec('COMMIT');return personalCards(db,userId);
  }catch(e){db.exec('ROLLBACK');throw e;}
}
export function reserveAIRequest(db,userId,now=Date.now()) {
  // Durable request quotas bound calls, not dollars; model token limits bound each call.
  const day=new Date(now).toISOString().slice(0,10);
  db.exec('BEGIN IMMEDIATE');try{
    for(const [key,max] of [[`personal-ai-user:${userId}:${day}`,50],[`personal-ai-global:${day}`,100]]){
      const row=db.prepare('SELECT count FROM rate_limits WHERE key=?').get(key);
      if((row?.count||0)>=max)throw Error('Daily AI request limit reached. Try tomorrow.');
      db.prepare('INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+86400000);
    }db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
}
export {personalAI} from "./wallet-ai.js";
