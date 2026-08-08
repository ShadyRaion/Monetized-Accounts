import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import prisma from '../server/api/utils/prisma'
import { buildProductMetadata } from './product-metadata.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '../.env.local'), override: false, quiet: true })
dotenv.config({ path: path.join(__dirname, '../.env'), override: false, quiet: true })

async function backfill() {
  try {
    console.log('Backfill: updating product descriptions and features')
    const products = await prisma.product.findMany({ where: {}, select: { id: true, platform: true, region: true, type: true, followers: true } })

    for (const product of products) {
      const metadata = buildProductMetadata({
        platform: product.platform,
        region: product.region ?? undefined,
        type: product.type,
        followers: product.followers
      })

      await prisma.product.update({
        where: { id: product.id },
        data: {
          description: metadata.description,
          features: metadata.features
        }
      })
    }

    console.log(`Backfill complete: updated ${products.length} products`)
  } catch (err) {
    console.error('Backfill error', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

backfill()
