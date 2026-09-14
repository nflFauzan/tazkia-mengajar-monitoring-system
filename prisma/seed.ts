import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/auth/password";
import { generateActivityReport, toReportInput } from "../src/lib/reports";

/**
 * Development seed.
 *
 * Safe to re-run: every seeded table is cleared first, in dependency order, so
 * `npm run db:seed` always produces the same dataset. Because it deletes rows,
 * the guard below refuses to run against anything but a local database unless
 * ALLOW_REMOTE_SEED is set explicitly.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
if (!isLocal && process.env.ALLOW_REMOTE_SEED !== "true") {
  throw new Error(
    "Refusing to seed a non-local database. This deletes existing rows.\n" +
      "Set ALLOW_REMOTE_SEED=true only if you are certain.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

/** Development-only credentials. Never reuse these in production. */
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "tazkia-mengajar";

/** Builds a `@db.Date` value from a plain calendar date. */
function calendarDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

async function clearExistingData() {
  // Children before parents. Cascades would cover most of this, but being
  // explicit makes the order obvious and keeps the reset predictable.
  await prisma.report.deleteMany();
  await prisma.documentation.deleteMany();
  await prisma.activityMaterial.deleteMany();
  await prisma.activityStudent.deleteMany();
  await prisma.activityTeamMember.deleteMany();
  await prisma.activity.deleteMany();

  await prisma.scheduleStudentGroup.deleteMany();
  await prisma.scheduleTeamMember.deleteMany();
  await prisma.schedule.deleteMany();

  await prisma.curriculumMaterial.deleteMany();
  await prisma.curriculumPeriod.deleteMany();
  await prisma.curriculum.deleteMany();

  await prisma.student.deleteMany();
  await prisma.studentGroup.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.location.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("Clearing existing data...");
  await clearExistingData();

  console.log("Creating admin user...");
  const admin = await prisma.user.create({
    data: {
      username: ADMIN_USERNAME,
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      name: "Administrator Tazkia Mengajar",
      role: "ADMIN",
    },
  });

  console.log("Creating location...");
  const location = await prisma.location.create({
    data: {
      name: "Desa Binaan Margajaya",
      partner: "Publik",
      category: "Desa Binaan",
      address:
        "Jalan Pemuda Dramaga Caringin Gg. Mesjid, Kel. Margajaya, RT.02/RW.05, Dramaga, Kec. Bogor Barat, Kota Bogor, Jawa Barat.",
      description:
        "Lokasi utama kegiatan Tazkia Mengajar bersama anak-anak Desa Binaan Margajaya.",
    },
  });

  console.log("Creating team members...");
  const teamMemberNames = [
    "Shifi Amalia Zein",
    "Rackisha Dhia Ezelly Lathief",
    "Shanaya Balghis Riyona",
    "Amanda Wijayanti",
    "Azmi Ittaqi Hammami",
    "Muhamad Naufal Fauzan",
    "Thoriqurrahman Akrami",
    "Rahmawati",
    "Muhammad Nabil Thoriq",
    "Nayla Elrazqya Putri",
  ];

  const teamMembers = await Promise.all(
    teamMemberNames.map((fullName, index) =>
      prisma.teamMember.create({
        data: {
          fullName,
          nickname: fullName.split(" ")[0],
          status: index % 3 === 0 ? "Pembimbing" : "Pengajar",
        },
      }),
    ),
  );

  console.log("Creating student groups...");
  const groupDefinitions = [
    { name: "Kelas Anak", description: "Anak usia SD." },
    { name: "Remaja", description: "Usia SMP dan SMA." },
    { name: "Tahsin", description: "Kelas perbaikan bacaan Al-Quran." },
  ];

  const studentGroups = await Promise.all(
    groupDefinitions.map((group) =>
      prisma.studentGroup.create({
        data: { ...group, locationId: location.id },
      }),
    ),
  );

  console.log("Creating students...");
  const studentDefinitions: Array<{
    fullName: string;
    gender: "LAKI_LAKI" | "PEREMPUAN";
    groupIndex: number;
  }> = [
    { fullName: "Ahmad Fauzi", gender: "LAKI_LAKI", groupIndex: 0 },
    { fullName: "Budi Santoso", gender: "LAKI_LAKI", groupIndex: 0 },
    { fullName: "Citra Ayu Lestari", gender: "PEREMPUAN", groupIndex: 0 },
    { fullName: "Deni Ramadhan", gender: "LAKI_LAKI", groupIndex: 0 },
    { fullName: "Eka Putri Handayani", gender: "PEREMPUAN", groupIndex: 0 },
    { fullName: "Fajar Nugroho", gender: "LAKI_LAKI", groupIndex: 0 },
    { fullName: "Gita Permatasari", gender: "PEREMPUAN", groupIndex: 0 },
    { fullName: "Hana Salsabila", gender: "PEREMPUAN", groupIndex: 0 },
    { fullName: "Indra Maulana", gender: "LAKI_LAKI", groupIndex: 0 },
    { fullName: "Jihan Nabila", gender: "PEREMPUAN", groupIndex: 0 },
    { fullName: "Kevin Pratama", gender: "LAKI_LAKI", groupIndex: 1 },
    { fullName: "Laila Rahmadani", gender: "PEREMPUAN", groupIndex: 1 },
    { fullName: "Muhammad Rizki", gender: "LAKI_LAKI", groupIndex: 1 },
    { fullName: "Nabila Zahra", gender: "PEREMPUAN", groupIndex: 2 },
    { fullName: "Omar Abdullah", gender: "LAKI_LAKI", groupIndex: 2 },
  ];

  const students = await Promise.all(
    studentDefinitions.map((student) =>
      prisma.student.create({
        data: {
          fullName: student.fullName,
          gender: student.gender,
          studentGroupId: studentGroups[student.groupIndex].id,
        },
      }),
    ),
  );

  console.log("Creating schedules...");
  const weeklySchedule = await prisma.schedule.create({
    data: {
      locationId: location.id,
      title: "Kelas Anak — Sabtu Siang",
      recurrence: "WEEKLY",
      daysOfWeek: [6],
      startDate: calendarDate(2026, 1, 10),
      endDate: calendarDate(2026, 12, 26),
      startTime: "13:00",
      endTime: "14:30",
      notes: "Kegiatan rutin mingguan bersama Kelas Anak.",
      teamMembers: {
        create: teamMembers.slice(0, 5).map((member) => ({
          teamMemberId: member.id,
        })),
      },
      studentGroups: {
        create: [{ studentGroupId: studentGroups[0].id }],
      },
    },
  });

  await prisma.schedule.create({
    data: {
      locationId: location.id,
      title: "Remaja & Tahsin — Senin dan Rabu Sore",
      recurrence: "WEEKLY",
      daysOfWeek: [1, 3],
      startDate: calendarDate(2026, 1, 12),
      startTime: "16:00",
      endTime: "17:30",
      notes: "Dua pertemuan per minggu.",
      teamMembers: {
        create: teamMembers.slice(5).map((member) => ({
          teamMemberId: member.id,
        })),
      },
      studentGroups: {
        create: [
          { studentGroupId: studentGroups[1].id },
          { studentGroupId: studentGroups[2].id },
        ],
      },
    },
  });

  console.log("Creating curriculum...");
  const curriculum = await prisma.curriculum.create({
    data: {
      name: "Tazkia Mengajar",
      description: "Kurikulum utama program Tazkia Mengajar untuk Desa Binaan.",
      periods: {
        create: [
          {
            name: "Semester 1",
            orderIndex: 1,
            materials: {
              create: [
                {
                  title: "Adab kepada Orang Tua",
                  meetingLabel: "Pertemuan 5",
                  objective: "Murid memahami adab dasar kepada orang tua.",
                  description:
                    "Pembahasan adab berbicara, meminta izin, dan membantu orang tua.",
                  orderIndex: 5,
                },
                {
                  title: "Thaharah dan Wudhu",
                  meetingLabel: "Pertemuan 1",
                  objective: "Murid dapat mempraktikkan wudhu dengan benar.",
                  orderIndex: 1,
                },
                {
                  title: "Hafalan Surat Pendek",
                  meetingLabel: "Pertemuan 2",
                  objective: "Murid menghafal Surat Al-Fil dan Al-Humazah.",
                  orderIndex: 2,
                },
              ],
            },
          },
          { name: "Semester 2", orderIndex: 2 },
        ],
      },
    },
    include: { periods: { include: { materials: true } } },
  });

  const adabMaterial = curriculum.periods
    .flatMap((period) => period.materials)
    .find((material) => material.title === "Adab kepada Orang Tua");

  if (!adabMaterial) {
    throw new Error("Seed error: expected curriculum material was not created.");
  }

  console.log("Creating completed activity...");
  const completedActivity = await prisma.activity.create({
    data: {
      locationId: location.id,
      scheduleId: weeklySchedule.id,
      date: calendarDate(2026, 9, 12),
      startTime: "13:00",
      endTime: "14:30",
      partner: "Publik",
      beneficiary: "Anak-anak Desa Binaan Margajaya",
      beneficiaryCount: 10,
      aidType: "Kegiatan belajar mengajar dan pembagian alat tulis",
      notes: "Kegiatan berjalan lancar.",
      status: "COMPLETED",
      createdById: admin.id,
      teamMembers: {
        create: [
          {
            teamMemberId: teamMembers[0].id,
            attendance: "HADIR",
            orderIndex: 0,
          },
          {
            teamMemberId: teamMembers[1].id,
            attendance: "HADIR",
            orderIndex: 1,
          },
          {
            teamMemberId: teamMembers[2].id,
            attendance: "HADIR",
            orderIndex: 2,
          },
          {
            teamMemberId: teamMembers[3].id,
            attendance: "HADIR",
            orderIndex: 3,
          },
          {
            teamMemberId: teamMembers[4].id,
            attendance: "HADIR",
            orderIndex: 4,
          },
          {
            teamMemberId: teamMembers[5].id,
            attendance: "IZIN",
            note: "Ada keperluan keluarga.",
            orderIndex: 5,
          },
          {
            teamMemberId: teamMembers[6].id,
            attendance: "SAKIT",
            orderIndex: 6,
          },
        ],
      },
      students: {
        create: students.slice(0, 10).map((student, index) => ({
          studentId: student.id,
          attendance:
            index < 8
              ? ("HADIR" as const)
              : index === 8
                ? ("IZIN" as const)
                : ("SAKIT" as const),
        })),
      },
      materials: {
        create: [{ materialId: adabMaterial.id }],
      },
      documents: {
        create: [
          {
            originalFilename: "dokumentasi-1.jpg",
            storedFilename: "dokumentasi-1.webp",
            mimeType: "image/webp",
            size: 184_320,
            storageKey: "seed/dokumentasi-1.webp",
            url: "https://placehold.co/1200x800/webp?text=Dokumentasi+1",
            isImage: true,
          },
          {
            originalFilename: "dokumentasi-2.jpg",
            storedFilename: "dokumentasi-2.webp",
            mimeType: "image/webp",
            size: 201_940,
            storageKey: "seed/dokumentasi-2.webp",
            url: "https://placehold.co/1200x800/webp?text=Dokumentasi+2",
            isImage: true,
          },
        ],
      },
    },
    include: {
      location: true,
      teamMembers: { include: { teamMember: true } },
      _count: { select: { documents: true } },
    },
  });

  console.log("Generating report for the completed activity...");
  const generated = generateActivityReport(toReportInput(completedActivity));

  await prisma.report.create({
    data: {
      activityId: completedActivity.id,
      content: generated.text,
      narrative: generated.narrative,
      createdById: admin.id,
    },
  });

  console.log("Creating draft activity...");
  await prisma.activity.create({
    data: {
      locationId: location.id,
      date: calendarDate(2026, 9, 19),
      startTime: "13:00",
      endTime: "14:30",
      partner: "Publik",
      beneficiary: "Anak-anak Desa Binaan Margajaya",
      beneficiaryCount: 8,
      aidType: "Kegiatan belajar mengajar",
      status: "DRAFT",
      createdById: admin.id,
      teamMembers: {
        create: [
          {
            teamMemberId: teamMembers[0].id,
            attendance: "HADIR",
            orderIndex: 0,
          },
          {
            teamMemberId: teamMembers[7].id,
            attendance: "HADIR",
            orderIndex: 1,
          },
        ],
      },
    },
  });

  const counts = {
    users: await prisma.user.count(),
    locations: await prisma.location.count(),
    teamMembers: await prisma.teamMember.count(),
    studentGroups: await prisma.studentGroup.count(),
    students: await prisma.student.count(),
    schedules: await prisma.schedule.count(),
    curriculumMaterials: await prisma.curriculumMaterial.count(),
    activities: await prisma.activity.count(),
    documentation: await prisma.documentation.count(),
    reports: await prisma.report.count(),
  };

  console.log("\nSeed complete:");
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table.padEnd(20)} ${count}`);
  }
  console.log(
    `\nLogin with username "${ADMIN_USERNAME}" and password "${ADMIN_PASSWORD}".`,
  );
  console.log("These credentials are for local development only.\n");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
