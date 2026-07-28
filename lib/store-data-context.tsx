"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react"
import { apiPath, authHeaders, apiFetch } from "@/lib/api"
import { getAnonymousInitials } from "@/lib/utils"
import { useUserAuth } from "@/lib/user-auth-context"
import { useAdminAuth } from "@/lib/admin-auth-context"
import type { Product, Order, OrderProduct, Review, Customer, Subscriber, Affiliate } from "@/lib/types"

// Extended Account type that matches both admin and customer needs
export interface Account {
  id: string
  platform: "TikTok" | "YouTube"
  type: string
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

// Testimonial for customer-facing pages
export interface Testimonial {
  id: string
  name: string
  title: string
  quote: string
  rating: number
  status: "pending" | "approved" | "rejected"
}

// Ticket/Message with reply thread
export interface TicketReply {
  id: string
  message: string
  isAdmin: boolean
  senderId?: string
  senderName?: string
  createdAt: string
}

export interface Ticket {
  id: string
  userId?: string // Optional - for non-logged-in users this will be undefined
  name: string
  email: string
  type?: string
  subject: string
  message: string
  status: "open" | "opened" | "replied" | "closed"
  createdAt: string
  replies: TicketReply[]
}

export type NewTicketInput = Omit<Ticket, "id" | "createdAt" | "status" | "replies">

// Computed stats from real data
export interface StoreStats {
  totalRevenue: number
  monthlyRevenue: number
  totalAccountsSold: number
  monthlyAccountsSold: number
  averageRating: number
  totalReviews: number
  customerSatisfaction: number
}

interface StoreDataContextType {
  // Products/Accounts
  products: Product[]
  accounts: Account[]
  addProduct: (product: Product) => Promise<void>
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>
  deleteProduct: (id: string) => Promise<{ ok: boolean; message?: string }>
  toggleProductStock: (id: string) => Promise<void>
  
  // Orders
  orders: Order[]
  addOrder: (order: Order) => Promise<void>
  updateOrderStatus: (id: string, status: Order["status"]) => Promise<void>
  updateOrder: (id: string, updates: Partial<Order>) => Promise<void>
  updateOrderProductDelivery: (orderId: string, productId: string, deliveryInfo: string) => Promise<void>
  
  // Reviews/Testimonials
  reviews: Review[]
  testimonials: Testimonial[]
  addReview: (review: Review) => Promise<void>
  updateReview: (id: string, updates: Partial<Review>) => Promise<void>
  deleteReview: (id: string) => Promise<void>
  approveReview: (id: string) => Promise<void>
  rejectReview: (id: string) => Promise<void>
  
  // Customers
  customers: Customer[]
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>
  addCustomer: (email: string, name: string, referralCode?: string) => Promise<void>
  addOrUpdateCustomer: (email: string, name: string, orderId: string, orderTotal: number) => Promise<void>
  getCustomerByEmail: (email: string) => Customer | undefined
  deleteCustomer: (id: string) => Promise<void>
  
  // Tickets/Messages
  tickets: Ticket[]
  refreshTickets: () => Promise<void>
  addTicket: (ticket: NewTicketInput) => Promise<string>
  addTicketReply: (ticketId: string, message: string, isAdmin: boolean) => Promise<void>
  markTicketAsOpened: (ticketId: string) => Promise<void>
  updateTicketStatus: (ticketId: string, status: Ticket["status"]) => Promise<void>
  reopenTicket: (ticketId: string) => Promise<void>
  deleteTicket: (ticketId: string) => Promise<void>
  getTicketsByEmail: (email: string) => Ticket[]
  getTicketsByUserId: (userId: string) => Ticket[]
  
  // Subscribers
  subscribers: Subscriber[]
  setSubscribers: React.Dispatch<React.SetStateAction<Subscriber[]>>
  addSubscriber: (email: string) => Promise<boolean>
  deleteSubscriber: (id: string) => Promise<void>
  
  // Affiliates
  affiliates: Affiliate[]
  setAffiliates: React.Dispatch<React.SetStateAction<Affiliate[]>>
  addAffiliate: (affiliate: Omit<Affiliate, "id" | "referralCode" | "joinDate" | "totalReferrals" | "totalSales" | "totalProductsByReferrals" | "totalSpentByReferrals" | "totalEarnings" | "lastActive" | "referralHistory" | "payoutHistory" | "totalReferralPurchases" | "currentTier" | "nextTierGoal"> & { isContentCreator?: boolean; platforms?: string[] }) => Promise<void>
  updateAffiliate: (id: string, updates: Partial<Affiliate>) => Promise<void>
  updateAffiliateStatus: (id: string, status: Affiliate["status"]) => Promise<void>
  updateAffiliateCommissionRate: (id: string, commissionRate: number) => Promise<void>
  getAffiliateByEmail: (email: string) => Affiliate | undefined
  getAffiliateByUserId: (userId: string) => Affiliate | undefined
  getAffiliateByReferralCode: (code: string) => Affiliate | undefined
  calculateReferralPurchases: (referralCode: string) => number
  
  // Computed Stats
  stats: StoreStats
  
  // Loading state
  isLoaded: boolean
  hasLiveUpdates: boolean
  refreshStoreData: () => Promise<void>

  // Flags for notification dots
  hasNewOrders?: boolean
  hasNewCustomers?: boolean
  hasOpenTickets?: boolean
  hasNewReviews?: boolean
  hasNewSubscribers?: boolean

  // Clear notification flags (caller marks as visited)
  clearNewOrders?: () => void
  clearNewCustomers?: () => void
  clearOpenTickets?: () => void
  clearNewReviews?: () => void
  clearNewSubscribers?: () => void

