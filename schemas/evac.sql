create table public.evacuation_areas (
  id bigint generated always as identity not null,
  name text not null,
  description text null,
  latitude double precision not null,
  longitude double precision not null,
  capacity integer null,
  status text null default 'active'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint evacuation_areas_pkey primary key (id),
  constraint evacuation_areas_status_check check (
    (
      status = any (
        array[
          'active'::text,
          'inactive'::text,
          'maintenance'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;