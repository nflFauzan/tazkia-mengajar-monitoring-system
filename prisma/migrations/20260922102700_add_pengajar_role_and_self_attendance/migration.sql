-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PENGAJAR';

-- AlterTable
ALTER TABLE "activity_team_members" ADD COLUMN     "checkedInAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teamMemberId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_teamMemberId_key" ON "users"("teamMemberId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "team_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
