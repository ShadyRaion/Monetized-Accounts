"use client"

import { use, useState } from "react"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useUserAuth } from "@/lib/user-auth-context"
import { useStoreData } from "@/lib/store-data-context"
import { useStoreSettings } from "@/lib/store-settings-context"
import { ArrowLeft, Package, CheckCircle, Clock, AlertCircle, XCircle, Copy, Check, Flag, CreditCard, Star, MessageCircle, XSquare } from "lucide-react"
import { toast } from "sonner"
import { getAnonymousInitials } from "@/lib/utils"

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useUserAuth()
  const { orders, addTicket, updateOrderStatus, addReview, isLoaded } = useStoreData()
  const { settings } = useStoreSettings()
  const router = useRouter()
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [reportDialogOpen, setReportDialogOpen] = useState(false)
  const [reportMessage, setReportMessage] = useState("")
  const [reportProductId, setReportProductId] = useState<string | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [showDiscordDialog, setShowDiscordDialog] = useState(false)
  const [reviewText, setReviewText] = useState("")
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewAnonymous, setReviewAnonymous] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  
  const order = orders.find(o => o.id === id && o.customerEmail.toLowerCase() === user?.email?.toLowerCase())
  
  if (!order) {
    if (!isLoaded) {
      return (
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-gray-600">
            Loading order details...
          </div>
        </div>
      )
    }

    notFound()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered": 
      case "completed": return <CheckCircle className="w-5 h-5 text-green-500" />
      case "processing": return <AlertCircle className="w-5 h-5 text-blue-500" />
      case "pending": return <Clock className="w-5 h-5 text-yellow-500" />
      case "cancelled": 
      case "refunded": return <XCircle className="w-5 h-5 text-red-500" />
      default: return <Clock className="w-5 h-5 text-gray-500" />
    }
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

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success("Copied to clipboard!")
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleReport = () => {
    if (!user || !reportMessage.trim()) return
    
    const product = order.products.find(p => p.productId === reportProductId)
    const subject = `Report: Order ${order.id} - ${product?.name || 'Product Issue'}`
    
    addTicket({
      userId: user.id,
      name: user.name,
      email: user.email,
      type: "Order",
      subject,
      message: reportMessage
    })
    
    toast.success("Report submitted! Our team will review it shortly.")
    setReportDialogOpen(false)
    setReportMessage("")
    setReportProductId(null)
  }

  const handleMarkReceived = async () => {
    if (!order) return
    try {
      await updateOrderStatus(order.id, "completed")
      toast.success("Order marked as received.")
      setShowReviewDialog(true)
    } catch (err) {
      toast.error("Unable to update order status.")
    }
  }

  const handleCancelOrder = async () => {
    if (!order) return
    try {
      await updateOrderStatus(order.id, "cancelled")
      toast.success("Order cancelled.")
    } catch (err) {
      toast.error("Unable to cancel order.")
    }
  }

  const handleSubmitReview = async () => {
    if (!user) return

    const tempId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `temp-${crypto.randomUUID()}`
      : `temp-${Date.now()}-${Math.floor(Math.random() * 10000)}`

    await addReview({
      id: tempId,
      productId: order.products[0]?.productId ?? "",
      orderId: order.id,
      productName: order.products[0]?.name ?? "",
      customerName: reviewAnonymous ? getAnonymousInitials(user?.name ?? "Anonymous") : user.name ?? "Anonymous",
      anonymous: reviewAnonymous,
      rating: reviewRating,
      title: reviewRating >= 5 ? "Excellent!" : reviewRating >= 4 ? "Great Experience" : "Good Service",
      text: reviewText,
      date: new Date().toISOString(),
      verified: true,
      helpful: 0,
      status: "pending"
    })

    toast.success("Review submitted. Thank you!")
    setShowReviewDialog(false)
    setReviewText("")
    setReviewRating(5)
    setReviewAnonymous(false)
    setReviewSubmitted(true)
    setShowDiscordDialog(true)
  }

  const handleCloseReviewDialog = () => {
    if (!reviewSubmitted) {
      setShowDiscordDialog(true)
    }
    setShowReviewDialog(false)
  }

  const handleReviewDialogOpenChange = (open: boolean) => {
    if (!open && showReviewDialog && !reviewSubmitted) {
      setShowDiscordDialog(true)
    }
    setShowReviewDialog(open)
  }

  const openReportDialog = (productId: string) => {
    setReportProductId(productId)
    setReportDialogOpen(true)
  }

  // Check if order has any delivered products
  const hasDeliveryInfo = order.products.some(p => p.deliveryInfo)
  const isDelivered = order.status === "delivered" || order.status === "completed"
  const isCancelable = !["completed", "cancelled", "refunded", "rejected"].includes(order.status)
  const canMarkReceived = order.status === "delivered"
  const canLeaveReview = order.status === "completed" && !order.reviewId && !reviewSubmitted

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/account/orders" className="inline-flex items-center gap-2 text-gray-600 hover:text-black mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Orders
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Order {order.id}</h1>
            <p className="text-gray-500">
              Placed on {new Date(order.date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
              })}
            </p>
          </div>
          <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
            {getStatusIcon(order.status)}
            {getStatusLabel(order.status)}
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.products.map((product, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-gray-500">Quantity: {product.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${product.price.toFixed(2)}</p>
                        {product.hasVerification && product.verificationPrice !== undefined && (
                          <p className="text-sm text-gray-500">Verification: ${product.verificationPrice.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Delivery Info */}
                    {product.deliveryInfo && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-green-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Account Delivered
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => copyToClipboard(product.deliveryInfo!, `delivery-${index}`)}
                            >
                              {copiedField === `delivery-${index}` ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span className="ml-1">Copy</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-orange-600 hover:text-orange-700"
                              onClick={() => openReportDialog(product.productId)}
                            >
                              <Flag className="w-3 h-3 mr-1" />
                              Report Issue
                            </Button>
                          </div>
                        </div>
                        <pre className="text-sm font-mono bg-white p-2 rounded border border-green-100 whitespace-pre-wrap break-all">
                          {product.deliveryInfo}
                        </pre>
                      </div>
                    )}
                    
                    {/* No delivery info yet */}
                    {!product.deliveryInfo && isDelivered && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-700">
                          Delivery info pending. Please contact support if not received within 24 hours.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {order.verificationAdded && (
                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Verification Added</span>
                    <span>Included</span>
                  </div>
                </div>
              )}
              
              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total</span>
                  <span style={{ color: settings.primaryColor }}>${order.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Status Info */}
          {order.status === "pending" && (
            <Card className="border-yellow-200 bg-yellow-50/50">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <Clock className="w-6 h-6 text-yellow-600 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-yellow-800">Awaiting Payment Confirmation</h3>
                    <p className="text-sm text-yellow-700">
                      Your order is pending payment confirmation. Once payment is verified, we will process your order.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


          {order.status === "processing" && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-blue-600 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-800">Order Processing</h3>
                    <p className="text-sm text-blue-700">
                      We are preparing your account. This usually takes 1-2 hours. You will be notified when ready.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(order.status === "delivered" || order.status === "completed") && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="py-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-green-800">Order Delivered</h3>
                      <p className="text-sm text-green-700">
                        Your account credentials have been delivered! Check the items above for your login details.
                        {order.deliveryDate && (
                          <span className="block mt-1 text-xs">
                            Delivered on {new Date(order.deliveryDate).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canMarkReceived && (
                      <Button onClick={handleMarkReceived} className="bg-green-600 text-white hover:bg-green-700">
                        <Check className="w-4 h-4 mr-1" />
                        Order Received
                      </Button>
                    )}
                    {canLeaveReview && (
                      <Button onClick={() => setShowReviewDialog(true)} className="bg-purple-600 text-white hover:bg-purple-700">
                        <Star className="w-4 h-4 mr-1" />
                        Leave a Positive Review
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isCancelable && order.status !== "delivered" && (
            <Card className="border-orange-200 bg-orange-50/50">
              <CardContent className="py-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-orange-800">Need to cancel?</h3>
                    <p className="text-sm text-orange-700">
                      You can cancel this order if it has not been marked as delivered yet.
                    </p>
                  </div>
                  <Button variant="outline" className="text-orange-700 border-orange-300" onClick={handleCancelOrder}>
                    <XSquare className="w-4 h-4 mr-1" />
                    Cancel Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Support Link */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Need help with this order?</h3>
                  <p className="text-sm text-gray-500">Our support team is here to assist you</p>
                </div>
                <Link href="/account/support">
                  <Button variant="outline">Contact Support</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Report Issue Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
            <DialogDescription>
              Please describe the issue with your delivered account. Our team will review and respond within 24 hours.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="report-message">Describe the issue</Label>
              <Textarea
                id="report-message"
                placeholder="Please explain what's wrong with the account..."
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleReport}
                disabled={!reportMessage.trim()}
                style={{ backgroundColor: settings.primaryColor }}
                className="text-white"
              >
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leave Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={handleReviewDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <DialogTitle>Leave a Positive Review</DialogTitle>
            </div>
            <DialogDescription>
              Share your experience. You can post anonymously or with your name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="text-2xl"
                  >
                    <Star className={star <= reviewRating ? "text-yellow-500" : "text-gray-300"} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="review-text">Review</Label>
              <Textarea
                id="review-text"
                placeholder="Write your review..."
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="mt-2 min-h-[100px]"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                id="anonymous-review"
                type="checkbox"
                checked={reviewAnonymous}
                onChange={(e) => setReviewAnonymous(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <Label htmlFor="anonymous-review" className="text-sm">
                Post anonymously
              </Label>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleCloseReviewDialog}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                style={{ backgroundColor: settings.primaryColor }}
                className="text-white"
              >
                Submit Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDiscordDialog} onOpenChange={setShowDiscordDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.08.037 13.865 13.865 0 00-.603 1.24 18.736 18.736 0 00-5.642 0 13.102 13.102 0 00-.612-1.24.077.077 0 00-.08-.037 19.736 19.736 0 00-4.885 1.515.069.069 0 00-.032.027C2.396 9.053 1.444 13.55 1.783 18.001a.095.095 0 00.037.058 19.977 19.977 0 006.129 3.021.077.077 0 00.084-.027c.472-.65.894-1.337 1.259-2.058a.076.076 0 00-.041-.105 12.37 12.37 0 01-1.78-.839.077.077 0 01-.008-.128c.12-.09.24-.183.356-.278a.075.075 0 01.079-.01c3.742 1.714 7.771 1.714 11.449 0a.073.073 0 01.08.009c.116.095.236.188.356.278a.077.077 0 01-.006.128 12.084 12.084 0 01-1.782.84.076.076 0 00-.04.105c.36.72.782 1.407 1.259 2.057a.077.077 0 00.084.028 19.949 19.949 0 006.128-3.02.076.076 0 00.037-.059c.5-5.177-.838-9.615-2.975-13.605a.061.061 0 00-.03-.028ZM8.02 15.331c-1.183 0-2.156-1.085-2.156-2.419 0-1.334.955-2.418 2.156-2.418 1.21 0 2.175 1.1 2.156 2.419 0 1.34-.955 2.418-2.156 2.418Zm7.974 0c-1.183 0-2.156-1.085-2.156-2.419 0-1.334.955-2.418 2.156-2.418 1.21 0 2.175 1.1 2.156 2.419 0 1.34-.946 2.418-2.156 2.418Z" />
                </svg>
              </span>
              <DialogTitle>Join our Discord community</DialogTitle>
            </div>
            <DialogDescription>
              Stay updated on restocks, exclusive offers, and support.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">
              Join our Discord community to get the latest updates and connect with other customers.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDiscordDialog(false)}>
                Not now
              </Button>
              <Button
                onClick={() => {
                  if (settings.storeDiscordLink) {
                    window.open(settings.storeDiscordLink, "_blank", "noopener,noreferrer")
                  }
                  setShowDiscordDialog(false)
                }}
                style={{ backgroundColor: settings.primaryColor }}
                className="text-white"
              >
                <span className="inline-flex w-4 h-4 items-center justify-center mr-2">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.08.037 13.865 13.865 0 00-.603 1.24 18.736 18.736 0 00-5.642 0 13.102 13.102 0 00-.612-1.24.077.077 0 00-.08-.037 19.736 19.736 0 00-4.885 1.515.069.069 0 00-.032.027C2.396 9.053 1.444 13.55 1.783 18.001a.095.095 0 00.037.058 19.977 19.977 0 006.129 3.021.077.077 0 00.084-.027c.472-.65.894-1.337 1.259-2.058a.076.076 0 00-.041-.105 12.37 12.37 0 01-1.78-.839.077.077 0 01-.008-.128c.12-.09.24-.183.356-.278a.075.075 0 01.079-.01c3.742 1.714 7.771 1.714 11.449 0a.073.073 0 01.08.009c.116.095.236.188.356.278a.077.077 0 01-.006.128 12.084 12.084 0 01-1.782.84.076.076 0 00-.04.105c.36.72.782 1.407 1.259 2.057a.077.077 0 00.084.028 19.949 19.949 0 006.128-3.02.076.076 0 00.037-.059c.5-5.177-.838-9.615-2.975-13.605a.061.061 0 00-.03-.028ZM8.02 15.331c-1.183 0-2.156-1.085-2.156-2.419 0-1.334.955-2.418 2.156-2.418 1.21 0 2.175 1.1 2.156 2.419 0 1.34-.955 2.418-2.156 2.418Zm7.974 0c-1.183 0-2.156-1.085-2.156-2.419 0-1.334.955-2.418 2.156-2.418 1.21 0 2.175 1.1 2.156 2.419 0 1.34-.946 2.418-2.156 2.418Z" />
                  </svg>
                </span>
                Join Discord
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
