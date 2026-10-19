-- AlterTable
ALTER TABLE "locations" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "radiusMeters" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "activity_team_members" ADD COLUMN "checkInLatitude" DOUBLE PRECISION,
ADD COLUMN "checkInLongitude" DOUBLE PRECISION,
ADD COLUMN "checkInDistanceMeters" INTEGER;
