import type { ProductType } from "@/lib/types"

export interface Account {
  id: string
  platform: "TikTok" | "YouTube"
  type: ProductType
  followers: string
  followersNum: number
  price: number
  badge: string
  badgeColor: string
  description: string
  features: string[]
  verified: boolean
  verificationPrice: number
  transferTime: string
  inStock: boolean
}

export const accounts: Account[] = [
  // US TikTok Shop Accounts
  {
    id: "us-tts-10k",
    platform: "TikTok",
    type: "US TikTok Shop",
    followers: "10K+",
    followersNum: 10000,
    price: 375,
    badge: "",
    badgeColor: "",
    description: "US TikTok Shop enabled account with 10K+ followers. Ready to start selling products and earning commissions immediately.",
    features: [
      "TikTok Shop enabled",
      "US region account",
      "Product showcase ready",
      "Affiliate program eligible",
      "Original email included"
    ],
    verified: false,
    verificationPrice: 30,
    transferTime: "24-48 hours",
    inStock: true
  },
  {
    id: "us-tts-20k",
    platform: "TikTok",
    type: "US TikTok Shop",
    followers: "20K+",
    followersNum: 20000,
    price: 415,
    badge: "Popular",
    badgeColor: "bg-[#FE2C55]",
    description: "US TikTok Shop enabled account with 20K+ followers. Higher reach and better conversion potential for your products.",
    features: [
      "TikTok Shop enabled",
      "US region account",
      "Product showcase ready",
      "Affiliate program eligible",
      "Original email included"
    ],
    verified: false,
    verificationPrice: 30,
    transferTime: "24-48 hours",
    inStock: true
  },
  {
    id: "us-tts-50k",
    platform: "TikTok",
    type: "US TikTok Shop",
    followers: "50K+",
    followersNum: 50000,
    price: 550,
    badge: "",
    badgeColor: "",
    description: "US TikTok Shop enabled account with 50K+ followers. Excellent audience size for product launches and brand partnerships.",
    features: [
      "TikTok Shop enabled",
      "US region account",
      "Product showcase ready",
      "Affiliate program eligible",
      "LIVE shopping enabled",
      "Original email included"
    ],
    verified: false,
    verificationPrice: 30,
    transferTime: "24-48 hours",
    inStock: true
  },
  {
    id: "us-tts-100k",
    platform: "TikTok",
    type: "US TikTok Shop",
    followers: "100K+",
    followersNum: 100000,
    price: 899,
    badge: "",
    badgeColor: "",
    description: "US TikTok Shop enabled account with 100K+ followers. Maximum reach and earning potential for serious sellers.",
    features: [
      "TikTok Shop enabled",
      "US region account",
      "Product showcase ready",
      "Affiliate program eligible",
      "LIVE shopping enabled",
      "Priority support",
      "Original email included"
    ],
    verified: false,
    verificationPrice: 30,
    transferTime: "24-48 hours",
    inStock: true
  },
  // UK TikTok Shop Account
  {
    id: "uk-tts-10k",
    platform: "TikTok",
    type: "UK TikTok Shop",
    followers: "10K+",
    followersNum: 10000,
    price: 400,
    badge: "",
    badgeColor: "",
    description: "UK TikTok Shop enabled account with 10K+ followers. Access the UK market and start selling products immediately.",
    features: [
      "TikTok Shop enabled",
      "UK region account",
      "Product showcase ready",
      "Affiliate program eligible",
      "Original email included"
    ],
    verified: false,
    verificationPrice: 30,
    transferTime: "24-48 hours",
    inStock: true
  },
  // Non-TTS/Affiliate Account
  {
    id: "non-tts-1k",
    platform: "TikTok",
    type: "Non-TTS/Affiliate",
    followers: "1K+",
    followersNum: 1000,
    price: 120,
    badge: "",
    badgeColor: "",
    description: "TikTok account with 1K+ followers. Perfect for affiliate marketing, link in bio promotions, or growing your brand.",
    features: [
      "Affiliate link eligible",
      "Link in bio ready",
      "LIVE access unlocked",
      "Creator Fund eligible",
      "Original email included"
    ],
    verified: true,
    verificationPrice: 0,
    transferTime: "24-48 hours",
    inStock: true
  },
  // YouTube Accounts
  {
    id: "youtube-aged",
    platform: "YouTube",
    type: "YouTube Aged",
    followers: "Varies",
    followersNum: 0,
    price: 300,
    badge: "",
    badgeColor: "",
    description: "Aged YouTube channel ready for monetization. Build your audience on an established channel with history.",
    features: [
      "Aged channel",
      "Clean strike history",
      "Ready for content",
      "Monetization eligible",
      "Original email included"
    ],
    verified: true,
    verificationPrice: 0,
    transferTime: "48-72 hours",
    inStock: true
  },
  {
    id: "youtube-monetized",
    platform: "YouTube",
    type: "YouTube Monetized",
    followers: "1K+",
    followersNum: 1000,
    price: 600,
    badge: "",
    badgeColor: "",
    description: "Fully monetized YouTube channel with YouTube Partner Program enabled. Start earning ad revenue immediately.",
    features: [
      "YouTube Partner Program",
      "4000+ watch hours",
      "1000+ subscribers",
      "Ad revenue enabled",
      "Original email included"
    ],
    verified: true,
    verificationPrice: 0,
    transferTime: "48-72 hours",
    inStock: true
  }
]

