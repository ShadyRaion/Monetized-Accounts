"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/data"
import { formatFollowers } from "@/lib/utils"
import { useCart } from "@/lib/cart-context"
import { useStoreData } from "@/lib/store-data-context"
import { Users, ShoppingCart, CheckCircle, AlertCircle, Heart } from "lucide-react"
import { useUserAuth } from "@/lib/user-auth-context"

function PlatformCardIcon({ platform }: { platform: string }) {
  if (platform === "YouTube") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-label="YouTube" role="img">
        <rect x="2" y="4" width="20" height="16" rx="5" fill="#FF0000" />
        <path d="M10 9.5v5l5-2.5-5-2.5Z" fill="white" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-label="TikTok" role="img">
      <path d="M15.4 3c.3 1.7 1.3 3.1 3.1 3.7v2.5c-1.2 0-2.4-.3-3.5-.9v7.2a4.9 4.9 0 1 1-4.9-4.9c.3 0 .6 0 .8.1v2.7a2.5 2.5 0 1 0 1.7 2.4V3h2.8Z" fill="white" />
    </svg>
  )
}

export function FeaturedAccounts() {
  const { addToCart, items } = useCart()
  const { accounts } = useStoreData()
  const { isAuthenticated, addToFavorites, removeFromFavorites, isFavorite, redirectToLogin } = useUserAuth()
  const featuredAccounts = accounts.slice(0, 4)

  const isInCart = (id: string) => items.some(item => item.account.id === id)

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-2 sm:mb-4">
            Featured Accounts
          </h2>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg text-gray-600">
            Our most popular accounts - ready for TikTok Shop, affiliate marketing, or YouTube monetization
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {featuredAccounts.map((account) => (
            <div 
              key={account.id}
              className="bg-white rounded-xl sm:rounded-2xl border-2 border-gray-100 overflow-hidden hover:border-[#FE2C55] transition-all hover:shadow-xl group"
            >
              <div className="bg-black p-3 sm:p-4 relative">
                {account.badge && (
                  <Badge className={`${account.badgeColor} absolute top-2 sm:top-3 ${isAuthenticated ? 'right-10 sm:right-12' : 'right-2 sm:right-3'} text-xs sm:text-sm`}>
                    {account.badge}
                  </Badge>
                )}
                {/* Favorite Heart Button */}
                <button
                  className="absolute top-2 sm:top-3 right-2 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  onClick={(e) => {
                    e.preventDefault()
                    if (!isAuthenticated) {
                      redirectToLogin()
                      return
                    }
                    if (isFavorite(account.id)) {
                      removeFromFavorites(account.id)
                    } else {
                      addToFavorites(account.id)
                    }
                  }}
                >
                  <Heart 
                    className={`w-3 h-3 sm:w-4 sm:h-4 transition-colors ${isFavorite(account.id) ? 'fill-[#FE2C55] text-[#FE2C55]' : 'text-white'}`}
                  />
                </button>
                <div className="text-white font-bold text-base sm:text-lg leading-tight pr-10">{account.title || account.platform}</div>
                <div className="text-[#25F4EE] text-[11px] sm:text-xs mt-1 pr-10">{account.type}</div>
                <div className="absolute bottom-2 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 translate-y-1">
                  <PlatformCardIcon platform={account.platform} />
                </div>
              </div>
              
              <div className="p-3 sm:p-6">
                <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  <div className="flex items-center justify-between text-sm sm:text-base">
                    <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Followers</span>
                    </div>
                    <span className="font-bold text-black text-sm sm:text-base">{formatFollowers(account.followers)}</span>
                  </div>
                  {account.platform === "TikTok" && account.type !== "Non-TTS/Affiliate" && (
                    <div className="flex items-center justify-between text-sm sm:text-base">
                      <div className="flex items-center gap-2 text-gray-600 text-xs sm:text-sm">
                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Verified</span>
                      </div>
                      <span className="font-medium text-orange-500 text-xs sm:text-sm">
                        +${account.verificationPrice}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-100 pt-3 sm:pt-4">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <span className="text-gray-500 text-xs sm:text-sm">Price</span>
                    <span className="text-xl sm:text-2xl font-bold text-black">{formatPrice(account.price)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/product/${account.id}`} className="flex-1">
                      <Button variant="outline" className="w-full rounded-full border-gray-200 text-xs sm:text-sm py-1.5 sm:py-2">
                        View Details
                      </Button>
                    </Link>
                    <Button 
                      className={`rounded-full text-xs sm:text-sm py-1.5 sm:py-2 px-2 sm:px-3 ${isInCart(account.id) ? 'bg-[#25F4EE] text-black' : 'bg-[#FE2C55] text-white hover:bg-[#FE2C55]/90'}`}
                      onClick={() => addToCart(account)}
                      disabled={isInCart(account.id)}
                    >
                      {isInCart(account.id) ? <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> : <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-8 sm:mt-12">
          <Link href="/shop">
            <Button className="bg-black hover:bg-black/90 text-white rounded-full px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-lg">
              View All Accounts
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
