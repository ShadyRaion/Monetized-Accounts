-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "verificationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verificationPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;
