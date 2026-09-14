# Database Design — Tazkia Mengajar Monitoring System

Engine: **PostgreSQL**. ORM: **Prisma**.
Development runs against local PostgreSQL 17; production runs against Neon.

## 1. Design principles

1. **Relational, not JSON.** Business data lives in real tables with real foreign
   keys. No JSON column stands in for a relation (CLAUDE.md §7).
2. **No duplicated business data.** An Activity links to a TeamMember; it never
   copies that member's name.
3. **History is immutable.** Master data is archived, not deleted, once it is
   referenced by an Activity. Past reports must keep rendering correctly.
4. **Audit metadata everywhere.** All tables carry `createdAt` / `updatedAt`;
   Activity and Report also carry `createdById` / `updatedById`.
5. **Schedule is not Activity.** A plan and a thing-that-happened are separate
   tables, with no automatic transition between them.

## 2. ER diagram

```mermaid
erDiagram
    User ||--o{ Activity : "createdBy"
    User ||--o{ Report : "createdBy"

    Location ||--o{ StudentGroup : has
    Location ||--o{ Schedule : hosts
    Location ||--o{ Activity : hosts

    StudentGroup ||--o{ Student : contains
    StudentGroup ||--o{ ScheduleStudentGroup : "planned for"

    TeamMember ||--o{ ScheduleTeamMember : "assigned to"
    TeamMember ||--o{ ActivityTeamMember : attended

    Schedule ||--o{ ScheduleTeamMember : has
    Schedule ||--o{ ScheduleStudentGroup : has
    Schedule ||--o{ Activity : "realized as"

    Curriculum ||--o{ CurriculumPeriod : has
    CurriculumPeriod ||--o{ CurriculumMaterial : has
    CurriculumMaterial ||--o{ ActivityMaterial : "used in"

    Activity ||--o{ ActivityTeamMember : records
    Activity ||--o{ ActivityStudent : records
    Activity ||--o{ ActivityMaterial : covers
    Activity ||--o{ Documentation : has
    Activity ||--o| Report : produces

    Student ||--o{ ActivityStudent : "attendance of"

    User {
        string id PK
        string username UK
        string passwordHash
        string name
        enum   role
        bool   isActive
    }
    Location {
        string id PK
        string name
        string partner
        string address
        string category
        string description
        bool   isActive
    }
    TeamMember {
        string id PK
        string fullName
        string nickname
        string status
        string phone
        string photoUrl
        string notes
        bool   isActive
    }
    StudentGroup {
        string id PK
        string locationId FK
        string name
        string description
        bool   isActive
    }
    Student {
        string id PK
        string studentGroupId FK
        string fullName
        enum   gender
        date   birthDate
        string notes
        bool   isActive
    }
    Schedule {
        string id PK
        string locationId FK
        string title
        enum   recurrence
        int    daysOfWeek
        date   startDate
        date   endDate
        string startTime
        string endTime
        string notes
        bool   isActive
    }
    ScheduleTeamMember {
        string id PK
        string scheduleId FK
        string teamMemberId FK
    }
    ScheduleStudentGroup {
        string id PK
        string scheduleId FK
        string studentGroupId FK
    }
    Curriculum {
        string id PK
        string name
        string description
        bool   isActive
    }
    CurriculumPeriod {
        string id PK
        string curriculumId FK
        string name
        int    orderIndex
    }
    CurriculumMaterial {
        string id PK
        string periodId FK
        string title
        string meetingLabel
        string objective
        string description
        string notes
        int    orderIndex
        bool   isActive
    }
    Activity {
        string id PK
        string locationId FK
        string scheduleId FK
        date   date
        string startTime
        string endTime
        string partner
        string beneficiary
        int    beneficiaryCount
        string aidType
        string notes
        enum   status
        string createdById FK
        string updatedById FK
    }
    ActivityTeamMember {
        string id PK
        string activityId FK
        string teamMemberId FK
        enum   attendance
        string note
        int    orderIndex
    }
    ActivityStudent {
        string id PK
        string activityId FK
        string studentId FK
        enum   attendance
        string note
    }
    ActivityMaterial {
        string id PK
        string activityId FK
        string materialId FK
    }
    Documentation {
        string id PK
        string activityId FK
        string originalFilename
        string storedFilename
        string mimeType
        int    size
        string storageKey
        string url
        bool   isImage
    }
    Report {
        string   id PK
        string   activityId FK UK
        string   content
        string   narrative
        bool     narrativeEdited
        datetime generatedAt
        string   createdById FK
    }
```

