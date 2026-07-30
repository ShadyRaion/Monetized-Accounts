"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useUserAuth } from "@/lib/user-auth-context"
import { useStoreData } from "@/lib/store-data-context"
import { useStoreSettings } from "@/lib/store-settings-context"
import { ArrowLeft, Package, ExternalLink } from "lucide-react"

export default function OrdersPage() {
  const router = useRouter()
  const { user } = useUserAuth()
  const { orders, hasLiveUpdates, isLoaded } = useStoreData()
  const { clearNewOrders } = useStoreData()
  const { settings } = useStoreSettings()
  const [statusFilter, setStatusFilter] = useState("all")
  
  const statusOptions = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "delivered", label: "Delivered" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "refunded", label: "Refunded" },
  ]

  const userOrders = orders
    .filter(order => order.customerEmail.toLowerCase() === user?.email?.toLowerCase())
    .filter(order => statusFilter === "all" || order.status === statusFilter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const isOrderLoading = !isLoaded && Boolean(user)

  // Clear customer-side new-orders notification when user visits their orders page
  useEffect(() => {
    try { clearNewOrders && clearNewOrders() } catch (e) { /* ignore */ }
  }, [clearNewOrders])

  if (isOrderLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-8">
        <div className="max-w-4xl mx-auto rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
          Loading your orders...
        </div>
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
      case "completed": return "bg-green-100 text-green-800"
      case "processing": return "bg-blue-100 text-blue-800"
      case "pending": return "bg-yellow-100 text-yellow-800"
      case "cancelled":
      case "refunded": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "processing": return "Processing"
      default: return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/account" className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-4 sm:mb-6 text-xs sm:text-sm">
          <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
          Back to Account
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div className="space-y-2">
            <h1 className="text-lg sm:text-2xl font-bold">My Orders</h1>
            {hasLiveUpdates && (
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Live updates available
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="order-status-filter" className="text-sm text-gray-600 hidden sm:block">Filter by status</label>
            <select
              id="order-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-[#FE2C55] focus:outline-none focus:ring-2 focus:ring-[#FE2C55]/20"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {userOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 sm:py-12 text-center">
              <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium mb-2">No orders yet</h3>
              <p className="text-gray-500 mb-4">Start shopping to see your orders here</p>
              <Link href="/shop">
                <Button style={{ backgroundColor: settings.primaryColor }} className="text-white">
                  Browse Accounts
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {userOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold">Order {order.id}</h3>
                        <Badge className={getStatusColor(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(order.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${order.total.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{order.products.length} item{order.products.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Items</h4>
                    <div className="space-y-2">
                      {order.products.map((product, index) => {
                        const hasValidProductLink = product.productId && !product.productId.startsWith('deleted-')
                        return (
                          <div key={index} className="flex justify-between items-center">
                            <div>
                              {hasValidProductLink ? (
                                <button
                                  type="button"
                                  onClick={() => router.push(`/product/${product.productId}`)}
                                  className="font-medium text-left hover:text-[#FE2C55] transition-colors"
                                >
                                  {product.name}
                                </button>
                              ) : (
                                <span className="font-medium">{product.name}</span>
                              )}
                              <p className="text-sm text-gray-500">Qty: {product.quantity}</p>
                            </div>
                            <p className="font-medium">${product.price.toFixed(2)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="border-t mt-4 pt-4">
                    <Link href={`/account/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <ExternalLink className="w-4 h-4" />
                        View Order Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
