# LocalWeb College System

A **modern admin console** for running a small college or training program: students, subjects, enrollments, schedules, and grades in one place. Built for **clarity, live demos, and honest data rules**—not for bloated legacy ERP workflows.

**Stack:** React (Vite) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (Postgres, Auth, Realtime)

---

## What it does

| Area | Capability |
|------|------------|
| **Authentication** | Supabase email/password for admins; session-aware routing. |
| **Dashboard** | Live stats (students, subjects, distinct enrolled learners) plus an **enrollment-by-subject** chart — **scoped to the selected term**. |
| **Semesters** | Academic terms (name + date range); **one “active” term** for defaults; header switcher compares Fall vs Spring, etc. |
| **Programs** | Admin-defined **courses/degrees offered**; students are assigned only from this list. |
| **Students** | Directory CRUD: **auto-generated student IDs** (`LW-YEAR-####`), **search** and filters (program, year). |
| **Instructors** | Faculty directory (**name + work email**); optional **`user_id`** links to Supabase Auth for future instructor login and grade entry. |
| **Subjects** | Catalog offerings with **assigned instructor** (from the directory) and **max capacity**; seat counts reflect the **term selected in the header**. |
| **Enrollments** | Enroll via **`enroll_student` (student, subject, semester)** — capacity and duplicates are **per term**. |
| **Schedule** | One time block **per subject per term**; week + table views. |
| **Grades** | Per student per subject **per term**: **numeric (0–100)** or **pass/fail**; upsert-safe. |

Optional **realtime refresh** keeps lists and charts feeling alive when replication is enabled on the underlying tables.

---

## Where the system is stronger than typical school software

Many campus systems grew from accounting and compliance modules. **LocalWeb College** is intentionally different:

1. **Honest enrollment rules in the database**  
   Capacity and “no double enroll in the same subject **for the same term**” are enforced in Postgres (`enroll_student`), not only in the browser. That avoids the classic gap where two staff tabs or a script can overbook a section.

2. **Operator-first UI**  
   Stripe/Notion-style layout: collapsible sidebar, modal forms, toasts, loading states, and a dashboard meant for a **pitch or walkthrough**, not a week of training.

3. **Small surface, full story**  
   One coherent path: **semesters** → **programs** → student directory → **instructors** → subject offerings → enroll → schedule → grade. No separate “modules” you have to license to get a working demo.

4. **Realtime-ready**  
   Subscriptions can reflect changes as they land—useful for front-desk or lab scenarios where multiple people work at once.

5. **Open, portable data model**  
   Plain Postgres tables and a documented schema; you are not locked into a vendor’s opaque “student object.”

---

## Edge cases and safeguards (the “boring” stuff that matters)

- **Over-capacity** — Inserts that would exceed `max_capacity` are rejected with a clear message from the server function.
- **Duplicate enrollment** — Same student + same subject **in the same term** cannot be enrolled twice; they may re-take the subject in a later term.
- **Capacity edits** — The UI blocks lowering `max_capacity` below current headcount so you do not orphan enrollments logically.
- **Grades** — One grade row per student per subject **per term**; updates merge instead of duplicating.
- **Schedule** — One schedule row per subject **per term** (same catalog subject can meet at different times next semester).
- **Active term** — Only one semester is marked active at a time (partial unique index); the header can still focus any term for review.
- **Student IDs** — Generated in the database for new rows (`LW-<calendar year>-<serial>`); imports can still set an explicit ID.
- **Programs** — Cannot delete a program that still has students (foreign key).
- **Instructors** — Work emails are unique. Deleting an instructor unassigns them from subjects (`instructor_id` becomes null). To mark someone as able to sign in, create a Supabase Auth user with the same email, then set `instructors.user_id` to that user’s `auth.users.id` (SQL or a future admin action).

Row Level Security is configured for **authenticated** users in this MVP; tighten policies when you add roles (e.g. student vs registrar).

---

## Roadmap: AI integration assistant

**Planned (not shipped yet):** an **AI assistant** embedded in the admin experience to help staff work faster and answer questions in context—for example:

- Natural-language lookups (“Who is enrolled in CS-210 this term?”).
- Guided workflows (“Walk me through enrolling a waitlisted student without breaking capacity.”).
- Summaries for meetings or accreditation snippets from current directory and enrollment data.

The assistant will be designed to **respect the same rules as the app** (capacity, duplicates, RLS) so suggestions stay aligned with what the database actually allows. Documentation here will be updated when the feature lands.

---

## Quick start

1. **Environment** — Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. **Schema** — In order, run `001_initial.sql` through `004_instructors.sql` in the Supabase SQL Editor (or your migration workflow).
3. **Demo data (optional)** — Run `supabase/seed_demo.sql` after all migrations for a populated snapshot (chart, full sections, mixed grades, one demo term, demo instructors).
4. **Auth** — Create an admin user under **Authentication → Users** in Supabase, then sign in at the app.
5. **Dev server** — `npm install` then `npm run dev`.

For **live dashboard updates**, enable replication for the app tables (including `programs`, `instructors`, and `semesters`) under **Database → Replication** in Supabase.

---

## Project layout (high level)

- `src/services/` — Supabase calls (semesters, programs, instructors, students, subjects, enrollments, schedules, grades, dashboard).
- `src/pages/` — Screen-level UI (dashboard, semesters, programs, students, instructors, subjects, enrollments, schedule, grades).
- `src/contexts/active-semester-context.tsx` — Selected term (header) drives enrollment, schedule, grades, and dashboard filters.
- `src/components/layout/` — Shell and collapsible sidebar.
- `supabase/migrations/` — Canonical schema and `enroll_student` function.
- `supabase/seed_demo.sql` — Optional demo dataset.

---

## License

Use and adapt for your institution or product pitch as needed; ensure compliance with Supabase and third-party terms for production deployments.
