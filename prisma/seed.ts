import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main(){
  // Ensure admin user exists but remove all non-admin users and all product/order/customer data.
  await prisma.$transaction([
    prisma.review.deleteMany(),
    prisma.affiliatePurchase.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.subscriber.deleteMany(),
    prisma.ticketMessage.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.affiliate.deleteMany(),
    prisma.product.deleteMany(),
    prisma.session.deleteMany(),
    prisma.blacklist.deleteMany(),
    prisma.user.deleteMany({ where: { role: { not: 'ADMIN' } } })
  ])

  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const existingAdmin = await prisma.user.findUnique({ where: { email } })
  if(!existingAdmin){
    const adminPassword = process.env.ADMIN_PASSWORD
    if (!adminPassword) {
      console.log('ADMIN_PASSWORD not set; skipping admin creation')
    } else {
      const hash = await bcrypt.hash(adminPassword, 10)
      await prisma.user.create({ data: { name: 'Admin', email, passwordHash: hash, role: 'ADMIN' } })
      console.log('Admin created')
    }
  }

  const products = [
    { platform: 'TikTok', region: 'US', type: 'Tiktok Shop', title: 'US Tiktok Shop 10K', followers: 10000, price: 250 },
    { platform: 'TikTok', region: 'UK', type: 'Tiktok Shop', title: 'UK Tiktok Shop 10K', followers: 10000, price: 250 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Shop', title: 'US Tiktok Shop 20K', followers: 20000, price: 320 },
    { platform: 'TikTok', region: 'UK', type: 'Tiktok Shop', title: 'UK Tiktok Shop 20K', followers: 20000, price: 320 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Shop', title: 'US Tiktok Shop 30K', followers: 30000, price: 380 },
    { platform: 'TikTok', region: 'UK', type: 'Tiktok Shop', title: 'UK Tiktok Shop 30K', followers: 30000, price: 380 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Shop', title: 'US Tiktok Shop 40K', followers: 40000, price: 440 },
    { platform: 'TikTok', region: 'UK', type: 'Tiktok Shop', title: 'UK Tiktok Shop 40K', followers: 40000, price: 440 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Shop', title: 'US Tiktok Shop 50K', followers: 50000, price: 499 },
    { platform: 'TikTok', region: 'UK', type: 'Tiktok Shop', title: 'UK Tiktok Shop 50K', followers: 50000, price: 499 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Shop', title: 'US Tiktok Shop 100K', followers: 100000, price: 669 },
    { platform: 'TikTok', region: 'UK', type: 'Tiktok Shop', title: 'UK Tiktok Shop 100K', followers: 100000, price: 669 },
    { platform: 'TikTok', region: 'US', type: 'Shop Affiliate', title: 'US Shop Affiliate 10K', followers: 10000, price: 200 },
    { platform: 'TikTok', region: 'UK', type: 'Shop Affiliate', title: 'UK Shop Affiliate 10K', followers: 10000, price: 200 },
    { platform: 'TikTok', region: 'US', type: 'Shop Affiliate', title: 'US Shop Affiliate 20K', followers: 20000, price: 250 },
    { platform: 'TikTok', region: 'UK', type: 'Shop Affiliate', title: 'UK Shop Affiliate 20K', followers: 20000, price: 250 },
    { platform: 'TikTok', region: 'US', type: 'Shop Affiliate', title: 'US Shop Affiliate 30K', followers: 30000, price: 300 },
    { platform: 'TikTok', region: 'UK', type: 'Shop Affiliate', title: 'UK Shop Affiliate 30K', followers: 30000, price: 300 },
    { platform: 'TikTok', region: 'US', type: 'Shop Affiliate', title: 'US Shop Affiliate 40K', followers: 40000, price: 350 },
    { platform: 'TikTok', region: 'UK', type: 'Shop Affiliate', title: 'UK Shop Affiliate 40K', followers: 40000, price: 350 },
    { platform: 'TikTok', region: 'US', type: 'Shop Affiliate', title: 'US Shop Affiliate 50K', followers: 50000, price: 400 },
    { platform: 'TikTok', region: 'UK', type: 'Shop Affiliate', title: 'UK Shop Affiliate 50K', followers: 50000, price: 400 },
    { platform: 'TikTok', region: 'US', type: 'Shop Affiliate', title: 'US Shop Affiliate 100K', followers: 100000, price: 450 },
    { platform: 'TikTok', region: 'UK', type: 'Shop Affiliate', title: 'UK Shop Affiliate 100K', followers: 100000, price: 450 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Monetized', title: 'Monetized Tiktok 10K', followers: 10000, price: 160 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Monetized', title: 'Monetized Tiktok 20K', followers: 20000, price: 200 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Monetized', title: 'Monetized Tiktok 30K', followers: 30000, price: 240 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Monetized', title: 'Monetized Tiktok 40K', followers: 40000, price: 280 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Monetized', title: 'Monetized Tiktok 50K', followers: 50000, price: 320 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Monetized', title: 'Monetized Tiktok 60K', followers: 60000, price: 360 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Monetized', title: 'Monetized Tiktok 70K', followers: 70000, price: 400 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Monetized', title: 'Monetized Tiktok 80K', followers: 80000, price: 440 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Monetized', title: 'Monetized Tiktok 90K', followers: 90000, price: 480 },
    { platform: 'TikTok', region: 'US', type: 'Tiktok Monetized', title: 'Monetized Tiktok 100K', followers: 100000, price: 520 },
    { platform: 'TikTok', region: 'US', type: 'Non-TTS/Affiliate', title: 'Non-TTS/Affiliate Account 1K', followers: 1000, price: 60 },
    { platform: 'YouTube', region: undefined, type: 'Youtube Monetized', title: 'Monetized Youtube 1K', followers: 1000, price: 269 }
  ]

  for (const product of products) {
    await prisma.product.create({ data: {
      platform: product.platform,
      region: product.region,
      type: product.type,
      title: product.title,
      followers: product.followers,
      price: product.price,
      hasVerificationFee: false,
      verificationPrice: 0,
      inStock: true
    } })
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } })
  if(!settings) await prisma.settings.create({ data: {} as any })

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
