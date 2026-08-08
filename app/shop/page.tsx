"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { formatPrice } from "@/lib/data"
import { formatFollowers } from "@/lib/utils"
import { apiPath } from "@/lib/api"
import { useCart } from "@/lib/cart-context"
import { useStoreSettings } from "@/lib/store-settings-context"
import { useUserAuth } from "@/lib/user-auth-context"
import { SHOP_TYPE_CARDS, getShopTypeIdForProductType, normalizeShopProductType } from "@/lib/shop-types"
import { Users, ShoppingCart, CheckCircle, AlertCircle, Heart } from "lucide-react"

function PlatformCardIcon({ platform }: { platform: string }) {
  if (platform === "YouTube") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" aria-label="YouTube" role="img">
        <rect x="2" y="4" width="20" height="16" rx="5" fill="#FF0000" />
        <path d="M10 9.5v5l5-2.5-5-2.5Z" fill="white" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 sm:h-5 sm:w-5" aria-label="TikTok" role="img">
      <path d="M15.4 3c.3 1.7 1.3 3.1 3.1 3.7v2.5c-1.2 0-2.4-.3-3.5-.9v7.2a4.9 4.9 0 1 1-4.9-4.9c.3 0 .6 0 .8.1v2.7a2.5 2.5 0 1 0 1.7 2.4V3h2.8Z" fill="white" />
    </svg>
  )
}

