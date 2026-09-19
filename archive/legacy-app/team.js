// Seeded scenario only. No agent messages or owner confirmations are live.
export function canShowTeamUpdate(workspace,draft){
 return workspace.example && !workspace.teamUpdate && draft?.receipt?.contextSupplied.some(x=>x.category==='Beta launch'&&x.text==='October 15, 2026');
}
export function createTeamUpdate(draftId){
 return {id:crypto.randomUUID(),draftId,status:'reported',riskAdded:false,simulated:true,
  owner:'Alex Rivera · Engineering lead',
  report:'The staging API migration blocks integration testing. Engineering estimates the beta may move from October 15 to October 22, 2026. The launch owner has not confirmed a new date.',
  sourceTitle:'Engineering dependency check · Sample agent report'};
}
export function transitionTeamUpdate(update,event){
 const next={...update};
 if(event==='dismiss'&&update.status==='reported')next.status='dismissed';
 else if(event==='request'&&update.status==='reported')next.status='requested';
 else if(event==='confirm'&&update.status==='requested')next.status='confirmed';
 else throw new Error('This update has already changed. Review its current status.');
 return next;
}
export function teamRisk(update){
 return {id:`risk-${update.id}`,category:'Launch risk',text:`Unconfirmed engineering risk: ${update.report} Keep October 15 as the approved milestone until a replacement is reviewed.`,sourceId:`report-${update.id}`,excerpt:update.report,status:'pending',allowed:true};
}
