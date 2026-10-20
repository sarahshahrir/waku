import {watchActionIcons} from './action-icons.mjs';
import { createClient } from '@supabase/supabase-js';
import { WorkspaceSync } from './sync.mjs';
import * as ProjectReport from './project-report.mjs';
import {pickProfile} from './profiles.mjs';
window.ProjectReport=ProjectReport;
watchActionIcons();

const url = SUPABASE_URL;
const key = SUPABASE_PUBLISHABLE_KEY;
// Failed links can arrive from the previous domain. Consume only error fragments;
// successful authentication fragments must remain available to the auth client.
const callbackError = new URLSearchParams(location.hash.slice(1));
const setupToken=callbackError.get('setup')||'';
if (callbackError.has('error')||callbackError.has('setup')) {
  history.replaceState(null, '', location.pathname + location.search);
}
const client = createClient(url, key);
let sync;
const style = document.createElement('style');
style.textContent = `
body:not([data-connected]) .app{visibility:hidden}
#access{position:fixed;inset:0;z-index:10000;background:var(--bg);display:grid;place-items:center;padding:24px;overflow:auto}
#access section{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:28px;width:100%;max-width:440px}
#access .profile-picker{position:relative}
#access .profile-back{display:grid;place-items:center;background:none;border:0;color:var(--ink2);width:32px;height:32px;border-radius:5px;margin:-12px 0 12px -8px;padding:0}
#access .profile-back:hover{background:var(--sunk);color:var(--ink)}
.profile-actions{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:8px}
#access .profile-create{background:none;border:0;color:var(--ink);padding:8px 0;margin:0;font-weight:500;height:auto}
#access .profile-create:hover{text-decoration:underline;text-underline-offset:4px}
#access .profile-signout{background:var(--red);border-color:var(--red);color:#fff;margin:0}
#access .profile-signout:hover{filter:brightness(.92)}
#access h1{font-size:24px;margin:0 0 12px}#access p{color:var(--ink2)}
#access input{width:100%;margin:8px 0 16px}#access button{margin:4px 8px 4px 0}
.profile-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:24px 0}.profile-choice{display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink)}.profile-choice:hover{border-color:var(--accent);background:var(--sunk)}.profile-choice small{color:var(--ink2)}.profile-avatar{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;color:white;font-size:18px;font-weight:600}
#connection{position:fixed;bottom:12px;left:12px;z-index:9000;background:var(--surface);border:1px solid var(--line);padding:5px 10px;border-radius:8px;font-size:12px;display:flex;gap:12px;align-items:center}
`;
document.head.append(style);
const gate = document.createElement('div');
gate.id = 'access';
document.body.append(gate);
const app = document.querySelector('.app');
app.inert = true;

function panel(title, message) {
  gate.hidden = false;
  gate.style.display = 'grid';
  gate.replaceChildren();
  const section = document.createElement('section');
  const h = document.createElement('h1');h.textContent = title;
  const p = document.createElement('p');p.textContent = message;
  section.append(h,p);gate.append(section);
  return section;
}
function button(parent, label, action) {
  const b = document.createElement('button');b.type='button';b.className='btn';b.textContent=label;
  b.addEventListener('click',action);parent.append(b);return b;
}
function downloadDraft() {
  const blob = new Blob([JSON.stringify(sync.snapshot(),null,2)],{type:'application/json'});
  const href=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=href;a.download='waku-unsaved-draft.json';a.click();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
}
function fail(error) {
  app.inert=true;
  const section=panel('Workspace unavailable', error.code==='40001'
    ? 'Another member saved changes first. Your latest edits were not saved. Download your draft before reloading and reapplying your changes.'
    : 'We could not load or save your workspace. Check your connection and membership. Download any unsaved draft before reloading.');
  if(sync?.pending)button(section,'Download unsaved draft',downloadDraft);
  button(section,'Reload',()=>location.reload());
  button(section,'Sign out',async()=>{await client.auth.signOut();location.reload()});
  console.error('waku operation failed:',error.code||error.name||'unknown');
}

async function signIn() {
  const {data,error}=await client.auth.getSession();
  if(error)throw error;
  if(data.session&&!setupToken)return data.session;
  const setup=!!setupToken;
  const section=panel(setup?'Choose your waku password':'Log in to waku',setup
    ? 'Set the password for wakuwaku. This private setup link can be used once.'
    : 'Enter your username and password. No email link is needed.');
  const form=document.createElement('form');
  function field(labelText,type,autocomplete){
    const label=document.createElement('label');label.textContent=labelText;
    const input=document.createElement('input');input.type=type;input.required=true;input.autocomplete=autocomplete;input.className='fld';label.append(input);form.append(label);return input;
  }
  const username=field('Username','text','username');username.value='wakuwaku';username.maxLength=64;username.spellcheck=false;
  const password=field('Password','password',setup?'new-password':'current-password');password.maxLength=64;if(setup)password.minLength=8;
  const confirm=setup?field('Confirm password','password','new-password'):null;
  const submit=document.createElement('button');submit.className='btn primary';submit.textContent=setup?'Set password and log in':'Log in';
  const message=document.createElement('p');message.setAttribute('role','status');
  form.append(submit,message);section.append(form);
  let complete;const ready=new Promise(resolve=>{complete=resolve});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(confirm&&password.value!==confirm.value){message.textContent='The passwords do not match.';return}
    submit.disabled=true;message.textContent=setup?'Setting password…':'Logging in…';
    try{
      const response=await fetch(url+'/functions/v1/waaku-account',{
        method:'POST',headers:{'Content-Type':'application/json','apikey':key},
        body:JSON.stringify({action:setup?'setup':'login',username:username.value.trim(),password:password.value,...(setup?{token:setupToken}:{})})
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Could not log in.');
      const {data,error}=await client.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});
      if(error)throw error;
      password.value='';if(confirm)confirm.value='';complete(data.session);
    }catch(error){message.textContent=error.message||'Could not log in. Check your connection and try again.'}
    finally{submit.disabled=false}
  });
  return ready;
}