export function getAccountById(id: string): Account | undefined {
  return accounts.find(account => account.id === id)
}

export function getAccountsByPlatform(platform: "TikTok" | "YouTube"): Account[] {
  return accounts.filter(account => account.platform === platform)
}

export function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`
}

export const faqs = [
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

export const testimonials = [
  {
    name: "Sarah K.",
    location: "Los Angeles, CA",
    rating: 5,
    text: "Bought a TikTok Shop account and made my money back in the first month! The transfer was smooth and support was amazing.",
    platform: "TikTok",
    earnings: "$1,200 first month"
  },
  {
    name: "Mike T.",
    location: "Austin, TX",
    rating: 5,
    text: "Was skeptical at first but these guys are legit. My YouTube channel came with everything they promised. Already seeing great ad revenue.",
    platform: "YouTube",
    earnings: "$800/month"
  },
  {
    name: "Jessica R.",
    location: "Miami, FL",
    rating: 5,
    text: "Best investment I've made! The TikTok Shop account had real engaged followers. Just had to start posting products.",
    platform: "TikTok",
    earnings: "$650/month"
  },
  {
    name: "David L.",
    location: "New York, NY",
    rating: 5,
    text: "Fast transfer, great communication. The account was exactly as advertised. Highly recommend!",
    platform: "TikTok",
    earnings: "$400/month"
  },
  {
    name: "Emma W.",
    location: "Seattle, WA",
    rating: 5,
    text: "Third account I've bought from them. Always reliable, always quality. My go-to for monetized accounts.",
    platform: "YouTube",
    earnings: "$2,100/month"
  }
]

// Mock data for backend integration - these will be replaced with database calls
// Product data is above in the accounts array
export const mockProducts = accounts.map(account => ({
  id: account.id,
  platform: account.platform as "TikTok" | "YouTube",
  type: account.type,
  followers: account.followers,
  followersNum: account.followersNum,
  price: account.price,
  badge: account.badge,
  badgeColor: account.badgeColor,
  description: account.description,
  features: account.features,
  verified: account.verified,
  verificationPrice: account.verificationPrice,
  transferTime: account.transferTime,
  inStock: account.inStock
}))

// Empty arrays - replace with database calls
export const mockOrders: any[] = []
export const mockReviews: any[] = []
export const mockMessages: any[] = []
export const mockAffiliates: any[] = []
export const mockSubscribers: any[] = []

// Mock analytics for dashboard
export const mockAnalytics = {
  dailyRevenue: [],
  weeklyRevenue: [],
  monthlyRevenue: [],
  conversionFunnel: {
    visitors: 0,
    clicks: 0,
    cartAdditions: 0,
    purchase: 0
  },
  pageViews: [],
  visitors: { unique: 0, returning: 0 },
  revenueByPlatform: [],
  trafficSources: [],
  revenueByType: []
}
