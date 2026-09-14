# Tazkia Mengajar — AI Development Instructions

## 1. Project Identity

Project name:

**Tazkia Mengajar Monitoring System**

Purpose:

Internal web application for monitoring, recording, documenting, and reporting Tazkia Mengajar activities.

The application is used only by internal Admin users.

The core principle is:

> Input data once → reuse structured data everywhere.

The system is not merely an attendance application.

The main business object is the **Activity/Kegiatan**.

An Activity connects:

- location
- schedule
- team
- team attendance
- students
- student attendance
- curriculum/material
- beneficiaries
- documentation
- generated report

---

# 2. Product Priorities

Always prioritize:

1. Correct business logic
2. Data integrity
3. Usability
4. Maintainability
5. Security
6. Performance
7. Visual polish

Do not prioritize visual complexity over functionality.

Avoid unnecessary features.

Do not implement features outside the MVP unless explicitly requested.

---

# 3. User Model

The MVP has only one role:

`ADMIN`

Every authenticated user is an Admin.

However, architecture should not make future roles impossible.

Future roles may include:

- Pengajar
- Pembimbing
- Super Admin

Do not implement them now.

---

# 4. Core Domain Model

The central entity is:

`Activity`

Conceptually:

```text
Activity
├── Location
├── Team Members
│   └── Attendance
├── Students
│   └── Attendance
├── Curriculum Material
├── Documentation
└── Report
```

Never duplicate business data unnecessarily.

For example:

Do not store a second copy of a team member's name inside Activity if a relation to TeamMember already exists.

Use relational data.

---

# 5. Recommended Technology

Use:

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Prisma
- Zod
- React Hook Form

Authentication must use a secure approach compatible with Next.js and Vercel.

Use a proper object storage service for uploaded files.

Do NOT use local filesystem storage for permanent uploaded files.

---

# 6. Architecture Rules

Prefer a clean, modular architecture.

Recommended conceptual structure:

```text
src/
├── app/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── dashboard/
│   ├── activities/
│   ├── schedules/
│   ├── students/
│   ├── team/
│   ├── curriculum/
│   ├── locations/
│   └── reports/
├── lib/
│   ├── auth/
│   ├── db/
│   ├── storage/
│   ├── validation/
│   ├── reports/
│   └── utils/
├── server/
│   ├── actions/
│   └── services/
└── types/
```

Adapt the structure if the chosen implementation has a better Next.js convention, but preserve separation of concerns.

---

# 7. Database Rules

Use PostgreSQL + Prisma.

Do not use JSON fields as a replacement for proper relational tables unless there is a strong technical reason.

Important entities include:

```text
User
Location
TeamMember
StudentGroup
Student
Schedule
ScheduleTeamMember
ScheduleStudentGroup
Curriculum
CurriculumPeriod
CurriculumMaterial
Activity
ActivityTeamMember
ActivityStudent
Documentation
Report
```

Use:

- primary keys
- foreign keys
- indexes
- unique constraints where appropriate
- createdAt
- updatedAt

Important entities should also track creator/updater when practical.

---

# 8. Activity Rules

Activity is the source of truth for an actual teaching session.

An Activity may be:

```text
DRAFT
COMPLETED
CANCELLED
```

A schedule does not automatically mean an Activity happened.

A scheduled event and an actual Activity are separate concepts.

---

# 9. Team Attendance

Allowed statuses:

```text
HADIR
IZIN
SAKIT
ALPA
```

Each ActivityTeamMember must contain:

- activity
- team member
- attendance status
- optional note

Do not hard-code names.

---

# 10. Student Attendance

Allowed statuses:

```text
HADIR
IZIN
SAKIT
ALPA
```

Student attendance is optional at the individual level.

An Activity may contain only:

```text
beneficiaryCount = 10
```

without individual student records.

If individual students are recorded, attendance should be linked to the Student entity.

---

# 11. Beneficiary Count

An Activity must support:

```text
beneficiaryCount
```

This is independent from whether individual Student records are available.

If students are recorded, validate obvious inconsistencies.

Example:

```text
10 students
8 HADIR
1 IZIN
1 SAKIT
```

is valid.

```text
10 students
8 HADIR
1 IZIN
```

must trigger a warning or validation depending on context.

Do not silently produce misleading totals.

---

# 12. Locations

Locations are reusable master data.

Admin can:

- create
- read
- update
- archive/delete when safe

A location contains:

- name
- partner/mitra
- full address
- category
- description
- active status

Never hard-code the current location.

---

# 13. Team Members

TeamMember represents:

- Pengajar
- Pembimbing
- Anggota Tim

