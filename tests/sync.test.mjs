import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WorkspaceSync} from '../src/sync.mjs';

function fixture(overrides={}) {
  let state={projects:[],tasks:[]};
  const messages=[];
  const sync=new WorkspaceSync({
    initial:{version:0,data:structuredClone(state)},
    snapshot:()=>state,hydrate:data=>{state=data},isEditing:()=>false,
    read:async()=>({version:0,data:state}),save:async version=>version+1,
    status:text=>messages.push(text),fail:()=>{},...overrides
  });
  return {sync,messages,get state(){return state}};
}
test('edits are marked saved only after database acknowledgement',async()=>{
  let finish;
  const f=fixture({save:()=>new Promise(resolve=>{finish=resolve})});
  f.state.tasks.push({id:'a'});
  const pending=f.sync.tick();
  assert.equal(f.messages.at(-1),'Saving…');assert.equal(f.sync.pending,true);
  finish(1);await pending;
  assert.equal(f.sync.pending,false);assert.equal(f.messages.at(-1),'Saved');
});
test('a concurrent save conflict preserves the draft and stops writes',async()=>{
  let failures=0;
  const f=fixture({save:async()=>{throw {code:'40001'}},fail:()=>failures++});
  f.state.tasks.push({id:'draft'});
  await f.sync.tick();await f.sync.tick();
  assert.equal(failures,1);assert.equal(f.sync.pending,true);
  assert.equal(f.state.tasks[0].id,'draft');assert.equal(f.messages.at(-1),'Not saved');
});
test('remote reads cannot replace edits made while a request is pending',async()=>{
  let finish;
  const f=fixture({read:()=>new Promise(resolve=>{finish=resolve})});
  const pending=f.sync.tick();f.state.tasks.push({id:'local'});
  finish({version:2,data:{projects:[],tasks:[{id:'remote'}]}});await pending;
  assert.equal(f.state.tasks[0].id,'local');assert.equal(f.sync.version,0);
});
test('edits made during a save remain pending for the next save',async()=>{
  let finish;
  const f=fixture({save:()=>new Promise(resolve=>{finish=resolve})});
  f.state.tasks.push({id:'a'});const pending=f.sync.tick();
  f.state.tasks.push({id:'b'});finish(1);await pending;
  assert.equal(f.sync.pending,true);assert.equal(f.messages.at(-1),'Changes pending');
});
test('clean idle clients receive another member’s saved data',async()=>{
  const f=fixture({read:async()=>({version:3,data:{projects:[],tasks:[{id:'remote'}]}})});
  await f.sync.tick();assert.equal(f.state.tasks[0].id,'remote');
  assert.equal(f.sync.version,3);assert.equal(f.sync.pending,false);
});
