-- Add hidden visibility support to Product records
ALTER TABLE "Product"
ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