  // Customer moderation
  toggleCustomerBan: (id: string, isBanned: boolean, reason?: string) => Promise<void>
}

// Tier system constants
export const TIER_SYSTEM = {
  tiers: [
    { tier: 0, minPurchases: 0, commission: 20, nextGoal: 10 },
    { tier: 1, minPurchases: 10, commission: 25, nextGoal: 25 },
    { tier: 2, minPurchases: 25, commission: 30, nextGoal: 50 },
    { tier: 3, minPurchases: 50, commission: 35, nextGoal: 100 },
    { tier: 4, minPurchases: 100, commission: 40, nextGoal: null }
  ]
}

export const getAffiliateCommissionTier = (totalReferralPurchases: number) => {
  for (let i = TIER_SYSTEM.tiers.length - 1; i >= 0; i--) {
    if (totalReferralPurchases >= TIER_SYSTEM.tiers[i].minPurchases) {
      return TIER_SYSTEM.tiers[i]
    }
  }
  return TIER_SYSTEM.tiers[0]
}

export const getAffiliateCommissionTierByRate = (commissionRate: number) => {
  const normalizedRate = Number(commissionRate)
  if (Number.isNaN(normalizedRate)) return TIER_SYSTEM.tiers[0]

  let currentTier = TIER_SYSTEM.tiers[0]
  for (const tier of TIER_SYSTEM.tiers) {
    if (normalizedRate >= tier.commission) {
      currentTier = tier
    }
  }
  return currentTier
}

export const normalizeAffiliateCommissionRate = (rawRate: any, defaultRate: number) => {
  const parsedRate = Number(rawRate ?? defaultRate)
  if (Number.isNaN(parsedRate)) return defaultRate
  return parsedRate > 0 && parsedRate < 1 ? parsedRate * 100 : parsedRate
}

const StoreDataContext = createContext<StoreDataContextType | null>(null)

// Convert Product to Account format for customer-facing pages
function productToAccount(product: Product): Account {
  return {
    id: product.id,
    platform: product.platform,
    type: product.type,
    followers: product.followers,
    followersNum: parseFollowers(product.followers),
    price: product.price,
    badge: product.badge ?? "",
    badgeColor: product.badge === "Popular" ? "bg-[#FE2C55]" : product.badge === "Best Value" ? "bg-green-500" : "",
    description: product.description,
    features: product.features,
    verified: (product.verificationPrice ?? 0) === 0,
    verificationPrice: product.verificationPrice ?? 0,
    transferTime: product.transferTime,
    inStock: product.inStock
  }
}

// Parse followers string to number for sorting
function parseFollowers(followers: string): number {
  const match = followers.match(/(\d+)/)
  if (!match) return 0
  const num = parseInt(match[1])
  if (followers.toLowerCase().includes("k")) return num * 1000
  return num
}



function mapBackendProduct(product: any): Product {
  const verificationPrice = product.verificationPrice !== undefined
    ? Number(product.verificationPrice || 0)
    : product.hasVerificationFee
      ? 30
      : 0

  return {
    id: product.id,
    platform: product.platform as "TikTok" | "YouTube",
    type: product.type ?? "",
    followers: String(product.followers ?? "0"),
    followersNum: Number(product.followers ?? 0),
    price: Number(product.price ?? 0),
    badge: product.badge ?? "",
    badgeColor: product.badge === "Popular" ? "bg-[#FE2C55]" : product.badge === "Best Value" ? "bg-green-500" : "",
    description: product.description ?? "",
    features: Array.isArray(product.features) ? product.features : [],
    verified: Number(verificationPrice) === 0,
    verificationPrice,
    transferTime: product.transferTime ?? "Instant",
    inStock: product.inStock ?? true
  }
}

function mapBackendOrder(order: any): Order {
  const items = Array.isArray(order.items) ? order.items : []
  const productMap = new Map<string, OrderProduct>()

  for (const item of items) {
    const product = (item.product as any) ?? {}
    const productId = product.id
    const verificationPrice = Number(item.verificationPrice ?? 0)
    const isVerified = Number(item.verificationCount ?? 0) > 0
    const baseProduct: OrderProduct = {
      productId,
      name: product.type ? `${product.platform} ${product.type}` : `${product.platform}`,
      price: Number(product.price ?? 0),
      verificationPrice,
      hasVerification: isVerified,
      verifiedQuantity: isVerified ? Number(item.verificationCount ?? 0) : 0,
      quantity: 1,
      deliveryInfo: item.accountDetails ?? undefined
    }

    if (productMap.has(productId)) {
      const existing = productMap.get(productId)!
      existing.quantity += 1
      existing.verifiedQuantity = (existing.verifiedQuantity || 0) + (baseProduct.verifiedQuantity || 0)
      existing.hasVerification = existing.hasVerification || baseProduct.hasVerification
      if (!existing.deliveryInfo && baseProduct.deliveryInfo) {
        existing.deliveryInfo = baseProduct.deliveryInfo
      }
    } else {
      productMap.set(productId, baseProduct)
    }
  }

  const products = Array.from(productMap.values())

  const statusMap: Record<string, Order["status"]> = {
    VerifyingPayment: "pending",
    Preparing: "processing",
    Delivered: "delivered",
    Completed: "completed",
    Cancelled: "cancelled",
    Rejected: "rejected",
    pending: "pending",
    payment_received: "processing",
    processing: "processing",
    delivered: "delivered",
    completed: "completed",
    refunded: "refunded",
    cancelled: "cancelled",
    rejected: "rejected"
  }

  const normalizedStatus = String(order.status || "").toLowerCase()
  const legacyStatus = String(order.status || "")

  return {
    id: order.id,
    customerEmail: order.user?.email ?? "",
    customerName: order.user?.name ?? "",
    products,
    total: Number(order.totalAmount ?? 0),
    verificationAdded: products.some((product) => product.hasVerification),
    status: statusMap[normalizedStatus] ?? statusMap[legacyStatus] ?? "pending",
    date: order.createdAt ?? new Date().toISOString(),
    paymentMethod: order.paymentMethod ?? "card",
    deliveryDate: order.updatedAt ?? undefined,
    adminNotes: order.adminNotes ?? undefined,
    affiliateUpdated: order.affiliateUpdated ?? false,
    reviewId: order.review?.id ?? undefined
  }
}

function mapBackendSubscriber(subscriber: any): Subscriber {
  return {
    id: subscriber.id,
    email: subscriber.email ?? "",
    name: subscriber.name ?? undefined,
    subscribedDate: subscriber.subscribedAt ?? subscriber.createdAt ?? new Date().toISOString(),
    source: subscriber.source === "checkout" || subscriber.source === "popup" ? subscriber.source : "newsletter",
    status: subscriber.status === "unsubscribed" ? "unsubscribed" : "active",
    lastEmailDate: subscriber.lastEmailDate ?? undefined
  }
}

function getLastTicketTimestamp(ticket: Ticket): number {
  const createdAt = new Date(ticket.createdAt).getTime()
  if (!ticket.replies.length) return createdAt
  return ticket.replies.reduce((latest, reply) => {
    const timestamp = new Date(reply.createdAt).getTime()
    return timestamp > latest ? timestamp : latest
  }, createdAt)
}

function sortTicketsByLatestMessage(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) => getLastTicketTimestamp(b) - getLastTicketTimestamp(a))
}

function normalizeTicketStatus(status: string | undefined): Ticket["status"] {
  switch ((status ?? "").toLowerCase()) {
    case "opened":
      return "opened"
    case "replied":
      return "replied"
    case "closed":
      return "closed"
    default:
      return "open"
  }
}

function toBackendTicketStatus(status: Ticket["status"]): string {
  switch (status) {
    case "opened":
      return "Opened"
    case "replied":
      return "Replied"
    case "closed":
      return "Closed"
    default:
      return "Open"
  }
}

function isOpenLikeStatus(status: Ticket["status"]) {
  return status === "open" || status === "opened"
}

function mapBackendTicket(ticket: any): Ticket {
  const ticketOwnerId = ticket.userId ?? ticket.user?.id ?? ""
  const ticketOwnerEmail = (ticket.user?.email ?? ticket.userEmail ?? "").toLowerCase()
  const messages = Array.isArray(ticket.messages) ? [...ticket.messages] : []
  messages.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const firstMessage = messages[0]
  const replies = messages.slice(1).map((msg: any) => {
    const senderId = msg.sender?.id ?? msg.senderId ?? ""
    const senderName = msg.sender?.name ?? (senderId === ticketOwnerId ? ticket.user?.name ?? ticket.userName ?? "You" : "Support Team")
    const isAdmin = msg.sender?.role === 'ADMIN' || (senderId !== "" && senderId !== ticketOwnerId)

    return {
      id: msg.id,
      message: msg.message,
      isAdmin,
      senderId,
      senderName,
      createdAt: msg.createdAt
    }
  })

  const allMessages = [
    ...(firstMessage ? [{
      id: firstMessage.id,
      message: firstMessage.message,
      isAdmin: false,
      senderId: ticketOwnerId,
      senderName: ticket.user?.name ?? ticket.userName ?? "",
      createdAt: firstMessage.createdAt
    }] : []),
    ...replies
  ]

  const lastMessage = allMessages.length > 0 ? allMessages[allMessages.length - 1] : null

  return {
    id: ticket.id,
    userId: ticket.userId,
    name: ticket.user?.name ?? ticket.userName ?? "",
    email: ticket.user?.email ?? ticket.userEmail ?? "",
    type: ticket.type ?? "Other",
    subject: ticket.subject,
    message: firstMessage?.message ?? "",
    status: normalizeTicketStatus(ticket.status),
    createdAt: ticket.createdAt,
    replies
  }
}

function mapBackendAffiliate(affiliate: any): Affiliate {
  const user = affiliate.user ?? {}
  const purchases = Array.isArray(affiliate.purchases) ? affiliate.purchases : []
  const referralHistory = purchases.map((purchase: any) => ({
    orderId: purchase.orderItem?.orderId ?? purchase.orderId ?? "",
    date: purchase.createdAt ?? new Date().toISOString(),
    amount: purchase.orderItem?.product?.price ?? 0,
    commission: purchase.commissionAmount ?? 0
  }))

  const totalReferrals = Number(affiliate.totalReferrals ?? purchases.length)
  const totalSales = Number(affiliate.totalSales ?? affiliate.totalReferralPurchases ?? purchases.length)
  const totalProductsByReferrals = Number(affiliate.totalProductsByReferrals ?? purchases.reduce((sum: number, item: any) => sum + (item.orderItem?.product ? 1 : 0), 0))
  const totalSpentByReferrals = Number(affiliate.totalSpentByReferrals ?? purchases.reduce((sum: number, item: any) => sum + (item.orderItem?.product?.price ?? 0), 0))
  const totalReferralPurchases = Number(affiliate.totalReferralPurchases ?? totalSales)
  const storedEarnings = typeof affiliate.totalEarnings === 'number' ? Number(affiliate.totalEarnings) : undefined
  const pendingEarnings = purchases.reduce((sum: number, purchase: any) => {
    if (!purchase || typeof purchase.status !== 'string') return sum
    return purchase.status.toLowerCase() !== 'paid' ? sum + Number(purchase.commissionAmount ?? 0) : sum
  }, 0)
  const totalEarnings = storedEarnings !== undefined
    ? (storedEarnings === 0 && pendingEarnings > 0 ? pendingEarnings : storedEarnings)
    : pendingEarnings

  const normalizedRate = normalizeAffiliateCommissionRate(affiliate.commissionRate, 20)
  const rateBasedTier = getAffiliateCommissionTierByRate(normalizedRate)
  const autoUpgradeEnabled = affiliate.commissionRateAutoUpgradeEnabled !== false
  const nextTierGoal = autoUpgradeEnabled ? rateBasedTier.nextGoal : null

  return {
    id: affiliate.userId ?? affiliate.id ?? "",
    userId: affiliate.userId ?? affiliate.id ?? "",
    name: user.name ?? "",
    email: user.email ?? "",
    referralCode: affiliate.affiliateCode ?? "",
    commissionRate: normalizedRate,
    commissionRateAutoUpgradeEnabled: autoUpgradeEnabled,
    status: affiliate.status === "Accepted" ? "active" : affiliate.status === "Pending" ? "pending" : affiliate.status?.toLowerCase() ?? "pending",
    joinDate: affiliate.createdAt ?? new Date().toISOString(),
    totalReferrals,
    totalSales,
    totalProductsByReferrals,
    totalSpentByReferrals,
    totalEarnings,
    totalReferralPurchases,
    lastActive: affiliate.updatedAt ?? affiliate.createdAt ?? new Date().toISOString(),
    currentTier: rateBasedTier.tier,
    nextTierGoal,
    socialMediaPlatforms: affiliate.socialMediaPlatforms ?? [],
    isContentCreator: Boolean(affiliate.isContentCreator ?? affiliate.contentCreator ?? false),
    paymentMethod: (() => {
      if (!affiliate.payoutMethod || typeof affiliate.payoutMethod !== "string") return undefined
      const payoutMethod = affiliate.payoutMethod.trim()
      const payoutAddress = typeof affiliate.payoutAddress === "string" ? affiliate.payoutAddress.trim() : ""
      if (!payoutAddress) return undefined

      const invalidSocialPlatforms = new Set(["instagram", "tiktok", "youtube", "twitter", "twitter/x", "twitch", "other"])
      if (invalidSocialPlatforms.has(payoutMethod.toLowerCase())) return undefined

      if (payoutMethod.toLowerCase() === "paypal") {
        return {
          type: "paypal" as const,
          paypalLink: payoutAddress
        }
      }

      return {
        type: "crypto" as const,
        cryptoData: {
          coin: payoutMethod,
          network: "",
          walletAddress: payoutAddress
        }
      }
    })(),
    referralHistory,
    payoutHistory: []
  }
}

