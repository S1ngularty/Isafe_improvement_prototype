alter table public.announcements add column if not exists long_description text null;

update public.announcements set long_description = '' where long_description is null;

alter table public.announcements alter column description drop not null;

alter table public.announcements drop constraint if exists announcements_description_check;

alter table public.announcements drop constraint if exists announcements_type_check;
