-- One username, mapped to the existing owner to preserve project data/assignments.
create table public.waaku_account (
 username text primary key check(username='wakuwaku'),
 user_id uuid not null unique references auth.users(id),
 setup_hash text,
 setup_expires_at timestamptz,
 setup_used_at timestamptz
);
alter table public.waaku_account enable row level security;
revoke all on public.waaku_account from public,anon,authenticated;
grant select,update on public.waaku_account to service_role;
insert into public.waaku_account(username,user_id)
select 'wakuwaku',id from auth.users where lower(email)='owner@example.com';

create or replace function public.is_workbench_member() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workbench_members m
 join public.waaku_account a on a.user_id=m.id where m.id=auth.uid());
$$;
