drop table if exists public.hotline_phone_numbers cascade;
drop table if exists public.hotlines cascade;

create table public.hotlines (
  id bigint generated always as identity not null,
  name text not null,
  email text null,
  website text null,
  category text not null check (category in ('general','police','fire','medical','rescue')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  deleted_at timestamp with time zone null,
  constraint hotlines_pkey primary key (id)
) TABLESPACE pg_default;

create table public.hotline_phone_numbers (
  id bigint generated always as identity not null,
  hotline_id bigint not null references public.hotlines(id) on delete cascade,
  type text null,
  number text not null,
  sort_order integer not null default 0,
  constraint hotline_phone_numbers_pkey primary key (id)
) TABLESPACE pg_default;

ALTER TABLE public.hotlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotline_phone_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active hotlines"
  ON public.hotlines
  FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "Anyone can read hotline phone numbers"
  ON public.hotline_phone_numbers
  FOR SELECT
  USING (true);

insert into public.hotlines (name, email, website, category, sort_order) values
  ('MDRRMO Tagkawayan', 'tkqoperationsandwarningsection@gmail.com', null, 'general', 1),
  ('Tagkawayan Municipal Police Station (MPS)', null, null, 'police', 2),
  ('Rural Health Unit (RHU)', null, null, 'medical', 3),
  ('Bumbero Tagkawayan', null, 'fb.com/TagkawayanFireStation', 'fire', 4),
  ('MLEGH Hospital', null, null, 'medical', 5);

insert into public.hotline_phone_numbers (hotline_id, type, number, sort_order) values
  (1, 'Globe', '0917-827-4878', 1),
  (1, 'Smart', '0961-801-6062', 2),
  (1, 'Smart (Alt)', '0928-985-1080', 3),
  (1, 'Globe/TM (Alt)', '0945-429-0479', 4),
  (2, 'Mobile', '0998-598-5781', 1),
  (2, 'Landline', '(042) 717-7380', 2),
  (3, 'Mobile', '0929-742-4195', 1),
  (4, 'Landline', '(042) 795-3975', 1),
  (4, 'Mobile', '0915-602-1563', 2),
  (5, 'Mobile', '0951-669-4274', 1);
