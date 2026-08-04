// Type definitions for backend integration

export type ProductType =
  | "Monetized Tiktok"
  | "US Shop Affiliate"
  | "UK Shop Affiliate"
  | "US TikTok Shop"
  | "UK TikTok Shop"
  | "Non-TTS/Affiliate"
  | "YouTube Aged"
  | "YouTube Monetized"

export interface Product {
  id: string
  platform: "TikTok" | "YouTube"
  type: ProductType
  title?: string
  followers: string
  followersNum?: number
  price: number
  originalPrice?: number
  badge?: string
  badgeColor?: string
  description: string
  features: string[]
  verified?: boolean
  verificationPrice?: number
  transferTime: string
  inStock: boolean
}

export interface OrderProduct {
  productId: string
  name: string
  price: number // Product price only (without verification)
  verificationPrice?: number // Verification price if included
  hasVerification: boolean // Whether verification was added for this product
  verifiedQuantity?: number
  quantity: number
  deliveryInfo?: string // Account credentials/info sent by admin
}

export interface Order {
  id: string
  customerEmail: string
  customerName: string
  products: OrderProduct[]
  total: number
  verificationAdded: boolean
  status: "pending" | "processing" | "delivered" | "completed" | "refunded" | "cancelled" | "rejected"
  date: string
  paymentMethod: string
  deliveryDate?: string // When the order was delivered
  adminNotes?: string // Notes from admin
  affiliateUpdated?: boolean // Track if affiliate stats have been updated for this order
  reviewId?: string
}

export interface Customer {
  id: string
  email: string
  name: string
  ordersCount: number
  totalSpent: number
  firstPurchaseDate: string
  lastPurchaseDate: string
  orders: string[]
  referralCode?: string // The referral code they were invited with
  isBanned?: boolean
}

export interface Message {
  id: string
  name: string
  email: string
  subject: string
  message: string
  date: string
  status: "unread" | "read" | "replied"
}

export interface Review {
  id: string
  productId: string
  orderId?: string
  productName: string
  customerName: string
  displayName?: string
  anonymous?: boolean
  rating: number
  title: string
  text: string
  comment?: string
  author?: string
  date: string
  verified: boolean
  helpful: number
  status: "pending" | "approved" | "rejected"
}

export interface Affiliate {
  id: string
  name: string
  email: string
  userId?: string // Link to user account
  referralCode: string
  commissionRate: number // Percentage (e.g., 20 for 20%)
  commissionRateAutoUpgradeEnabled?: boolean
  status: "active" | "pending" | "suspended" | "rejected"
  joinDate: string
  totalReferrals: number // Number of users who signed up with this code
  totalSales: number // Number of orders placed by referrals
  totalProductsByReferrals: number // Total number of products (items) purchased by referrals
  totalSpentByReferrals: number // Total amount spent by referrals
  totalEarnings: number // Calculated: totalSpentByReferrals * (commissionRate/100)
  totalReferralPurchases: number // Count of purchases made by referrals
  lastActive: string
  currentTier: number // 0=base(20%), 1=25%, 2=30%, 3=35%, 4=40%
  nextTierGoal: number | null // Target purchases for next tier
  socialMediaPlatforms?: string[] // Selected platforms (e.g., ["TikTok", "Instagram", "YouTube"])
  isContentCreator?: boolean
  paymentMethod?: {
    type: "paypal" | "crypto"
    paypalLink?: string
    cryptoData?: {
      coin: string // e.g., "Bitcoin"
      network: string // e.g., "Mainnet"
      walletAddress: string
    }
  }
  referralHistory: Array<{
    orderId: string
    date: string
    amount: number
    commission: number
  }>
  payoutHistory: Array<{
    date: string
    amount: number
    status: "paid" | "pending" | "failed"
  }>
}

export interface Subscriber {
  id: string
  email: string
  name?: string
  subscribedDate: string
  source: "newsletter" | "checkout" | "popup"
  status: "active" | "unsubscribed"
  lastEmailDate?: string
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  date: string
  status: "new" | "read" | "responded"
}
