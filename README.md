# Tazkia Mengajar Monitoring System

Internal web application for recording, monitoring and reporting Tazkia Mengajar
teaching activities. One admin role; the central object is the **Activity**
(Kegiatan), which ties together a location, a team and their attendance,
students and their attendance, curriculum material, documentation, and the
generated WhatsApp-ready report.

The guiding principle is **input once → structured data → reuse everywhere**.

## Requirements

| Tool       | Version tested |
|------------|----------------|
| Node.js    | 24.18.0 (Node 20+ should work) |
| npm        | 11.16.0 |
| PostgreSQL | 17.7 (14+ should work) |

## Installation

```bash
git clone <repository-url>
cd tazkia-mengajar-monitoring-system
npm install
```

## Environment variables

Copy the template and fill it in:

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection the app uses at runtime. On Neon, the **pooled** URL. |
| `DIRECT_URL` | production | Non-pooled connection for `prisma migrate`. Falls back to `DATABASE_URL`. |
| `AUTH_SECRET` | yes | Signing key for the session JWT, at least 32 characters. |
| `BLOB_READ_WRITE_TOKEN` | production | Vercel Blob token for documentation files. |

Generate an auth secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**Uploads in local development:** leave `BLOB_READ_WRITE_TOKEN` empty and files
are written to a git-ignored `.uploads/` folder, which exercises the whole
pipeline — validation, WebP conversion, metadata, preview, delete — without
provisioning a store. Production requires the real token; the local fallback is
refused there because Vercel's filesystem is ephemeral.

## Database setup

Create the database, then apply the schema:

```bash
createdb tazkia_mengajar          # or: psql -c "CREATE DATABASE tazkia_mengajar"
npm run db:migrate                # applies migrations, generates the client
npm run db:seed                   # sample data + the admin account
```

To start over from an empty database at any time:

```bash
npm run db:reset                  # drops, re-migrates and re-seeds
```

The seed refuses to run against a non-local `DATABASE_URL` unless
`ALLOW_REMOTE_SEED=true` is set, because it deletes existing rows.

### Development credentials

```
username: admin
password: tazkia-mengajar
```

These are for local development only. Create a real account in **Pengaturan**
and deactivate this one before using the app for real data.

## Development

```bash
npm run dev          # http://localhost:3000
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (runs TypeScript) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest suite |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:deploy` | Apply pending migrations (production) |
| `npm run db:seed` | Seed sample data |
| `npm run db:reset` | Drop, migrate and seed |
| `npm run db:studio` | Prisma Studio |

## Tests

```bash
npm test
```

40 tests covering the logic that would quietly corrupt records if it regressed:
report template rendering (including the exact WhatsApp formatting and line
breaks), narrative generation and ownership, the required-data checklist,
attendance tallies, the beneficiary-count consistency rule, and schedule
recurrence expansion. They are pure functions, so the suite needs no database.

## Build

```bash
npm run build
```

## Deployment

See [docs/deployment.md](docs/deployment.md) for the full Vercel + Neon walkthrough.

## Documentation

| Document | Contents |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Application, auth, storage, reporting and deployment architecture |
| [docs/database-design.md](docs/database-design.md) | Mermaid ERD, constraints, indexes, deletion policy |
| [docs/implementation-plan.md](docs/implementation-plan.md) | Phase plan, decisions and environment notes |
| [docs/deployment.md](docs/deployment.md) | How to reproduce the deployment |
| [docs/PRD.md](docs/PRD.md) | Product specification |
| [docs/engineering-rules.md](docs/engineering-rules.md) | Engineering rules for this project |

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui
(Base UI) · PostgreSQL · Prisma 7 · Zod · jose + bcryptjs · sharp · Vercel Blob ·
ExcelJS · date-fns · Vitest

## Project layout

```text
src/
├── app/
│   ├── (auth)/login/        public login
│   ├── (app)/               authenticated pages behind the shell
│   └── api/                 upload, local upload serving, Excel export
├── components/
│   ├── ui/                  shadcn primitives
│   ├── common/              shared page furniture, dialogs, table toolbar
│   ├── layout/              sidebar, header
│   └── <domain>/            activities, schedules, students, team, ...
├── lib/                     auth, db, storage, validation, reports, dates
├── server/
│   ├── actions/             mutations (Zod-validated, session-checked)
│   └── services/            business logic, unit-tested
└── proxy.ts                 route gate (Next 16's renamed middleware)
```

## Security notes

- Passwords are hashed with bcrypt (cost 12) and never logged.
- The session is a signed HS256 JWT in an `httpOnly`, `sameSite=lax` cookie;
  `secure` in production.
- `src/proxy.ts` is an optimistic redirect only. `requireUser()` is the real
  authorization boundary and runs in every protected page, action and route
  handler, because Server Actions can be invoked directly.
- A session is only valid while its account still exists and is active.
- Uploads are validated server-side by sniffing magic bytes, not by trusting the
  browser's declared MIME type; filenames are sanitised and size is capped.
- The storage token never reaches the browser — uploads go through the server.
- Master data referenced by history cannot be hard-deleted, only archived.
