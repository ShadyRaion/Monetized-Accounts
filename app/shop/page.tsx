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
import { Users, ShoppingCart, Search, Filter, CheckCircle, AlertCircle, Heart } from "lucide-react"
export default function ShopPage() {
  const [platform, setPlatform] = useState<string>("all")
  const [accountType, setAccountType] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("popular")
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  
  const { addToCart, items } = useCart()
  const { settings } = useStoreSettings()
  
  // Fetch products directly from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const url = apiPath('/products')
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
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
    await addToCart(account)
    // Reset the animation state after 1.5 seconds
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
          followers: p.followers,
          followersFormatted: formatFollowers(p.followers),
          followersNum: Number(p.followers || 0),
          price: Number(p.price || 0),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#FE2C55] border-t-transparent" />
      </div>
    )
  }

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
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-[10px] sm:text-sm text-gray-500 hidden sm:inline">Filter:</span>
                </div>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="w-20 sm:w-[140px] rounded-full text-[11px] sm:text-sm h-auto py-1.5 sm:py-2">
                    <SelectValue placeholder="Platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger className="w-24 sm:w-[180px] rounded-full text-[11px] sm:text-sm h-auto py-1.5 sm:py-2">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="US TikTok Shop">US TikTok Shop</SelectItem>
                    <SelectItem value="UK TikTok Shop">UK TikTok Shop</SelectItem>
                    <SelectItem value="Non-TTS/Affiliate">Non-TTS/Affiliate</SelectItem>
                    <SelectItem value="YouTube Aged">YouTube Aged</SelectItem>
                    <SelectItem value="YouTube Monetized">YouTube Monetized</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px] rounded-full">
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
                    <div className="text-white font-semibold text-base">{account.type}</div>
                    <div className="mt-2 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/80">
                      <span className={`px-2 py-1 rounded-full text-white ${account.platform === "TikTok" ? "bg-pink-600" : "bg-red-600"}`}>
                        {account.platform}
                      </span>
                      <span>{account.followersFormatted}</span>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="space-y-3 mb-6">
                      <div className="text-sm text-gray-600">{account.description}</div>
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
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-black">{formatPrice(account.price)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Link href={`/product/${account.id}`} className="flex-1">
                            <Button variant="outline" className="w-full rounded-full border-gray-200">
                              View Details
                            </Button>
                          </Link>
                        </div>
                        <Button 
                          className="rounded-full text-white px-3 py-1.5 h-auto text-sm"
                          style={{ 
                            backgroundColor: !account.inStock ? '#9CA3AF' : justAdded === account.id ? '#25F4EE' : settings.primaryColor,
                            color: justAdded === account.id ? 'black' : 'white',
                            cursor: !account.inStock ? 'not-allowed' : 'pointer'
                          }}
                          onClick={() => account.inStock && handleAddToCart(account)}
                          disabled={!account.inStock}
                        >
                          {!account.inStock ? 'Out of Stock' : justAdded === account.id ? <CheckCircle className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                        </Button>
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