function mapBackendReview(review: any): Review {
  const product = review.order?.items?.[0]?.product ?? {}
  const title = review.rating >= 5 ? "Excellent!" : review.rating >= 4 ? "Great Experience" : "Good Service"
  const isAnonymous = Boolean(review.anonymous ?? review.isAnonymous)
  const displayName = review.displayName ?? review.user?.name ?? "Anonymous"
  const resolvedName = isAnonymous ? getAnonymousInitials(displayName) : (displayName || "Anonymous")

  return {
    id: review.id,
    productId: product.id ?? "",
    orderId: review.order?.id ?? undefined,
    productName: product.type ? `${product.platform} ${product.type}` : `${product.platform ?? "Product"}`,
    customerName: resolvedName,
    rating: Number(review.rating ?? 0),
    title,
    text: review.comment ?? review.text ?? "",
    comment: review.comment ?? undefined,
    author: resolvedName,
    date: review.createdAt ?? new Date().toISOString(),
    verified: true,
    helpful: 0,
    status: (review.status as string) === "approved" ? "approved" : (review.status as string) === "rejected" ? "rejected" : "pending"
  }
}

// Convert Review to Testimonial format for customer-facing pages
function reviewToTestimonial(review: Review): Testimonial {
  return {
    id: review.id,
    name: review.customerName,
    title: review.rating >= 5 ? "Excellent!" : review.rating >= 4 ? "Great Experience" : "Good Service",
    quote: review.text,
    rating: review.rating,
    status: review.status
  }
}

// Calculate stats from orders and reviews
function calculateStats(orders: Order[], reviews: Review[]): StoreStats {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  
  // Filter completed orders
  const completedOrders = orders.filter(o => o.status === "completed")
  
  // Calculate revenue
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0)
  
  // Orders from the exact last 30 days
  const monthlyOrders = completedOrders.filter(o => new Date(o.date) >= thirtyDaysAgo)
  const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + o.total, 0)
  
  // Total accounts sold (count products in completed orders)
  const totalAccountsSold = completedOrders.reduce((sum, o) => 
    sum + o.products.reduce((pSum, p) => pSum + p.quantity, 0), 0)
  
  // Accounts sold in the last 30 days
  const monthlyAccountsSold = monthlyOrders.reduce((sum, o) => 
    sum + o.products.reduce((pSum, p) => pSum + p.quantity, 0), 0)
  
  // Average rating from approved reviews
  const approvedReviews = reviews.filter(r => r.status === "approved")
  const averageRating = approvedReviews.length > 0 
    ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length 
    : 5
  
  // Customer satisfaction (percentage of 4-5 star reviews)
  const satisfiedReviews = approvedReviews.filter(r => r.rating >= 4)
  const customerSatisfaction = approvedReviews.length > 0 
    ? (satisfiedReviews.length / approvedReviews.length) * 100 
    : 100

  return {
    totalRevenue,
    monthlyRevenue,
    totalAccountsSold,
    monthlyAccountsSold,
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews: approvedReviews.length,
    customerSatisfaction: Math.round(customerSatisfaction * 10) / 10
  }
}


