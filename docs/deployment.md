# Deployment — Vercel + Neon

How to reproduce a production deployment of the Tazkia Mengajar Monitoring
System.

```text
Browser
   ↓ HTTPS
Vercel (Next.js)
   ├──► Neon PostgreSQL   (pooled at runtime, direct for migrations)
   └──► Vercel Blob       (documentation files)
```

Nothing is written to the local filesystem in production. Vercel's filesystem is
ephemeral, so uploads must go to Blob or they vanish on the next deploy.

## 1. Create the database (Neon)

1. Create a project at [neon.tech](https://neon.tech) and pick a region close to
   your Vercel region.
2. From the dashboard, copy **two** connection strings:
   - the **pooled** one — its host contains `-pooler` — for `DATABASE_URL`
   - the **direct** one — no `-pooler` — for `DIRECT_URL`

Both are needed. Prisma Migrate uses DDL statements and advisory locks that
PgBouncer cannot proxy, so migrations must bypass the pooler; the application
itself wants the pooler, because serverless functions open many short-lived
connections.

## 2. Create the Blob store

In the Vercel dashboard: **Storage → Create → Blob**, then connect it to the
project. Connecting sets `BLOB_READ_WRITE_TOKEN` on the project automatically.

## 3. Create the Vercel project

Either connect the Git repository through the Vercel dashboard, or use the CLI:

```bash
npm install -g vercel
vercel login
vercel link
```

## 4. Set environment variables

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string |
| `DIRECT_URL` | Neon **direct** connection string |
| `AUTH_SECRET` | A fresh 32+ character secret, different from development |
| `BLOB_READ_WRITE_TOKEN` | Set automatically when the Blob store is connected |

Generate the auth secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Via the CLI, for each variable:

```bash
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production
vercel env add AUTH_SECRET production
```

Set them for **Production** (and Preview, if you use preview deployments).

## 5. Migrations

`vercel.json` sets the build command to:

```
prisma migrate deploy && next build
```

so pending migrations apply automatically on every deploy. `migrate deploy`
never prompts and never resets data.

Running them in the build is deliberate. A schema change would otherwise need a
separate manual step that is easy to forget, and the failure mode here is the
safe one: if a migration fails the build fails, so code never ships against a
schema that did not apply.

To apply migrations by hand instead — useful when inspecting a risky change
before it ships — point the direct URL at Neon and run:

```bash
DATABASE_URL="<neon direct url>" DIRECT_URL="<neon direct url>" npm run db:deploy
```

## 6. Create the first admin

The seed is development-only — it **deletes existing rows**, and refuses to run
against a non-local database unless `ALLOW_REMOTE_SEED=true`. Do not point it at
production.

Create the first admin with a one-off script instead:

```bash
DATABASE_URL="<neon direct url>" node -e "
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
(async () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  await prisma.user.create({
    data: {
      username: 'admin',
      name: 'Administrator',
      passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
      role: 'ADMIN',
    },
  });
  console.log('Admin created.');
  await prisma.\$disconnect();
})();
"
```

Pass the password through `ADMIN_PASSWORD` rather than typing it inline, so it
does not end up in your shell history.

Afterwards you can add further admins from **Pengaturan** inside the app.

## 7. Deploy

```bash
vercel --prod
```

Or push to the default branch if the Git integration is connected.

## 8. Verify production

Walk the full workflow against the deployed URL:

```text
[ ] Login with the admin account
[ ] Unauthenticated request to /dashboard redirects to /login
[ ] Dashboard statistics load
[ ] Create a location
[ ] Create a team member
[ ] Create a student group and a student
[ ] Create a curriculum, period and material
[ ] Create a schedule; check it appears on the calendar
[ ] Create an activity (step 1 saves a draft)
[ ] Record team attendance with a non-HADIR status and a note
[ ] Record student attendance; confirm the count mismatch warning appears
[ ] Select curriculum material
[ ] Upload a JPEG — confirm it is stored as WebP and smaller
[ ] Upload a PDF — confirm it is unchanged
[ ] Try an oversized file — confirm it is rejected with a clear message
[ ] Review step shows the completeness checklist
[ ] Generate the report
[ ] Edit the narrative, then regenerate the report and confirm the edit survives
[ ] Use Regenerate Narrative and confirm it is replaced
[ ] Copy the report to the clipboard
[ ] Complete the activity
[ ] Filter the history by date, location and status
[ ] Export Excel and confirm it matches the filters
[ ] Logout
```

## Operational notes

**Runtimes.** Routes touching Prisma, sharp or Blob run on the Node.js runtime.
Only `src/proxy.ts` runs on Edge, and it does nothing but verify a JWT.

**Migrations on future deploys.** These run automatically as part of the build
(see step 5). Prefer additive migrations so the previous version keeps working
during the rollover, since old and new code briefly serve at the same time.

**Rotating `AUTH_SECRET`.** Changing it invalidates every session and signs
everybody out. That is the correct response to a suspected leak.

**Backups.** Neon keeps point-in-time history on its paid tiers; on the free
tier, take periodic `pg_dump` snapshots if the data matters.

**Blob retention.** Deleting documentation in the app deletes the row first and
then the blob. If the blob delete fails, the file is orphaned but the app stays
consistent — the failure is logged rather than surfaced to the user.
