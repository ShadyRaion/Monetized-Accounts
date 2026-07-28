"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useCart } from "@/lib/cart-context"
import { useUserAuth } from "@/lib/user-auth-context"
import { formatPrice } from "@/lib/data"
import { Trash2, ShoppingBag, ArrowRight, Shield, Clock, CheckCircle, User, Plus, Minus } from "lucide-react"

export default function CartPage() {
  const router = useRouter()
  const { items, removeFromCart, toggleVerification, getTotal, clearCart, updateQuantity, setVerificationCount } = useCart()
  const { isAuthenticated, redirectToLogin } = useUserAuth()
  
  const handleCheckout = () => {
    if (!isAuthenticated) {
      redirectToLogin("/checkout")
    }
  }
  const total = getTotal()

  const [verificationMode, setVerificationMode] = useState<'none' | 'all' | 'custom'>('none')
  const [customVerificationCount, setCustomVerificationCount] = useState<number>(1)

  const applyGlobalVerification = (mode: 'none' | 'all' | 'custom', count: number) => {
    items.forEach(item => {
      if (mode === 'none') return setVerificationCount(item.account.id, 0)
      if (mode === 'all') return setVerificationCount(item.account.id, item.quantity)
      return setVerificationCount(item.account.id, Math.max(0, Math.min(count, item.quantity)))
    })
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-black mb-8">Your Cart</h1>
          
          {items.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-black mb-2">Your cart is empty</h2>
              <p className="text-gray-500 mb-6">Browse our selection of accounts and start earning today.</p>
              <Link href="/shop">
                <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full px-8">
                  Browse Accounts
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {items.map((item) => (
                    <div 
                      key={item.account.id}
                      className="bg-white border-2 border-gray-100 rounded-2xl p-6"
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        <button
                          type="button"
                          onClick={() => router.push(`/product/${item.account.id}`)}
                          className="bg-black rounded-xl p-4 text-center min-w-[100px] cursor-pointer"
                        >
                          <div className="text-[#25F4EE] text-xs">{item.account.type}</div>
                          <div className="text-white font-bold">{item.account.platform}</div>
                          <div className="text-white text-sm">{item.account.followers}</div>
                        </button>
                        
                        <div className="flex-1">
                          <button
                            type="button"
                            onClick={() => router.push(`/product/${item.account.id}`)}
                            className="font-bold text-black text-lg text-left hover:text-[#FE2C55] transition-colors"
                          >
                            {item.account.platform} - {item.account.followers} Followers
                          </button>
                          <p className="text-gray-500 text-sm line-clamp-2">{item.account.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-gray-500">Transfer: <span className="font-medium">{item.account.transferTime}</span></span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-end gap-2">
                            <span className="text-2xl font-bold text-black">{formatPrice(item.account.price * item.quantity)}</span>
                            <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1">
                              <button 
                                onClick={(event) => {
                                  event.stopPropagation()
                                  updateQuantity(item.account.id, Math.max(1, item.quantity - 1))
                                }}
                                className="p-1 hover:bg-gray-100 transition-colors"
                              >
                                <Minus className="w-4 h-4 text-gray-600" />
                              </button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <button 
                                onClick={(event) => {
                                  event.stopPropagation()
                                  updateQuantity(item.account.id, item.quantity + 1)
                                }}
                                className="p-1 hover:bg-gray-100 transition-colors"
                              >
                                <Plus className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                          <button 
                            onClick={(event) => {
                              event.stopPropagation()
                              removeFromCart(item.account.id)
                            }}
                            className="p-2 text-gray-400 hover:text-[#FE2C55] transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      {item.account.platform === "TikTok" && item.account.type !== "Non-TTS/Affiliate" && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <Checkbox
                                checked={item.verificationCount > 0}
                                onCheckedChange={() => setVerificationCount(item.account.id, item.verificationCount > 0 ? 0 : item.quantity)}
                              />
                              <span className="text-sm text-gray-700">
                                Enable verification
                                {item.quantity > 1 && item.verificationCount > 0 && (
                                  <span className="text-gray-500"> ({item.verificationCount}/{item.quantity})</span>
                                )}
                              </span>
                            </label>

                            {item.quantity > 1 && item.verificationCount > 0 && (
                              <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1 w-auto">
                                <button
                                  type="button"
                                  onClick={() => setVerificationCount(item.account.id, Math.max(1, item.verificationCount - 1))}
                                  className="p-1 hover:bg-gray-100 transition-colors"
                                >
                                  <Minus className="w-4 h-4 text-gray-600" />
                                </button>
                                <span className="w-8 text-center font-medium">{item.verificationCount}</span>
                                <button
                                  type="button"
                                  onClick={() => setVerificationCount(item.account.id, Math.min(item.quantity, item.verificationCount + 1))}
                                  className="p-1 hover:bg-gray-100 transition-colors"
                                >
                                  <Plus className="w-4 h-4 text-gray-600" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center mt-6">
                  <Link href="/shop">
                    <Button variant="outline" className="rounded-full">
                      Continue Shopping
                    </Button>
                  </Link>
                  <button 
                    onClick={clearCart}
                    className="text-gray-500 hover:text-[#FE2C55] text-sm transition-colors"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>
              
              <div>
                <div className="bg-gray-50 rounded-3xl p-6 sticky top-24">
                  <h2 className="text-xl font-bold text-black mb-6">Order Summary</h2>
                  
                  <div className="space-y-3 mb-6">
                    {items.map((item) => (
                      <div key={item.account.id}>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.account.platform} ({item.account.followers}) × {item.quantity}</span>
                          <span className="font-medium">{formatPrice(item.account.price * item.quantity)}</span>
                        </div>
                        {item.verificationCount > 0 && (
                          <div className="flex justify-between text-sm text-orange-600 mt-1">
                            <span className="ml-4">+ Verification (×{item.verificationCount})</span>
                            <span>+${item.account.verificationPrice * item.verificationCount}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4 mb-6">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                  
                  {isAuthenticated ? (
                    <Link href="/checkout">
                      <Button className="w-full bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full text-lg py-6">
                        Proceed to Checkout
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      onClick={handleCheckout}
                      className="w-full bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full text-lg py-6"
                    >
                      Sign In to Checkout
                      <User className="w-5 h-5 ml-2" />
                    </Button>
                  )}
                  
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Shield className="w-4 h-4 text-[#25F4EE]" />
                      <span>30-day money-back guarantee</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Clock className="w-4 h-4 text-[#25F4EE]" />
                      <span>Fast account transfer</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <CheckCircle className="w-4 h-4 text-[#25F4EE]" />
                      <span>24/7 support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
