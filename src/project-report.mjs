import {jsPDF} from 'jspdf';
import {autoTable} from 'jspdf-autotable';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STAGES=['Solution','Development','Testing','PVT','Go live'];
const STATUSES=['Not started','On track','At risk','Blocked','Complete'];
export function reportFor(project,tasks=[]){
 const r=project.statusReport||{};
 const base={status:STATUSES.includes(project.status)?project.status:'Not started',asOf:'',goLive:project.target||'',summary:'',nextSteps:'',stages:STAGES.map(name=>({name,date:'',status:'Planned'})),decisions:[],notes:[{title:'Current solution',text:''},{title:'Scope and exclusions',text:''},{title:'Dependencies and flexibility',text:''}],...r,testing:{pass:0,fail:0,blocked:0,remaining:0,...r.testing}};
 const linked=tasks.filter(t=>t.project===project.id&&t.type!=='request');
 const records=project.deliveryRecords;
 base.goLive=project.target||base.goLive;
 base.nextSteps=linked.filter(t=>t.status!=='done').sort((a,b)=>(a.status==='blocked'?-1:0)-(b.status==='blocked'?-1:0)||(a.due||'9999').localeCompare(b.due||'9999')).map(t=>`${t.status==='blocked'?'BLOCKED: ':''}${t.title}${t.due?' — due '+t.due:''}${t.blockedReason?' — '+t.blockedReason:''}`).join('\n')||'TBC — no open project tasks recorded.';
 if(records||linked.length)base.stages=[...(records?.milestones||[]).map(m=>({name:m.title,date:m.due,status:m.status})),...linked.map(t=>({name:t.title,date:t.due||'',status:t.status==='done'?'Complete':t.status==='prog'?'In progress':t.status==='blocked'?'Blocked':'Planned'}))];
 if(records){base.testing={pass:0,fail:0,blocked:0,remaining:0};for(const t of records.tests||[])base.testing[t.result in base.testing?t.result:'remaining']++;base.decisions=records.decisions||[];base.notes=records.notes||[];}
 return base;
}
export function testingProgress(t){
 const values=['pass','fail','blocked','remaining'].map(k=>Math.max(0,Number(t[k])||0));
 const total=values.reduce((a,b)=>a+b,0),executed=values[0]+values[1];
 return {total,executed,percent:total?Math.round(executed/total*100):null};
}
export function countdown(iso,now=new Date()){
 if(!iso)return 'Go-live date not set';
 const today=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
 const days=Math.round((Date.parse(iso+'T00:00:00Z')-today)/86400000);
 return days===0?'Go live today':days>0?`${days} day${days===1?'':'s'} to go live`:`${-days} day${days===-1?'':'s'} since planned go live`;
}
const date=s=>s?new Date(s+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'Not set';
const color=s=>s==='Complete'||s==='On track'?'green':s==='Blocked'?'red':s==='At risk'?'amber':'';
const paragraph=s=>esc(s||'Not recorded').replace(/\n/g,'<br>');
export function dashboard(project,tasks=[]){
 const r=reportFor(project,tasks),t=testingProgress(r.testing);
 return `<div class="report-tools"><div><h3 style="margin:0">Project status dashboard</h3><p class="hint">${r.updatedAt?'Updated '+esc(new Date(r.updatedAt).toLocaleString())+' by '+esc(r.updatedBy):'Add your first project update'}</p></div><button class="btn" data-a="draftreport">Generate report draft</button><button class="btn" data-a="editreport">Review summary / status</button><button class="btn primary" data-a="exportreport">Download PDF</button></div>
 <div class="report-grid"><section class="panel-card report-body"><div class="report-tools"><span class="tag ${color(r.status)}">${esc(r.status)}</span><strong>${esc(countdown(r.goLive))}</strong><span class="hint">Go live: ${date(r.goLive)} · Report date: ${date(r.asOf)}</span></div><h3>Executive summary</h3><p class="report-copy">${paragraph(r.summary)}</p>
 <h3>Delivery timeline · project tasks and milestones</h3><div class="report-stages">${r.stages.map(s=>`<div class="report-stage ${s.status==='Complete'?'complete':s.status==='In progress'?'active':''}"><b>${esc(s.name)}</b><span>${date(s.date)}</span><small>${esc(s.status)}</small></div>`).join('')}</div>
 <h3>Testing</h3><div class="report-tools"><strong>${t.percent===null?'No tests recorded':t.percent+'% executed'}</strong><span class="hint">${t.executed} of ${t.total} tests executed (pass + fail)</span></div><div class="bar"><div style="width:${t.percent||0}%"></div></div><div class="report-counts">${['pass','fail','blocked','remaining'].map(k=>`<div><b>${r.testing[k]}</b><span>${k[0].toUpperCase()+k.slice(1)}</span></div>`).join('')}</div><p class="hint">Blocked and remaining tests are not counted as executed. Execution progress does not indicate launch readiness.</p>
 <h3>Next steps / supervisor attention</h3><p class="report-copy">${paragraph(r.nextSteps)}</p></section>
 <aside class="panel-card report-body"><h3>Solution notes</h3>${r.notes.map(n=>`<h4>${esc(n.title)}</h4><p class="report-copy">${paragraph(n.text)}</p>`).join('')}</aside></div>
 <section class="panel-card report-body" style="margin-top:16px"><h3>Key decisions and escalations</h3><div style="overflow:auto"><table class="report-table"><thead><tr><th>#</th><th>Decision / escalation required</th><th>Owner</th><th>By when?</th><th>Outcome</th><th>Status</th></tr></thead><tbody>${r.decisions.length?r.decisions.map((d,i)=>`<tr><td>${i+1}</td><td>${paragraph(d.title)}</td><td>${esc(d.owner||'Unassigned')}</td><td>${date(d.due)}</td><td>${paragraph(d.outcome)}</td><td>${esc(d.status)}</td></tr>`).join(''):'<tr><td colspan="6">No decisions recorded.</td></tr>'}</tbody></table></div></section>`;
}
function input(label,name,value,type='text'){
 return `<label class="l">${esc(label)}<input class="fld" type="${type}" name="${name}" value="${esc(value)}" ${type==='number'?'min="0" max="1000000" step="1"':''}></label>`;
}
function text(label,name,value){return `<label class="l">${esc(label)}<textarea class="fld" name="${name}" rows="3" maxlength="20000">${esc(value)}</textarea></label>`}
function select(label,name,value,options){return `<label class="l">${esc(label)}<select class="fld" name="${name}">${options.map(o=>`<option${o===value?' selected':''}>${esc(o)}</option>`).join('')}</select></label>`}
export function decisionRow(d={},i=0){return `<fieldset class="report-edit-row" data-report-row="decision"><legend>Decision</legend>${input('Decision / escalation',`decision.${i}.title`,d.title||'')}${input('Owner',`decision.${i}.owner`,d.owner||'')}<div class="two">${input('Due date',`decision.${i}.due`,d.due||'','date')}${select('Status',`decision.${i}.status`,d.status||'Open',['Open','In progress','Done'])}</div>${text('Decision outcome',`decision.${i}.outcome`,d.outcome||'')}<button class="btn sm danger" type="button" data-a="removereportrow">Remove decision</button></fieldset>`}
export function noteRow(n={},i=0){return `<fieldset class="report-edit-row" data-report-row="note"><legend>Solution note</legend>${input('Section title',`note.${i}.title`,n.title||'')}${text('Notes',`note.${i}.text`,n.text||'')}<button class="btn sm danger" type="button" data-a="removereportrow">Remove section</button></fieldset>`}
export function editor(project){
 const r=reportFor(project);
 return `<h3>Update project status</h3><form data-form="statusreport"><p class="hint">Changes are saved with this project. PDF exports include the full report.</p><div class="two">${select('Overall status','status',r.status,STATUSES)}${input('Report date','asOf',r.asOf||new Date().toLocaleDateString('en-CA'),'date')}</div>${input('Planned go-live date','goLive',r.goLive,'date')}${text('Executive summary','summary',r.summary)}${text('Next steps / supervisor attention','nextSteps',r.nextSteps)}<h4>Delivery stages</h4>${r.stages.map((s,i)=>`<fieldset class="report-edit-row" data-report-row="stage">${input('Stage name',`stage.${i}.name`,s.name)}<div class="two">${input('Target date',`stage.${i}.date`,s.date,'date')}${select('Stage status',`stage.${i}.status`,s.status,['Planned','In progress','Complete'])}</div></fieldset>`).join('')}<h4>Testing counts</h4><div class="two">${['pass','fail','blocked','remaining'].map(k=>input(k[0].toUpperCase()+k.slice(1),k,r.testing[k],'number')).join('')}</div><h4>Key decisions</h4><div id="report-decisions">${r.decisions.map(decisionRow).join('')}</div><button class="btn sm" type="button" data-a="addreportdecision">Add decision</button><h4>Solution notes</h4><div id="report-notes">${r.notes.map(noteRow).join('')}</div><button class="btn sm" type="button" data-a="addreportnote">Add notes section</button><p class="err" id="report-error" role="alert"></p><div class="report-tools"><button type="button" class="btn" data-a="mclose">Cancel</button><button class="btn primary" type="submit">Save status report</button></div></form>`;
}
export function readEditor(form){
 const fields=new FormData(form),get=name=>String(fields.get(name)||'').trim();
 const rows=kind=>[...form.querySelectorAll(`[data-report-row="${kind}"]`)].map(row=>Object.fromEntries([...row.querySelectorAll('[name]')].map(el=>[el.name.split('.').at(-1),el.value.trim()])));
 const testing=Object.fromEntries(['pass','fail','blocked','remaining'].map(k=>{
   const v=Number(get(k));if(!Number.isSafeInteger(v)||v<0||v>1000000)throw new Error('Testing counts must be whole numbers between 0 and 1,000,000.');return [k,v];
 }));
 const decisions=rows('decision'),notes=rows('note');
 if(decisions.some(d=>!d.title))throw new Error('Give each decision a title or remove the empty decision.');
 if(notes.some(n=>!n.title))throw new Error('Give each notes section a title or remove it.');
 const stages=rows('stage');if(stages.some(s=>!s.name))throw new Error('Every delivery stage needs a name.');
 return {status:get('status'),asOf:get('asOf'),goLive:get('goLive'),summary:get('summary'),nextSteps:get('nextSteps'),testing,stages,decisions,notes};
}
// Vector text/tables keep the exported report searchable and sharp when printed.
export function makePdf(project,{lead='',now=new Date(),tasks=[]}={}){
 const r=reportFor(project,tasks),t=testingProgress(r.testing);
 const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),width=297,margin=14;
 const navy=[9,29,63],teal=[11,110,117];
 doc.setProperties({title:project.name+' - Status report',subject:'Project status update',author:'waku'});
 const clean=s=>String(s??'').normalize('NFKC').replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\u2022/g,'-');
 function heading(title,y){doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(...navy);doc.text(title,margin,y);return y+4}
 function table(head,body,y,widths){autoTable(doc,{startY:y,margin:{left:margin,right:margin,top:17,bottom:16},head:[head],body:body.map(row=>row.map(clean)),theme:'grid',styles:{font:'helvetica',fontSize:9,cellPadding:2,textColor:[34,45,59],overflow:'linebreak',valign:'top'},headStyles:{fillColor:teal,textColor:255,fontStyle:'bold'},alternateRowStyles:{fillColor:[246,248,250]},columnStyles:widths||{},rowPageBreak:'avoid'});return doc.lastAutoTable.finalY+9}
 function ensure(y,space=25){if(y+space>191){doc.addPage();return 24}return y}
 doc.setFillColor(...navy);doc.rect(0,0,width,30,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text('waku | Project status',margin,12);doc.setFontSize(13);doc.text(doc.splitTextToSize(clean(project.name),265).slice(0,2),margin,21);
 let y=table(['Overall status','Planned go live','Report date','Project lead'],[[r.status,date(r.goLive),date(r.asOf),lead||'Not recorded']],37);
 y=table(['Launch countdown','Testing execution'],[[countdown(r.goLive,now),t.percent===null?'No tests recorded':`${t.percent}% executed (${t.executed} of ${t.total}; pass + fail)`]],y);
 y=heading('Executive summary',ensure(y));y=table(['Summary','Next steps / supervisor attention'],[[r.summary||'Not recorded',r.nextSteps||'Not recorded']],y,{0:{cellWidth:134.5},1:{cellWidth:134.5}});
 y=heading('Delivery timeline',ensure(y));y=table(['Task / milestone','Target date','Status'],r.stages.map(s=>[s.name,date(s.date),s.status]),y);
 y=heading('Testing',ensure(y));y=table(['Pass','Fail','Blocked','Remaining','Total'],[[r.testing.pass,r.testing.fail,r.testing.blocked,r.testing.remaining,t.total]],y);
 y=heading('Key decisions and escalations',ensure(y));y=table(['#','Decision / escalation','Owner','By when','Outcome','Status'],r.decisions.length?r.decisions.map((d,i)=>[i+1,d.title,d.owner||'Unassigned',date(d.due),d.outcome||'Not recorded',d.status]):[['-','No decisions recorded','','','','']],y,{0:{cellWidth:10},1:{cellWidth:65},2:{cellWidth:32},3:{cellWidth:30},4:{cellWidth:100},5:{cellWidth:32}});
 y=heading('Solution notes',ensure(y));table(['Section','Notes'],r.notes.length?r.notes.map(n=>[n.title,n.text||'Not recorded']):[['Notes','Not recorded']],y,{0:{cellWidth:55},1:{cellWidth:214}});
 const pages=doc.getNumberOfPages();
 for(let i=1;i<=pages;i++){
  doc.setPage(i);if(i>1){doc.setFontSize(9);doc.setTextColor(...navy);doc.text(clean(project.name).slice(0,95)+' | Status report',margin,10)}
  doc.setDrawColor(220);doc.line(margin,197,283,197);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(90);
  doc.text('waku | Exported '+now.toLocaleDateString('en-GB')+' | Blocked tests are not executed. Status is manually assessed.',margin,202);doc.text(`${i} / ${pages}`,283,202,{align:'right'});
 }
 return doc;
}
export function downloadPdf(project,options){const doc=makePdf(project,options);doc.save((project.name.replace(/[^a-z0-9]+/gi,'-').slice(0,70)||'project')+'-status-report.pdf')}

