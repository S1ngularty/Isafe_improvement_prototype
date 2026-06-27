create table public.contacts (
  user_id uuid not null,
  contact_id uuid null,
  contact_name character varying not null,
  contact_number character varying not null,
  created_at timestamp with time zone not null default now(),
  constraint contacts_contact_id_fkey foreign KEY (contact_id) references notification (user_id) on delete CASCADE,
  constraint contacts_user_id_fkey foreign KEY (user_id) references profiles (id)
) TABLESPACE pg_default;