"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useStoreSettings } from "@/lib/store-settings-context"
import { useCart } from "@/lib/cart-context"
import { apiPath, apiFetch } from "@/lib/api"
import { useRouter } from "next/navigation"
import { ArrowLeft, Heart, ShoppingCart, Trash2, Users, Loader2 } from "lucide-react"

export default function FavoritesPage() {
  const { addToCart } = useCart()
  const { settings } = useStoreSettings()
  const router = useRouter()
  const [favorites, setFavorites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load favorites from backend
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const response = await apiFetch('/favorites')

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login")
            return
          }
          throw new Error("Failed to fetch favorites")
        }

        const data = await response.json()
        setFavorites(data || [])
      } catch (err: any) {
        console.error("Error loading favorites:", err)
        setError(err.message || "Failed to load favorites")
      } finally {
        setLoading(false)
      }
    }

    loadFavorites()
  }, [router])

  const handleRemoveFavorite = async (productId: string) => {
    try {
      const response = await apiFetch(`/favorites/${productId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error("Failed to remove favorite")
      }

      setFavorites(prev => prev.filter(fav => fav.product?.id !== productId))
    } catch (err: any) {
      console.error("Error removing favorite:", err)
      alert("Failed to remove favorite")
    }
  }

  const handleCardClick = (productId: string) => {
    router.push(`/product/${productId}`)
  }

  const handleAddToCart = (product: any) => {
    addToCart({
      id: product.id,
      platform: product.platform as "TikTok" | "YouTube",
      type: product.type as "US TikTok Shop" | "UK TikTok Shop" | "Non-TTS/Affiliate" | "YouTube Aged" | "YouTube Monetized",
      followers: product.followers,
      followersNum: parseInt(product.followers) || 0,
      price: parseFloat(product.price),
      badge: product.badge || "",
      badgeColor: product.platform === "TikTok" ? "bg-pink-600" : "bg-red-600",
      description: product.description || "",
      features: [],
      verified: product.verified || false,
      verificationPrice: product.verificationPrice ? parseFloat(product.verificationPrice) : 0,
      transferTime: product.transferTime || "Instant",
      inStock: product.inStock || true
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/account" className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-4 sm:mb-6 text-xs sm:text-sm">
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
          Back to Account
        </Link>

        <h1 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6">My Favorites</h1>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {favorites.length === 0 ? (
          <Card>
            <CardContent className="py-8 sm:py-12 text-center">
              <Heart className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No favorites yet</h3>
              <p className="text-gray-500 mb-4">Save accounts you like to find them easily later</p>
              <Link href="/shop">
                <Button style={{ backgroundColor: settings.primaryColor }} className="text-white">
                  Browse Accounts
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {favorites.map((fav) => {
              const product = fav.product
              return (
                <Card
                  key={product.id}
                  className="overflow-hidden cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardClick(product.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      handleCardClick(product.id)
                    }
                  }}
                >
                  <CardContent className="p-0">
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Badge variant="outline" className="mb-2">{product.platform}</Badge>
                          <h3 className="font-semibold">{product.type} - {product.followers}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleRemoveFavorite(product.id)
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Remove from favorites"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{parseInt(product.followers)?.toLocaleString() || 0} followers</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold" style={{ color: settings.primaryColor }}>
                            ${parseFloat(product.price).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleAddToCart(product)
                          }}
                          size="sm"
                          className="text-white gap-2"
                          style={{ backgroundColor: settings.primaryColor }}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
