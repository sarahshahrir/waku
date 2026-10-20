import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';

const html=await readFile(new URL('../src/index.html',import.meta.url),'utf8');
const inline=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).find(s=>s.includes('const PAGES='));
function interfaceFixture(){
  const window={addEventListener:()=>{}};
  const script=inline.slice(0,inline.indexOf('/* ---------- boot ---------- */'))+`
    USERS.push({id:'member',name:'Test Member',title:'Engineer',role:'Member',hue:180});ME=USERS[0];
    window.unit={PAGES,S,PROJECTS,TASKS,USERS,createItem,projOpts,selectProfile:id=>{ME=user(id)}};
  })();`;
  runInNewContext(script,{window,crypto:webcrypto,Date,Set,Map,matchMedia:()=>({matches:false}),localStorage:{getItem:()=>null},
    document:{addEventListener:()=>{},documentElement:{dataset:{}}}});
  return window.unit;
}
test('every main page renders for a new empty workspace',()=>{
  const unit=interfaceFixture();
  for(const name of ['home','tasks','inbox','projects','team','reports','settings','profile']){
    assert.equal(typeof unit.PAGES[name](),'string',name);
  }
});
test('task creation uses the signed-in member and unique IDs',()=>{
  const unit=interfaceFixture();
  const a=unit.createItem({title:'First task'}),b=unit.createItem({title:'Second task'});
  assert.equal(a.creator,'member');assert.equal(a.assignee,'member');assert.notEqual(a.id,b.id);
  assert.equal(unit.TASKS.length,2);
});
test('new projects immediately appear in task project options',()=>{
  const unit=interfaceFixture();unit.PROJECTS.push({id:'new',name:'New project'});
  assert.ok(unit.projOpts().some(([id])=>id==='new'));
});

test('switching display profiles attributes new work without changing earlier work',()=>{
 const unit=interfaceFixture();
 const sarahTask=unit.createItem({title:'Sarah task'});
 unit.USERS.push({id:'wallace',name:'Wallace',role:'Member',title:'',hue:220});
 unit.selectProfile('wallace');
 const task=unit.createItem({title:'Wallace task'});
 assert.equal(task.creator,'wallace');assert.equal(task.assignee,'wallace');
 assert.equal(task.history[0].who,'wallace');assert.equal(sarahTask.creator,'member');
 assert.ok(unit.PAGES.home().includes('Wallace'));
});
