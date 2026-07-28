-- DropForeignKey
ALTER TABLE "AffiliatePurchase" DROP CONSTRAINT "AffiliatePurchase_affiliateId_fkey";

-- AddForeignKey
ALTER TABLE "AffiliatePurchase" ADD CONSTRAINT "AffiliatePurchase_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "Affiliate"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
