import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main(){
  // create admin user
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const existing = await prisma.user.findUnique({ where: { email } })
  if(!existing){
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      console.log('ADMIN_PASSWORD not set; skipping admin creation')
    } else {
      const hash = await bcrypt.hash(adminPassword, 10)
      await prisma.user.create({ data: { name: 'Admin', email, passwordHash: hash, role: 'ADMIN' } })
      console.log('Admin created')
    }
  } else {
    console.log('Admin already exists')
  }

  // create sample products
  const samples = [
    { platform: 'TikTok', followers: 10000, hasVerificationFee: true, verificationPrice: 30, inStock: true, price: 49.99 },
    { platform: 'TikTok', followers: 20000, hasVerificationFee: true, verificationPrice: 30, inStock: true, price: 89.99 },
    { platform: 'YouTube', followers: 5000, hasVerificationFee: false, verificationPrice: 0, inStock: true, price: 39.99 },
    { platform: 'YouTube', followers: 50000, hasVerificationFee: false, verificationPrice: 0, inStock: true, price: 299.99 }
  ]

  for(const s of samples){
    const exists = await prisma.product.findFirst({ where: { platform: s.platform, followers: s.followers } })
    if(!exists) await prisma.product.create({ data: s as any })
  }

  // ensure settings row exists
  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  if(!settings) await prisma.settings.create({ data: {} as any })

  // Restore original FAQ entries if missing
  const faqs = [
    {
      question: "How do I know these accounts are legitimate?",
      answer: "All our accounts are 100% organic with real followers and verified status. We provide full transparency including analytics screenshots before purchase. Every account comes with a 30-day guarantee."
    },
    {
      question: "How long does the transfer process take?",
      answer: "TikTok accounts are typically transferred within 24-48 hours. YouTube accounts may take 48-72 hours due to the additional verification steps required by Google. You'll receive step-by-step guidance throughout the entire process."
    },
    {
      question: "Can I change the account username and branding?",
      answer: "Yes, once the account is transferred to you, you have full control. You can change the username (subject to platform availability), profile picture, bio, and all other account details. The followers and monetization status remain intact."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and cryptocurrency (Bitcoin, Ethereum). All payments are processed securely through encrypted payment gateways."
    },
    {
      question: "What if the account gets suspended after purchase?",
      answer: "We offer a 30-day guarantee on all accounts. If your account gets suspended due to pre-existing issues within 30 days of purchase, we'll either provide a replacement account of equal value or issue a full refund."
    },
    {
      question: "Do I get the original email associated with the account?",
      answer: "Yes, for most accounts we transfer the original email along with the account. This ensures complete ownership and makes it easier to manage account recovery options. Details are specified on each account listing."
    }
  ]

  for (let i = 0; i < faqs.length; i++) {
    const f = faqs[i]
    const existsFaq = await prisma.faq.findFirst({ where: { question: f.question } })
    if (!existsFaq) {
      await prisma.faq.create({ data: { question: f.question, answer: f.answer, order: i } })
      console.log('Inserted FAQ from seed:', f.question)
    }
  }

  console.log('Seeding complete')
}

main().catch(e=>{ console.error(e); process.exit(1) }).finally(()=>prisma.$disconnect())
