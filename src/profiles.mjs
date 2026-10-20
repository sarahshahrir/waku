export function profileValues(name,title=''){
 const clean=String(name||'').trim(),job=String(title||'').trim();
 if(!clean||clean.length>120)throw new Error('Enter a profile name with 1 to 120 characters.');
 if(job.length>120)throw new Error('Keep the role or title within 120 characters.');
 return {name:clean,title:job,hue:Math.floor(Math.random()*360)};
}
export function pickProfile({profiles,createProfile,panel,button,onCancel,onSignOut}){
 return new Promise(resolve=>{
  const section=panel('Who’s using waku?','Choose your profile, or create one. Everyone uses the same workspace.');
  section.style.maxWidth='620px';section.classList.add('profile-picker');
  if(onCancel){const back=button(section,'',()=>resolve(null));back.className='profile-back';back.title='Back';back.setAttribute('aria-label','Back');back.innerHTML='<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h15"/></svg>';section.prepend(back);}
  const grid=document.createElement('div');grid.className='profile-grid';
  for(const profile of profiles){
   const b=button(grid,'',()=>resolve(profile));b.className='profile-choice';
   const avatar=document.createElement('span');avatar.className='profile-avatar';avatar.style.background=`hsl(${profile.hue} 45% 42%)`;avatar.textContent=profile.name.split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase();
   const name=document.createElement('strong');name.textContent=profile.name;
   const title=document.createElement('small');title.textContent=profile.title||'Team profile';
   b.append(avatar,name,title);
  }
  section.append(grid);
  const form=document.createElement('form');form.hidden=true;
  const actions=document.createElement('div');actions.className='profile-actions';section.append(actions);
  const add=button(actions,'+ Create a Profile',()=>{form.hidden=!form.hidden;if(!form.hidden)nameInput.focus()});add.className='profile-create';
  function field(labelText,maxLength){const label=document.createElement('label');label.textContent=labelText;const input=document.createElement('input');input.className='fld';input.maxLength=maxLength;label.append(input);form.append(label);return input}
  const nameInput=field('Profile name',120);nameInput.required=true;nameInput.autocomplete='name';
  const titleInput=field('Role / title (optional)',120);
  const submit=document.createElement('button');submit.type='submit';submit.className='btn primary';submit.textContent='Create and use profile';
  const error=document.createElement('p');error.setAttribute('role','alert');form.append(submit,error);section.append(form);
  form.addEventListener('submit',async event=>{
   event.preventDefault();submit.disabled=true;error.textContent='';
   try{const profile=await createProfile(profileValues(nameInput.value,titleInput.value));resolve(profile)}
   catch(e){error.textContent=e.code==='23505'?'That profile name already exists. Choose it above or use another name.':e.message||'Could not create this profile. Try again.';submit.disabled=false;}
  });
  if(onSignOut){const out=button(actions,'Sign out',onSignOut);out.className='btn profile-signout';}
 });
}
