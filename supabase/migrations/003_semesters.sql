-- Run after 002_programs_and_student_id.sql.
-- Adds academic terms; enrollments, schedules, and grades are scoped per semester.

-- ---------------------------------------------------------------------------
-- Semesters
-- ---------------------------------------------------------------------------
create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

-- At most one “active” semester for UI defaults
create unique index semesters_one_active_at_a_time
  on public.semesters ((1))
  where (is_active = true);

-- Default row for existing data (stable id for seeds / reproducibility)
insert into public.semesters (id, name, starts_on, ends_on, is_active)
values (
  '40000000-0000-4000-8000-000000000001',
  'Legacy term (migrated)',
  '2020-01-01',
  '2030-12-31',
  true
);

-- ---------------------------------------------------------------------------
-- Enrollments: per semester (same student may take same subject again later)
-- ---------------------------------------------------------------------------
alter table public.enrollments
  add column semester_id uuid references public.semesters (id) on delete restrict
  not null default '40000000-0000-4000-8000-000000000001';

alter table public.enrollments alter column semester_id drop default;

alter table public.enrollments drop constraint if exists enrollments_student_id_subject_id_key;

alter table public.enrollments
  add constraint enrollments_student_subject_semester unique (student_id, subject_id, semester_id);

create index enrollments_subject_semester_idx on public.enrollments (subject_id, semester_id);

-- ---------------------------------------------------------------------------
-- Schedules: same subject can run different times each semester
-- ---------------------------------------------------------------------------
alter table public.schedules
  add column semester_id uuid references public.semesters (id) on delete cascade
  not null default '40000000-0000-4000-8000-000000000001';

alter table public.schedules alter column semester_id drop default;

alter table public.schedules drop constraint if exists schedules_subject_id_key;

alter table public.schedules
  add constraint schedules_subject_semester unique (subject_id, semester_id);

-- ---------------------------------------------------------------------------
-- Grades: one grade per student / subject / semester
-- ---------------------------------------------------------------------------
alter table public.grades
  add column semester_id uuid references public.semesters (id) on delete cascade
  not null default '40000000-0000-4000-8000-000000000001';

alter table public.grades alter column semester_id drop default;

alter table public.grades drop constraint if exists grades_student_id_subject_id_key;

alter table public.grades
  add constraint grades_student_subject_semester unique (student_id, subject_id, semester_id);

-- ---------------------------------------------------------------------------
-- Enrollment RPC (capacity & duplicate checks per semester offering)
-- ---------------------------------------------------------------------------
drop function if exists public.enroll_student(uuid, uuid);

create or replace function public.enroll_student(
  p_student_id uuid,
  p_subject_id uuid,
  p_semester_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cap integer;
  cnt integer;
begin
  if not exists (select 1 from public.semesters where id = p_semester_id) then
    return jsonb_build_object('ok', false, 'error', 'Semester not found.');
  end if;

  select max_capacity into cap from public.subjects where id = p_subject_id;
  if not found or cap is null then
    return jsonb_build_object('ok', false, 'error', 'Subject not found.');
  end if;

  select count(*)::integer into cnt
  from public.enrollments
  where subject_id = p_subject_id and semester_id = p_semester_id;

  if cnt >= cap then
    return jsonb_build_object('ok', false, 'error', 'This section is at full capacity for this term.');
  end if;

  if exists (
    select 1 from public.enrollments
    where student_id = p_student_id and subject_id = p_subject_id and semester_id = p_semester_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'Student is already enrolled in this subject for this term.');
  end if;

  insert into public.enrollments (student_id, subject_id, semester_id)
  values (p_student_id, p_subject_id, p_semester_id);

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'Student is already enrolled in this subject for this term.');
end;
$$;

grant execute on function public.enroll_student(uuid, uuid, uuid) to authenticated;
grant execute on function public.enroll_student(uuid, uuid, uuid) to service_role;

-- Atomically mark one semester active (clears others)
create or replace function public.set_active_semester(p_semester_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.semesters where id = p_semester_id) then
    raise exception 'Semester not found';
  end if;
  update public.semesters set is_active = false where is_active = true;
  update public.semesters set is_active = true where id = p_semester_id;
end;
$$;

grant execute on function public.set_active_semester(uuid) to authenticated;
grant execute on function public.set_active_semester(uuid) to service_role;

-- RLS
alter table public.semesters enable row level security;

create policy "authenticated_all_semesters" on public.semesters
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