export default function ShopPage() {
  const [sortBy, setSortBy] = useState<string>("price-low")
  const [selectedShopType, setSelectedShopType] = useState<string | null>(null)
  const [regionFilter, setRegionFilter] = useState<string>("all")
  const [followersFilter, setFollowersFilter] = useState<string>("all")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  
  const { addToCart, items } = useCart()
  const { isAuthenticated, addToFavorites, removeFromFavorites, isFavorite, redirectToLogin } = useUserAuth()
  const { settings } = useStoreSettings()
  const cartItemIds = useMemo(() => new Set(items.map(item => item.account.id)), [items])
  const isInCart = (id: string) => cartItemIds.has(id)
  
  // Fetch products directly from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(apiPath('/products'))
        if (response.ok) {
          const data = await response.json()
          setProducts(Array.isArray(data) ? data : [])
        } else {
          setProducts([])
        }
      } catch (error) {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const handleAddToCart = async (account: any) => {
    setJustAdded(account.id)
    void addToCart(account)
    setTimeout(() => {
      setJustAdded(null)
    }, 1500)
  }

  const parseFollowersNum = (followersValue: unknown): number => {
    if (typeof followersValue === 'number' && Number.isFinite(followersValue)) {
      return followersValue
    }

    if (typeof followersValue !== 'string') {
      return 0
    }

    const raw = followersValue.trim().toLowerCase()

    if (!raw || raw === 'varies' || raw === 'varies+') {
      return 0
    }

    const numericValue = Number.parseFloat(raw)

    if (Number.isNaN(numericValue)) {
      return 0
    }

    if (raw.includes('m')) {
      return Math.round(numericValue * 1000000)
    }

    if (raw.includes('k')) {
      return Math.round(numericValue * 1000)
    }

    return Math.round(numericValue)
  }
  
  // Convert products to accounts format
  const accounts = useMemo(() => {
    return products
      .filter(p => p && p.id && !p.hidden)
      .map(p => {
        const verificationPrice = p.verificationPrice !== undefined
          ? Number(p.verificationPrice || 0)
          : p.hasVerificationFee
            ? 30
            : 0

        const normalizedType = normalizeShopProductType(p.type) || (p.type || "Unknown")

        return {
          id: p.id,
          platform: (p.platform || "TikTok") as "TikTok" | "YouTube",
          type: normalizedType as any,
          title: p.title || p.platform || "",
          followers: p.followers,
          followersNum: parseFollowersNum(p.followers),
          price: Number(p.price || 0),
          originalPrice: p.originalPrice !== undefined ? Number(p.originalPrice || 0) : undefined,
          badge: p.badge || "",
          badgeColor: p.platform === "TikTok" ? "bg-pink-600" : "bg-red-600",
          description: p.description || "",
          features: Array.isArray(p.features) ? p.features : [],
          verified: Number(verificationPrice) === 0,
          verificationPrice,
          transferTime: p.transferTime || "Instant",
          inStock: p.inStock ?? true
        }
      })
  }, [products])

  const shopTypeCards = useMemo(() => {
    return SHOP_TYPE_CARDS.map((shopType) => {
      const matchingAccounts = accounts.filter((account) => {
        return getShopTypeIdForProductType(account.type) === shopType.id
      })

      return {
        ...shopType,
        count: matchingAccounts.length
      }
    })
  }, [accounts])

  const selectedShopTypeCard = SHOP_TYPE_CARDS.find((shopType) => shopType.id === selectedShopType) ?? null

  const selectedTypeAccounts = useMemo(() => {
    if (!selectedShopType) {
      return []
    }

    return accounts.filter((account) => getShopTypeIdForProductType(account.type) === selectedShopType)
  }, [accounts, selectedShopType])

  const showRegionFilter = useMemo(() => {
    return selectedTypeAccounts.some((account) => account.region === "US" || account.region === "UK")
  }, [selectedTypeAccounts])

  const priceMin = useMemo(() => {
    if (!selectedTypeAccounts.length) {
      return 0
    }

    return Math.min(...selectedTypeAccounts.map((account) => account.price))
  }, [selectedTypeAccounts])

  const priceMax = useMemo(() => {
    if (!selectedTypeAccounts.length) {
      return 1000
    }

    return Math.max(...selectedTypeAccounts.map((account) => account.price))
  }, [selectedTypeAccounts])

  useEffect(() => {
    if (!selectedShopType) {
      return
    }

    setPriceRange([priceMin, priceMax])
  }, [selectedShopType, priceMin, priceMax])

  const filteredAccounts = useMemo(() => {
    let filtered = [...accounts]

    if (selectedShopType) {
      filtered = filtered.filter((account) => getShopTypeIdForProductType(account.type) === selectedShopType)
    }

    if (showRegionFilter && regionFilter !== "all") {
      filtered = filtered.filter((account) => account.region === regionFilter)
    }

    if (followersFilter !== "all") {
      filtered = filtered.filter((account) => {
        const followersNum = Number(account.followersNum || 0)

        if (followersFilter === "under-10k") {
          return followersNum < 10000
        }

        if (followersFilter === "10k-plus") {
          return followersNum >= 10000 && followersNum < 20000
        }

        if (followersFilter === "20k-plus") {
          return followersNum >= 20000 && followersNum < 30000
        }

        if (followersFilter === "30k-plus") {
          return followersNum >= 30000 && followersNum < 40000
        }

        if (followersFilter === "40k-plus") {
          return followersNum >= 40000 && followersNum < 50000
        }

        if (followersFilter === "50k-plus") {
          return followersNum >= 50000 && followersNum < 100000
        }

        if (followersFilter === "100k-plus") {
          return followersNum >= 100000
        }

        return true
      })
    }

    filtered = filtered.filter((account) => account.price >= priceRange[0] && account.price <= priceRange[1])

    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a, b) => b.price - a.price)
        break
      default:
        break
    }

    return filtered
  }, [accounts, selectedShopType, showRegionFilter, regionFilter, followersFilter, priceRange, sortBy])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main>
        <section className="bg-black text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
              Browse Accounts
            </h1>
            <p className="text-gray-400 text-lg text-center max-w-2xl mx-auto">
              TikTok accounts come unverified. Verification is available for a fee.
            </p>
          </div>
        </section>
        
        <section className="py-12">
          <div className="container mx-auto px-4">
            {selectedShopTypeCard ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <div className="mb-2">
                      <button
                        type="button"
                        className="text-sm font-semibold text-[#FE2C55] hover:text-[#c71a3d]"
                        onClick={() => {
                          setSelectedShopType(null)
                          setRegionFilter('all')
                          setFollowersFilter('all')
                          setSortBy('price-low')
                          setPriceRange([0, 1000])
                        }}
                      >
                        ← All Account Types
                      </button>
                    </div>
                    <h2 className="text-3xl font-bold text-black">{selectedShopTypeCard.title}</h2>
                    <p className="text-gray-500 mt-2">{selectedShopTypeCard.description}</p>
                  </div>
                  <span className="text-gray-500">{filteredAccounts.length} accounts available</span>
                </div>

                <section className="rounded-3xl border border-gray-200 bg-gray-50 p-4 mb-6">
                  <div className={`grid grid-cols-1 gap-4 ${showRegionFilter ? 'md:grid-cols-[minmax(170px,220px)_minmax(170px,230px)_minmax(170px,210px)_minmax(250px,1fr)]' : 'md:grid-cols-[minmax(170px,220px)_minmax(170px,230px)_minmax(250px,1fr)]'} md:items-end`}>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">
                        Price
                      </label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full rounded-full">
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="price-low">Low to High</SelectItem>
                          <SelectItem value="price-high">High to Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">
                        Followers
                      </label>
                      <Select value={followersFilter} onValueChange={setFollowersFilter}>
                        <SelectTrigger className="w-full rounded-full">
                          <SelectValue placeholder="Followers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Followers</SelectItem>
                          <SelectItem value="under-10k">Less than 10K</SelectItem>
                          <SelectItem value="10k-plus">+10K</SelectItem>
                          <SelectItem value="20k-plus">+20K</SelectItem>
                          <SelectItem value="30k-plus">+30K</SelectItem>
                          <SelectItem value="40k-plus">+40K</SelectItem>
                          <SelectItem value="50k-plus">+50K</SelectItem>
                          <SelectItem value="100k-plus">+100K</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {showRegionFilter && (
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-2">
                          Region
                        </label>
                        <Select value={regionFilter} onValueChange={setRegionFilter}>
                          <SelectTrigger className="w-full rounded-full">
                            <SelectValue placeholder="Region" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Regions</SelectItem>
                            <SelectItem value="US">US</SelectItem>
                            <SelectItem value="UK">UK</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-start gap-3 mb-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">
                          Price Range
                        </label>
                        <span className="text-[11px] font-semibold text-gray-600">
                          {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Slider
                          className="h-3 w-full max-w-52.5"
                          min={priceMin}
                          max={priceMax}
                          step={1}
                          value={priceRange}
                          onValueChange={(value) => {
                            const safeValues = value as number[]
                            const nextMin = Math.min(safeValues[0] ?? priceMin, safeValues[1] ?? priceMax)
                            const nextMax = Math.max(safeValues[1] ?? priceMax, safeValues[0] ?? priceMin)
                            setPriceRange([nextMin, nextMax])
                          }}
                        />
                        <button
                          type="button"
                          className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-black hover:text-white transition-colors shrink-0"
                          onClick={() => {
                            setSortBy('price-low')
                            setRegionFilter('all')
                            setFollowersFilter('all')
                            setPriceRange([priceMin, priceMax])
                          }}
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden hover:border-[#FE2C55] transition-all hover:shadow-xl group"
                    >
                      <div className="bg-black p-4 relative">
                        {account.badge && (
                          <Badge className={`${account.badgeColor} absolute top-3 right-3`}>
                            {account.badge}
                          </Badge>
                        )}
                        <div className="text-white font-bold text-sm sm:text-[15px] leading-tight pr-10">{account.title || account.platform}</div>
                        <div className="text-[#25F4EE] text-[11px] sm:text-xs mt-1 pr-10">{account.type}</div>
                        <div className="absolute bottom-2 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 translate-y-1">
                          <PlatformCardIcon platform={account.platform} />
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Users className="w-4 h-4" />
                              <span>Followers</span>
                            </div>
                            <span className="font-bold text-black">{formatFollowers(account.followers)}</span>
                          </div>
                          {account.platform === "TikTok" && account.type !== "Non-TTS/Affiliate" && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-gray-600">
                                <AlertCircle className="w-4 h-4" />
                                <span>Verification</span>
                              </div>
                              <span className={`font-medium ${account.verificationPrice > 0 ? "text-orange-500" : "text-gray-500"}`}>
                                {account.verificationPrice > 0 ? `+${formatPrice(account.verificationPrice)}` : "Not available"}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-500">Price</span>
                            <div className="flex items-baseline gap-2">
                              {account.originalPrice && account.originalPrice > account.price ? (
                                <span className="text-sm font-medium text-red-500 line-through">{formatPrice(account.originalPrice)}</span>
                              ) : null}
                              <span className="text-2xl font-bold text-black">{formatPrice(account.price)}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              className={`rounded-full border border-gray-200 p-2 transition-colors ${isFavorite(account.id) ? 'bg-[#FE2C55]/10 text-[#FE2C55]' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                              onClick={(e) => {
                                e.preventDefault()
                                if (!isAuthenticated) {
                                  redirectToLogin()
                                  return
                                }
                                if (isFavorite(account.id)) {
                                  void removeFromFavorites(account.id)
                                } else {
                                  void addToFavorites(account.id)
                                }
                              }}
                              aria-label={isFavorite(account.id) ? 'Remove from favorites' : 'Add to favorites'}
                            >
                              <Heart className={`w-4 h-4 ${isFavorite(account.id) ? 'fill-[#FE2C55] text-[#FE2C55]' : 'text-gray-500'}`} />
                            </button>

                            <Link href={`/product/${account.id}`} className="flex-1">
                              <Button variant="outline" className="w-full rounded-full border-gray-200 text-sm py-2">
                                View Details
                              </Button>
                            </Link>

                            <button
                              type="button"
                              className={`rounded-full px-3 py-1.5 h-auto text-sm transition-colors ${isInCart(account.id) ? 'bg-[#25F4EE] text-black' : 'bg-[#FE2C55] text-white hover:bg-[#FE2C55]/90'}`}
                              onClick={() => account.inStock && handleAddToCart(account)}
                              disabled={!account.inStock || isInCart(account.id)}
                            >
                              {!account.inStock ? 'Out of Stock' : isInCart(account.id) ? <CheckCircle className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredAccounts.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-gray-500 text-lg">No accounts found matching your criteria.</p>
                    <Button
                      variant="outline"
                      className="mt-4 rounded-full"
                      onClick={() => {
                        setSelectedShopType(null)
                        setFollowersFilter('all')
                        setPriceRange([priceMin, priceMax])
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-black mb-2">Choose an account type</h2>
                    <p className="text-gray-500">Select a product family to see the available accounts.</p>
                  </div>
                  <span className="text-gray-500">{accounts.length} accounts available</span>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {shopTypeCards.map((shopType) => (
                    <button
                      key={shopType.id}
                      type="button"
                      onClick={() => {
                        setSelectedShopType(shopType.id)
                        setRegionFilter('all')
                      }}
                      className="text-left bg-white rounded-3xl border border-gray-200 p-8 hover:border-[#FE2C55] hover:shadow-xl transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-full">
                          <div className="mb-4">
                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
                              <PlatformCardIcon platform={shopType.id.includes('youtube') || shopType.id.includes('aged') ? 'YouTube' : 'TikTok'} />
                            </span>
                          </div>
                          <h3 className="text-2xl font-bold text-black group-hover:text-[#FE2C55] transition-colors">
                            {shopType.title}
                          </h3>
                          <p className="mt-3 text-sm leading-6 text-gray-500">
                            {shopType.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}
