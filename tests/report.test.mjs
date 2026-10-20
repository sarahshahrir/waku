import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reportFor,testingProgress,countdown,dashboard,makePdf} from '../src/project-report.mjs';
import {exampleProject} from './report-fixture.mjs';
test('old projects get reporting defaults without changing their saved data',()=>{
 const p={target:'2026-11-01',status:'Planning'};const r=reportFor(p);
 assert.equal(r.goLive,p.target);assert.equal(r.stages.length,5);assert.equal(p.statusReport,undefined);
 assert.equal(testingProgress(r.testing).percent,null);
});
test('testing progress includes only passed and failed tests',()=>{
 const stats=testingProgress({pass:79,fail:8,blocked:10,remaining:56});
 assert.equal(stats.total,153);assert.equal(stats.executed,87);assert.equal(stats.percent,57);
});
test('launch countdown distinguishes future, today and past dates',()=>{
 const now=new Date(2026,9,19,12);
 assert.equal(countdown('2026-10-23',now),'4 days to go live');
 assert.equal(countdown('2026-10-19',now),'Go live today');
 assert.equal(countdown('2026-10-18',now),'1 day since planned go live');
});
test('user-entered report text is escaped on the dashboard',()=>{
 const p=structuredClone(exampleProject);p.statusReport.summary='<img src=x onerror=alert(1)>';
 const html=dashboard(p);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));
});
test('long decision lists and notes paginate rather than being truncated',()=>{
 const p=structuredClone(exampleProject);p.statusReport.decisions=Array.from({length:40},(_,i)=>({title:'Decision '+i+' - '+('Long decision text. '.repeat(8)),owner:'Owner',due:'2026-10-23',outcome:'Recorded outcome. '.repeat(8),status:'Open'}));
 p.statusReport.notes=[{title:'Long notes',text:'Detailed project note. '.repeat(500)+'FINAL_REPORT_MARKER'}];
 const doc=makePdf(p,{now:new Date(2026,9,19)});
 assert.ok(doc.getNumberOfPages()>2);assert.ok(doc.output().includes('FINAL_REPORT_MARKER'));
});

test('linked report uses only its project tasks and live delivery records',()=>{
 const p={id:'p',target:'2026-12-01',statusReport:{testing:{pass:99},decisions:[{title:'Old'}]},deliveryRecords:{tests:[{result:'pass'},{result:'blocked'},{result:'remaining'}],decisions:[{title:'Approve',status:'Done'}],notes:[{title:'Architecture',text:'Service A'}],milestones:[{title:'UAT',due:'2026-11-01',status:'Planned'}]}};
 const tasks=[{project:'p',title:'Build',status:'done'},{project:'p',title:'Resolve API',status:'blocked',blockedReason:'Await access',due:'2026-10-30'},{project:'other',title:'Private',status:'todo'}];
 const r=reportFor(p,tasks);assert.equal(r.testing.pass,1);assert.equal(r.testing.blocked,1);assert.equal(r.stages.length,3);assert.match(r.nextSteps,/Await access/);assert.doesNotMatch(r.nextSteps,/Private|Build/);assert.equal(r.decisions[0].title,'Approve');assert.equal(r.notes[0].text,'Service A');
 tasks[1].status='done';assert.doesNotMatch(reportFor(p,tasks).nextSteps,/Resolve API/);assert.equal(p.statusReport.testing.pass,99);
 const pdf=makePdf(p,{tasks});assert.ok(pdf.getNumberOfPages()>0);
});
