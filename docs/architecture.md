# Architecture — Tazkia Mengajar Monitoring System

## 1. Purpose

Internal administrative web application for recording, monitoring and reporting
Tazkia Mengajar teaching activities. Single role (`ADMIN`). The guiding principle
is **input once → structured data → reuse everywhere**.

The central business object is the **Activity** (Kegiatan). Every other entity
exists either as master data feeding an Activity, or as output derived from it.

## 2. High-level architecture

```text
Browser (React Server Components + minimal client islands)
   │  HTTPS
   ▼
Vercel (Node.js runtime; Edge only for middleware)
   │
   ├── Next.js App Router
   │     ├── middleware.ts        → session cookie gate on protected routes
   │     ├── app/(auth)/login     → public
   │     ├── app/(app)/**         → protected pages (server components)
   │     └── app/api/**           → upload, download, export endpoints
   │
   ├── server/actions/*           → Server Actions (all mutations, Zod-validated)
   ├── server/services/*          → business logic (reports, stats, attendance)
   └── lib/*                      → db, auth, storage, validation, utils
   │
   ├────────────► PostgreSQL (Neon in production, local PG in development)
   └────────────► Vercel Blob (documentation files)
```

### Why this shape

CLAUDE.md §39 forbids over-engineering. There is no separate API service, no
message bus, no client-side state library. Data is read in React Server
Components directly through Prisma, and written through Server Actions. That is
the smallest thing that is correct, and it keeps every authorization check on
the server.

## 3. Directory layout

```text
src/
├── app/
│   ├── (auth)/login/             login page (public)
│   ├── (app)/                    authenticated shell: sidebar + header
│   │   ├── dashboard/
│   │   ├── kegiatan/             activities: list, [id], baru (wizard)
│   │   ├── jadwal/               schedules: list, kalender, [id]
│   │   ├── tim/                  team members
│   │   ├── murid/                students + kelompok (groups)
│   │   ├── kurikulum/            curriculum → period → material
│   │   ├── tempat/               locations
│   │   ├── laporan/              reports + rekap
│   │   └── pengaturan/           settings / admin users
│   └── api/
│       ├── upload/               multipart upload → sharp → Vercel Blob
│       └── export/               ExcelJS workbook download
├── components/
│   ├── ui/                       shadcn primitives
│   ├── layout/                   sidebar, header, breadcrumbs, page shell
│   ├── common/                   data table, pagination, empty/error state,
│   │                             confirm dialog, filter bar, form fields
│   └── <domain>/                 activities, schedules, students, team, ...
├── lib/
│   ├── auth/                     session (jose JWT cookie), password (bcrypt)
│   ├── db/                       Prisma client singleton
│   ├── storage/                  Vercel Blob put/delete + image pipeline
│   ├── validation/               Zod schemas shared by client and server
│   ├── reports/                  report template, narrative, validation
│   └── utils/                    dates (id-ID), formatting, pagination
├── server/
│   ├── actions/                  "use server" mutations per domain
│   └── services/                 business logic, unit-testable
└── types/
```

## 4. Authentication

- Username + password. No OAuth in the MVP (PRD §28).
- Passwords hashed with **bcrypt** (cost 12). Never stored or logged in plain text.
- On successful login the server issues a **signed JWT** (HS256, via `jose`)
  written to an `httpOnly`, `sameSite=lax`, `secure`-in-production cookie named
  `tazkia_session`, with a 7-day expiry.
- `middleware.ts` verifies the cookie on every protected request and redirects to
  `/login` when it is absent or invalid. **This is a fast gate, not the security
  boundary.**
- The real boundary is `requireUser()`, called at the top of every protected page,
  Server Action and route handler. Middleware alone is never trusted, because
  Server Actions can be invoked directly.
- `jose` is used rather than `jsonwebtoken` because middleware runs on the Edge
  runtime, where Node crypto APIs are unavailable.

### Why not NextAuth

Auth.js adds an adapter, a provider abstraction and extra tables for what is a
single credentials provider with one role. CLAUDE.md §40 says prefer the simpler,
easier-to-debug solution. A small `jose` + `bcrypt` module is that solution, and
it leaves room for roles later — the JWT payload already carries `role`.

## 5. File storage

