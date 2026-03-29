-- LocalWeb College System — run in Supabase SQL Editor (or `supabase db push`).
-- After applying: in Dashboard → Database → Replication, confirm realtime is enabled
-- for the tables below (or keep the publication statements if your project allows them).

-- Extensions
create extension if not exists "pgcrypto";

-- Students
create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  student_id text not null unique,
  course text not null,
  year_level text not null,
  created_at timestamptz not null default now()
);

-- Subjects (courses)
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  instructor text not null default '',
  max_capacity integer not null check (max_capacity > 0),
  created_at timestamptz not null default now()
);

-- Enrollments
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

create index enrollments_subject_id_idx on public.enrollments (subject_id);
create index enrollments_student_id_idx on public.enrollments (student_id);

-- Schedules (one row per subject for MVP)
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  day_of_week text not null,
  start_time text not null,
  end_time text not null,
  room text not null default '',
  created_at timestamptz not null default now(),
  unique (subject_id)
);

-- Grades
create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  grade_mode text not null check (grade_mode in ('numeric', 'pass_fail')),
  numeric_value numeric(5, 2),
  pass_fail text check (pass_fail is null or pass_fail in ('pass', 'fail')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

create index grades_student_id_idx on public.grades (student_id);
create index grades_subject_id_idx on public.grades (subject_id);

-- Atomic enrollment with capacity + duplicate checks
create or replace function public.enroll_student(p_student_id uuid, p_subject_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
  cnt integer;
begin
  select max_capacity into cap from public.subjects where id = p_subject_id;
  if not found or cap is null then
    return jsonb_build_object('ok', false, 'error', 'Subject not found.');
  end if;
  select count(*)::integer into cnt from public.enrollments where subject_id = p_subject_id;
  if cnt >= cap then
    return jsonb_build_object('ok', false, 'error', 'This subject is at full capacity.');
  end if;
  if exists (
    select 1 from public.enrollments
    where student_id = p_student_id and subject_id = p_subject_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Student is already enrolled in this subject.');
  end if;
  insert into public.enrollments (student_id, subject_id)
  values (p_student_id, p_subject_id);
  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Student is already enrolled in this subject.');
end;
$$;

grant execute on function public.enroll_student(uuid, uuid) to authenticated;
grant execute on function public.enroll_student(uuid, uuid) to service_role;

-- RLS: authenticated users (admin) full access — tighten per role in production
alter table public.students enable row level security;
alter table public.subjects enable row level security;
alter table public.enrollments enable row level security;
alter table public.schedules enable row level security;
alter table public.grades enable row level security;

create policy "authenticated_all_students" on public.students
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_subjects" on public.subjects
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_enrollments" on public.enrollments
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_schedules" on public.schedules
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "authenticated_all_grades" on public.grades
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Realtime: enable these tables under Dashboard → Database → Replication (recommended).
-- If you prefer SQL and your role allows it, uncomment:
-- alter publication supabase_realtime add table public.students;
-- alter publication supabase_realtime add table public.subjects;
-- alter publication supabase_realtime add table public.enrollments;
-- alter publication supabase_realtime add table public.schedules;
-- alter publication supabase_realtime add table public.grades;
