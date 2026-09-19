export function parseRequest(text,sources){
 const clean=text.replace(/^\s*\/prd\s*/i,'').trim();
 const feature=clean.match(/\b(?:prd|product requirements(?: document)?)\s+(?:for|of|about)\s+["“]([^"”]+)["”]/i);
 let title=feature?.[1]||clean.replace(/^(?:help me\s+(?:to\s+)?)?(?:draft|write|create)\s+(?:a\s+)?(?:prd|product requirements(?: document)?)\s*(?:(?:for|of|about)\s+)?/i,'').split(/[,.;]?\s*(?:please\s+)?(?:reference|refer to)\b|[,.;]?\s*(?:and\s+)?(?:directly\s+)?(?:update|publish|save)\s+(?:to\s+)?(?:the\s+)?(?:wiki|confluence)\b/i)[0].replace(/^["“]|["”.,;\s]+$/g,'').trim();
 if(!title)title='Product requirements';
 const clause=clean.match(/\b(?:reference|refer to)\s+(.+?)(?=\s*(?:[,.;]\s*)?(?:and\s+)?(?:directly\s+)?(?:update|publish|save)\b|$)/i)?.[1];
 const names=clause?clause.split(/\s*[,;]\s*|\s+and\s+/i).map(x=>x.replace(/^and\s+/i,'').replace(/^[@"“\s]+|["”\s.,;]+$/g,'').trim()).filter(Boolean):[];
 const normalize=x=>x.toLowerCase().trim();
 const matched=names.map(name=>({name,source:sources.findLast(s=>normalize(s.title)===normalize(name)||s.id===name)}));
 return {title:title.slice(0,180),task:`Draft a PRD for ${title}`.slice(0,240),sourceIds:[...new Set(matched.filter(x=>x.source).map(x=>x.source.id))],missing:matched.filter(x=>!x.source).map(x=>x.name),explicitReferences:names.length>0,wantsWiki:/\b(?:wiki|confluence)\b/i.test(text)};
}
export function contextForRequest(items,request){return items.filter(m=>m.status!=='superseded'&&(!request?.sourceIds?.length||request.sourceIds.includes(m.sourceId)));}
export function writeWikiPreview(pages,{title,body,expectedVersion}){
 if(typeof title!=='string'||!title.trim()||typeof body!=='string'||!body.trim())throw new Error('The wiki preview needs a title and content.');
 const key=title.trim().toLowerCase(),previous=pages[key];
 if((previous?.version||0)!==expectedVersion)throw new Error('This wiki preview changed after you opened it. Close this window and review the latest version.');
 const page={key,title:title.trim(),body,version:expectedVersion+1,savedAt:new Date().toISOString(),destination:'local-preview'};
 pages[key]=page;return structuredClone(page);
}