async function read() {
  const {data,error}=await client.from('workbench_state').select('version,data').eq('id',true).single();
  if(error)throw error;
  return data;
}
async function connect() {
  const session=await signIn();
  const {error:joinError}=await client.rpc('join_workbench');
  if(joinError)throw joinError;
  const {data:members,error}=await client.from('workbench_members').select('*');
  if(error)throw error;
  if(!members.some(member=>member.id===session.user.id))throw new Error('Membership required');
  async function loadProfiles(){
    const {data,error}=await client.from('waaku_profiles').select('id,name,title,hue').order('created_at');
    if(error)throw error;
    return data.map(profile=>({...profile,role:'Member'}));
  }
  async function createProfile(values){
    const {data,error}=await client.from('waaku_profiles').insert(values).select('id,name,title,hue').single();
    if(error)throw error;
    const profile={...data,role:'Member'};profiles.push(profile);return profile;
  }
  async function signOut(){const {error}=await client.auth.signOut();if(error)throw error;location.reload()}
  let profiles=await loadProfiles();
  let selected=await pickProfile({profiles,createProfile,panel,button,onSignOut:()=>signOut().catch(fail)});
  let profileChanged=()=>{};
  const initial=await read();
  const connection=document.createElement('div');connection.id='connection';
  const status=document.createElement('span');status.setAttribute('role','status');status.textContent='Connected';connection.append(status);
  button(connection,'Sign out',async()=>{
    if(document.querySelector('form[data-report-dirty="true"]')&&!confirm('Sign out without saving your report edits?'))return;
    if(sync?.pending){await sync.tick();if(sync.pending)return}
    const {error}=await client.auth.signOut();if(error){fail(error);return}location.reload();
  });
  button(connection,'Switch profile',async()=>{
    if(document.querySelector('form[data-report-dirty="true"]')&&!confirm('Switch profile without saving your report edits?'))return;
    try{
      await workspace.flush();
      app.inert=true;
      profiles=await loadProfiles();
      const next=await pickProfile({profiles,createProfile,panel,button,onCancel:()=>{},onSignOut:()=>signOut().catch(fail)});
      if(next)selected=next;
      profileChanged();
      gate.style.display='none';app.inert=false;
    }catch(error){fail(error)}
  });
  connection.querySelectorAll('button').forEach(b=>{
    const label=b.textContent;b.title=label;b.setAttribute('aria-label',label);
    b.innerHTML='<svg class="i" viewBox="0 0 24 24" aria-hidden="true">'+(label==='Sign out'?'<path d="M9 4H4v16h5M13 8l4 4-4 4m-5-4h13"/>':'<circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2m2-16 3 3-3 3m-1-3h5"/>')+'</svg><span class="lbl">'+label+'</span>';
  });
  document.body.append(connection);
  gate.style.display='none';document.body.dataset.connected='true';app.inert=false;
  client.auth.onAuthStateChange(event=>{
    if(event==='SIGNED_OUT'){app.inert=true;panel('Signed out','Reload to sign in again.');location.reload()}
  });
  const workspace={
    get userId(){return selected.id},
    get members(){return profiles},
    onProfileChange(callback){profileChanged=callback},
    state:initial.data,
    async flush(){
      const deadline=Date.now()+15000;
      while(sync.busy&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,50));
      if(sync.busy||sync.stopped)throw new Error('Wait for the workspace to reconnect before exporting.');
      await sync.tick();
      if(sync.pending||sync.stopped)throw new Error('Your latest changes have not been saved. Please resolve the save error before exporting.');
    },
    watch({snapshot,hydrate,isEditing}) {
      sync=new WorkspaceSync({snapshot,hydrate,isEditing,initial,read,
        status:text=>{status.textContent=text;document.querySelectorAll('#saveInd').forEach(el=>el.textContent=text)},
        fail,
        save:async(version,data)=>{
          const {data:next,error}=await client.rpc('save_workbench',{expected_version:version,next_data:data});
          if(error)throw error;return next;
        }
      });
      setInterval(()=>sync.tick(),1500);
      window.addEventListener('beforeunload',event=>{
        if(sync.pending){event.preventDefault();event.returnValue=''}
      });
    }
  };
  return workspace;
}
window.Workbench={connect,fail};
