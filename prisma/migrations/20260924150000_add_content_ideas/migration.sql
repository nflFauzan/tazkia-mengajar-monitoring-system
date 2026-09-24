-- CreateEnum
CREATE TYPE "ContentPlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'LAINNYA');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('IDE', 'RENCANA', 'PROSES_EDIT', 'TAYANG');

-- CreateTable
CREATE TABLE "content_ideas" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" "ContentPlatform" NOT NULL DEFAULT 'INSTAGRAM',
    "contentType" TEXT,
    "referenceUrl" TEXT,
    "description" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'IDE',
    "targetDate" TIMESTAMP(3),
    "locationId" TEXT,
    "publishedUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_ideas_status_idx" ON "content_ideas"("status");

-- CreateIndex
CREATE INDEX "content_ideas_targetDate_idx" ON "content_ideas"("targetDate");

-- AddForeignKey
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_ideas" ADD CONSTRAINT "content_ideas_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
