# Implementation Plan — Tazkia Mengajar Monitoring System

Companion documents: [architecture.md](./architecture.md),
[database-design.md](./database-design.md), [deployment.md](./deployment.md).

Each phase ends with a verification step. A phase is not finished until its
checks pass; errors are fixed before the next phase begins.

## Decisions taken up front

| Question | Decision | Reason |
|---|---|---|
| Framework | Next.js 16, App Router, TypeScript | Required by PRD §31 |
| Styling | Tailwind CSS v4 + shadcn/ui | Required by PRD §31 |
| Database | PostgreSQL + Prisma; local PG 17 in dev, Neon in production | Required by PRD §29; Neon chosen by the user |
| Auth | Username + password, bcryptjs hash, signed JWT session cookie via `jose` | PRD §28; simplest correct option for a single role |
| Storage | Vercel Blob, server-side upload | Chosen by the user; no storage credential reaches the browser |
| Image pipeline | `sharp`; images to WebP, non-images untouched | CLAUDE.md §18 |
| Excel export | ExcelJS | Actively maintained, works in serverless |
| Dates | `date-fns` with the `id` locale | Indonesian day/date formatting required by the report template |
| Tests | Vitest over report, narrative, validation and attendance logic | Business logic is where regressions actually hurt |
| Prisma version | Pinned exactly to **7.10.0** (`--save-exact`) for both `prisma` and `@prisma/client` | npm's `latest` tag currently points at `8.0.0-rc.15`, a release candidate. Installing unpinned produced a CLI/client version mismatch and a broken tree. Never install Prisma here without an explicit version. |

## Environment notes

Findings from Phase 0 that cost time and should not be rediscovered:

- **npm is very slow on this machine** (10–20 minutes for a single install), most
  likely Defender scanning `node_modules`. Never run two `npm install` commands
  concurrently against this tree — doing so corrupted `node_modules` once and
  required a repair install.
- **`create-next-app` refuses any non-empty directory**, including stray `.md`
  files, so the spec files had to be moved aside before scaffolding.
- **Next.js 16 writes `AGENTS.md`** describing breaking changes from earlier
  versions. Read `node_modules/next/dist/docs/` before writing App Router code
  rather than relying on Next 14/15 habits.
- The scaffold ignores `.env*` wholesale; `!.env.example` was added so the
  template stays tracked.

## Phase 0 — Analysis (done)

- Read CLAUDE.md and the PRD in full.
- Inspected the repository: empty except for the two spec files and one commit.
- Confirmed Node 24.18.0, npm 11.16.0, local PostgreSQL 17.7 listening on 5432.
- Confirmed no Vercel CLI and no GitHub CLI installed.
- Wrote `architecture.md` and `database-design.md`.

## Phase 1 — Project initialization

Scaffold Next.js with TypeScript, Tailwind, ESLint, App Router and a `src`
directory. Install Prisma, Zod, React Hook Form, jose, bcryptjs, sharp, Vercel
Blob, ExcelJS, date-fns, lucide-react and sonner. Initialize shadcn/ui and add
the primitives the app needs.

**Check:** `npm run build` succeeds on the untouched scaffold.

## Phase 2 — Database

Write `prisma/schema.prisma` covering all entities, with the enums, relations,
indexes, unique constraints and deletion rules from `database-design.md`. Create
the initial migration. Write `prisma/seed.ts` producing one admin, one location,
ten team members, student groups, students, schedules, a curriculum tree, and one
complete activity with a report.

**Check:** drop the database, migrate, seed, and confirm row counts.

## Phase 3 — Authentication

Password hashing, JWT session cookie, login and logout server actions,
middleware gate, and `requireUser()` inside every protected page and action.

**Check:** an unauthenticated request to a protected route redirects to login; a
valid login reaches the dashboard; a wrong password shows a human error; logout
clears the cookie.

## Phase 4 — Application shell and design system

Sidebar with the exact navigation from PRD §33, header with user menu,
breadcrumbs, page container, and the reusable pieces every later phase needs:
data table, pagination, filter bar, form fields, dialog, confirm dialog, toast,
plus loading, empty and error states.

**Check:** the shell renders at desktop, tablet and phone widths; navigation works.

## Phase 5 — Master data

Full CRUD against the real database for Location, TeamMember, StudentGroup,
Student and the Curriculum tree. Server-side validation, pagination, search, and
archive-instead-of-delete when a row is already referenced.

**Check:** create, edit, archive and delete each entity; confirm a referenced row
cannot be hard-deleted and is offered archiving instead.

## Phase 6 — Scheduling

Weekly and custom schedules with multiple days per week, a date range, times, a
location, an assigned team and student groups. List, detail, form, and a month
calendar that distinguishes scheduled, completed and cancelled.

**Check:** a weekly schedule expands to the correct dates in the calendar, and a
schedule is never treated as a completed activity.

## Phase 7 — Activity workflow

The seven-step wizard: Informasi, Tim, Murid, Kurikulum, Dokumentasi, Review,
Laporan. Draft saving at any step. Team attendance with four statuses and notes.
Students recorded either as a plain beneficiary count or as individual attendance
rows, with a warning when the two disagree. Transitions between DRAFT, COMPLETED
and CANCELLED.

**Check:** complete the wizard end to end; save and resume a draft; deliberately
trigger the count-mismatch warning.

## Phase 8 — Documentation storage

Server-side multipart upload, magic-byte sniffing, size and extension limits,
filename sanitization, WebP conversion for images, pass-through for everything
else, Vercel Blob storage, metadata rows in PostgreSQL, gallery preview and delete.

**Check:** upload a JPEG and confirm it is stored as a smaller WebP; upload a PDF
and confirm it is untouched; reject an oversized file and a disallowed type.

## Phase 9 — Report generation

`lib/reports` with template rendering, default narrative, a validation checklist
and a single `generateActivityReport` entry point. Preview, edit narrative,
explicit regenerate, copy to clipboard.

**Check:** the generated text matches the PRD §17 template exactly, including team
status suffixes and line breaks; an edited narrative survives regeneration of the
report body; final generation is blocked while required data is missing.

## Phase 10 — Dashboard

Real aggregate queries for total activities, activities this month, total
beneficiaries, team members, locations, attendance rate, recent activities and
upcoming schedules.

**Check:** every number matches a hand-run SQL query against the seed data.

## Phase 11 — Export

ExcelJS export for the activity recap, team attendance and student attendance,
honouring the active date, location, team member and status filters.

**Check:** the exported rows equal the filtered rows shown on screen.

## Phase 12 — Testing and security review

Vitest unit tests over report rendering, narrative generation, report validation
and attendance consistency. Run lint, typecheck and build. Walk the full workflow
manually. Review auth, validation, upload handling and secrets.

**Check:** lint clean, build green, tests pass, no secret committed.

## Phase 13 — Production preparation

`.env.example`, README, `deployment.md`, production build settings, and the
migration strategy for Neon.

## Phase 14 — Vercel deployment

The user installs and authenticates the Vercel CLI; the project is then linked,
environment variables are set, and the application is deployed.

## Phase 15 — Production verification

Walk the entire checklist from the brief against the deployed URL, fix whatever
breaks, and only then report completion.
