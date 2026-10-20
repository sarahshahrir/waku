-- Display profiles are separate from the single authenticated account.
create table public.waaku_profiles (
 id uuid primary key default gen_random_uuid(),
 name text not null check(name=btrim(name) and length(name) between 1 and 120),
 title text not null default '' check(length(title)<=120),
 hue integer not null default 180 check(hue between 0 and 360),
 created_at timestamptz not null default now()
);
create unique index waaku_profiles_unique_name on public.waaku_profiles(lower(name));
alter table public.waaku_profiles enable row level security;
revoke all on public.waaku_profiles from public,anon,authenticated;
grant select,insert on public.waaku_profiles to authenticated;
create policy profiles_read on public.waaku_profiles for select to authenticated
 using (public.is_workbench_member());
create policy profiles_create on public.waaku_profiles for insert to authenticated
 with check (public.is_workbench_member());

-- Retain Sarah's existing ID so historical assignments and activity still resolve.
insert into public.waaku_profiles(id,name,hue)
select user_id,'Sarah',180 from public.waaku_account where username='wakuwaku';
insert into public.waaku_profiles(id,name,hue)
select coalesce((select m.id from public.workbench_members m join auth.users u on u.id=m.id where lower(u.email)='teammate@example.com' limit 1),gen_random_uuid()),'Wallace',220;
-- Preserve any other member IDs referenced by existing work.
insert into public.waaku_profiles(id,name,title,hue)
select id,name,title,hue from public.workbench_members on conflict do nothing;
