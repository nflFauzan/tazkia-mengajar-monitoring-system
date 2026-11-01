-- AlterTable
ALTER TABLE "team_members" ADD COLUMN "locationId" TEXT;

-- CreateIndex
CREATE INDEX "team_members_locationId_idx" ON "team_members"("locationId");

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default location assignments for Petir volunteers
UPDATE "team_members"
SET "locationId" = (
  SELECT id FROM "locations"
  WHERE name ILIKE '%NusaPendidik%' OR name ILIKE '%Petir%'
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE "fullName" ILIKE '%Amanda Wijayanti%'
   OR "fullName" ILIKE '%Azmi Ittaqi Hammami%'
   OR "fullName" ILIKE '%Muhammad Nabil Thoriq%'
   OR "fullName" ILIKE '%Nayla Elrazqya Putri%'
   OR "fullName" ILIKE '%Shifi Amalia Zein%'
   OR "fullName" ILIKE '%Dayana Maya Lestari%';

-- Seed default location assignments for Margajaya volunteers
UPDATE "team_members"
SET "locationId" = (
  SELECT id FROM "locations"
  WHERE name ILIKE '%Margajaya%'
  ORDER BY "createdAt" ASC
  LIMIT 1
)
WHERE "fullName" ILIKE '%Muhamad Naufal Fauzan%'
   OR "fullName" ILIKE '%Rackisha Dhia Ezelly Lathief%'
   OR "fullName" ILIKE '%Shanaya Balghis Riyona%'
   OR "fullName" ILIKE '%Thoriqurrahman Akrami%'
   OR "fullName" ILIKE '%Rahmawati%';
