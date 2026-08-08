"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/data"
import { formatFollowers } from "@/lib/utils"
import { useCart } from "@/lib/cart-context"
import { useStoreData } from "@/lib/store-data-context"
import { Users, ShoppingCart, CheckCircle, AlertCircle, Heart } from "lucide-react"
import { useUserAuth } from "@/lib/user-auth-context"

const FEATURED_PRIORITY_TYPES = [
  "Tiktok Shop (Creator)",
  "Tiktok Shop (Seller)",
  "Tiktok Monetized",
  "Youtube Monetized"
]

export function selectFeaturedAccounts(accounts: Array<{ type: string; price: number; id: string; region?: string }>) {
  if (!accounts.length) {
    return []
  }

  const groups = new Map<string, Array<{ type: string; price: number; id: string; region?: string }>>()

  for (const account of accounts) {
    if (!groups.has(account.type)) {
      groups.set(account.type, [])
    }

    groups.get(account.type)?.push(account)
  }

  const regionPriority = (region?: string) => {
    const normalized = String(region ?? '').toUpperCase()

    if (normalized === 'US') {
      return 0
    }

    if (normalized === 'UK') {
      return 1
    }

    return 2
  }

  for (const group of groups.values()) {
    group.sort((a, b) => {
      const regionDelta = regionPriority(a.region) - regionPriority(b.region)
      if (regionDelta !== 0) {
        return regionDelta
      }

      return a.price - b.price
    })
  }

  const orderedTypes = [
    ...FEATURED_PRIORITY_TYPES.filter((type) => groups.has(type)),
    ...Array.from(groups.keys()).filter((type) => !FEATURED_PRIORITY_TYPES.includes(type))
  ]

  const selected: Array<{ type: string; price: number; id: string; region?: string }> = []
  const selectedTypeCursor = new Map<string, number>()

  for (const type of orderedTypes) {
    const group = groups.get(type)
    if (!group || group.length === 0) {
      continue
    }

    const nextIndex = selectedTypeCursor.get(type) ?? 0
    const nextAccount = group[nextIndex]

    if (!nextAccount) {
      continue
    }

    selected.push(nextAccount)
    selectedTypeCursor.set(type, nextIndex + 1)

    if (selected.length >= 4) {
      break
    }
  }

  if (selected.length < 4) {
    const candidateTypes = Array.from(new Set(selected.map((account) => account.type)))

    while (selected.length < 4) {
      const startLength = selected.length

      for (const type of candidateTypes) {
        const group = groups.get(type)
        if (!group || group.length === 0) {
          continue
        }

        const nextIndex = selectedTypeCursor.get(type) ?? 0
        const nextAccount = group[nextIndex]

        if (nextAccount) {
          selected.push(nextAccount)
          selectedTypeCursor.set(type, nextIndex + 1)
        }

        if (selected.length >= 4) {
          break
        }
      }

      if (selected.length === startLength) {
        break
      }
    }
  }

  return selected.slice(0, 4)
}

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

export function FeaturedAccounts() {
  const { addToCart, items } = useCart()
  const { accounts } = useStoreData()
  const { isAuthenticated, addToFavorites, removeFromFavorites, isFavorite, redirectToLogin } = useUserAuth()
  const featuredAccounts = useMemo(() => selectFeaturedAccounts(accounts), [accounts])
  const cartItemIds = useMemo(() => new Set(items.map(item => item.account.id)), [items])
  const isInCart = (id: string) => cartItemIds.has(id)

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
                      onClick={() => addToCart(account)}
                      disabled={isInCart(account.id)}
                    >
                      {isInCart(account.id) ? <CheckCircle className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
                    </button>
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
