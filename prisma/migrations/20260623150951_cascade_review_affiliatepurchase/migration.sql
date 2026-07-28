-- DropForeignKey
ALTER TABLE "AffiliatePurchase" DROP CONSTRAINT "AffiliatePurchase_orderItemId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_orderId_fkey";

-- AddForeignKey
ALTER TABLE "AffiliatePurchase" ADD CONSTRAINT "AffiliatePurchase_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