These are intentionally one entity in the MVP.

Admin can CRUD team members.

Do not create separate Pengajar and Pembimbing tables.

---

# 14. Student Structure

Student structure must remain flexible.

A Location may have multiple StudentGroups.

Examples:

```text
Kelas Anak
Remaja
Tahsin
Kelompok A
Kelompok B
```

Do not assume every location uses school-style classes.

StudentGroup must be customizable.

---

# 15. Scheduling

Schedules must support:

- weekly recurring schedules
- multiple days per week
- custom schedules
- start date
- end date
- start time
- end time
- location
- team
- student groups

Keep:

```text
Schedule
```

separate from:

```text
Activity
```

Schedule = planned activity.

Activity = activity that actually happened.

---

# 16. Curriculum

Curriculum should be hierarchical.

Conceptually:

```text
Curriculum
└── Period
    └── Material
```

Material can be linked to an Activity.

Do not hard-code curriculum content.

---

# 17. File Upload

This is extremely important.

Do NOT store binary files directly inside PostgreSQL.

Use:

```text
Object Storage
    ↓
File
```

and:

```text
PostgreSQL
    ↓
File metadata
```

Metadata should include:

- original filename
- stored filename/key
- MIME type
- file size
- storage key
- URL if applicable
- activity ID
- createdAt

---

# 18. Image Optimization

Images should be converted to WebP before storage when technically appropriate.

Do NOT attempt to convert every file format to WebP.

Correct behavior:

```text
JPEG → WebP
PNG → WebP
WEBP → WebP
```

Non-image files:

```text
PDF → PDF
DOCX → DOCX
XLSX → XLSX
PPTX → PPTX
MP4 → MP4
```

Preserve their original format.

---

# 19. Upload Security

Validate:

- MIME type
- file extension
- file size
- filename

Sanitize filenames.

Do not trust client-side MIME type alone.

Use server-side validation.

Do not expose storage credentials to the browser.

Use signed upload/download mechanisms if supported by the chosen storage provider.

---

# 20. Report Generation

Report generation is a core feature.

The report is generated from Activity data.

Do not require Admin to manually rewrite information already stored in the database.

The system should automatically generate:

- date
- day
- location
- address
- time
- beneficiary
- beneficiary count
- activity/bantuan
- team
- team attendance status
- narrative

The generated report must remain editable before final use.

---

# 21. Report Template

Default template:

```text
*Assalamualaikum warahmatullahi wabarakatuh*
*Izin Melaporkan Kegiatan Tazkia Mengajar*

*📝 Nama Kegiatan*
*Tazkia Mengajar*
*(Mencerdaskan Generasi Penerus Bangsa)*

*🤝 Mitra:*
{MITRA}

*📆 Hari, Tanggal :*
{HARI}, {TANGGAL}

*📍 Lokasi Kegiatan :*
{ALAMAT}

*⏰ Waktu Kegiatan:*
Pukul {JAM_MULAI} s/d {JAM_SELESAI} WIB

*🏹Penerima Manfaat:*
{PENERIMA_MANFAAT}

*👨‍👩‍👦 Jumlah penerima manfaat:*

- {JUMLAH} anak

*🎁 Jenis Bantuan:*

- {JENIS_BANTUAN}

⛑️ *Tim yang bertugas*

{DAFTAR_TIM}

📷 Dokumentasi :
(terlampir)

📄 *Narasi:*
{NARASI}

*Tazkia Mengajar x BaitulMal Tazkia*

*Wassalamualaikum warahmatullahi wabarakatuh*
```

Preserve line breaks and WhatsApp formatting.

---

# 22. Report Validation

Final report requires:

- date
- location
- time
- beneficiary
- beneficiary count
- activity type
- at least one team member
- at least one documentation file
- narrative

If incomplete, show exactly what is missing.

Example:

```text
Laporan belum lengkap.

✗ Dokumentasi
✓ Lokasi
✓ Tim
✓ Jumlah penerima manfaat
```

Do not allow final report generation until required data exists.

Draft saving is allowed with incomplete data.

---

# 23. Narrative

The system should generate a default narrative from structured data.

Admin can edit it.

If Admin manually edits the narrative, do not silently overwrite it when the report is regenerated.

Use explicit regenerate behavior.

---

# 24. UI/UX

The application should be:

- clean
- modern
- professional
- simple
- responsive
- fast
- practical

Do not create excessive animations.

Do not make the dashboard visually complicated.

The application should feel like a serious internal administrative tool.

---

# 25. Activity Creation

Prefer a wizard:

