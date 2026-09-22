-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PEMBIMBING';

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "attendance_appeals" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "proposedAttendance" "AttendanceStatus" NOT NULL DEFAULT 'HADIR',
    "reason" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "attendance_appeals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_assessments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "materialId" TEXT,
    "customTitle" TEXT,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "assessedById" TEXT NOT NULL,
    "activityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_appeals_status_idx" ON "attendance_appeals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_appeals_activityId_teamMemberId_key" ON "attendance_appeals"("activityId", "teamMemberId");

-- CreateIndex
CREATE INDEX "student_assessments_studentId_idx" ON "student_assessments"("studentId");

-- CreateIndex
CREATE INDEX "student_assessments_materialId_idx" ON "student_assessments"("materialId");

-- CreateIndex
CREATE INDEX "student_assessments_assessedById_idx" ON "student_assessments"("assessedById");

-- AddForeignKey
ALTER TABLE "attendance_appeals" ADD CONSTRAINT "attendance_appeals_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_appeals" ADD CONSTRAINT "attendance_appeals_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_appeals" ADD CONSTRAINT "attendance_appeals_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assessments" ADD CONSTRAINT "student_assessments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assessments" ADD CONSTRAINT "student_assessments_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "curriculum_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assessments" ADD CONSTRAINT "student_assessments_assessedById_fkey" FOREIGN KEY ("assessedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_assessments" ADD CONSTRAINT "student_assessments_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
