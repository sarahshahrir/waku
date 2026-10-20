import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
const origins=new Set(['https://the-waku.vercel.app','http://127.0.0.1:4173']);
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://the-waku.vercel.app','Access-Control-Allow-Headers':'content-type, apikey, authorization, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'Origin not allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(Number(req.headers.get('content-length')||0)>4096)return reply({error:'Request too large'},413);
 try{
  const raw=await req.text();if(raw.length>4096)return reply({error:'Request too large'},413);
  const body=JSON.parse(raw);
  const username=String(body.username||'').trim().toLowerCase();
  const password=body.password;
  if(username!=='wakuwaku'||typeof password!=='string'||password.length<1||password.length>64)return reply({error:'Incorrect username or password.'},401);
  const url=Deno.env.get('SUPABASE_URL')!;
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:account,error:lookupError}=await admin.from('waaku_account').select('username,user_id').eq('username',username).single();
  if(lookupError||!account)return reply({error:'Account is not configured.'},503);
  if(body.action==='setup'){
   if(password.length<8||typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))return reply({error:'Use a password with 8 to 64 characters and a valid setup link.'},400);
   const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.token));
   const hash=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
   const {data:claimed,error:claimError}=await admin.from('waaku_account').update({setup_used_at:new Date().toISOString()}).eq('username',username).eq('setup_hash',hash).is('setup_used_at',null).gt('setup_expires_at',new Date().toISOString()).select('user_id').maybeSingle();
   if(claimError||!claimed)return reply({error:'This setup link has expired or has already been used.'},403);
   const {error}=await admin.auth.admin.updateUserById(account.user_id,{password});
   if(error){
    await admin.from('waaku_account').update({setup_used_at:null}).eq('username',username).eq('setup_hash',hash);
    return reply({error:'Could not set this password. Choose another password and try again.'},400);
   }
   await admin.from('waaku_account').update({setup_hash:null}).eq('username',username).eq('setup_hash',hash);
  }else if(body.action!=='login')return reply({error:'Invalid action'},400);
  const {data:identity,error:identityError}=await admin.auth.admin.getUserById(account.user_id);
  if(identityError||!identity.user?.email)return reply({error:'Account is unavailable.'},503);
  // Password checking and hashing remain in Supabase Auth, never in the browser.
  const publicClient=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await publicClient.auth.signInWithPassword({email:identity.user.email,password});
  if(error||!data.session)return reply({error:error?.status===429?'Too many attempts. Wait before trying again.':'Incorrect username or password.'},error?.status===429?429:401);
  return reply({access_token:data.session.access_token,refresh_token:data.session.refresh_token});
 }catch{return reply({error:'Could not complete the request. Try again.'},400)}
});