```text
1. Informasi
2. Tim
3. Murid
4. Kurikulum
5. Dokumentasi
6. Review
7. Report
```

Admin should be able to save as Draft.

Do not make one extremely long form if a wizard improves usability.

---

# 26. Dashboard

Dashboard should show:

- total activities
- activities this month
- beneficiary count
- team member count
- location count
- attendance rate
- recent activities
- upcoming schedules

Use real database data.

Never leave dashboard statistics permanently hard-coded.

---

# 27. Search & Filters

Important lists must support:

- search
- date filter
- location filter
- status filter

Do not load unlimited records into the browser.

Use server-side pagination when appropriate.

---

# 28. Pagination

Use pagination for potentially large datasets.

Default approximately:

20–25 records/page.

---

# 29. Validation

Use Zod or equivalent schema validation.

Validation must happen server-side.

Client-side validation is useful for UX but is NOT a security boundary.

---

# 30. Error Handling

Do not expose raw technical errors to users.

Bad:

```text
PrismaClientKnownRequestError
```

Good:

```text
Gagal menyimpan kegiatan.
Silakan coba lagi.
```

Keep technical details in server logs.

---

# 31. Loading States

Every async action needs a visible loading state.

Examples:

```text
Menyimpan...
Mengunggah...
Menghasilkan laporan...
Menghapus...
```

Prevent accidental duplicate submissions.

---

# 32. Security

At minimum:

- secure password hashing
- protected routes
- server-side authorization
- input validation
- safe database queries
- secure cookies/session
- secure file uploads
- secret management
- security headers where practical

Never expose:

- database credentials
- storage secret
- auth secret

to the browser.

---

# 33. Environment Variables

Use `.env.local`.

Provide:

`.env.example`

Never commit real secrets.

Example variables:

```text
DATABASE_URL=
AUTH_SECRET=

STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET=
STORAGE_BUCKET=
```

Adapt variable names to the actual storage provider.

---

# 34. Seed Data

Development seed should contain:

- one admin
- one location
- sample team members
- sample student groups
- sample students
- sample schedules
- sample curriculum
- one completed activity
- documentation metadata if practical

Seed credentials must be development-only.

Never use development credentials in production.

---

# 35. Testing

Before declaring completion, test:

## Authentication

- valid login
- invalid login
- logout
- protected route

## Master Data

- create
- read
- update
- archive/delete

## Activities

- draft
- edit
- complete
- cancel

## Attendance

- all statuses
- notes
- count consistency

## Documentation

- upload
- multiple files
- image conversion
- non-image preservation
- delete
- invalid file
- oversized file

## Reporting

- generate
- edit
- regenerate
- copy
- missing required fields

## Export

- Excel
- filters

## Responsive

- desktop
- tablet
- mobile

---

# 36. Performance

Avoid:

- N+1 database queries
- loading entire tables unnecessarily
- huge client-side datasets
- unnecessary client components
- unnecessary API calls

Prefer:

- server components where appropriate
- server-side filtering
- pagination
- optimized images
- lazy loading

---

# 37. Git Rules

Use meaningful commits.

Example:

```text
feat: initialize Next.js application
feat: add Prisma database schema
feat: implement authentication
feat: implement location management
feat: implement team management
feat: implement student management
feat: implement scheduling
feat: implement activity workflow
feat: implement documentation storage
feat: implement report generation
feat: implement dashboard
feat: implement Excel export
fix: ...
```

Do not make one giant meaningless commit if development is performed incrementally.

---

# 38. Definition of Done

The project is NOT finished because:

- UI exists
- pages render
- mock data appears
- database exists

It is finished only when the complete workflow works:

```text
Login
 ↓
Dashboard
 ↓
Create master data
 ↓
Create schedule
 ↓
Create activity
 ↓
Record team attendance
 ↓
Record students
 ↓
Record student attendance
 ↓
Select curriculum
 ↓
Upload documentation
 ↓
Review
 ↓
Generate report
 ↓
Edit narrative
 ↓
Copy report
 ↓
Complete activity
 ↓
View history
 ↓
Filter/review
 ↓
Export
```

---

# 39. Anti-Overengineering Rule

Do not introduce unnecessary:

- microservices
- Kubernetes
- event buses
- complex state management
- complex permission systems
- AI features
- real-time infrastructure

This is an internal administrative application.

Keep the architecture boring, reliable, and maintainable.

---

# 40. Final Principle

When choosing between two technically valid solutions:

Prefer the solution that is:

- simpler
- easier to understand
- easier to debug
- easier to deploy
- easier to maintain

The objective is a working production application, not an impressive architecture diagram.