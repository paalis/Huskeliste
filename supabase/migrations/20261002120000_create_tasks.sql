create table public.tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  due date,
  priority text not null default 'middels' check (priority in ('lav', 'middels', 'høy')),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index tasks_user_id_idx on public.tasks (user_id);

alter table public.tasks enable row level security;

create policy "Brukere ser egne oppgaver" on public.tasks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Brukere oppretter egne oppgaver" on public.tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Brukere endrer egne oppgaver" on public.tasks
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Brukere sletter egne oppgaver" on public.tasks
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.tasks from anon;
grant select, insert, update, delete on public.tasks to authenticated;
