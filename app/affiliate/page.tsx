"use client"

import { useState, useEffect, useMemo, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, TrendingUp, Gift, CheckCircle, ArrowRight, Copy, ShoppingBag, CreditCard, Bitcoin, ChevronDown } from "lucide-react"
import { useUserAuth } from "@/lib/user-auth-context"
import { useStoreData, TIER_SYSTEM } from "@/lib/store-data-context"
import { useStoreSettings } from "@/lib/store-settings-context"
import { usePendingAction } from "@/lib/pending-action-context"
import { apiPath, authHeaders, apiFetch } from "@/lib/api"
import type { Affiliate } from "@/lib/types"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AffiliateFormData {
  fullName: string
  email: string
  isContentCreator: boolean
  platforms: {
    instagram: boolean
    tiktok: boolean
    youtube: boolean
    twitter: boolean
    twitch: boolean
    other: boolean
  }
  otherPlatforms: string
}

function normalizeAffiliateStatus(status?: string) {
  if (!status) return "pending"

  const normalized = status.toLowerCase()
  if (normalized === "accepted" || normalized === "active") return "active"
  if (normalized === "pending" || normalized === "submitted") return "pending"
  if (normalized === "rejected") return "rejected"
  if (normalized === "suspended") return "suspended"

  return normalized as "active" | "pending" | "suspended" | "rejected"
}

function normalizeAffiliateCommissionRate(rate?: number | string): number {
  const parsedRate = Number(rate ?? 20)
  if (Number.isNaN(parsedRate)) return 20
  return parsedRate > 0 && parsedRate < 1 ? parsedRate * 100 : parsedRate
}

function getNextTierCommissionGoal(nextTierGoal: number | null): number {
  if (nextTierGoal === 10) return 25
  if (nextTierGoal === 25) return 30
  if (nextTierGoal === 50) return 35
  if (nextTierGoal === 100) return 40
  return 40
}

function formatCommissionRate(rate: number): string {
  const rounded = Math.round(rate * 100) / 100
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2)
}

function AffiliatePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, redirectToLogin, isLoading } = useUserAuth()
  const { affiliates, addAffiliate, getAffiliateByEmail, getAffiliateByUserId, updateAffiliate, setAffiliates } = useStoreData()
  const { settings } = useStoreSettings()

  const [resolvedAffiliate, setResolvedAffiliate] = useState<Affiliate | undefined>(undefined)
  const affiliate = useMemo(() => {
    if (!user || !isAuthenticated) return undefined

    const foundAffiliate = getAffiliateByUserId(user.id) ?? getAffiliateByEmail(user.email)
    if (foundAffiliate) {
      return {
        ...foundAffiliate,
        status: normalizeAffiliateStatus(foundAffiliate.status)
      }
    }

    return resolvedAffiliate ? {
      ...resolvedAffiliate,
      status: normalizeAffiliateStatus(resolvedAffiliate.status)
    } : undefined
  }, [resolvedAffiliate, user?.id, user?.email, isAuthenticated, affiliates, getAffiliateByEmail, getAffiliateByUserId])

  const [submitted, setSubmitted] = useState(searchParams.get("submitted") === "true")
  const [copied, setCopied] = useState(false)
  const [pendingAffiliateSubmit, setPendingAffiliateSubmit] = useState(false)
  const [isReapplying, setIsReapplying] = useState(false)
  const [hasScrolledToPending, setHasScrolledToPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const pendingSectionRef = useRef<HTMLDivElement>(null)
  const { pendingAction, savePendingAction, clearPendingAction } = usePendingAction()
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentType, setPaymentType] = useState<"paypal" | "crypto" | "">(affiliate?.paymentMethod?.type || "")
  const [paypalLink, setPaypalLink] = useState(affiliate?.paymentMethod?.paypalLink || "")
  const [selectedCrypto, setSelectedCrypto] = useState("")
  const [selectedNetwork, setSelectedNetwork] = useState("")
  const [walletAddress, setWalletAddress] = useState(affiliate?.paymentMethod?.cryptoData?.walletAddress || "")
  const [formData, setFormData] = useState<AffiliateFormData>({
    fullName: "",
    email: "",
    isContentCreator: false,
    platforms: {
      instagram: false,
      tiktok: false,
      youtube: false,
      twitter: false,
      twitch: false,
      other: false
    },
    otherPlatforms: ""
  })

  useEffect(() => {
    let isActive = true

    const loadAffiliateFromBackend = async () => {
      if (typeof window === "undefined" || !user || !isAuthenticated || isLoading) return

      try {
        const response = await apiFetch(apiPath("/affiliate/me"), {
          headers: authHeaders()
        })

        if (!isActive) return

        if (response.ok) {
          const data = await response.json()
          const mappedAffiliate: Affiliate = {
            id: data.userId ?? data.id ?? user.id,
            userId: data.userId ?? data.id ?? user.id,
            name: data.user?.name ?? user.name ?? "",
            email: data.user?.email ?? user.email ?? "",
            referralCode: data.affiliateCode ?? data.referralCode ?? "",
            commissionRate: normalizeAffiliateCommissionRate(data.commissionRate),
            commissionRateAutoUpgradeEnabled: data.commissionRateAutoUpgradeEnabled !== false,
            status: normalizeAffiliateStatus(data.status),
            joinDate: data.createdAt ?? new Date().toISOString(),
            totalReferrals: Number(data.totalReferrals ?? 0),
            totalSales: Number(data.totalSales ?? 0),
            totalProductsByReferrals: Number(data.totalProductsByReferrals ?? 0),
            totalSpentByReferrals: Number(data.totalSpentByReferrals ?? 0),
            totalEarnings: Number(data.totalEarnings ?? 0),
            totalReferralPurchases: Number(data.totalReferralPurchases ?? 0),
            lastActive: data.updatedAt ?? data.createdAt ?? new Date().toISOString(),
            currentTier: Number(data.currentTier ?? 0),
            nextTierGoal: data.nextTierGoal === null ? null : Number(data.nextTierGoal ?? 10),
            socialMediaPlatforms: Array.isArray(data.socialMediaPlatforms) ? data.socialMediaPlatforms : [],
            isContentCreator: Boolean(data.isContentCreator ?? false),
            paymentMethod: (() => {
              if (!data.payoutMethod || typeof data.payoutMethod !== "string") return undefined
              const payoutMethod = data.payoutMethod.trim()
              const payoutAddress = typeof data.payoutAddress === "string" ? data.payoutAddress.trim() : ""
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
            referralHistory: [],
            payoutHistory: []
          }

          setResolvedAffiliate(mappedAffiliate)
          setAffiliates(prev => [mappedAffiliate, ...prev.filter(a => a.id !== mappedAffiliate.id)])
        } else if (response.status === 404) {
          setResolvedAffiliate(undefined)
        }
      } catch (err) {
        console.warn("Failed to load affiliate from backend:", err)
      }
    }

    loadAffiliateFromBackend()

    return () => {
      isActive = false
    }
  }, [user?.id, isAuthenticated, isLoading])

  // Check affiliate status from store data
  useEffect(() => {
    if (user && isAuthenticated) {
      // Pre-fill form with user data
      setFormData(prev => ({
        ...prev,
        fullName: user.name || "",
        email: user.email || ""
      }))

      // If affiliate is suspended or rejected, pre-fill their previous data
      if (affiliate && (affiliate.status === "suspended" || affiliate.status === "rejected")) {
        const platformMap: Record<string, keyof typeof formData.platforms> = {
          "instagram": "instagram",
          "tiktok": "tiktok",
          "youtube": "youtube",
          "twitter/x": "twitter",
          "twitter": "twitter",
          "twitch": "twitch"
        }
        
        const newPlatforms = { instagram: false, tiktok: false, youtube: false, twitter: false, twitch: false, other: false }
        let otherPlatforms = ""
        
        if (affiliate.socialMediaPlatforms && Array.isArray(affiliate.socialMediaPlatforms)) {
          affiliate.socialMediaPlatforms.forEach((platform: string) => {
            const normalized = platform.toLowerCase()
            const mapped = platformMap[normalized]
            if (mapped) {
              newPlatforms[mapped] = true
            } else if (normalized !== "instagram" && normalized !== "tiktok" && normalized !== "youtube" && normalized !== "twitter" && normalized !== "twitch") {
              newPlatforms.other = true
              otherPlatforms = platform
            }
          })
        }
        
        setFormData(prev => ({
          ...prev,
          fullName: affiliate.name || user.name || "",
          email: affiliate.email || user.email || "",
          isContentCreator: affiliate.isContentCreator || false,
          platforms: newPlatforms,
          otherPlatforms: otherPlatforms
        }))
        setIsReapplying(true)
      }

      if (pendingAction?.type === "affiliate" && pendingAction.data && !pendingAffiliateSubmit) {
        const parsed = pendingAction.data
        setFormData({
          ...parsed,
          fullName: user.name || parsed.fullName,
          email: user.email || parsed.email
        })
        // Mark for auto-submit
        setPendingAffiliateSubmit(true)
      }
    }
  }, [user, isAuthenticated, pendingAffiliateSubmit, affiliate?.status, pendingAction])

  useEffect(() => {
    if (!affiliate) return

    if (affiliate.status !== "suspended" && affiliate.status !== "rejected") {
      setIsReapplying(false)
    }
  }, [affiliate?.status])

  useEffect(() => {
    if (pendingSectionRef.current && (submitted || affiliate?.status === "pending" || affiliate?.status === "suspended" || affiliate?.status === "rejected") && !hasScrolledToPending) {
      pendingSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
      setHasScrolledToPending(true)
    }
  }, [affiliate?.status, submitted, hasScrolledToPending])

  // Auto-submit affiliate form if returning from login with pending form data
  useEffect(() => {
    if (pendingAffiliateSubmit && isAuthenticated && user && formData.fullName && formData.email) {
      const selectedPlatforms = Object.entries(formData.platforms)
        .filter(([_, selected]) => selected)
        .map(([platform]) => {
          if (platform === 'instagram') return 'Instagram'
          if (platform === 'tiktok') return 'TikTok'
          if (platform === 'youtube') return 'YouTube'
          if (platform === 'twitter') return 'Twitter/X'
          if (platform === 'twitch') return 'Twitch'
          if (platform === 'other') return formData.otherPlatforms
          return platform
        })
        .filter(p => p)
      
      // Auto-submit the affiliate form
      addAffiliate({
        name: formData.fullName,
        email: formData.email,
        userId: user.id,
        status: "pending",
        commissionRate: 20,
        socialMediaPlatforms: selectedPlatforms
      })
      
      setSubmitted(true)
      setPendingAffiliateSubmit(false)
      toast.success("Application submitted successfully!")
    }
  }, [pendingAffiliateSubmit, isAuthenticated, user, formData, addAffiliate])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    
    if (type === "checkbox" && name.includes("platforms.")) {
      const platformName = name.replace("platforms.", "") as keyof typeof formData.platforms
      setFormData(prev => ({
        ...prev,
        platforms: {
          ...prev.platforms,
          [platformName]: checked
        }
      }))
    } else if (name === "isContentCreator") {
      setFormData(prev => ({
        ...prev,
        isContentCreator: checked
      }))
    } else if (name === "otherPlatforms") {
      setFormData(prev => ({
        ...prev,
        otherPlatforms: value
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("handleSubmit called, isAuthenticated:", isAuthenticated, "affiliate status:", affiliate?.status)
    
    // If not logged in, redirect to login with email
    if (!isAuthenticated) {
      savePendingAction({ type: 'affiliate', data: formData, targetPage: '/affiliate' })
      router.push(`/login?email=${encodeURIComponent(formData.email)}`)
      return
    }
    
    // If logged in, submit the form and save to store
    if (user) {
      try {
        console.log("Submitting affiliate form with data:", formData)
        
        // Collect selected platforms
        const selectedPlatforms = Object.entries(formData.platforms)
          .filter(([_, selected]) => selected)
          .map(([platform]) => {
            if (platform === 'instagram') return 'Instagram'
            if (platform === 'tiktok') return 'TikTok'
            if (platform === 'youtube') return 'YouTube'
            if (platform === 'twitter') return 'Twitter/X'
            if (platform === 'twitch') return 'Twitch'
            if (platform === 'other') return formData.otherPlatforms
            return platform
          })
          .filter(p => p) // Remove empty strings
        
        console.log("Selected platforms:", selectedPlatforms)
        
        addAffiliate({
          name: formData.fullName,
          email: formData.email,
          userId: user.id,
          status: "pending",
          commissionRate: 20, // Default 20%
          socialMediaPlatforms: selectedPlatforms,
          isContentCreator: formData.isContentCreator
        })
        
        setSubmitted(true)
        toast.success("Application submitted successfully!")
      } catch (err) {
        console.error("Error submitting affiliate form:", err)
        toast.error(`Failed to submit application: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
  }

  const copyReferralLink = () => {
    if (affiliate?.referralCode) {
      const link = `${window.location.origin}?ref=${affiliate.referralCode}`
      navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success("Referral link copied!")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSavePaymentMethod = () => {
    if (!affiliate || !paymentType) {
      toast.error("Please select a payment method")
      return
    }

    if (paymentType === "paypal") {
      if (!paypalLink.trim()) {
        toast.error("Please enter your PayPal link")
        return
      }
      updateAffiliate(affiliate.id, {
        paymentMethod: {
          type: "paypal",
          paypalLink: paypalLink.trim()
        }
      })
    } else if (paymentType === "crypto") {
      if (!selectedCrypto || !selectedNetwork || !walletAddress.trim()) {
        toast.error("Please fill in all crypto payment details")
        return
      }
      updateAffiliate(affiliate.id, {
        paymentMethod: {
          type: "crypto",
          cryptoData: {
            coin: selectedCrypto,
            network: selectedNetwork,
            walletAddress: walletAddress.trim()
          }
        }
      })
    }

    toast.success("Payment method saved successfully!")
    setPaymentDialogOpen(false)
  }

  const benefits = [
    {
      icon: DollarSign,
      title: "+20% Commission",
      description: "Earn +20% minimum on every sale you refer. No caps, no limits."
    },
    {
      icon: Users,
      title: "Lifetime Referrals",
      description: "Once someone uses your link, they're tied to you forever."
    },
    {
      icon: TrendingUp,
      title: "Real-Time Tracking",
      description: "Monitor your clicks, conversions, and earnings live."
    },
    {
      icon: Gift,
      title: "Exclusive Bonuses",
      description: "Top affiliates get access to special deals and higher rates."
    }
  ]

  const displayCommissionRate = normalizeAffiliateCommissionRate(affiliate?.commissionRate)
  const nextTierCommission = affiliate?.nextTierGoal === null
    ? displayCommissionRate
    : getNextTierCommissionGoal(affiliate?.nextTierGoal ?? 10)
  const autoUpgradeEnabled = affiliate?.commissionRateAutoUpgradeEnabled !== false
  const canShowMaxTier = affiliate?.nextTierGoal === null && autoUpgradeEnabled

  // Use totalEarnings directly from affiliate object (already calculated and stored)
  // Do NOT recalculate based on current commission rate as it changes past earnings
  const totalEarnings = affiliate?.totalEarnings || 0

  // Render affiliate dashboard if accepted
  if (affiliate?.status === "active") {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        
        <main>
          {/* Dashboard Header */}
          <section className="bg-black text-white py-12">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-2 text-[#25F4EE] text-sm font-medium mb-2">
                <CheckCircle className="w-4 h-4" />
                <span>Active Affiliate</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Welcome back, {affiliate.name}!
              </h1>
              <p className="text-gray-400 max-w-2xl">
                You&apos;re earning {formatCommissionRate(displayCommissionRate)}% commission on every sale. Share your link and start earning!
              </p>
            </div>
          </section>

          {/* Referral Link */}
          <section className="py-8 border-b">
            <div className="container mx-auto px-4">
              <div className="bg-gradient-to-r from-[#FE2C55]/10 to-[#25F4EE]/10 rounded-2xl p-6">
                <h2 className="font-bold text-lg mb-3">Your Referral Link</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 bg-white rounded-xl p-4 border-2 border-dashed border-gray-200 font-mono text-sm break-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}?ref=${affiliate.referralCode}` : `https://yoursite.com?ref=${affiliate.referralCode}`}
                  </div>
                  <Button 
                    onClick={copyReferralLink}
                    className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full px-6"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? "Copied!" : "Copy Link"}
                  </Button>
                </div>
                <p className="text-gray-500 text-sm mt-3">
                  Share this link on social media, your website, or directly with friends!
                </p>
              </div>
            </div>
          </section>

          {/* Stats Dashboard */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">Your Stats</h2>
              
              {/* Commission Banner */}
              <div className="bg-gradient-to-r from-[#FE2C55]/10 to-pink-500/10 border border-[#FE2C55]/30 rounded-2xl p-4 mb-6 flex gap-3">
                {canShowMaxTier ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Maximum Tier Reached! You earn {formatCommissionRate(displayCommissionRate)}% on all referral sales</p>
                      <p className="text-sm text-gray-700">You've reached the highest commission tier. Keep growing your referral network!</p>
                    </div>
                  </>
                ) : autoUpgradeEnabled ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-[#FE2C55] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Earn {formatCommissionRate(displayCommissionRate)}% on every referral sale</p>
                      <p className="text-sm text-gray-700">
                        Reach {affiliate.nextTierGoal} referral purchases to unlock {formatCommissionRate(nextTierCommission)}% commission!
                        ({(affiliate.totalReferralPurchases || 0)}/{affiliate.nextTierGoal})
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Your commission rate is locked at {formatCommissionRate(displayCommissionRate)}%</p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Referrals Joined
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{affiliate.totalReferrals || 0}</p>
                    <p className="text-xs text-gray-500">People who signed up with your link</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      Total Sales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{affiliate.totalReferralPurchases || 0}</p>
                    <p className="text-xs text-gray-500">Products purchased by your referrals</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Revenue Generated
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">${(affiliate.totalSpentByReferrals || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total spent by your referrals</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#FE2C55] to-[#FE2C55]/80 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Your Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">${totalEarnings.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Payment Method Section */}
          <section className="py-8 border-b bg-gray-50">
            <div className="container mx-auto px-4">
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FE2C55]/10 rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-[#FE2C55]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Payment Method</h3>
                      <p className="text-sm text-gray-500">Set how you&apos;ll receive your commission payouts</p>
                    </div>
                  </div>
                </div>

                {affiliate?.paymentMethod ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-[#FE2C55]/5 to-transparent rounded-xl border border-[#FE2C55]/20">
                      <p className="text-sm text-gray-600 mb-1">Current Payment Method</p>
                      {affiliate.paymentMethod.type === "paypal" ? (
                        <p className="font-semibold text-gray-900">PayPal: {affiliate.paymentMethod.paypalLink}</p>
                      ) : (
                        <p className="font-semibold text-gray-900">
                          {affiliate.paymentMethod.cryptoData?.coin} ({affiliate.paymentMethod.cryptoData?.network})
                        </p>
                      )}
                    </div>
                    <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full"
                          onClick={() => {
                            setPaymentType(affiliate.paymentMethod?.type || "")
                            setPaypalLink(affiliate.paymentMethod?.paypalLink || "")
                            if (affiliate.paymentMethod?.cryptoData) {
                              setSelectedCrypto(affiliate.paymentMethod.cryptoData.coin)
                              setSelectedNetwork(affiliate.paymentMethod.cryptoData.network)
                              setWalletAddress(affiliate.paymentMethod.cryptoData.walletAddress)
                            }
                          }}
                        >
                          Change Payment Method
                        </Button>
                      </DialogTrigger>
                      <PaymentMethodDialog
                        paymentType={paymentType}
                        setPaymentType={setPaymentType}
                        paypalLink={paypalLink}
                        setPaypalLink={setPaypalLink}
                        selectedCrypto={selectedCrypto}
                        setSelectedCrypto={setSelectedCrypto}
                        selectedNetwork={selectedNetwork}
                        setSelectedNetwork={setSelectedNetwork}
                        walletAddress={walletAddress}
                        setWalletAddress={setWalletAddress}
                        onSave={handleSavePaymentMethod}
                        settings={settings}
                      />
                    </Dialog>
                  </div>
                ) : (
                  <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full"
                        size="lg"
                      >
                        <CreditCard className="w-5 h-5 mr-2" />
                        Add Payment Method
                      </Button>
                    </DialogTrigger>
                    <PaymentMethodDialog
                      paymentType={paymentType}
                      setPaymentType={setPaymentType}
                      paypalLink={paypalLink}
                      setPaypalLink={setPaypalLink}
                      selectedCrypto={selectedCrypto}
                      setSelectedCrypto={setSelectedCrypto}
                      selectedNetwork={selectedNetwork}
                      setSelectedNetwork={setSelectedNetwork}
                      walletAddress={walletAddress}
                      setWalletAddress={setWalletAddress}
                      onSave={handleSavePaymentMethod}
                      settings={settings}
                    />
                  </Dialog>
                )}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">Your Stats</h2>
              
              {/* Commission Banner */}
              <div className="bg-gradient-to-r from-[#FE2C55]/10 to-pink-500/10 border border-[#FE2C55]/30 rounded-2xl p-4 mb-6 flex gap-3">
                {canShowMaxTier ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Maximum Tier Reached! You earn {formatCommissionRate(displayCommissionRate)}% on all referral sales</p>
                      <p className="text-sm text-gray-700">You've reached the highest commission tier. Keep growing your referral network!</p>
                    </div>
                  </>
                ) : autoUpgradeEnabled ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-[#FE2C55] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Earn {formatCommissionRate(displayCommissionRate)}% on every referral sale</p>
                      <p className="text-sm text-gray-700">
                        Reach {affiliate.nextTierGoal} referral purchases to unlock {formatCommissionRate(nextTierCommission)}% commission!
                        ({(affiliate.totalReferralPurchases || 0)}/{affiliate.nextTierGoal})
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Your commission rate is locked at {formatCommissionRate(displayCommissionRate)}%</p>
                    </div>
                  </>
                )}
              </div>
              
              <div className="grid md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Referrals Joined
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{affiliate.totalReferrals || 0}</p>
                    <p className="text-xs text-gray-500">People who signed up with your link</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4" />
                      Total Sales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{affiliate.totalReferralPurchases || 0}</p>
                    <p className="text-xs text-gray-500">Products purchased by your referrals</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Revenue Generated
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">${(affiliate.totalSpentByReferrals || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total spent by your referrals</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-[#FE2C55] to-[#FE2C55]/80 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Your Earnings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">${totalEarnings.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-12 bg-gray-50">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">How Your Affiliate Works</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl p-6">
                  <div className="w-10 h-10 bg-[#FE2C55] rounded-full flex items-center justify-center text-white font-bold mb-4">3</div>
                  <h3 className="font-bold mb-2">Share & Earn</h3>
                  <p className="text-gray-600">Share your link on social media, blogs, or YouTube. Earn +20% on every sale.</p>
                </div>
                <div className="bg-white rounded-2xl p-6">
                  <div className="w-10 h-10 bg-[#FE2C55] rounded-full flex items-center justify-center text-white font-bold mb-4">2</div>
                  <h3 className="font-bold mb-2">They Sign Up & Buy</h3>
                  <p className="text-gray-600 text-sm">When someone clicks your link and creates an account, they become your referral forever. Any purchase they make earns you commission.</p>
                </div>
                <div className="bg-white rounded-2xl p-6">
                  <div className="w-10 h-10 bg-[#FE2C55] rounded-full flex items-center justify-center text-white font-bold mb-4">3</div>
                  <h3 className="font-bold mb-2">Get Paid</h3>
                  <p className="text-gray-600 text-sm">Earn {formatCommissionRate(displayCommissionRate)}% commission on every sale. Payouts are processed monthly via PayPal.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6">Your Benefits</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {benefits.map((benefit, index) => (
                  <div key={index} className="text-center">
                    <div className="w-14 h-14 bg-[#FE2C55]/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <benefit.icon className="w-7 h-7 text-[#FE2C55]" />
                    </div>
                    <h3 className="font-bold mb-1">{benefit.title}</h3>
                    <p className="text-gray-600 text-sm">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main>
        <section className="bg-black text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-[#FE2C55] text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Gift className="w-4 h-4" />
              <span>Partner Program</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Earn <span className="text-[#FE2C55]">+20%</span> On Every Sale
            </h1>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-8">
              Join our affiliate program and start earning passive income by referring customers to Monetized Accounts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <div className="bg-white/10 rounded-2xl px-6 py-4">
                <div className="text-3xl font-bold">$150+</div>
                <div className="text-gray-400 text-sm">Avg. Commission Per Sale</div>
              </div>
              <div className="bg-white/10 rounded-2xl px-6 py-4">
                <div className="text-3xl font-bold">30 Days</div>
                <div className="text-gray-400 text-sm">Cookie Duration</div>
              </div>
              <div className="bg-white/10 rounded-2xl px-6 py-4">
                <div className="text-3xl font-bold">Monthly</div>
                <div className="text-gray-400 text-sm">Payouts via PayPal</div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-12">
              Why Partner With Us?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-[#FE2C55]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="w-8 h-8 text-[#FE2C55]" />
                  </div>
                  <h3 className="text-xl font-bold text-black mb-2">{benefit.title}</h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-4">
                How It Works
              </h2>
              <p className="text-gray-600 text-center mb-12">
                Getting started is simple. Here&apos;s how to begin earning.
              </p>
              
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#FE2C55] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-black mb-1">Apply to Join</h3>
                    <p className="text-gray-600">Fill out the application form below. We review applications within 24 hours.</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#FE2C55] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-black mb-1">Get Your Link</h3>
                    <p className="text-gray-600">Once approved, you&apos;ll receive a unique affiliate link and access to marketing materials.</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl p-6 flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#FE2C55] rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-black mb-1">Share & Earn</h3>
                    <p className="text-gray-600">Share your link on social media, blogs, or YouTube. Earn 20% on every sale.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-20" ref={pendingSectionRef}>
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              {affiliate?.status === "pending" && submitted && !isReapplying ? (
                <div className="bg-[#25F4EE]/10 rounded-3xl p-8 text-center">
                  <CheckCircle className="w-16 h-16 text-[#25F4EE] mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-black mb-2">Application Pending</h2>
                  <p className="text-gray-600">
                    Thanks for applying! We&apos;re reviewing your application. You&apos;ll hear from us within 24 hours.
                  </p>
                  <p className="text-gray-500 text-sm mt-4">
                    Your referral code will be generated once your application is approved.
                  </p>
                </div>
              ) : affiliate?.status === "suspended" ? (
                <>
                  <div className="bg-amber-50 rounded-3xl p-8 text-center border-2 border-amber-200 mb-8">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-2xl font-bold text-black mb-2">Account Suspended</h2>
                    <p className="text-gray-600 mb-4">
                      Your affiliate account has been suspended. Please review and resubmit your application with updated information.
                    </p>
                    <p className="text-gray-500 text-sm">
                      Once resubmitted, our team will review your updated application within 24 hours.
                    </p>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-4">
                    Reapply Now
                  </h2>
                  <p className="text-gray-600 text-center mb-8">
                    Update your information and resubmit your application.
                  </p>
                  
                  <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 bg-gray-50 rounded-2xl p-6 sm:p-8">
                    {/* Form fields */}
                    <div>
                      <Label htmlFor="fullName" className="text-black font-semibold">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        className="rounded-lg mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-black font-semibold">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="rounded-lg mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-black font-semibold mb-3 block">Are you a content creator?</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="isContentCreator"
                            value="true"
                            checked={formData.isContentCreator === true}
                            onChange={() => setFormData(prev => ({ ...prev, isContentCreator: true }))}
                            className="mr-2"
                          />
                          <span className="text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="isContentCreator"
                            value="false"
                            checked={formData.isContentCreator === false}
                            onChange={() => setFormData(prev => ({ ...prev, isContentCreator: false }))}
                            className="mr-2"
                          />
                          <span className="text-gray-700">No</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label className="text-black font-semibold mb-3 block">Which platforms do you use to share links?</Label>
                      <div className="space-y-3">
                        {[
                          { id: "instagram", label: "Instagram" },
                          { id: "tiktok", label: "TikTok" },
                          { id: "youtube", label: "YouTube" },
                          { id: "twitter", label: "Twitter/X" },
                          { id: "twitch", label: "Twitch" },
                          { id: "other", label: "Other" }
                        ].map(platform => (
                          <label key={platform.id} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name={`platforms.${platform.id}`}
                              checked={formData.platforms[platform.id as keyof typeof formData.platforms]}
                              onChange={handleInputChange}
                              className="mr-3 w-4 h-4"
                            />
                            <span className="text-gray-700">{platform.label}</span>
                          </label>
                        ))}
                      </div>
                      
                      {formData.platforms.other && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <Label htmlFor="otherPlatforms" className="text-gray-700 font-medium">Please specify other platforms (e.g., Snapchat, Discord, Threads)</Label>
                          <Input
                            id="otherPlatforms"
                            name="otherPlatforms"
                            type="text"
                            placeholder="e.g., Snapchat, Discord, Threads"
                            value={formData.otherPlatforms}
                            onChange={handleInputChange}
                            className="rounded-lg mt-2"
                          />
                        </div>
                      )}
                    </div>

                    <Button 
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-full text-lg py-6 mt-6"
                    >
                      Resubmit Application
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </form>
                </>
              ) : affiliate?.status === "rejected" ? (
                <>
                  <div className="bg-red-50 rounded-3xl p-8 text-center border-2 border-red-200 mb-8">
                    <CheckCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-black mb-2">Application Declined</h2>
                    <p className="text-gray-600 mb-4">
                      Unfortunately, your application doesn&apos;t meet our current requirements.
                    </p>
                    <p className="text-gray-500 text-sm">
                      Please contact support if you have any questions or would like to reapply with updated information.
                    </p>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-4">
                    Reapply Now
                  </h2>
                  <p className="text-gray-600 text-center mb-8">
                    Update your information and resubmit your application.
                  </p>
                  
                  <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 rounded-2xl p-6 sm:p-8">
                    {/* Form fields */}
                    <div>
                      <Label htmlFor="fullName" className="text-black font-semibold">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        className="rounded-lg mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-black font-semibold">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="rounded-lg mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-black font-semibold mb-3 block">Are you a content creator?</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="isContentCreator"
                            value="true"
                            checked={formData.isContentCreator === true}
                            onChange={() => setFormData(prev => ({ ...prev, isContentCreator: true }))}
                            className="mr-2"
                          />
                          <span className="text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="isContentCreator"
                            value="false"
                            checked={formData.isContentCreator === false}
                            onChange={() => setFormData(prev => ({ ...prev, isContentCreator: false }))}
                            className="mr-2"
                          />
                          <span className="text-gray-700">No</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label className="text-black font-semibold mb-3 block">Which platforms do you use to share links?</Label>
                      <div className="space-y-3">
                        {[
                          { id: "instagram", label: "Instagram" },
                          { id: "tiktok", label: "TikTok" },
                          { id: "youtube", label: "YouTube" },
                          { id: "twitter", label: "Twitter/X" },
                          { id: "twitch", label: "Twitch" },
                          { id: "other", label: "Other" }
                        ].map(platform => (
                          <label key={platform.id} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name={`platforms.${platform.id}`}
                              checked={formData.platforms[platform.id as keyof typeof formData.platforms]}
                              onChange={handleInputChange}
                              className="mr-3 w-4 h-4"
                            />
                            <span className="text-gray-700">{platform.label}</span>
                          </label>
                        ))}
                      </div>
                      
                      {formData.platforms.other && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <Label htmlFor="otherPlatforms" className="text-gray-700 font-medium">Please specify other platforms (e.g., Snapchat, Discord, Threads)</Label>
                          <Input
                            id="otherPlatforms"
                            name="otherPlatforms"
                            type="text"
                            placeholder="e.g., Snapchat, Discord, Threads"
                            value={formData.otherPlatforms}
                            onChange={handleInputChange}
                            className="rounded-lg mt-2"
                          />
                        </div>
                      )}
                    </div>

                    <Button 
                      type="submit"
                      className="w-full bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full text-lg py-6 mt-6"
                    >
                      Resubmit Application
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-4">
                    Apply Now
                  </h2>
                  <p className="text-gray-600 text-center mb-8">
                    Ready to start earning? Fill out the form below to apply.
                  </p>
                  
                  <form onSubmit={handleSubmit} className="space-y-6 bg-gray-50 rounded-2xl p-6 sm:p-8">
                    {/* Full Name */}
                    <div>
                      <Label htmlFor="fullName" className="text-black font-semibold">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        className="rounded-lg mt-1"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <Label htmlFor="email" className="text-black font-semibold">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="rounded-lg mt-1"
                      />
                    </div>

                    {/* Content Creator */}
                    <div>
                      <Label className="text-black font-semibold mb-3 block">Are you a content creator?</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="isContentCreator"
                            value="true"
                            checked={formData.isContentCreator === true}
                            onChange={() => setFormData(prev => ({ ...prev, isContentCreator: true }))}
                            className="mr-2"
                          />
                          <span className="text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="isContentCreator"
                            value="false"
                            checked={formData.isContentCreator === false}
                            onChange={() => setFormData(prev => ({ ...prev, isContentCreator: false }))}
                            className="mr-2"
                          />
                          <span className="text-gray-700">No</span>
                        </label>
                      </div>
                    </div>

                    {/* Platforms */}
                    <div>
                      <Label className="text-black font-semibold mb-3 block">Which platforms do you use to share links?</Label>
                      <div className="space-y-3">
                        {[
                          { id: "instagram", label: "Instagram" },
                          { id: "tiktok", label: "TikTok" },
                          { id: "youtube", label: "YouTube" },
                          { id: "twitter", label: "Twitter/X" },
                          { id: "twitch", label: "Twitch" },
                          { id: "other", label: "Other" }
                        ].map(platform => (
                          <label key={platform.id} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name={`platforms.${platform.id}`}
                              checked={formData.platforms[platform.id as keyof typeof formData.platforms]}
                              onChange={handleInputChange}
                              className="mr-3 w-4 h-4"
                            />
                            <span className="text-gray-700">{platform.label}</span>
                          </label>
                        ))}
                      </div>
                      
                      {/* Custom platforms input - only show if "Other" is checked */}
                      {formData.platforms.other && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <Label htmlFor="otherPlatforms" className="text-gray-700 font-medium">Please specify other platforms (e.g., Snapchat, Discord, Threads)</Label>
                          <Input
                            id="otherPlatforms"
                            name="otherPlatforms"
                            type="text"
                            placeholder="e.g., Snapchat, Discord, Threads"
                            value={formData.otherPlatforms}
                            onChange={handleInputChange}
                            className="rounded-lg mt-2"
                          />
                        </div>
                      )}
                    </div>

                    <Button 
                      type="submit"
                      className="w-full bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full text-lg py-6 mt-6"
                    >
                      Apply to Become an Affiliate
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </form>
                  
                  <p className="text-gray-500 text-sm text-center mt-6">
                    By applying, you agree to our affiliate terms and conditions.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}

interface PaymentMethodDialogProps {
  paymentType: "paypal" | "crypto" | ""
  setPaymentType: (type: "paypal" | "crypto" | "") => void
  paypalLink: string
  setPaypalLink: (link: string) => void
  selectedCrypto: string
  setSelectedCrypto: (crypto: string) => void
  selectedNetwork: string
  setSelectedNetwork: (network: string) => void
  walletAddress: string
  setWalletAddress: (address: string) => void
  onSave: () => void
  settings: any
}

function PaymentMethodDialog({
  paymentType,
  setPaymentType,
  paypalLink,
  setPaypalLink,
  selectedCrypto,
  setSelectedCrypto,
  selectedNetwork,
  setSelectedNetwork,
  walletAddress,
  setWalletAddress,
  onSave,
  settings
}: PaymentMethodDialogProps) {
  const getNetworksForCrypto = () => {
    const crypto = settings.paymentSettings?.cryptoCurrencies.find((c: any) => c.name === selectedCrypto)
    return crypto?.networks || []
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Set Payment Method</DialogTitle>
        <DialogDescription>
          Choose how you want to receive your commission payouts
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold mb-3 block">Payment Type</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentType("paypal")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                paymentType === "paypal"
                  ? "border-[#FE2C55] bg-[#FE2C55]/10"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-semibold text-sm">PayPal</div>
            </button>
            <button
              onClick={() => setPaymentType("crypto")}
              className={`p-3 rounded-lg border-2 transition-colors ${
                paymentType === "crypto"
                  ? "border-[#FE2C55] bg-[#FE2C55]/10"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-semibold text-sm">Cryptocurrency</div>
            </button>
          </div>
        </div>

        {paymentType === "paypal" && (
          <div className="space-y-2">
            <Label htmlFor="paypal-link">PayPal Link</Label>
            <Input
              id="paypal-link"
              placeholder="e.g., paypal.me/yourname"
              value={paypalLink}
              onChange={(e) => setPaypalLink(e.target.value)}
              className="rounded-lg"
            />
            <p className="text-xs text-gray-500">Enter your PayPal.me link or email</p>
          </div>
        )}

        {paymentType === "crypto" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="crypto-select">Cryptocurrency</Label>
              <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                <SelectTrigger id="crypto-select" className="rounded-lg">
                  <SelectValue placeholder="Select cryptocurrency" />
                </SelectTrigger>
                <SelectContent>
                  {settings.paymentSettings?.cryptoCurrencies.map((crypto: any) => (
                    <SelectItem key={`${crypto.name}-${crypto.symbol}`} value={crypto.name}>
                      {crypto.name} ({crypto.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCrypto && (
              <div className="space-y-2">
                <Label htmlFor="network-select">Network</Label>
                <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                  <SelectTrigger id="network-select" className="rounded-lg">
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    {getNetworksForCrypto().map((network: any, index: number) => {
                      const networkKey = network.network || network.name || `network-${index}`
                      const networkValue = network.network || network.name || `network-${index}`
                      return (
                        <SelectItem key={`${selectedCrypto}-${networkKey}`} value={networkValue}>
                          {networkValue}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedNetwork && (
              <div className="space-y-2">
                <Label htmlFor="wallet-address">Wallet Address</Label>
                <Input
                  id="wallet-address"
                  placeholder="Enter your wallet address"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="rounded-lg font-mono text-sm"
                />
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={onSave}
          className="w-full bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-lg"
          disabled={!paymentType || (paymentType === "paypal" && !paypalLink) || (paymentType === "crypto" && (!selectedCrypto || !selectedNetwork || !walletAddress))}
        >
          Save Payment Method
        </Button>
      </div>
    </DialogContent>
  )
}

export default function AffiliatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <AffiliatePageContent />
    </Suspense>
  )
}
