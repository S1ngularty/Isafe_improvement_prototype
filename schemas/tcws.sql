create table if not exists public.tcws_alerts (
  id uuid primary key default gen_random_uuid(),
  signal_level integer not null check (signal_level between 1 and 5),
  area text not null,
  description text not null default '',
  wind_speed text not null,
  is_active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tcws_alerts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'Anyone can read active tcws alerts' and tablename = 'tcws_alerts'
  ) then
    create policy "Anyone can read active tcws alerts"
      on public.tcws_alerts for select
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Admins can read all tcws alerts' and tablename = 'tcws_alerts'
  ) then
    create policy "Admins can read all tcws alerts"
      on public.tcws_alerts for select
      using (is_admin());
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Admins can insert tcws alerts' and tablename = 'tcws_alerts'
  ) then
    create policy "Admins can insert tcws alerts"
      on public.tcws_alerts for insert
      with check (is_admin());
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Admins can update tcws alerts' and tablename = 'tcws_alerts'
  ) then
    create policy "Admins can update tcws alerts"
      on public.tcws_alerts for update
      using (is_admin());
  end if;

  if not exists (
    select 1 from pg_policies where policyname = 'Admins can delete tcws alerts' and tablename = 'tcws_alerts'
  ) then
    create policy "Admins can delete tcws alerts"
      on public.tcws_alerts for delete
      using (is_admin());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tcws_alerts'
  ) then
    alter publication supabase_realtime add table public.tcws_alerts;
  end if;
end $$;

alter table public.tcws_alerts replica identity full;
