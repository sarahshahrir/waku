-- An invitation grants workspace membership after email verification.
-- It does not send email. The owner manages this private allowlist.
create table public.workbench_invitations (
  email text primary key check(email=lower(email)),
  name text not null check(length(name) between 1 and 120)
);
alter table public.workbench_invitations enable row level security;
revoke all on public.workbench_invitations from public, anon, authenticated;

create function public.join_workbench() returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.workbench_members(id,name)
  select u.id,i.name from auth.users u
  join public.workbench_invitations i on i.email=lower(u.email)
  where u.id=auth.uid() and u.email_confirmed_at is not null
  on conflict(id) do nothing;
  if not public.is_workbench_member() then
    raise exception 'An invitation and verified email are required' using errcode='42501';
  end if;
end;
$$;
revoke all on function public.join_workbench() from public, anon;
grant execute on function public.join_workbench() to authenticated;
