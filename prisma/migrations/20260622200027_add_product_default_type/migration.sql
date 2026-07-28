-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "badge" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "transferTime" TEXT NOT NULL DEFAULT 'Instant',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT '';
