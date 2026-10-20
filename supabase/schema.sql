-- Apply once in the Supabase SQL editor. Membership is managed by the owner.
create table public.workbench_members (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  title text not null default '',
  hue integer not null default 180 check (hue between 0 and 360)
);
create table public.workbench_state (
  id boolean primary key default true check (id),
  version integer not null default 0,
  data jsonb not null default '{"projects":[],"tasks":[]}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.workbench_state(id) values(true);

alter table public.workbench_members enable row level security;
alter table public.workbench_state enable row level security;

-- Definer avoids recursive membership policies. No arbitrary SQL or identifiers.
create function public.is_workbench_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.workbench_members where id = auth.uid());
$$;
revoke all on function public.is_workbench_member() from public, anon;
grant execute on function public.is_workbench_member() to authenticated;

revoke all on public.workbench_members, public.workbench_state from anon, authenticated;
grant select on public.workbench_members, public.workbench_state to authenticated;
create policy member_directory on public.workbench_members for select to authenticated
  using (public.is_workbench_member());
create policy member_workspace on public.workbench_state for select to authenticated
  using (public.is_workbench_member());

-- Atomic compare-and-swap prevents a stale browser from overwriting another save.
create function public.save_workbench(expected_version integer, next_data jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare new_version integer;
begin
  if not public.is_workbench_member() then
    raise exception 'Workspace membership required' using errcode = '42501';
  end if;
  if jsonb_typeof(next_data) is distinct from 'object'
    or jsonb_typeof(next_data->'projects') is distinct from 'array'
    or jsonb_typeof(next_data->'tasks') is distinct from 'array'
    or octet_length(next_data::text) > 5000000 then
    raise exception 'Invalid workspace data' using errcode = '22023';
  end if;
  update public.workbench_state
  set data=next_data, version=version+1, updated_at=now(), updated_by=auth.uid()
  where id=true and version=expected_version
  returning version into new_version;
  if new_version is null then
    raise exception 'Workspace changed; reload before editing' using errcode = '40001';
  end if;
  return new_version;
end;
$$;
revoke all on function public.save_workbench(integer,jsonb) from public, anon;
grant execute on function public.save_workbench(integer,jsonb) to authenticated;
