"use client"

import React, { useState } from "react"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatPrice } from "@/lib/data"
import { formatFollowers } from "@/lib/utils"
import { useCart } from "@/lib/cart-context"
import { useStoreSettings } from "@/lib/store-settings-context"
import { useStoreData } from "@/lib/store-data-context"
import { getVariantSelection } from "@/lib/product-variants"
import {
  Users,
  Clock,
  CheckCircle,
  Shield,
  ArrowLeft,
  ShoppingCart,
  Heart,
  Plus,
  Minus
} from "lucide-react"
import { useUserAuth } from "@/lib/user-auth-context"
import { getProductTypeDetailsHtml } from "@/lib/product-type-details"

export default function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()
  const { addToCart, items, setBuyNowItem, updateQuantity } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [buyNowAddVerification, setBuyNowAddVerification] = useState(false)
  const [buyNowVerificationCountLocal, setBuyNowVerificationCountLocal] = useState(0)
  const [selectedRegion, setSelectedRegion] = useState<"all" | "US" | "UK">("all")
  const [selectedFollowers, setSelectedFollowers] = useState<string>("all")
  const [detailsExpanded, setDetailsExpanded] = useState(false)
  const { settings } = useStoreSettings()
  const { accounts, products } = useStoreData()
  const { isAuthenticated, addToFavorites, removeFromFavorites, isFavorite, redirectToLogin } = useUserAuth()
  
  const account = accounts.find(a => a.id === id)
  const baseAccount = account ?? accounts[0]
  const variantSelection = React.useMemo(() => {
    if (!baseAccount) return { activeVariant: null, variants: [], availableRegions: [], availableFollowers: [] as string[] }
    return getVariantSelection(accounts, baseAccount, { region: selectedRegion, followers: selectedFollowers })
  }, [accounts, baseAccount, selectedRegion, selectedFollowers])
  const activeAccount = variantSelection.activeVariant ?? baseAccount ?? null

  React.useEffect(() => {
    if (!activeAccount) return
    setSelectedRegion(activeAccount.region ?? "all")
    setSelectedFollowers(activeAccount.followers)
  }, [activeAccount?.id])

  React.useEffect(() => {
    if (!activeAccount || activeAccount.id === id) return
    router.replace(`/product/${activeAccount.id}`, { scroll: false })
  }, [activeAccount?.id, id, router])
  
  // Show loading if products are empty (initial load)
  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }
  
  if (!activeAccount) {
    notFound()
  }

  const isInCart = items.some(item => item.account.id === activeAccount.id)
  const hasVerificationFee = activeAccount.verificationPrice > 0

  const sameTypeAccounts = accounts.filter(a => a.type === activeAccount.type && a.id !== activeAccount.id)
  const samePlatformAccounts = accounts.filter(a => a.platform === activeAccount.platform && a.id !== activeAccount.id)

  const relatedAccounts = [
    ...sameTypeAccounts.slice(0, 3),
    ...samePlatformAccounts.filter(a => !sameTypeAccounts.some(s => s.id === a.id)).slice(0, Math.max(0, 3 - sameTypeAccounts.length))
  ].slice(0, 3)

  const detailsHtml = getProductTypeDetailsHtml(activeAccount.type, activeAccount.region)

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="py-4 sm:py-8">
        <div className="container mx-auto px-3 sm:px-4">
          <Link 
            href="/shop" 
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors mb-4 sm:mb-8 text-xs sm:text-sm"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            Back to Shop
          </Link>
          
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-12">
            <div>
              <div className="bg-black rounded-2xl sm:rounded-3xl p-4 sm:p-8 mb-4 sm:mb-6 relative overflow-hidden">
                {activeAccount.badge && (
                  <Badge className={`${activeAccount.badgeColor} absolute top-3 sm:top-6 right-14 sm:right-20 text-xs sm:text-sm`}>
                    {activeAccount.badge}
                  </Badge>
                )}
                {/* Favorite Heart Button */}
                <button
                  className="absolute top-3 sm:top-6 right-3 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
                  onClick={(e) => {
                    e.preventDefault()
                    if (!isAuthenticated) {
                      redirectToLogin()
                      return
                    }
                    if (isFavorite(activeAccount.id)) {
                      removeFromFavorites(activeAccount.id)
                    } else {
                      addToFavorites(activeAccount.id)
                    }
                  }}
                >
                  <Heart 
                    className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${isFavorite(activeAccount.id) ? 'fill-[#FE2C55] text-[#FE2C55]' : 'text-white'}`} 
                  />
                </button>
                <div className="text-[#25F4EE] text-[10px] sm:text-xs font-medium mb-2">{activeAccount.type}</div>
                <h1 className="text-[1.05rem] sm:text-[1.6rem] md:text-[2.2rem] font-bold text-white mb-3 sm:mb-4">
                  {activeAccount.title || activeAccount.platform}
                </h1>
                <p className="text-gray-400 text-xs sm:text-base md:text-lg">{activeAccount.description}</p>
                
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#FE2C55]/20 rounded-full blur-3xl" />
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#25F4EE]/20 rounded-full blur-3xl" />
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gray-50 rounded-lg sm:rounded-2xl p-3 sm:p-4 text-center">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" style={{ color: settings.primaryColor }} />
                  <div className="text-lg sm:text-2xl font-bold text-black">{formatFollowers(activeAccount.followers)}</div>
                  <div className="text-xs sm:text-sm text-gray-500">Followers</div>
                </div>
                <div className="bg-gray-50 rounded-lg sm:rounded-2xl p-3 sm:p-4 text-center">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#25F4EE] mx-auto mb-1 sm:mb-2" />
                  <div className="text-lg sm:text-2xl font-bold text-black">{activeAccount.transferTime}</div>
                  <div className="text-xs sm:text-sm text-gray-500">Transfer</div>
                </div>
              </div>

              <section className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                <div className={`${detailsExpanded ? '' : 'line-clamp-4'} prose prose-sm max-w-none product-type-details-wrap`}>
                  <div dangerouslySetInnerHTML={{ __html: detailsHtml }} />
                </div>
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-[#FE2C55] hover:text-[#c71a3d] underline-offset-2 hover:underline"
                  onClick={() => setDetailsExpanded(value => !value)}
                >
                  {detailsExpanded ? 'Show less' : 'Read more..'}
                </button>
              </section>
            </div>
            
            <div>
              <div className="bg-white border-2 border-gray-100 rounded-2xl sm:rounded-3xl p-4 sm:p-8 sticky top-24">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div>
                    <span className="text-gray-500 text-xs sm:text-sm">Price</span>
                    <div className="flex items-end gap-3 mt-1">
                      <div className="text-2xl sm:text-4xl font-bold text-black">{formatPrice(activeAccount.price)}</div>
                      {activeAccount.originalPrice && activeAccount.originalPrice > activeAccount.price ? (
                        <div className="text-sm font-medium text-red-500 line-through">{formatPrice(activeAccount.originalPrice)}</div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {activeAccount.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#25F4EE]" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
                
                {/* Quantity Selector */}
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Quantity</label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-2">
                      <button 
                        onClick={() => {
                          const nextQuantity = Math.max(1, quantity - 1)
                          setQuantity(nextQuantity)
                          setBuyNowVerificationCountLocal(prev => Math.min(prev, nextQuantity))
                        }}
                        className="p-1 hover:bg-gray-200 transition-colors"
                      >
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="w-8 text-center font-medium">{quantity}</span>
                      <button 
                        onClick={() => setQuantity(quantity + 1)}
                        className="p-1 hover:bg-gray-200 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <span className="text-lg font-semibold text-gray-700">
                      {formatPrice(activeAccount.price * quantity)} total
                    </span>
                  </div>
                </div>

                {hasVerificationFee ? (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-center gap-2 text-blue-600 font-medium mb-3">
                      <Shield className="w-4 h-4" />
                      <span>Add Verification (+${activeAccount.verificationPrice} per item)</span>
                    </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <Checkbox
                            id="buyNowVerify"
                            checked={buyNowVerificationCountLocal > 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setBuyNowVerificationCountLocal(quantity)
                              } else {
                                setBuyNowVerificationCountLocal(0)
                              }
                              setBuyNowAddVerification(checked as boolean)
                            }}
                          />
                          <span className="text-sm text-gray-700">
                            Enable verification
                            {quantity > 1 && buyNowVerificationCountLocal > 0 && (
                              <span className="text-gray-500"> ({buyNowVerificationCountLocal}/{quantity})</span>
                            )}
                          </span>
                        </label>

                        {quantity > 1 && buyNowVerificationCountLocal > 0 && (
                          <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-2">
                            <button
                              type="button"
                              onClick={() => setBuyNowVerificationCountLocal(Math.max(1, buyNowVerificationCountLocal - 1))}
                              className="p-1 hover:bg-gray-200 transition-colors"
                            >
                              <Minus className="w-4 h-4 text-gray-600" />
                            </button>
                            <span className="w-8 text-center font-medium">{buyNowVerificationCountLocal}</span>
                            <button
                              type="button"
                              onClick={() => setBuyNowVerificationCountLocal(Math.min(quantity, buyNowVerificationCountLocal + 1))}
                              className="p-1 hover:bg-gray-200 transition-colors"
                            >
                              <Plus className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        )}
                      </div>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-sm text-gray-600">No verification available for this account.</p>
                  </div>
                )}

                <div className="mb-6 grid gap-3">
                  {variantSelection.availableRegions.length > 1 && (
                    <div className="flex flex-col gap-3">
                      <span className="text-sm font-medium text-gray-700">Region</span>
                      <div className="flex flex-wrap gap-2">
                        {variantSelection.availableRegions.map((region) => (
                          <button
                            key={region}
                            type="button"
                            onClick={() => setSelectedRegion(region)}
                            className={`rounded-full px-3 py-2 text-sm font-medium transition ${selectedRegion === region ? 'bg-[#FE2C55] text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'}`}
                          >
                            {region}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {variantSelection.availableFollowers.length > 1 && (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-gray-700" htmlFor="followers-select">Followers</label>
                      <Select value={selectedFollowers} onValueChange={(value) => setSelectedFollowers(value)}>
                        <SelectTrigger
                          id="followers-select"
                          className="w-28 rounded-lg border border-gray-200 bg-white text-sm"
                          size="sm"
                        >
                          <SelectValue placeholder={formatFollowers(activeAccount.followers)} />
                        </SelectTrigger>
                        <SelectContent className="min-w-28 rounded-xl border border-gray-200 bg-white shadow-lg">
                          {variantSelection.availableFollowers.map((followers) => (
                            <SelectItem
                              key={followers}
                              value={followers}
                              className="data-state=checked:bg-[#FE2C55] data-state=checked:text-white data-highlighted:bg-gray-100"
                            >
                              {formatFollowers(followers)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button 
                    className="flex-1 rounded-full text-lg py-6"
                    style={{ 
                      backgroundColor: activeAccount.inStock ? settings.primaryColor : '#9CA3AF',
                      color: 'white',
                      cursor: activeAccount.inStock ? 'pointer' : 'not-allowed'
                    }}
                    disabled={!activeAccount.inStock}
                    onClick={() => {
                      if (!activeAccount.inStock) return
                      const verificationCount = buyNowAddVerification ? buyNowVerificationCountLocal : 0
                      setBuyNowItem(activeAccount, quantity, verificationCount)
                      router.push('/checkout?buyNow=true')
                    }}
                  >
                    {activeAccount.inStock ? `Buy Now - ${formatPrice(activeAccount.price * quantity + (buyNowAddVerification ? activeAccount.verificationPrice * buyNowVerificationCountLocal : 0))}` : 'Out of Stock'}
                  </Button>
                  <Button 
                    className="rounded-full h-auto px-4"
                    style={{ 
                      backgroundColor: isInCart ? '#25F4EE' : 'transparent',
                      color: isInCart ? 'black' : settings.primaryColor,
                      border: isInCart ? 'none' : `2px solid ${settings.primaryColor}`
                    }}
                    onClick={() => {
                      addToCart(activeAccount)
                      // Update quantity after adding to cart
                      setTimeout(() => {
                        updateQuantity(activeAccount.id, quantity)
                      }, 50)
                    }}
                    disabled={isInCart || !activeAccount.inStock}
                  >
                    {isInCart ? <CheckCircle className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                  </Button>
                </div>
                
                {isInCart && (
                  <Link href="/cart">
                    <Button variant="outline" className="w-full rounded-full mt-3">
                      View Cart
                    </Button>
                  </Link>
                )}
                
                <div className="flex items-center justify-center gap-2 mt-4 text-gray-500 text-sm">
                  <Shield className="w-4 h-4" />
                  <span>30-day money-back guarantee</span>
                </div>
              </div>
            </div>
          </div>
          
          {relatedAccounts.length > 0 && (
            <section className="mt-16">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-black">Similar Accounts</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedAccounts.map((related) => (
                  <Link 
                    key={related.id}
                    href={`/product/${related.id}`}
                    className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden hover:border-[#FE2C55] transition-all hover:shadow-lg"
                  >
                    <div className="bg-black p-4 relative">
                      {related.badge && (
                        <Badge className={`${related.badgeColor} absolute top-3 right-3`}>
                          {related.badge}
                        </Badge>
                      )}
                      <div className="text-white font-bold text-sm sm:text-[15px] leading-tight pr-10">{related.title || related.platform}</div>
                      <div className="text-[#25F4EE] text-[11px] sm:text-xs mt-1 pr-10">{related.type}</div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-500">Followers</span>
                        <span className="font-bold text-black">{formatFollowers(related.followers)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Price</span>
                        <div className="flex items-baseline gap-2">
                          {related.originalPrice && related.originalPrice > related.price ? (
                            <span className="text-sm font-medium text-red-500 line-through">{formatPrice(related.originalPrice)}</span>
                          ) : null}
                          <span className="font-bold text-black">{formatPrice(related.price)}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-6 flex justify-center">
                <Link href="/shop">
                  <Button className="rounded-full text-sm py-3 px-6" style={{ backgroundColor: '#FE2C55', color: 'white' }}>
                    See more
                  </Button>
                </Link>
              </div>
            </section>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
