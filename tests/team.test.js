import test from 'node:test';
import assert from 'node:assert/strict';
import {canShowTeamUpdate,createTeamUpdate,transitionTeamUpdate,teamRisk} from '../public/team.js';
import {approvedPack,draftFromContext} from '../public/core.js';
test('sample team scenario is scoped to the example milestone',()=>{
 const draft={receipt:{contextSupplied:[{category:'Beta launch',text:'October 15, 2026'}]}};
 assert.equal(canShowTeamUpdate({example:true},draft),true);
 assert.equal(canShowTeamUpdate({example:false},draft),false);
 assert.equal(canShowTeamUpdate({example:true,teamUpdate:{}},draft),false);
});
test('confirmation cannot skip the request and never approves context',()=>{
 const report=createTeamUpdate('draft');
 assert.throws(()=>transitionTeamUpdate(report,'confirm'));
 const requested=transitionTeamUpdate(report,'request');
 const confirmed=transitionTeamUpdate(requested,'confirm');
 assert.equal(report.status,'reported');assert.equal(confirmed.status,'confirmed');
 assert.equal(confirmed.simulated,true);assert.equal(confirmed.approved,undefined);
 assert.throws(()=>transitionTeamUpdate(transitionTeamUpdate(report,'dismiss'),'request'));
});
test('risk is pending, preserves uncertainty and cannot replace milestone',()=>{
 const risk=teamRisk(createTeamUpdate('draft'));
 assert.deepEqual(approvedPack([risk]),[]);
 const text=draftFromContext('Feature',[{id:'date',category:'Beta launch',text:'October 15, 2026'},risk]);
 assert.match(text,/## Milestone\nOctober 15, 2026/);
 assert.match(text,/## Risks awaiting confirmation/);
 assert.match(text,/Unconfirmed engineering risk/);
});
