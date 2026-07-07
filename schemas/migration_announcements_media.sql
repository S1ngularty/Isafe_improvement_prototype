alter table public.announcements add column if not exists deleted_at timestamptz null;

create or replace function public.announcements_soft_delete()
returns trigger
language plpgsql
as $$
begin
  update public.announcements set deleted_at = now() where id = old.id;
  return null;
end;
$$;

drop policy if exists "Anyone can read active announcements" on public.announcements;
create policy "Anyone can read active announcements"
  on public.announcements for select
  using (is_active = true and deleted_at is null);

drop policy if exists "Admins can delete announcements" on public.announcements;
drop policy if exists "Admins can soft-delete announcements" on public.announcements;
create policy "Admins can soft-delete announcements"
  on public.announcements for delete
  using (is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('announcement_media', 'announcement_media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do nothing;

drop policy if exists "Public can read announcement media" on storage.objects;
create policy "Public can read announcement media"
  on storage.objects for select
  using (bucket_id = 'announcement_media');

drop policy if exists "Admins can upload announcement media" on storage.objects;
create policy "Admins can upload announcement media"
  on storage.objects for insert
  with check (
    bucket_id = 'announcement_media'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can update announcement media" on storage.objects;
create policy "Admins can update announcement media"
  on storage.objects for update
  using (
    bucket_id = 'announcement_media'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can delete announcement media" on storage.objects;
create policy "Admins can delete announcement media"
  on storage.objects for delete
  using (
    bucket_id = 'announcement_media'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );
