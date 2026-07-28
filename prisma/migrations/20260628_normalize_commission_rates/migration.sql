-- Normalize commission rates: convert decimal values (0.2, 0.25, etc.) to percentages (20, 25, etc.)
-- Only update rates that are between 0 and 1 (decimals), leave others unchanged
UPDATE "Affiliate" 
SET "commissionRate" = "commissionRate" * 100 
WHERE "commissionRate" > 0 AND "commissionRate" < 1;
