-- Run after 001_initial.sql.
-- Adds school-defined programs, replaces free-text student.course with program_id,
-- and auto-generates student_id (LW-YYYY-NNNN) when inserting new students with an empty id.

-- ---------------------------------------------------------------------------
-- Programs (courses / degrees offered — admin-managed list)
-- ---------------------------------------------------------------------------
create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Year-scoped serial for student IDs
create table public.student_id_seq (
  year int primary key,
  last_value int not null default 0
);

-- Link students to programs; keep legacy "course" column until backfilled
alter table public.students add column program_id uuid references public.programs (id) on delete restrict;

-- Seed programs from existing directory text (if any)
insert into public.programs (name)
select distinct trim(course)
from public.students
where course is not null and trim(course) <> ''
on conflict (name) do nothing;

-- Fallback program for rows that had empty course
insert into public.programs (name)
values ('General Studies')
on conflict (name) do nothing;

update public.students s
set program_id = p.id
from public.programs p
where s.program_id is null and p.name = trim(s.course);

update public.students
set program_id = (select id from public.programs where name = 'General Studies' limit 1)
where program_id is null;

alter table public.students alter column program_id set not null;
alter table public.students drop column course;

-- Default empty student_id: trigger replaces before insert
alter table public.students alter column student_id set default '';

-- Prime sequence from existing LW-YYYY-NNNN IDs (so new IDs continue sensibly)
insert into public.student_id_seq (year, last_value)
select y, mx
from (
  select
    (regexp_match(student_id, '^LW-([0-9]{4})-([0-9]+)$'))[1]::int as y,
    max((regexp_match(student_id, '^LW-([0-9]{4})-([0-9]+)$'))[2]::int) as mx
  from public.students
  where student_id ~ '^LW-[0-9]{4}-[0-9]+$'
  group by 1
) t
where y is not null and mx is not null
on conflict (year) do update
set last_value = greatest(public.student_id_seq.last_value, excluded.last_value);

-- Allocate LW-YYYY-NNNN when student_id is null or blank (runs as definer so seq stays private)
create or replace function public.students_assign_student_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from now())::int;
  n int;
begin
  if new.student_id is null or btrim(new.student_id) = '' then
    insert into public.student_id_seq (year, last_value)
    values (y, 1)
    on conflict (year) do update
    set last_value = public.student_id_seq.last_value + 1
    returning last_value into n;

    new.student_id := format('LW-%s-%s', y, lpad(n::text, 4, '0'));
  end if;
  return new;
end;
$$;

drop trigger if exists students_assign_student_id on public.students;
create trigger students_assign_student_id
  before insert on public.students
  for each row
  execute function public.students_assign_student_id();

revoke all on public.student_id_seq from public;

-- RLS
alter table public.programs enable row level security;

create policy "authenticated_all_programs" on public.programs
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
