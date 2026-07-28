-- AlterTable
ALTER TABLE "Affiliate" ADD COLUMN     "isContentCreator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "socialMediaPlatforms" TEXT[] DEFAULT ARRAY[]::TEXT[];