```text
Browser ──multipart──► /api/upload (Node runtime, admin-gated)
                            │
                            ├── validate: size, extension, sniffed magic bytes
                            ├── images → sharp → WebP (quality 82, max 2000px)
                            ├── non-images → passed through untouched
                            ├── put() → Vercel Blob (random suffix, public)
                            └── Documentation row written to PostgreSQL
```

- **Binaries never touch PostgreSQL.** The database stores metadata only:
  original filename, stored key, MIME type, size, URL, activity id, timestamps.
- Uploads are **server-side**, not client-direct, so the blob token never reaches
  the browser. `BLOB_READ_WRITE_TOKEN` is server-only (no `NEXT_PUBLIC_` prefix).
- The Vercel filesystem is ephemeral; nothing is ever written to local disk.

### Image conversion policy (CLAUDE.md §18)

| Input                              | Stored as                  |
|------------------------------------|----------------------------|
| JPEG / PNG / WebP / AVIF / TIFF    | WebP (converted)           |
| PDF, DOCX, XLSX, PPTX, ZIP, MP4, … | original format, untouched |

GIF is passed through rather than converted, because converting an animated GIF
to a still WebP silently destroys the animation.

## 6. Report generation

Report construction lives in `lib/reports/`, never inside a component.

```text
generateActivityReport(activity) → { text, narrative, missing[], isComplete }
```

Pipeline:

1. `loadActivityForReport(id)` — one Prisma query with exactly the includes needed
   (team members, students, documentation, location, curriculum material).
2. `validateReportData(activity)` — returns a checklist of required fields
   (date, location, time, beneficiary, count, aid type, at least one team member,
   at least one documentation file, narrative). Final generation is blocked until
   the checklist is clean; drafts save regardless.
3. `buildDefaultNarrative(activity)` — default Indonesian narrative from
   structured data.
4. `renderReportTemplate(activity, narrative)` — substitutes placeholders into the
   PRD §17 WhatsApp template, preserving `*bold*` markers and line breaks.

**Narrative ownership:** `Report.narrativeEdited` is a boolean. Once an admin
edits the narrative it is never silently overwritten — regenerating the report
body keeps the edited narrative unless the admin explicitly triggers *Regenerate
Narrative*, which is a separate, confirmed action (CLAUDE.md §23).

## 7. Data access and performance

- Reads happen in server components; lists are **server-side paginated**
  (20–25 per page) and filtered in SQL, never in the browser.
- Prisma `include`/`select` are explicit at each call site to avoid N+1 queries.
- Dashboard statistics use aggregate queries (`count`, `groupBy`, `_sum`) issued
  together in one `$transaction`, rather than loading rows into memory.
- A Prisma client singleton survives hot reload in development and connection
  churn in serverless.

## 8. Validation and error handling

- Every Server Action begins with `requireUser()` and then `schema.parse(input)`.
- Zod schemas in `lib/validation/` are shared by React Hook Form (client UX) and
  the Server Action (security boundary). Client validation is never sufficient.
- Actions return a discriminated result
  `{ ok: true, data } | { ok: false, error, fieldErrors? }`.
  Raw Prisma or driver errors are logged server-side and replaced with human
  Indonesian messages before reaching the user (CLAUDE.md §30).

## 9. Deletion policy

Historical integrity beats tidy tables. Master data that activities may already
reference (Location, TeamMember, StudentGroup, Student, CurriculumMaterial) is
**archived** (`isActive = false`) rather than deleted, and archived rows remain
joinable so past reports keep rendering correctly. Hard delete is offered only
when a row has zero references; the server checks first and returns a clear
message when it cannot. Rows genuinely owned by a parent
(ActivityTeamMember, ActivityStudent, ScheduleTeamMember, ScheduleStudentGroup,
Report, Documentation) cascade from that parent.

## 10. Deployment

```text
GitHub (optional) → Vercel build → Next.js
                         ├── DATABASE_URL          → Neon Postgres (pooled)
                         ├── DIRECT_URL            → Neon direct (migrations)
                         ├── AUTH_SECRET           → JWT signing key
                         └── BLOB_READ_WRITE_TOKEN → Vercel Blob
```

`prisma generate` runs in `postinstall`; `prisma migrate deploy` runs as part of
the Vercel build command so production schema changes ship with the code.
Routes that touch Prisma, sharp or Blob run on the Node.js runtime. Only
`middleware.ts` runs on Edge, and it does nothing but verify a JWT.
