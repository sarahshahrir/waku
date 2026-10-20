const paths={
 plus:'<path d="M12 5v14M5 12h14"/>',
 edit:'<path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15l-1 6Z"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 draft:'<path d="M14 3H5v18h14V8l-5-5Zm0 0v5h5M8 12h8m-8 4h5"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
 back:'<path d="m12 5-7 7 7 7M5 12h15"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 send:'<path d="m3 3 18 9-18 9 4-9-4-9Zm4 9h14"/>',
 folder:'<path d="M3 6h7l2 3h9v12H3V6Z"/>',
 list:'<path d="M9 6h12M9 12h12M9 18h12M3 6h1m-1 6h1m-1 6h1"/>',
 copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>'
};
const actions={prepareupdate:['edit',false],reviewback:['back',false],editreport:['edit',true],exportreport:['download',false],draftreport:['draft',false],removereportrow:['trash',true],addrecord:['plus',false],addreportdecision:['plus',false],addreportnote:['plus',false],newtask:['plus',false],newproj:['plus',false],newreq:['send',false],comment:['send',false]};
export function decorateActions(root=document){
 const buttons=[...(root.matches?.('button')?[root]:[]),...root.querySelectorAll('button')];
 for(const b of buttons){
  if(b.dataset.visualAction||b.querySelector('svg'))continue;
  const label=b.textContent.trim();let choice=actions[b.dataset.a];
  if(b.dataset.a==='nav'&&label==='Open project')choice=['folder',false];
  if(b.dataset.a==='nav'&&label==='View my tasks')choice=['list',false];
  if(b.dataset.a==='ptab'&&label==='Back to report')choice=['back',true];
  if(b.dataset.a==='ptab'&&label==='Update report information')choice=['edit',false];
  if(b.type==='submit'&&/^Save/.test(label))choice=['check',false];
  if(!choice)continue;
  const [kind,iconOnly]=choice;b.dataset.visualAction='true';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','i');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.innerHTML=paths[kind];
  if(iconOnly){b.setAttribute('aria-label',label);b.title=label;b.textContent='';b.classList.add('action-icon-only');}
  else if(kind==='plus')b.textContent=label.replace(/^\+\s*/,'');
  b.prepend(svg);
 }
}
export function watchActionIcons(){
 decorateActions();
 const observer=new MutationObserver(changes=>{for(const change of changes)for(const node of change.addedNodes)if(node.nodeType===1)decorateActions(node);});
 observer.observe(document.body,{childList:true,subtree:true});
 return observer;
}
