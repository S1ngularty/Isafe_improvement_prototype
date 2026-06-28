alter table public.evacuation_areas enable row level security;

create policy "Anyone can read active evacuation areas"
  on public.evacuation_areas
  for select
  using (status = 'active');

create policy "Admins can insert evacuation areas"
  on public.evacuation_areas
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admins can update evacuation areas"
  on public.evacuation_areas
  for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

create policy "Admins can delete evacuation areas"
  on public.evacuation_areas
  for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );
