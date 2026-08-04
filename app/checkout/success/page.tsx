"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { useUserAuth } from "@/lib/user-auth-context"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, Mail, Clock, MessageCircle, ArrowRight, AlertCircle, Star, Send } from "lucide-react"
import { Suspense } from "react"
import { useStoreData } from "@/lib/store-data-context"

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isPending = searchParams.get('pending') === 'true'
  const orderId = searchParams.get('orderId')
  const { user, isAuthenticated, isLoading } = useUserAuth()
  const { addReview } = useStoreData()

  const clearCheckoutState = () => {
    // No client-side persistence for checkout state.
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated && isPending) {
      router.push("/login")
    }
  }, [isLoading, isAuthenticated, isPending, router])

  
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [rating, setRating] = useState(5)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [reviewText, setReviewText] = useState("")
  const [reviewerName, setReviewerName] = useState("")
  
  const handleSubmitReview = () => {
    if (!reviewerName.trim()) return
    
    const review = {
      id: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `temp-${crypto.randomUUID()}`
        : `temp-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
      productId: "general",
      productName: "Purchase Experience",
      customerName: reviewerName,
      title: rating >= 5 ? "Excellent!" : rating >= 4 ? "Great Experience" : "Good Service",
      rating,
      text: reviewText,
      date: new Date().toISOString(),
      verified: true,
      helpful: 0,
      status: "pending" as const
    }
    
    addReview(review)
    setReviewSubmitted(true)
    setShowReviewForm(false)
  }
  
  return (
    <div className="max-w-2xl mx-auto text-center px-6 py-8 sm:px-0">
      <div className={`w-28 h-28 ${isPending ? 'bg-amber-100' : 'bg-[#25F4EE]/10'} rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-black/5`}>
        {isPending ? (
          <AlertCircle className="w-14 h-14 text-amber-500" />
        ) : (
          <CheckCircle className="w-14 h-14 text-[#25F4EE]" />
        )}
      </div>
      
      <h1 className="text-5xl md:text-6xl font-bold text-black mb-4 leading-tight">
        {isPending ? 'Order Submitted!' : 'Payment Successful!'}
      </h1>
      <p className={`text-xl md:text-2xl ${isPending ? 'text-amber-900' : 'text-gray-600'} mb-4`}>
        {isPending 
          ? 'Your order is pending payment confirmation. We will verify your payment and process your order shortly.'
          : 'Thank you for your purchase. Your account transfer is now being processed.'
        }
      </p>
      
      {orderId && (
        <div className={`inline-block rounded-3xl px-6 py-4 mb-8 ${isPending ? 'bg-amber-50 border border-amber-200' : 'bg-gray-100'} text-left`}>
          <p className="text-sm text-gray-500">Order Reference</p>
          <p className="font-mono font-bold text-black">{orderId}</p>
        </div>
      )}
      
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 text-left">
          <h3 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Payment Verification in Progress
          </h3>
          <p className="text-amber-800 text-sm">
            Our team will verify your payment within 1-24 hours. Once confirmed, you will receive an email with your account details. 
            If you have any questions, please contact our support team with your order reference.
          </p>
        </div>
      )}
      
      <div className="bg-gray-50 rounded-3xl p-8 mb-8">
        <h2 className="text-xl font-bold text-black mb-6">What happens next?</h2>
        
        <div className="space-y-6 text-left">
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-[#FE2C55] rounded-full flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-black">Check Your Email</h3>
              <p className="text-gray-600 text-sm">
                You&apos;ll receive a confirmation email with your order details and next steps within the next few minutes.
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-[#25F4EE] rounded-full flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="font-bold text-black">Account Transfer</h3>
              <p className="text-gray-600 text-sm">
                Our team will begin the secure transfer process. TikTok accounts take 24-48 hours, YouTube accounts take 48-72 hours.
              </p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-black">Support Available</h3>
              <p className="text-gray-600 text-sm">
                Have questions? Our support team is available 24/7 to help you through the transfer process.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Review Section */}
      {!isPending && !reviewSubmitted && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8">
          {!showReviewForm ? (
            <div className="text-center">
              <Star className="w-8 h-8 text-[#FE2C55] mx-auto mb-3" />
              <h3 className="font-bold text-black mb-2">Leave a Review</h3>
              <p className="text-gray-600 text-sm mb-4">Help others by sharing your experience</p>
              <Button 
                onClick={() => setShowReviewForm(true)}
                className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full"
              >
                Write a Review
              </Button>
            </div>
          ) : (
            <div className="text-left space-y-4">
              <h3 className="font-bold text-black text-center mb-4">Share Your Experience</h3>
              
              {/* Star Rating */}
              <div>
                <Label className="text-sm text-gray-600 mb-2 block">Your Rating</Label>
                <div className="flex gap-1 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star 
                        className={`w-8 h-8 ${
                          star <= (hoveredRating || rating) 
                            ? "fill-[#FE2C55] text-[#FE2C55]" 
                            : "text-gray-300"
                        }`} 
                      />
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Name */}
              <div>
                <Label htmlFor="reviewerName" className="text-sm text-gray-600">Your Name</Label>
                <input
                  id="reviewerName"
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="John D."
                  className="w-full mt-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FE2C55]/20 focus:border-[#FE2C55]"
                />
              </div>
              
              {/* Review Text */}
              <div>
                <Label htmlFor="reviewText" className="text-sm text-gray-600">Your Review</Label>
                <Textarea
                  id="reviewText"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Tell us about your experience..."
                  className="mt-1 min-h-25"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowReviewForm(false)}
                  className="flex-1 rounded-full"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitReview}
                  disabled={!reviewerName.trim()}
                  className="flex-1 bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Review
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Review Submitted Confirmation */}
      {reviewSubmitted && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-3" />
          <h3 className="font-bold text-green-900 mb-2">Thank You for Your Review!</h3>
          <p className="text-green-700 text-sm">
            Your review has been submitted and is pending approval. It will appear on our website once reviewed by our team.
          </p>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/shop">
          <Button onClick={clearCheckoutState} variant="outline" className="rounded-full px-8">
            Continue Shopping
          </Button>
        </Link>
        <Link href="/contact">
          <Button onClick={clearCheckoutState} className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full px-8">
            Contact Support
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="py-16">
        <div className="container mx-auto px-4">
          <Suspense fallback={<div className="text-center">Loading...</div>}>
            <SuccessContent />
          </Suspense>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
