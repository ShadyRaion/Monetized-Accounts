import prisma from '../server/api/utils/prisma'

async function backfill() {
  try {
    console.log('Backfill: updating products with hasVerificationFee=true and missing verificationPrice')
    // Use raw SQL to avoid depending on generated client types
    const sql = `UPDATE "Product" SET "verificationPrice" = $1 WHERE "hasVerificationFee" = true AND ("verificationPrice" IS NULL OR "verificationPrice" = 0) RETURNING id`
    const updated: any = await prisma.$queryRawUnsafe(sql, 30)
    const count = Array.isArray(updated) ? updated.length : 0
    console.log(`Updated ${count} products`) 
    console.log('Backfill complete')
  } catch (err) {
    console.error('Backfill error', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backfill()
