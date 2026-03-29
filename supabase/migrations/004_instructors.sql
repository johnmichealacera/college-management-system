-- Run after 003_semesters.sql.
-- Admin-managed instructors (name + email). Optional user_id links to auth.users for future login.
-- Subjects reference instructors instead of free-text instructor names.

-- ---------------------------------------------------------------------------
-- Instructors
-- ---------------------------------------------------------------------------
create table public.instructors (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index instructors_user_id_idx on public.instructors (user_id);

-- Link subjects to instructors (nullable until assigned)
alter table public.subjects add column instructor_id uuid references public.instructors (id) on delete set null;

-- Migrate existing instructor text → instructor rows + FK
insert into public.instructors (full_name, email)
select distinct trim(s.instructor) as fn,
  'legacy+' || md5(trim(s.instructor)) || '@localweb.legacy'
from public.subjects s
where trim(s.instructor) is not null and trim(s.instructor) <> '';

update public.subjects sub
set instructor_id = i.id
from public.instructors i
where sub.instructor_id is null
  and trim(sub.instructor) = i.full_name;

alter table public.subjects drop column instructor;

-- RLS
alter table public.instructors enable row level security;

create policy "authenticated_all_instructors" on public.instructors
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