export function StoreDataProvider({ children }: { children: ReactNode }) {
  const { user: customerUser, isLoading: isCustomerAuthLoading } = useUserAuth()
  const { user: adminUser, isLoading: isAdminAuthLoading } = useAdminAuth()

  // Initialize with empty state - we'll load from backend on mount
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasLiveUpdates, setHasLiveUpdates] = useState(false)

  // Load data from backend on mount
  const refreshTickets = useCallback(async () => {
    try {
      const headers = authHeaders()
      let ticketsRes

      // If we're in an admin session, prefer the admin listing endpoint so
      // admins see all tickets rather than the empty /tickets/me result.
      const isAdminSession = Boolean(adminUser)
      if (isAdminSession) {
        ticketsRes = await apiFetch(apiPath("/tickets"), { headers: authHeaders(undefined, true) })
      } else {
        ticketsRes = await apiFetch(apiPath("/tickets/me"), { headers })
        if (!ticketsRes.ok && ticketsRes.status === 403) {
          ticketsRes = await apiFetch(apiPath("/tickets"), { headers })
        }
      }

      if (ticketsRes && ticketsRes.ok) {
        const ticketsData = await ticketsRes.json()
        console.debug('[store] refreshTickets: raw response', ticketsData)
        const mappedTickets = Array.isArray(ticketsData)
          ? ticketsData.map(mapBackendTicket)
          : ticketsData.tickets?.map(mapBackendTicket) || []
        console.debug('[store] refreshTickets: mapped tickets', mappedTickets)
        setTickets(sortTicketsByLatestMessage(mappedTickets))
      } else if (ticketsRes) {
        let bodyText = ''
        try { bodyText = await ticketsRes.text() } catch (e) { /* ignore */ }
        console.warn('[store] refreshTickets failed', ticketsRes.status, ticketsRes.statusText, bodyText)
      }
    } catch (err) {
      console.warn("Failed to refresh tickets:", err)
    }
  }, [adminUser])

  const refreshStoreData = useCallback(async () => {
    setHasLiveUpdates(false)
    try {
      const headers = authHeaders()
      const isAdminSession = Boolean(adminUser)
      const orderPath = apiPath(isAdminSession ? "/orders" : "/orders/me")
      const orderHeaders = isAdminSession ? authHeaders(undefined, true) : headers

      const productsPromise = apiFetch(apiPath("/products"), { headers })
        .then(async (res) => res.ok ? await res.json() : null)
        .catch((err) => { console.warn("Failed to load products:", err); return null })

      const ordersPromise = apiFetch(orderPath, { headers: orderHeaders })
        .then(async (res) => {
          if (res.ok) return await res.json()
          if (!isAdminSession && [401, 403, 404].includes(res.status)) {
            const fallback = await apiFetch(apiPath("/orders"), { headers: authHeaders(undefined, true) })
            return fallback.ok ? await fallback.json() : null
          }
          const text = await res.text().catch(() => '')
          console.warn('[store] load orders failed', res.status, res.statusText, text)
          return null
        })
        .catch((err) => { console.warn("Failed to load orders:", err); return null })

      const reviewsPromise = apiFetch(apiPath("/reviews"), { headers })
        .then(async (res) => res.ok ? await res.json() : null)
        .catch((err) => { console.warn("Failed to load reviews:", err); return null })

      const ticketsPromise = refreshTickets().catch((err) => {
        console.warn("Failed to load tickets:", err)
      })

      const subscribersPromise = apiFetch(apiPath("/admin/subscribers"), { headers: authHeaders(undefined, true) })
        .then(async (res) => {
          if (res.ok) return await res.json()
          if ([404, 401, 403].includes(res.status)) {
            const fallback = await apiFetch(apiPath("/subscribers"), { headers })
            return fallback.ok ? await fallback.json() : null
          }
          return null
        })
        .catch((err) => { console.warn("Failed to load subscribers:", err); return null })

      const affiliatesPromise = apiFetch(apiPath("/affiliate/me"), { headers })
        .then(async (res) => {
          if (res.ok) return await res.json()
          if (res.status === 403) {
            const adminRes = await apiFetch(apiPath("/affiliate"), { headers: authHeaders(undefined, true) })
            return adminRes.ok ? await adminRes.json() : null
          }
          return null
        })
        .catch((err) => { console.warn("Failed to load affiliates:", err); return null })

      const customersPromise = apiFetch(apiPath("/admin/customers"), { headers: authHeaders(undefined, true) })
        .then(async (res) => {
          if (res.ok) return await res.json()
          if (res.status === 404) {
            const usersRes = await apiFetch(apiPath("/admin/users"), { headers: authHeaders(undefined, true) })
            return usersRes.ok ? await usersRes.json() : null
          }
          return null
        })
        .catch((err) => { console.warn("Failed to load customers:", err); return null })

      const [productsData, ordersData, reviewsData, subscribersData, affiliatesData, customersData] = await Promise.all([
        productsPromise,
        ordersPromise,
        reviewsPromise,
        subscribersPromise,
        affiliatesPromise,
        customersPromise
      ])

      if (productsData) {
        const mappedProducts = Array.isArray(productsData)
          ? productsData.map(mapBackendProduct)
          : productsData.products?.map(mapBackendProduct) || []
        setProducts(mappedProducts)
      }

      if (ordersData) {
        const mappedOrders = Array.isArray(ordersData)
          ? ordersData.map(mapBackendOrder)
          : ordersData.orders?.map(mapBackendOrder) || []
        setOrders(mappedOrders)
      }

      if (reviewsData) {
        const mappedReviews = Array.isArray(reviewsData)
          ? reviewsData.map(mapBackendReview)
          : reviewsData.reviews?.map(mapBackendReview) || []
        setReviews(mappedReviews)
      }

      if (subscribersData) {
        const rawSubscribers = Array.isArray(subscribersData)
          ? subscribersData
          : subscribersData.subscribers || []
        setSubscribers(rawSubscribers.map(mapBackendSubscriber))
      }

      if (affiliatesData) {
        const rawAffiliates = Array.isArray(affiliatesData)
          ? affiliatesData
          : affiliatesData ? [affiliatesData] : []
        setAffiliates(rawAffiliates.map(mapBackendAffiliate))
      }

      if (customersData) {
        const mappedCustomers = (Array.isArray(customersData)
          ? customersData
          : customersData.customers || [])
          .filter((customer: any) => customer?.role !== 'ADMIN')
        setCustomers(mappedCustomers)
      }

      await ticketsPromise
      setIsLoaded(true)
    } catch (err) {
      console.error("Failed to load store data:", err)
      setIsLoaded(true)
    }
  }, [adminUser, isCustomerAuthLoading, isAdminAuthLoading])

  useEffect(() => {
    if (!isCustomerAuthLoading && !isAdminAuthLoading) {
      void refreshStoreData()
    }
  }, [isCustomerAuthLoading, isAdminAuthLoading, refreshStoreData])

  useEffect(() => {
    if (typeof window === "undefined" || isCustomerAuthLoading || isAdminAuthLoading) {
      return
    }

    const interval = window.setInterval(() => {
      void refreshStoreData()
    }, 10000)

    return () => window.clearInterval(interval)
  }, [isCustomerAuthLoading, isAdminAuthLoading, refreshStoreData])


  const addProduct = useCallback(async (product: Product) => {
    try {
      // Optimistically update local state
      setProducts(prev => [...prev, product])
      
      // Call backend
      const res = await apiFetch(apiPath("/products"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(product)
      })
      
      if (!res.ok) {
        console.error("Failed to add product to backend")
        // Revert on error
        setProducts(prev => prev.filter(p => p.id !== product.id))
      }
    } catch (err) {
      console.error("Error adding product:", err)
      setProducts(prev => prev.filter(p => p.id !== product.id))
    }
  }, [])

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const previousProducts = products.slice()
    try {
      // Optimistically update
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))

      // Call backend
      const res = await apiFetch(apiPath(`/products/${id}`), {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(updates)
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        console.error("Failed to update product", res.status, text)
        // Revert on error
        setProducts(previousProducts)
      }
    } catch (err) {
      console.error("Error updating product:", err)
      // Revert optimistic change on exception
      setProducts(previousProducts)
    }
  }, [products])

  const deleteProduct = useCallback(async (id: string) => {
    const previousProducts = products
    // Optimistically update
    setProducts(prev => prev.filter(p => p.id !== id))

    try {
      const res = await apiFetch(apiPath(`/products/${id}`), {
        method: "DELETE",
        headers: authHeaders()
      })

      if (!res.ok) {
        const errorMessage = await res.text().catch(() => 'Failed to delete product')
        console.error("Failed to delete product", res.status, errorMessage)
        setProducts(previousProducts)
        return { ok: false, message: errorMessage }
      }

      return { ok: true }
    } catch (err) {
      console.error("Error deleting product:", err)
      setProducts(previousProducts)
      return { ok: false, message: String(err) }
    }
  }, [products])

  const toggleProductStock = useCallback(async (id: string) => {
    try {
      const product = products.find(p => p.id === id)
      if (!product) return
      
      const previousProducts = products
      // Optimistically update
      setProducts(prev => prev.map(p => p.id === id ? { ...p, inStock: !p.inStock } : p))
      
      // Call backend
      const res = await apiFetch(apiPath(`/products/${id}`), {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ inStock: !product.inStock })
      })
      
      if (!res.ok) {
        console.error("Failed to toggle product stock")
        // Revert on error
        setProducts(previousProducts)
      }
    } catch (err) {
      console.error("Error toggling product stock:", err)
    }
  }, [products])

  // Order operations - with backend sync
  const addOrder = useCallback(async (order: Order) => {
    try {
      // Optimistically update local state
      setOrders(prev => [order, ...prev])
      
      // Call backend
      const res = await apiFetch(apiPath("/orders"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(order)
      })
      
      if (!res.ok) {
        console.error("Failed to create order in backend")
        // Revert on error
        setOrders(prev => prev.filter(o => o.id !== order.id))
      }
    } catch (err) {
      console.error("Error adding order:", err)
      setOrders(prev => prev.filter(o => o.id !== order.id))
    }
  }, [])

  const updateOrderStatus = useCallback(async (id: string, status: Order["status"]) => {
    const previousOrders = orders
    const order = orders.find(o => o.id === id)
    if (!order) {
      throw new Error(`Order not found: ${id}`)
    }

    try {
      // Optimistically update local state
      setOrders(prev => prev.map(o => {
        if (o.id === id) {
          const updates: Partial<Order> = { status }
          // Set delivery date when marking as delivered
          if (status === "delivered" && !o.deliveryDate) {
            updates.deliveryDate = new Date().toISOString()
          }
          return { ...o, ...updates }
        }
        return o
      }))

      // Call backend - admin endpoint to update order status
      const preferAdminToken = Boolean(adminUser)
      const res = await apiFetch(apiPath(`/orders/${id}/status`), {
        method: "PUT",
        headers: authHeaders(undefined, preferAdminToken),
        body: JSON.stringify({ status })
      })

      if (!res.ok) {
        let respText = ''
        try { respText = await res.text() } catch (_) { respText = '' }
        console.error("Failed to update order status", res.status, respText)
        setOrders(previousOrders)
        throw new Error(`Failed to update order status: ${res.status} ${respText}`)
      }

      setHasLiveUpdates(true)

      const updatedOrder = await res.json()
      if (updatedOrder) {
        setOrders(prev => prev.map(o => o.id === id ? mapBackendOrder(updatedOrder) : o))
      }
      
      // If this order was marked completed, refresh customers aggregates from backend
      if (status === "completed") {
        try {
          const customersRes = await apiFetch(apiPath("/admin/customers"), {
            headers: authHeaders(undefined, preferAdminToken)
          })
          if (customersRes.ok) {
            const customersData = await customersRes.json()
            const mappedCustomers = Array.isArray(customersData) ? customersData : customersData.customers || []
            setCustomers(mappedCustomers.filter((c: any) => c?.role !== 'ADMIN'))
          }
        } catch (err) {
          console.warn("Failed to refresh customers after order completion:", err)
        }
      }
    } catch (err) {
      console.error("Error updating order status:", err)
      throw err
    }
  }, [orders, adminUser])

  const updateOrder = useCallback(async (id: string, updates: Partial<Order>) => {
    try {
      const previousOrders = orders
      // Optimistically update
      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o))
      
      // Call backend
      const res = await apiFetch(apiPath(`/orders/${id}`), {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(updates)
      })
      
      if (!res.ok) {
        console.error("Failed to update order")
        // Revert on error
        setOrders(previousOrders)
      }
    } catch (err) {
      console.error("Error updating order:", err)
    }
  }, [orders])

  const updateOrderProductDelivery = useCallback(async (orderId: string, productId: string, deliveryInfo: string) => {
    try {
      const previousOrders = orders
      // Optimistically update
      setOrders(prev => prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            products: o.products.map(p => 
              p.productId === productId ? { ...p, deliveryInfo } : p
            )
          }
        }
        return o
      }))
      
      // Call backend
      const res = await apiFetch(apiPath(`/orders/${orderId}/delivery`), {
        method: "PUT",
        headers: authHeaders(undefined, true),
        body: JSON.stringify({ productId, deliveryInfo })
      })
      
      if (!res.ok) {
        let respText = ''
        try { respText = await res.text() } catch (_) { respText = '' }
        console.error("Failed to update delivery info", res.status, respText)
        // Revert on error
        setOrders(previousOrders)
        return
      }
    } catch (err) {
      console.error("Error updating delivery info:", err)
    }
  }, [orders])

  // Review operations - with backend sync
  const addReview = useCallback(async (review: Review) => {
    try {
      // Optimistically update local state
      setReviews(prev => [review, ...prev])

      const res = await apiFetch(apiPath("/reviews"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          orderId: review.orderId,
          rating: review.rating,
          comment: review.text,
          anonymous: review.anonymous,
          displayName: review.customerName,
          status: review.status
        })
      })

      if (!res.ok) {
        console.error("Failed to add review")
        setReviews(prev => prev.filter(r => r.id !== review.id))
        return
      }

      setHasLiveUpdates(true)
      setHasNewReviews(true)

      const backendReview = await res.json()
      const mappedReview = mapBackendReview(backendReview)
      setReviews(prev => [mappedReview, ...prev.filter(r => r.id !== review.id)])
    } catch (err) {
      console.error("Error adding review:", err)
      setReviews(prev => prev.filter(r => r.id !== review.id))
    }
  }, [])

  const updateReview = useCallback(async (id: string, updates: Partial<Review>) => {
    try {
      const previousReviews = reviews
      // Optimistically update
      setReviews(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
      
      // Call backend
      const res = await apiFetch(apiPath(`/reviews/${id}`), {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(updates)
      })
      
      if (!res.ok) {
        console.error("Failed to update review")
        // Revert on error
        setReviews(previousReviews)
      }
    } catch (err) {
      console.error("Error updating review:", err)
    }
  }, [reviews])

  const deleteReview = useCallback(async (id: string) => {
    try {
      const previousReviews = reviews
      // Optimistically update
      setReviews(prev => prev.filter(r => r.id !== id))
      
      // Call backend
      const res = await apiFetch(apiPath(`/reviews/${id}`), {
        method: "DELETE",
        headers: authHeaders()
      })
      
      if (!res.ok) {
        console.error("Failed to delete review")
        // Revert on error
        setReviews(previousReviews)
      }
    } catch (err) {
      console.error("Error deleting review:", err)
    }
  }, [reviews])

  const approveReview = useCallback(async (id: string) => {
    try {
      const previousReviews = reviews
      // Optimistically update
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status: "approved" as const } : r))
      
      // Call backend using admin token for admin action
      const res = await apiFetch(apiPath(`/reviews/${id}`), {
        method: "PUT",
        headers: authHeaders(undefined, true),
        body: JSON.stringify({ status: "approved" })
      })
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        console.error("Failed to approve review", res.status, errorText)
        // Revert on error
        setReviews(previousReviews)
        throw new Error(`Failed to approve review: ${res.status} ${errorText}`)
      }
    } catch (err) {
      console.error("Error approving review:", err)
      throw err
    }
  }, [reviews])

  const rejectReview = useCallback(async (id: string) => {
    try {
      const previousReviews = reviews
      // Optimistically update
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" as const } : r))
      
      // Call backend using admin token for admin action
      const res = await apiFetch(apiPath(`/reviews/${id}`), {
        method: "PUT",
        headers: authHeaders(undefined, true),
        body: JSON.stringify({ status: "rejected" })
      })
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        console.error("Failed to reject review", res.status, errorText)
        // Revert on error
        setReviews(previousReviews)
        throw new Error(`Failed to reject review: ${res.status} ${errorText}`)
      }
    } catch (err) {
      console.error("Error rejecting review:", err)
      throw err
    }
  }, [reviews])

  // Customer operations - with backend sync
  const addCustomer = useCallback(async (email: string, name: string, referralCode?: string) => {
    setCustomers(prev => {
      // Check if customer already exists
      if (prev.find(c => c.email.toLowerCase() === email.toLowerCase())) {
        return prev
      }
      
      const now = new Date().toISOString().split('T')[0]
      const newCustomer: Customer = {
        id: `CUS-${Date.now()}`,
        email: email.toLowerCase(),
        name,
        ordersCount: 0,
        totalSpent: 0,
        firstPurchaseDate: now,
        lastPurchaseDate: now,
        orders: [],
        referralCode: referralCode && referralCode.trim() ? referralCode.trim() : undefined
      }
      const updated = [...prev, newCustomer]
      
      // Also call backend to persist
      apiFetch(apiPath("/customers"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(newCustomer)
      }).catch(err => console.error("Failed to create customer on backend:", err))
      
      return updated
    })
  }, [])

  const getCustomerByEmail = useCallback((email: string): Customer | undefined => {
    return customers.find(c => c.email.toLowerCase() === email.toLowerCase())
  }, [customers])

  const addOrUpdateCustomer = useCallback(async (email: string, name: string, orderId: string, orderTotal: number) => {
    setCustomers(prev => {
      const existingCustomer = prev.find(c => c.email.toLowerCase() === email.toLowerCase())
      const now = new Date().toISOString().split('T')[0]
      
      let updated: Customer[]
      if (existingCustomer) {
        // Update existing customer
        updated = prev.map(c => c.email.toLowerCase() === email.toLowerCase() ? {
          ...c,
          ordersCount: c.ordersCount + 1,
          totalSpent: c.totalSpent + orderTotal,
          lastPurchaseDate: now,
          orders: [...c.orders, orderId]
        } : c)
        
        // Call backend to update
        apiFetch(apiPath(`/customers/${existingCustomer.id}`), {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({
            ordersCount: (existingCustomer.ordersCount || 0) + 1,
            totalSpent: (existingCustomer.totalSpent || 0) + orderTotal,
            lastPurchaseDate: now
          })
        }).catch(err => console.error("Failed to update customer on backend:", err))
      } else {
        // Add new customer
        const newCustomer: Customer = {
          id: `CUS-${String(prev.length + 1).padStart(3, '0')}`,
          email,
          name,
          ordersCount: 1,
          totalSpent: orderTotal,
          firstPurchaseDate: now,
          lastPurchaseDate: now,
          orders: [orderId]
        }
        updated = [...prev, newCustomer]
        
        // Call backend to create
        apiFetch(apiPath("/customers"), {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(newCustomer)
        }).catch(err => console.error("Failed to create customer on backend:", err))
        setHasNewCustomers(true)
      }
      return updated
    })
  }, [])

  // Ticket operations - with backend sync
  // Notification flags state
  const [hasNewOrders, setHasNewOrders] = useState(false)
  const [hasNewCustomers, setHasNewCustomers] = useState(false)
  const [hasOpenTickets, setHasOpenTickets] = useState(false)
  const [hasNewReviews, setHasNewReviews] = useState(false)
  const [hasNewSubscribers, setHasNewSubscribers] = useState(false)

  // Track notification fingerprints so clearing the badge suppresses
  // it until new activity happens (prevents immediate reappearance).
  const lastTicketNotificationKeyRef = useRef<string>("")
  const ticketBadgeClearedRef = useRef(false)
  const lastOrderNotificationKeyRef = useRef<string>("")
  const orderBadgeClearedRef = useRef(false)

  const clearNewOrders = useCallback(() => {
    orderBadgeClearedRef.current = true
    setHasNewOrders(false)
  }, [])
  const clearNewCustomers = useCallback(() => setHasNewCustomers(false), [])
  const clearOpenTickets = useCallback(() => {
    ticketBadgeClearedRef.current = true
    setHasOpenTickets(false)
  }, [])
  const clearNewReviews = useCallback(() => setHasNewReviews(false), [])
  const clearNewSubscribers = useCallback(() => setHasNewSubscribers(false), [])

  function getTicketNotificationKey(ticketList: Ticket[]) {
    return ticketList
      .filter(t => isOpenLikeStatus(t.status))
      .map(t => `${t.id}:${t.status}:${t.replies.length}:${getLastTicketTimestamp(t)}`)
      .sort()
      .join('|')
  }

  function getOrderNotificationKey(orderList: Order[]) {
    return orderList
      .map(order => `${order.id}:${order.status}:${order.total}:${order.date}`)
      .sort()
      .join('|')
  }

  const addTicket = useCallback(async (ticketData: NewTicketInput): Promise<string> => {
    const ticketId = `TKT-${Date.now()}`
    const newTicket: Ticket = {
      ...ticketData,
      id: ticketId,
      type: ticketData.type ?? "Other",
      status: "open",
      createdAt: new Date().toISOString(),
      replies: []
    }
    
    // Optimistically update local state
    setTickets(prev => [newTicket, ...prev])
    
    try {
      // Call backend
      const res = await apiFetch(apiPath("/tickets"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          ...ticketData,
          type: ticketData.type ?? "Other"
        })
      })
      
      if (res.ok) {
        const backendTicket = await res.json()
        const mappedTicket = mapBackendTicket(backendTicket)
        // Replace with backend ticket
        setTickets(prev => [mappedTicket, ...prev.filter(t => t.id !== ticketId)])
        setHasLiveUpdates(true)
        setHasOpenTickets(true)
        return mappedTicket.id
      } else {
        const errorText = await res.text().catch(() => '')
        console.error("Failed to create ticket on backend", res.status, errorText)
        // Revert on error
        setTickets(prev => prev.filter(t => t.id !== ticketId))
        return ticketId
      }
    } catch (err) {
      console.error("Error adding ticket:", err)
      // Revert on error
      setTickets(prev => prev.filter(t => t.id !== ticketId))
      return ticketId
    }
  }, [])

  const markTicketAsOpened = useCallback(async (ticketId: string) => {
    try {
      const previousTickets = tickets
      const ticketToUpdate = tickets.find(ticket => ticket.id === ticketId)
      if (!ticketToUpdate || ticketToUpdate.status !== "open") return

      setTickets(prev => prev.map(ticket =>
        ticket.id === ticketId
          ? { ...ticket, status: "opened" }
          : ticket
      ))

      const res = await apiFetch(apiPath(`/tickets/${ticketId}`), {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ status: toBackendTicketStatus("opened") })
      })

      if (!res.ok) {
        setTickets(previousTickets)
        return
      }

      setHasLiveUpdates(true)
      setHasOpenTickets(true)
    } catch (err) {
      console.error("Error opening ticket:", err)
    }
  }, [tickets])

  const addTicketReply = useCallback(async (ticketId: string, message: string, isAdmin: boolean) => {
    try {
      const previousTickets = tickets
      // Optimistically update
      setTickets(prev => sortTicketsByLatestMessage(prev.map(ticket => {
        if (ticket.id !== ticketId) return ticket

        const newReply: TicketReply = {
          id: `REPLY-${Date.now()}`,
          message,
          isAdmin,
          senderId: isAdmin ? "ADMIN" : ticket.userId ?? "",
          senderName: isAdmin ? "Support Team" : "You",
          createdAt: new Date().toISOString()
        }

        const replies = [...ticket.replies, newReply]
          const status = isAdmin ? "replied" : "open"

        return {
          ...ticket,
          replies,
          status
        }
      })))
      
      const preferAdminToken = typeof window !== "undefined" && isAdmin
      const headers = authHeaders(undefined, preferAdminToken)
      console.debug("[addTicketReply] ticketId=", ticketId, "isAdmin=", isAdmin, "preferAdminToken=", preferAdminToken, "hasAuth=", Boolean((headers as Record<string, string>)["Authorization"]))
      // Call backend
      const res = await apiFetch(apiPath(`/tickets/${ticketId}/messages`), {
        method: "POST",
        headers,
        body: JSON.stringify({ message })
      })
      
      if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        console.error("Failed to add ticket reply", res.status, errorText)
        // Revert on error
        setTickets(previousTickets)
      } else {
        // Backend returns the updated ticket with the new message included
        const updatedBackendTicket = await res.json()
        
        // Map the backend response to our frontend ticket format
        const mappedTicket = mapBackendTicket(updatedBackendTicket)
        
        // Update the ticket with the mapped data to sync status changes
        setTickets(prev => sortTicketsByLatestMessage(prev.map(ticket =>
          ticket.id === ticketId ? mappedTicket : ticket
        )))
        
        setHasLiveUpdates(true)
      }
    } catch (err) {
      console.error("Error adding ticket reply:", err)
    }
  }, [tickets])

  // Periodically compute notification flags from data load (simple heuristics)
  useEffect(() => {
    const openTickets = tickets.filter(t => isOpenLikeStatus(t.status))
    const currentTicketKey = getTicketNotificationKey(tickets)
    const previousTicketKey = lastTicketNotificationKeyRef.current
    const hasOpen = openTickets.length > 0
    const hasTicketActivity = currentTicketKey !== previousTicketKey

    if (!hasOpen) {
      ticketBadgeClearedRef.current = false
      setHasOpenTickets(false)
    } else if (!ticketBadgeClearedRef.current || hasTicketActivity) {
      ticketBadgeClearedRef.current = false
      setHasOpenTickets(true)
    }

    const currentOrderKey = getOrderNotificationKey(orders)
    const previousOrderKey = lastOrderNotificationKeyRef.current
    const hasPendingOrders = orders.some(o => o.status === 'pending' || o.status === 'processing')
    const hasOrderActivity = currentOrderKey !== previousOrderKey

    if (!hasPendingOrders) {
      orderBadgeClearedRef.current = false
      setHasNewOrders(false)
    } else if (!orderBadgeClearedRef.current || hasOrderActivity) {
      orderBadgeClearedRef.current = false
      setHasNewOrders(true)
    }

    lastTicketNotificationKeyRef.current = currentTicketKey
    lastOrderNotificationKeyRef.current = currentOrderKey
    setHasNewReviews(reviews.some(r => r.status === 'pending'))
  }, [tickets, reviews, orders])

  const updateTicketStatus = useCallback(async (ticketId: string, status: Ticket["status"]) => {
    try {
      const previousTickets = tickets
      const ticketToUpdate = tickets.find(ticket => ticket.id === ticketId)
      if (!ticketToUpdate) return

      // Optimistic update only for non-reopen transitions
      if (!(ticketToUpdate.status === 'closed' && status === 'open')) {
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId ? { ...ticket, status } : ticket
        ))
      }

      const endpoint = ticketToUpdate.status === 'closed' && status === 'open'
        ? apiPath(`/tickets/${ticketId}/reopen`)
        : apiPath(`/tickets/${ticketId}`)
      const method = 'PUT'
      const body = ticketToUpdate.status === 'closed' && status === 'open'
        ? undefined
        : JSON.stringify({ status })

      const res = await apiFetch(endpoint, {
        method,
        headers: authHeaders(),
        body
      })

      if (!res.ok) {
        let respText = ''
        try { respText = await res.text() } catch (_) { respText = '' }
        console.error("Failed to update ticket status", res.status, respText)
        setTickets(previousTickets)
        return
      }

      const updatedBackendTicket = await res.json()
      const updatedStatus = normalizeTicketStatus(updatedBackendTicket.status)
      setTickets(prev => sortTicketsByLatestMessage(prev.map(ticket =>
        ticket.id === ticketId ? { ...ticket, status: updatedStatus } : ticket
      )))

      setHasLiveUpdates(true)
      if (updatedStatus === 'open' || updatedStatus === 'opened') {
        setHasOpenTickets(true)
      }
    } catch (err) {
      console.error("Error updating ticket status:", err)
    }
  }, [tickets])

  const deleteTicket = useCallback(async (ticketId: string) => {
    try {
      const previousTickets = tickets
      // Optimistically update
      setTickets(prev => prev.filter(ticket => ticket.id !== ticketId))
      
      // Call backend
      const res = await apiFetch(apiPath(`/tickets/${ticketId}`), {
        method: "DELETE",
        headers: authHeaders()
      })
      
      if (!res.ok) {
        let respText = ''
        try { respText = await res.text() } catch (_) { respText = '' }
        console.error("Failed to delete ticket", res.status, respText)
        // Revert on error
        setTickets(previousTickets)
      }
    } catch (err) {
      console.error("Error deleting ticket:", err)
    }
  }, [tickets])

  const reopenTicket = useCallback(async (ticketId: string) => {
    try {
      const ticketToUpdate = tickets.find(ticket => ticket.id === ticketId)
      if (!ticketToUpdate) return

      const res = await apiFetch(apiPath(`/tickets/${ticketId}/reopen`), {
        method: "PUT",
        headers: authHeaders()
      })

      if (!res.ok) {
        let respText = ''
        try { respText = await res.text() } catch (_) { respText = '' }
        console.error("Failed to reopen ticket", res.status, respText)
        return
      }

      const updatedBackendTicket = await res.json()
      const updatedStatus = normalizeTicketStatus(updatedBackendTicket.status)

      setTickets(prev => sortTicketsByLatestMessage(prev.map(ticket =>
        ticket.id === ticketId ? { ...ticket, status: updatedStatus } : ticket
      )))
      setHasLiveUpdates(true)
      if (updatedStatus === 'open' || updatedStatus === 'opened') {
        setHasOpenTickets(true)
      }
    } catch (err) {
      console.error("Error reopening ticket:", err)
    }
  }, [tickets])

  const getTicketsByEmail = useCallback((email: string): Ticket[] => {
    return tickets.filter(t => t.email.toLowerCase() === email.toLowerCase())
  }, [tickets])

  const getTicketsByUserId = useCallback((userId: string): Ticket[] => {
    return tickets.filter(t => t.userId === userId)
  }, [tickets])

  // Subscriber operations - with backend sync
  const addSubscriber = useCallback(async (email: string) => {
    const normalizedEmail = email.toLowerCase().trim()
    const existingSubscriber = subscribers.find(s => s.email.toLowerCase() === normalizedEmail)

    if (existingSubscriber?.status === "active") {
      return true
    }

    const newSubscriber: Subscriber = existingSubscriber
      ? {
          ...existingSubscriber,
          email: normalizedEmail,
          status: "active",
          subscribedDate: new Date().toISOString()
        }
      : {
          id: `SUB-${Date.now()}`,
          email: normalizedEmail,
          subscribedDate: new Date().toISOString(),
          source: "newsletter",
          status: "active"
        }

    // Optimistically update local state
    setSubscribers(prev => {
      if (existingSubscriber) {
        return prev.map(s => s.id === existingSubscriber.id ? newSubscriber : s)
      }
      return [newSubscriber, ...prev]
    })

    try {
      // Call backend
      const res = await apiFetch(apiPath("/subscribers"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ email: normalizedEmail })
      })

      if (res.ok) {
        const backendSubscriber = await res.json()
        const mappedBackendSubscriber = mapBackendSubscriber(backendSubscriber)
        setSubscribers(prev => [mappedBackendSubscriber, ...prev.filter(s => s.id !== newSubscriber.id)])
        setHasLiveUpdates(true)
        return true
      }

      console.error("Failed to create subscriber on backend")
      // Revert on error
      setSubscribers(prev => prev.filter(s => s.id !== newSubscriber.id))
      return false
    } catch (err) {
      console.error("Error adding subscriber:", err)
      // Revert on error
      setSubscribers(prev => prev.filter(s => s.id !== newSubscriber.id))
      return false
    }
  }, [subscribers])

  const deleteSubscriber = useCallback(async (id: string) => {
    try {
      const previousSubscribers = subscribers
      // Optimistically update
      setSubscribers(prev => prev.filter(s => s.id !== id))
      
      // Call backend
      const res = await apiFetch(apiPath(`/subscribers/${id}`), {
        method: "DELETE",
        headers: authHeaders(undefined, true)
      })
      
      if (!res.ok) {
        console.error("Failed to delete subscriber")
        // Revert on error
        setHasNewSubscribers(true)
        setSubscribers(previousSubscribers)
      } else {
        setHasLiveUpdates(true)
      }
    } catch (err) {
      console.error("Error deleting subscriber:", err)
    }
  }, [subscribers])

  // Generate unique referral code
  const generateReferralCode = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }, [])

  const addAffiliate = useCallback(async (affiliate: Omit<Affiliate, "id" | "referralCode" | "joinDate" | "totalReferrals" | "totalSales" | "totalProductsByReferrals" | "totalSpentByReferrals" | "totalEarnings" | "lastActive" | "referralHistory" | "payoutHistory" | "totalReferralPurchases" | "currentTier" | "nextTierGoal"> & { isContentCreator?: boolean; platforms?: string[] }) => {
    const normalizedPlatforms = Array.isArray(affiliate.socialMediaPlatforms)
      ? affiliate.socialMediaPlatforms.filter(Boolean)
      : Array.isArray(affiliate.platforms)
        ? affiliate.platforms.filter(Boolean)
        : []

    const newAffiliate: Affiliate = {
      ...affiliate,
      id: affiliate.userId ?? `AFF-${Date.now()}`,
      referralCode: affiliate.status === "active" ? generateReferralCode() : "",
      commissionRate: normalizeAffiliateCommissionRate(affiliate.commissionRate, 20),
      commissionRateAutoUpgradeEnabled: true,
      joinDate: new Date().toISOString(),
      totalReferrals: 0,
      totalSales: 0,
      totalProductsByReferrals: 0,
      totalSpentByReferrals: 0,
      totalEarnings: 0,
      totalReferralPurchases: 0,
      currentTier: 0,
      nextTierGoal: 10,
      socialMediaPlatforms: normalizedPlatforms,
      isContentCreator: Boolean(affiliate.isContentCreator),
      lastActive: new Date().toISOString(),
      referralHistory: [],
      payoutHistory: []
    }

    setAffiliates(prev => [newAffiliate, ...prev])

    try {
      const socialMediaDescription = normalizedPlatforms.join(", ")

      const res = await apiFetch(apiPath("/affiliate/apply"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          isContentCreator: Boolean(affiliate.isContentCreator),
          platforms: normalizedPlatforms
        })
      })

      if (res.ok) {
        const backendAffiliate = await res.json()
        const mappedBackendAffiliate = mapBackendAffiliate(backendAffiliate)
        setAffiliates(prev => [mappedBackendAffiliate, ...prev.filter(a => a.id !== newAffiliate.id)])
      } else {
        const errorData = await res.json().catch(() => ({}))
        const message = typeof errorData?.message === 'string' ? errorData.message : ''
        if (res.status === 400 && /already applied|already exists/i.test(message)) {
          console.info("Affiliate already exists on backend; using local copy")
        } else {
          console.error("Failed to create affiliate on backend:", res.status, errorData)
          // Keep local affiliate even if backend fails
          console.warn("Affiliate stored locally, but backend sync failed")
        }
      }
    } catch (err) {
      console.error("Error adding affiliate:", err)
      // Keep local affiliate even if sync fails
      console.warn("Affiliate stored locally, sync error:", err)
    }
  }, [])

  const updateAffiliateStatus = useCallback(async (id: string, status: Affiliate["status"]) => {
    try {
      const previousAffiliates = affiliates
      // Optimistically update
      setAffiliates(prev => {
        return prev.map(a => {
          if (a.id === id) {
            const referralCode = status === "active" && !a.referralCode ? generateReferralCode() : a.referralCode
            return { ...a, status, referralCode }
          }
          return a
        })
      })
      
      // Call backend
      const res = await apiFetch(apiPath(`/affiliate/${id}`), {
        method: "PUT",
        headers: authHeaders(undefined, true),
        body: JSON.stringify({ status })
      })
      
      if (!res.ok) {
        console.error("Failed to update affiliate status")
        // Revert on error
        setAffiliates(previousAffiliates)
      } else {
        setHasLiveUpdates(true)
      }
    } catch (err) {
      console.error("Error updating affiliate status:", err)
    }
  }, [affiliates, generateReferralCode])

  const toggleCustomerBan = useCallback(async (id: string, isBanned: boolean, reason?: string) => {
    const previousCustomers = customers
    const endpoint = isBanned ? `/admin/users/${id}/ban` : `/admin/users/${id}/unban`

    // Optimistic update
    setCustomers(prev => prev.map(customer => customer.id === id ? { ...customer, isBanned } : customer))

    try {
      const res = await apiFetch(apiPath(endpoint), {
        method: "PUT",
        headers: authHeaders(undefined, true),
        body: isBanned ? JSON.stringify({ reason }) : undefined
      })

      if (!res.ok) {
        // Revert optimistic change on any failure
        setCustomers(previousCustomers)
        // Provide a clearer error for auth failures
        if (res.status === 401 || res.status === 403) {
          throw new Error('Unauthorized: admin credentials are required')
        }
        throw new Error(`Failed to ${isBanned ? "ban" : "unban"} customer`)
      }

      setHasLiveUpdates(true)
    } catch (err) {
      console.error("Error updating customer ban state:", err)
      setCustomers(previousCustomers)
      throw err
    }
  }, [customers])

  const deleteCustomer = useCallback(async (id: string) => {
    const previousCustomers = customers
    setCustomers(prev => prev.filter(c => c.id !== id))
    try {
      const res = await apiFetch(apiPath(`/admin/users/${id}`), {
        method: 'DELETE',
        headers: authHeaders(undefined, true)
      })
      if (!res.ok) {
        setCustomers(previousCustomers)
        throw new Error('Failed to delete customer')
      }
      setHasLiveUpdates(true)
      setHasNewCustomers(prev => prev) // keep flag handling elsewhere
    } catch (err) {
      console.error('Error deleting customer:', err)
      setCustomers(previousCustomers)
      throw err
    }
  }, [customers])

  const updateAffiliateCommissionRate = useCallback(async (id: string, commissionRate: number) => {
    try {
      const previousAffiliates = affiliates
      // Optimistically update
      setAffiliates(prev => prev.map(a => a.id === id ? { ...a, commissionRate } : a))
      
      // Call backend
      const res = await apiFetch(apiPath(`/affiliate/${id}`), {
        method: "PUT",
        headers: authHeaders(undefined, true),
        body: JSON.stringify({ commissionRate })
      })
      
      if (!res.ok) {
        console.error("Failed to update affiliate commission rate")
        // Revert on error
        setAffiliates(previousAffiliates)
      } else {
        const updatedAffiliate = await res.json().catch(() => null)
        if (updatedAffiliate) {
          setAffiliates(prev => prev.map(a => a.id === id ? mapBackendAffiliate(updatedAffiliate) : a))
        }
      }
    } catch (err) {
      console.error("Error updating affiliate commission rate:", err)
    }
  }, [affiliates])

  const updateAffiliate = useCallback(async (id: string, updates: Partial<Affiliate>) => {
    try {
      const previousAffiliates = affiliates
      // Optimistically update
      setAffiliates(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
      
      // Call backend
      const res = await apiFetch(apiPath(`/affiliate/me/update`), {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(updates)
      })
      
      if (!res.ok) {
        const errorBody = await res.text().catch(() => "<no body>")
        console.error("Failed to update affiliate", { status: res.status, statusText: res.statusText, body: errorBody })
        // Revert on error
        setAffiliates(previousAffiliates)
      }
    } catch (err) {
      console.error("Error updating affiliate:", err)
    }
  }, [affiliates])

  useEffect(() => {
    // Keep affiliates in-memory and source authoritative state from backend.
  }, [affiliates])

  const getAffiliateByEmail = useCallback((email: string): Affiliate | undefined => {
    return affiliates.find(a => a.email.toLowerCase() === email.toLowerCase())
  }, [affiliates])

  const getAffiliateByUserId = useCallback((userId: string): Affiliate | undefined => {
    return affiliates.find(a => a.userId === userId)
  }, [affiliates])

  const getAffiliateByReferralCode = useCallback((code: string): Affiliate | undefined => {
    return affiliates.find(a => a.referralCode === code)
  }, [affiliates])

  // Calculate total products purchased by referrals (for a given referral code)
  const calculateReferralPurchases = useCallback((referralCode: string): number => {
    // Get all orders from customers with this referral code
    const customerEmails = customers
      .filter(c => c.referralCode === referralCode)
      .map(c => c.email.toLowerCase())
    
    let totalProducts = 0
    orders.forEach(order => {
      if (customerEmails.includes(order.customerEmail.toLowerCase()) && order.status === "completed") {
        const orderTotal = order.products.reduce((sum, product) => sum + (product.quantity || 1), 0)
        totalProducts += orderTotal
      }
    })
    
    return totalProducts
  }, [orders, customers])

  // Computed values - show all accounts, not just in-stock ones
  const accounts = products.map(productToAccount)
  const testimonials = reviews.filter(r => r.status === "approved").map(reviewToTestimonial)
  const stats = calculateStats(orders, reviews)
  // Server-Sent Events (SSE) client for real-time updates (orders, tickets/messages)
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const es = new EventSource(apiPath('/events'))
      es.onmessage = (e) => {
        try {
          const evt = JSON.parse(e.data)
          if (!evt || !evt.type) return
          const action = evt.action
          if (evt.type === 'order') {
            setHasLiveUpdates(true)
            setHasNewOrders(true)
            const ord = evt.data
            if (ord && ord.id) {
              if (action === 'deleted') {
                setOrders(prev => prev.filter(o => o.id !== ord.id))
                return
              }
              try {
                const mapped = mapBackendOrder(ord)
                setOrders(prev => {
                  const exists = prev.some(o => o.id === mapped.id)
                  if (exists) return prev.map(o => o.id === mapped.id ? mapped : o)
                  return [mapped, ...prev]
                })
              } catch (err) {
                // ignore mapping errors
              }
            }
          } else if (evt.type === 'ticket') {
            setHasLiveUpdates(true)
            setHasOpenTickets(true)
            const t = evt.data
            if (t && t.id) {
              if (action === 'deleted') {
                setTickets(prev => prev.filter(tt => tt.id !== t.id))
                return
              }
              try {
                const mapped = mapBackendTicket(t)
                setTickets(prev => {
                  const exists = prev.some(tt => tt.id === mapped.id)
                  if (exists) return sortTicketsByLatestMessage(prev.map(tt => tt.id === mapped.id ? mapped : tt))
                  return sortTicketsByLatestMessage([mapped, ...prev])
                })
              } catch (err) {
                // ignore mapping errors
              }
            }
          } else if (evt.type === 'product') {
            setHasLiveUpdates(true)
            const productData = evt.data
            if (productData && productData.id) {
              if (action === 'deleted') {
                setProducts(prev => prev.filter(product => product.id !== productData.id))
                return
              }
              try {
                const mapped = mapBackendProduct(productData)
                setProducts(prev => {
                  const exists = prev.some(product => product.id === mapped.id)
                  if (exists) return prev.map(product => product.id === mapped.id ? mapped : product)
                  return [mapped, ...prev]
                })
              } catch (err) {
                // ignore mapping errors
              }
            }
          } else if (evt.type === 'review') {
            setHasLiveUpdates(true)
            const reviewData = evt.data
            if (reviewData && reviewData.id) {
              if (action === 'deleted') {
                setReviews(prev => prev.filter(review => review.id !== reviewData.id))
                return
              }
              try {
                const mapped = mapBackendReview(reviewData)
                setReviews(prev => {
                  const exists = prev.some(review => review.id === mapped.id)
                  if (exists) return prev.map(review => review.id === mapped.id ? mapped : review)
                  return [mapped, ...prev]
                })
              } catch (err) {
                // ignore mapping errors
              }
            }
          } else if (evt.type === 'subscriber') {
            setHasLiveUpdates(true)
            const subscriberData = evt.data
            if (subscriberData && subscriberData.id) {
              if (action === 'deleted') {
                setSubscribers(prev => prev.filter(subscriber => subscriber.id !== subscriberData.id))
                return
              }
              try {
                const mapped = mapBackendSubscriber(subscriberData)
                setSubscribers(prev => {
                  const exists = prev.some(subscriber => subscriber.id === mapped.id)
                  if (exists) return prev.map(subscriber => subscriber.id === mapped.id ? mapped : subscriber)
                  return [mapped, ...prev]
                })
              } catch (err) {
                // ignore mapping errors
              }
            }
          } else if (evt.type === 'affiliate') {
            setHasLiveUpdates(true)
            const affiliateData = evt.data
            if (affiliateData && affiliateData.id) {
              try {
                const mapped = mapBackendAffiliate(affiliateData)
                setAffiliates(prev => {
                  const exists = prev.some(affiliate => affiliate.id === mapped.id)
                  if (exists) return prev.map(affiliate => affiliate.id === mapped.id ? mapped : affiliate)
                  return [mapped, ...prev]
                })
              } catch (err) {
                // ignore mapping errors
              }
            }
          }
        } catch (err) {
          console.warn('Failed to parse SSE message', err)
        }
      }
      es.onerror = (err) => {
        console.warn('SSE connection error', err)
        try { es.close() } catch (e) {}
      }
      return () => { try { es.close() } catch (e) {} }
    } catch (err) {
      console.warn('Failed to initialize EventSource', err)
    }
  }, [])

  return (
    <StoreDataContext.Provider value={{
      products,
      accounts,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleProductStock,
      orders,
      addOrder,
      updateOrderStatus,
      updateOrder,
      updateOrderProductDelivery,
      reviews,
      testimonials,
      addReview,
      updateReview,
      deleteReview,
      approveReview,
      rejectReview,
      customers,
      setCustomers,
      addCustomer,
      addOrUpdateCustomer,
      getCustomerByEmail,
      toggleCustomerBan,
      tickets,
      refreshTickets,
      addTicket,
      addTicketReply,
      markTicketAsOpened,
      updateTicketStatus,
      reopenTicket,
      deleteTicket,
      deleteCustomer,
      getTicketsByEmail,
      getTicketsByUserId,
      subscribers,
      setSubscribers,
      addSubscriber,
      deleteSubscriber,
      affiliates,
      setAffiliates,
      addAffiliate,
      updateAffiliate,
      updateAffiliateStatus,
      updateAffiliateCommissionRate,
      getAffiliateByEmail,
      getAffiliateByUserId,
      getAffiliateByReferralCode,
      calculateReferralPurchases,
      stats,
      isLoaded,
      hasLiveUpdates,
      refreshStoreData: refreshStoreData as () => Promise<void>,

      // Notification flags
      hasNewOrders,
      hasNewCustomers,
      hasOpenTickets,
      hasNewReviews,
      hasNewSubscribers,
      clearNewOrders,
      clearNewCustomers,
      clearOpenTickets,
      clearNewReviews,
      clearNewSubscribers,
    }}>
      {children}
    </StoreDataContext.Provider>
  )
}

export function useStoreData() {
  const context = useContext(StoreDataContext)
  if (!context) {
    throw new Error("useStoreData must be used within a StoreDataProvider")
  }
  return context
}