## 3. Enums

| Enum               | Values                            | Used by                                 |
|--------------------|-----------------------------------|-----------------------------------------|
| `Role`             | `ADMIN`                           | `User.role` (room for future roles)     |
| `AttendanceStatus` | `HADIR`, `IZIN`, `SAKIT`, `ALPA`  | `ActivityTeamMember`, `ActivityStudent` |
| `ActivityStatus`   | `DRAFT`, `COMPLETED`, `CANCELLED` | `Activity.status`                       |
| `Recurrence`       | `WEEKLY`, `CUSTOM`                | `Schedule.recurrence`                   |
| `Gender`           | `LAKI_LAKI`, `PEREMPUAN`          | `Student.gender` (optional)             |

## 4. Key constraints

Unique:

- `User.username`
- `Report.activityId` — one report per activity
- `(activityId, teamMemberId)` on `ActivityTeamMember` — a member appears once
- `(activityId, studentId)` on `ActivityStudent`
- `(activityId, materialId)` on `ActivityMaterial`
- `(scheduleId, teamMemberId)` on `ScheduleTeamMember`
- `(scheduleId, studentGroupId)` on `ScheduleStudentGroup`
- `(locationId, name)` on `StudentGroup` — no duplicate group names per location

Indexes, chosen from the actual query patterns of the list pages and dashboard:

- `Activity(date)`, `Activity(status)`, `Activity(locationId)` — history filters
- `Activity(date, status)` — dashboard "this month, completed" aggregate
- `Student(studentGroupId)`, `StudentGroup(locationId)`
- `Schedule(locationId)`, `Schedule(isActive)`
- `Documentation(activityId)`
- `ActivityTeamMember(teamMemberId)` — per-member attendance recap
- `CurriculumMaterial(periodId)`, `CurriculumPeriod(curriculumId)`

## 5. Deletion behaviour

Deliberately mixed, because the two groups of tables mean different things.

**Cascade** — child rows are meaningless without the parent:

| Parent         | Cascading children                                                           |
|----------------|------------------------------------------------------------------------------|
| `Activity`     | ActivityTeamMember, ActivityStudent, ActivityMaterial, Documentation, Report |
| `Schedule`     | ScheduleTeamMember, ScheduleStudentGroup                                     |
| `Curriculum`   | CurriculumPeriod, then CurriculumMaterial                                    |
| `StudentGroup` | Student — only permitted when no student has attendance history              |

**Restrict** — deleting would destroy history:

| Row attempted        | Blocked when                               |
|----------------------|--------------------------------------------|
| `Location`           | any Activity or Schedule references it      |
| `TeamMember`         | any ActivityTeamMember references it        |
| `Student`            | any ActivityStudent references it           |
| `CurriculumMaterial` | any ActivityMaterial references it          |
| `StudentGroup`       | any of its students has attendance history  |

When a delete is blocked, the UI offers **Arsipkan** (`isActive = false`) instead.
Archived rows remain joinable, so old reports stay intact, but they are hidden
from pickers when creating new records.

`Activity.scheduleId` is `ON DELETE SET NULL`: deleting a plan must never delete
the record of what actually happened.

## 6. Notes on specific fields

- **Times** (`startTime`, `endTime`) are stored as `String` in `HH:mm` form rather
  than `DateTime`. They are wall-clock WIB times attached to a separate date
  field; storing them as timestamps invites timezone drift for no benefit.
- **`Schedule.daysOfWeek`** is `Int[]` (0 = Sunday to 6 = Saturday). This is the one
  place an array replaces a join table: the values are a fixed, tiny,
  non-referential domain, and no query ever joins on them.
- **`Activity.beneficiaryCount`** is always required and always authoritative.
  Individual `ActivityStudent` rows are optional (PRD §12). When both exist and
  disagree, the app surfaces a warning rather than silently reconciling them.
- **`Activity.partner`** defaults from the Location at creation time but stays
  editable, because an activity at a known location can involve a different mitra.
  This denormalises a value, not an entity.
