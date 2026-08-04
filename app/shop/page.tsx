"use client"

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatPrice } from "@/lib/data"
import { formatFollowers } from "@/lib/utils"
import { apiPath } from "@/lib/api"
import { useCart } from "@/lib/cart-context"
import { useStoreSettings } from "@/lib/store-settings-context"
import { useUserAuth } from "@/lib/user-auth-context"
import { Users, ShoppingCart, Search, Filter, CheckCircle, AlertCircle, Heart } from "lucide-react"

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
  const [platform, setPlatform] = useState<string>("all")
  const [accountType, setAccountType] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("popular")
  const [searchQuery, setSearchQuery] = useState("")
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
        const url = apiPath('/products')
        console.log('Shop page: Fetching products from URL:', url)
        const response = await fetch(url)
        console.log('Shop page: Response status:', response.status)
        if (response.ok) {
          const data = await response.json()
          console.log('Shop page: Received products:', data)
          setProducts(Array.isArray(data) ? data : [])
        } else {
          console.error('Shop page: Response not OK:', response.status)
        }
      } catch (error) {
        console.error("Error fetching products:", error)
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
  
  // Convert products to accounts format
  const accounts = useMemo(() => {
    return products
      .filter(p => p && p.id)
      .map(p => {
        const verificationPrice = p.verificationPrice !== undefined
          ? Number(p.verificationPrice || 0)
          : p.hasVerificationFee
            ? 30
            : 0

        return {
          id: p.id,
          platform: (p.platform || "TikTok") as "TikTok" | "YouTube",
          type: (p.type || "Unknown") as any,
          title: p.title || p.platform || "",
          followers: p.followers,
          followersNum: Number(p.followers || 0),
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

  const filteredAccounts = useMemo(() => {
    let filtered = [...accounts]
    
    if (platform !== "all") {
      filtered = filtered.filter(a => a.platform.toLowerCase() === platform)
    }

    if (accountType !== "all") {
      filtered = filtered.filter(a => a.type === accountType)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(query) ||
        a.platform.toLowerCase().includes(query) ||
        a.type.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
      )
    }
    
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price - b.price)
        break
      case "price-high":
        filtered.sort((a, b) => b.price - a.price)
        break
      case "followers":
        filtered.sort((a, b) => b.followersNum - a.followersNum)
        break
      default:
        break
    }
    
    return filtered
  }, [accounts, platform, accountType, sortBy, searchQuery])

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
        
        <section className="py-3 sm:py-8 border-b border-gray-100 bg-white/95 backdrop-blur-md">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex flex-col gap-2 sm:gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="relative flex-1 sm:w-80">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 sm:pl-10 rounded-full border-gray-200 text-xs sm:text-sm py-2 sm:py-3 h-auto"
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 w-full">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 shrink-0" />
                  <span className="text-[10px] sm:text-sm text-gray-500 hidden sm:inline">Filter:</span>
                </div>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="w-20 sm:w-35 rounded-full text-[11px] sm:text-sm h-auto py-1.5 sm:py-2">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger className="w-24 sm:w-45 rounded-full text-[11px] sm:text-sm h-auto py-1.5 sm:py-2">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Monetized Tiktok">Monetized Tiktok</SelectItem>
                    <SelectItem value="US Shop Affiliate">US Shop Affiliate</SelectItem>
                    <SelectItem value="UK Shop Affiliate">UK Shop Affiliate</SelectItem>
                    <SelectItem value="US TikTok Shop">US TikTok Shop</SelectItem>
                    <SelectItem value="UK TikTok Shop">UK TikTok Shop</SelectItem>
                    <SelectItem value="Non-TTS/Affiliate">Non-TTS/Affiliate</SelectItem>
                    <SelectItem value="YouTube Aged">YouTube Aged</SelectItem>
                    <SelectItem value="YouTube Monetized">YouTube Monetized</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-37.5 rounded-full">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="followers">Most Followers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </section>
        
        <section className="py-12">
          <div className="container mx-auto px-4">
            <p className="text-gray-500 mb-6">{filteredAccounts.length} accounts available</p>
            
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
                    setPlatform("all")
                    setAccountType("all")
                    setSearchQuery("")
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  )
}