export function recordsFor(project){return project.deliveryRecords||{tests:[],milestones:[],decisions:project.statusReport?.decisions||[],notes:project.statusReport?.notes||[{title:'Current architecture / environment',text:''},{title:'Deployment and dependencies',text:''}]};}
export function recordRow(kind,row={},i=0){
 const f=(label,key,type='text')=>input(label,kind+'.'+i+'.'+key,row[key]||'',type);
 let body='';
 if(kind==='test')body=f('Test case','title')+select('Result',kind+'.'+i+'.result',row.result||'remaining',['remaining','pass','fail','blocked'])+f('Evidence / result notes','evidence');
 if(kind==='milestone')body=f('Milestone','title')+f('Target date','due','date')+select('Status',kind+'.'+i+'.status',row.status||'Planned',['Planned','In progress','Complete','Blocked']);
 if(kind==='decision')return decisionRow(row,i);
 if(kind==='note')return noteRow(row,i);
 return `<fieldset class="report-edit-row" data-report-row="${kind}">${body}<button class="btn sm danger" type="button" data-a="removereportrow">Remove</button></fieldset>`;
}
export function recordsView(project){const r=recordsFor(project);return `<section class="panel-card report-body"><h3>Project delivery records</h3><p class="hint">Maintain these records here. The status dashboard and PDF use them automatically. Task progress and next steps come from the project’s task list. Saving enables record-based testing counts; previous manual counts are retained in the saved project but are no longer used by the dashboard.</p><form data-form="deliveryrecords">${[['milestone','Milestones',r.milestones],['test','Test cases',r.tests],['decision','Decisions and escalations',r.decisions],['note','Architecture and environment',r.notes]].map(([kind,title,rows])=>`<h4>${title}</h4><div id="records-${kind}">${(rows||[]).map((v,i)=>recordRow(kind,v,i)).join('')}</div><button class="btn sm" type="button" data-a="addrecord" data-kind="${kind}">+ Add ${kind==='note'?'environment section':kind}</button>`).join('')}<p class="err" id="records-error" role="alert"></p><button class="btn primary" type="submit">Save delivery records</button></form></section>`;}
export function readRecords(form){const rows=kind=>[...form.querySelectorAll(`[data-report-row="${kind}"]`)].map(row=>Object.fromEntries([...row.querySelectorAll('[name]')].map(el=>[el.name.split('.').at(-1),el.value.trim()])));const result={tests:rows('test'),milestones:rows('milestone'),decisions:rows('decision'),notes:rows('note')};for(const group of Object.values(result))if(group.some(r=>!r.title))throw new Error('Give each record a title or remove the empty record.');return result;}
export function draftSummary(project,tasks){const r=reportFor(project,tasks),ts=tasks.filter(t=>t.project===project.id&&t.type!=='request'),t=testingProgress(r.testing);return `${project.name}: ${ts.filter(t=>t.status==='done').length} of ${ts.length} tasks complete; ${ts.filter(t=>t.status==='blocked').length} blocked.\nTesting: ${project.deliveryRecords?`${t.executed} of ${t.total} executed; ${r.testing.pass} passed, ${r.testing.fail} failed, ${r.testing.blocked} blocked.`:'TBC — test-case records not yet maintained.'}\nDecisions: ${r.decisions.filter(d=>d.status!=='Done').length} open.\nGo-live date: ${r.goLive||'TBC'}.\nArchitecture / environment: ${r.notes.some(n=>n.text)?r.notes.filter(n=>n.text).map(n=>n.title+': '+n.text).join('; '):'TBC'}.\nReadiness and sign-off: TBC — confirm manually.`;}
export function reviewEditor(project,summary){const r=reportFor(project);return `<h3>Review report draft</h3><form data-form="reportreview"><p class="hint">Review this draft before saving and sharing. Overall status requires your assessment. Tasks, tests, decisions and environment details stay linked to project records.</p>${select('Overall status','status',r.status,STATUSES)}${input('Planned go-live date','goLive',r.goLive,'date')}${input('Report date','asOf',r.asOf||new Date().toLocaleDateString('en-CA'),'date')}${text('Executive summary','summary',summary??r.summary)}<button class="btn" type="button" data-a="mclose">Cancel</button> <button class="btn primary">Save reviewed report</button></form>`;}
