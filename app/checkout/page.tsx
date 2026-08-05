"use client"

import { useState, useMemo, Suspense, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCart } from "@/lib/cart-context"
import { useStoreSettings } from "@/lib/store-settings-context"
import { useStoreData } from "@/lib/store-data-context"
import { useUserAuth } from "@/lib/user-auth-context"
import { usePendingAction } from "@/lib/pending-action-context"
import { useReferral } from "@/lib/referral-context"
import { apiPath, authHeaders, apiFetch } from "@/lib/api"
import { formatPrice } from "@/lib/data"
import { formatFollowers } from "@/lib/utils"
import { ArrowLeft, Shield, Lock, CreditCard, CheckCircle, Copy, ExternalLink, Clock, Bitcoin, Plus, Minus, AlertTriangle } from "lucide-react"
import { toast } from 'sonner'

function CheckoutPageContent() {
  const searchParams = useSearchParams()
  const buyNowParam = searchParams.get('buyNow') ?? searchParams.get('buynow')
  const isBuyNow = buyNowParam?.toLowerCase() === 'true'
  const { items, getTotal, clearCart, toggleVerification, setVerificationCount, updateQuantity, buyNowItem, setBuyNowItem, clearBuyNowItem, toggleBuyNowVerification, setBuyNowVerificationCount, getBuyNowTotal, updateBuyNowQuantity } = useCart()
  const { settings } = useStoreSettings()
  const { addOrder, addOrUpdateCustomer } = useStoreData()
  const { user, isAuthenticated, isLoading, redirectToLogin } = useUserAuth()
  const { referralCode } = useReferral()
  const { pendingAction, savePendingAction, clearPendingAction } = usePendingAction()
  const [fallbackBuyNowItem, setFallbackBuyNowItem] = useState<typeof buyNowItem>(null)
  const [isBuyNowLoading, setIsBuyNowLoading] = useState(isBuyNow)

  const normalizeBuyNowItem = (item: any) => {
    const quantity = Math.max(1, Number(item?.quantity) || 1)
    const verificationCount = Math.max(0, Math.min(Number(item?.verificationCount ?? 0), quantity))
    return {
      ...item,
      quantity,
      verificationCount,
      addVerification: Boolean(item?.addVerification || verificationCount > 0)
    }
  }

  useEffect(() => {
    if (!isBuyNow) {
      setFallbackBuyNowItem(null)
      setIsBuyNowLoading(false)
      return
    }

    if (isBuyNow && buyNowItem) {
      setFallbackBuyNowItem(buyNowItem)
      setIsBuyNowLoading(false)
      return
    }

    const savedCheckoutState = typeof window !== 'undefined'
      ? window.sessionStorage.getItem(CHECKOUT_PENDING_STORAGE_KEY)
      : null

    if (savedCheckoutState) {
      try {
        const parsed = JSON.parse(savedCheckoutState)
        if (parsed?.buyNowItem) {
          setFallbackBuyNowItem(normalizeBuyNowItem(parsed.buyNowItem))
        }
        if (parsed?.pendingCheckoutItems) {
          setPendingCheckoutItems(parsed.pendingCheckoutItems)
        }
      } catch (error) {
        console.warn('Failed to restore buy now item from storage', error)
      }
    }

    setIsBuyNowLoading(false)
  }, [isBuyNow, buyNowItem, setBuyNowItem])

  const effectiveBuyNowItem = buyNowItem || fallbackBuyNowItem
  const [pendingCheckoutItems, setPendingCheckoutItems] = useState<PendingCheckoutItem[]>([])

  type PendingCheckoutItem = { account: any; quantity: number; verificationCount: number }

  const checkoutItems = useMemo<any[]>(() => {
    if (isBuyNow) {
      return effectiveBuyNowItem ? [effectiveBuyNowItem] : []
    }
    if (items.length === 0) {
      return pendingCheckoutItems
    }
    return items
  }, [isBuyNow, effectiveBuyNowItem, items, pendingCheckoutItems])

  const total = isBuyNow
    ? (effectiveBuyNowItem ? effectiveBuyNowItem.account.price * effectiveBuyNowItem.quantity + effectiveBuyNowItem.verificationCount * effectiveBuyNowItem.account.verificationPrice : 0)
    : items.length > 0
    ? getTotal()
    : pendingCheckoutItems.reduce((sum: number, item: PendingCheckoutItem) => sum + ((item.account.price ?? 0) * item.quantity) + (item.verificationCount * (item.account.verificationPrice ?? 0)), 0)
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [selectedCrypto, setSelectedCrypto] = useState<string>("")
  const [selectedNetwork, setSelectedNetwork] = useState<string>("")
  const [showPaymentWarning, setShowPaymentWarning] = useState(false)
  const [showPendingConfirmation, setShowPendingConfirmation] = useState(false)
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (!showPendingConfirmation || typeof window === 'undefined') return

    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      document.documentElement.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const timer = window.setTimeout(scrollToTop, 80)
    return () => window.clearTimeout(timer)
  }, [showPendingConfirmation])
  const [copied, setCopied] = useState(false)
  const hasMounted = useRef(false)
  const pendingOrderIdRef = useRef<string | null>(null)
  const pendingOrderCancelRef = useRef(false)
  const CHECKOUT_PENDING_STORAGE_KEY = 'checkout_pending_state_v1'

  const [formData, setFormData] = useState({
    email: user?.email || "",
    firstName: user?.name?.split(' ')[0] || "",
    lastName: user?.name?.split(' ').slice(1).join(' ') || "",
    cardNumber: "",
    expiry: "",
    cvc: "",
    agreeToTerms: false
  })
  const [pendingCheckoutAction, setPendingCheckoutAction] = useState(false)
  const { paymentSettings } = settings

  const persistPendingConfirmationState = (orderId: string, paymentMethod: string, selectedCrypto?: string, selectedNetwork?: string) => {
    setPendingOrderId(orderId)
    setShowPendingConfirmation(true)
  }

  const clearPendingConfirmationState = () => {
    setPendingOrderId(null)
    setShowPendingConfirmation(false)
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(CHECKOUT_PENDING_STORAGE_KEY)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const storedState = window.sessionStorage.getItem(CHECKOUT_PENDING_STORAGE_KEY)
      if (!storedState) return
      const parsed = JSON.parse(storedState)
      if (parsed?.pendingOrderId) {
        setPendingOrderId(parsed.pendingOrderId)
      }
      if (parsed?.showPendingConfirmation) {
        setShowPendingConfirmation(true)
      }
      if (parsed?.selectedCrypto) {
        setSelectedCrypto(parsed.selectedCrypto)
      }
      if (parsed?.selectedNetwork) {
        setSelectedNetwork(parsed.selectedNetwork)
      }
      if (parsed?.buyNowItem) {
        setFallbackBuyNowItem(normalizeBuyNowItem(parsed.buyNowItem))
      }
      if (parsed?.pendingCheckoutItems) {
        setPendingCheckoutItems(parsed.pendingCheckoutItems)
      }
      if (parsed?.formData) {
        setFormData(prev => ({
          ...prev,
          email: parsed.formData.email || prev.email,
          firstName: parsed.formData.firstName || prev.firstName,
          lastName: parsed.formData.lastName || prev.lastName,
          agreeToTerms: parsed.formData.agreeToTerms ?? prev.agreeToTerms
        }))
      }
    } catch (error) {
      console.warn('Failed to restore checkout pending state', error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const payload = {
      pendingOrderId,
      showPendingConfirmation,
      paymentMethod,
      selectedCrypto,
      selectedNetwork,
      buyNowItem: effectiveBuyNowItem || null,
      pendingCheckoutItems,
      formData: {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        agreeToTerms: formData.agreeToTerms
      }
    }
    window.sessionStorage.setItem(CHECKOUT_PENDING_STORAGE_KEY, JSON.stringify(payload))
  }, [pendingOrderId, showPendingConfirmation, paymentMethod, selectedCrypto, selectedNetwork, effectiveBuyNowItem, pendingCheckoutItems, formData.email, formData.firstName, formData.lastName, formData.agreeToTerms])

  const cancelPendingOrder = async (orderId: string | null) => {
    if (!orderId) return

    try {
      await apiFetch(apiPath(`/orders/${orderId}/status`), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'cancelled' })
      })
    } catch (error) {
      console.warn("Failed to cancel pending order", error)
    }
  }

  // Restore checkout state after login
  useEffect(() => {
    if (user && isAuthenticated && !pendingCheckoutAction && !isLoading) {
      setFormData(prev => ({
        ...prev,
        email: user.email,
        firstName: user.name?.split(' ')[0] || prev.firstName,
        lastName: user.name?.split(' ').slice(1).join(' ') || prev.lastName
      }))
    }
  }, [user, isAuthenticated, pendingCheckoutAction, isLoading])

  useEffect(() => {
    hasMounted.current = true
    return () => {
      if (pendingOrderCancelRef.current && pendingOrderIdRef.current) {
        clearPendingConfirmationState()
        cancelPendingOrder(pendingOrderIdRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!pendingAction || pendingAction.type !== 'checkout' || !pendingAction.data) return
    const savedAutoSubmit = typeof window !== 'undefined'
      ? window.sessionStorage.getItem('checkout_login_auto_submit')
      : null

    if (pendingAction.data.checkoutItems && pendingAction.data.checkoutItems.length > 0 && items.length === 0) {
      setPendingCheckoutItems(pendingAction.data.checkoutItems.map((item: any) => ({
        account: item.account,
        quantity: item.quantity,
        verificationCount: item.verificationCount
      })))
    }

    if (pendingAction.data.isBuyNow && pendingAction.data.checkoutItems?.length === 1 && !effectiveBuyNowItem) {
      setFallbackBuyNowItem(normalizeBuyNowItem(pendingAction.data.checkoutItems[0]))
    }

    if (pendingAction.data.formData) {
      setFormData(prev => ({
        ...prev,
        email: pendingAction.data.formData.email || prev.email,
        firstName: pendingAction.data.formData.firstName || prev.firstName,
        lastName: pendingAction.data.formData.lastName || prev.lastName,
        agreeToTerms: pendingAction.data.formData.agreeToTerms ?? prev.agreeToTerms
      }))
    }

    if (pendingAction.data.selectedCrypto) {
      setSelectedCrypto(pendingAction.data.selectedCrypto)
    }
    if (pendingAction.data.selectedNetwork) {
      setSelectedNetwork(pendingAction.data.selectedNetwork)
    }

    if (savedAutoSubmit === '1' && isAuthenticated && !isLoading && !isProcessing) {
      window.sessionStorage.removeItem('checkout_login_auto_submit')
      setPendingCheckoutAction(true)
      void handleCheckoutSubmit(pendingAction.data.paymentMethod || paymentMethod)
    }
  }, [pendingAction, isAuthenticated, isLoading, isProcessing, items.length, effectiveBuyNowItem, paymentMethod])

  const hasPayPalLink = paymentSettings.paypalLinkEnabled
  const hasPayPalApi = paymentSettings.paypalApiEnabled
  const hasPayPalLegacy = paymentSettings.paypalEnabled && !hasPayPalLink && !hasPayPalApi
  const effectivePayPalEnabled = hasPayPalLink || hasPayPalApi || hasPayPalLegacy

  const normalizeExternalUrl = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return ""
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
      return trimmed
    }
    if (trimmed.startsWith('//')) {
      return `https:${trimmed}`
    }
    return `https://${trimmed}`
  }

  const isPayPalMethod = (method: string) => method === 'paypal' || method === 'paypal_link' || method === 'paypal_api'

  // Get available payment methods
  const availablePaymentMethods = []
  if (paymentSettings.creditCardEnabled) availablePaymentMethods.push('card')
  if (hasPayPalLink) availablePaymentMethods.push('paypal_link')
  if (hasPayPalApi) availablePaymentMethods.push('paypal_api')
  if (hasPayPalLegacy) availablePaymentMethods.push('paypal')
  if (paymentSettings.cryptoEnabled && paymentSettings.cryptoCurrencies.length > 0) availablePaymentMethods.push('crypto')

  // Get selected crypto currency and network details
  const selectedCryptoCurrency = paymentSettings.cryptoCurrencies.find(c => c.name === selectedCrypto)
  const selectedNetworkData = selectedCryptoCurrency?.networks.find(n => n.network === selectedNetwork)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Availability checks for methods (true only if configured)
  const paypalLinkConfigured = hasPayPalLink && typeof paymentSettings.paypalLink === 'string' && paymentSettings.paypalLink.trim() !== ''
  const paypalApiConfigured = hasPayPalApi && typeof paymentSettings.paypalApiUrl === 'string' && paymentSettings.paypalApiUrl.trim() !== ''
  const creditCardConfigured = paymentSettings.creditCardEnabled && typeof paymentSettings.stripeApiUrl === 'string' && paymentSettings.stripeApiUrl.trim() !== ''
  const cryptoConfigured = paymentSettings.cryptoEnabled && Array.isArray(paymentSettings.cryptoCurrencies) && paymentSettings.cryptoCurrencies.some(c => Array.isArray(c.networks) && c.networks.some(n => typeof n.address === 'string' && n.address.trim() !== ''))

  const isMethodConfigured = (method: string) => {
    if (method === 'paypal_link') return paypalLinkConfigured
    if (method === 'paypal_api') return paypalApiConfigured
    if (method === 'paypal') return paypalLinkConfigured || paypalApiConfigured || hasPayPalLegacy
    if (method === 'card') return creditCardConfigured
    if (method === 'crypto') return cryptoConfigured
    return false
  }

  const getCheckoutItemsForSubmission = () => {
    if (isBuyNow) {
      if (effectiveBuyNowItem) {
        return [effectiveBuyNowItem]
      }

      return []
    }

    if (items.length === 0) {
      return pendingCheckoutItems
    }

    return items
  }

  // Create order via backend REST API
  const createOrderAndCustomer = async (status: "pending" | "processing" | "completed", paymentMethodLabel: string, referralCodeOverride?: string) => {
    try {
      const pendingTargetPage = `${window.location.pathname}${window.location.search}`
      const submissionItems = getCheckoutItemsForSubmission()
      const orderReferralCode = referralCodeOverride || referralCode || undefined

      // Check if user is authenticated
      if (!user || isLoading) {
        if (isLoading) {
          // Auth is still loading, don't process yet
          return null
        }

        // Save the pending checkout action with all current form data
        const checkoutData = {
          status,
          paymentMethodLabel,
          formData,
          paymentMethod,
          selectedCrypto,
          selectedNetwork,
          referralCode: orderReferralCode,
          isBuyNow,
          checkoutItems: submissionItems.map((item: any) => ({
            productId: item.account.id,
            account: item.account,
            quantity: item.quantity,
            verificationCount: item.verificationCount,
            verificationUnitPrice: item.account.verificationPrice ?? 0,
            price: item.account.price ?? 0
          })),
          total
        }
        
        savePendingAction({
          type: "checkout",
          data: checkoutData,
          targetPage: pendingTargetPage || "/checkout"
        })
        
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('checkout_login_auto_submit', '1')
        }
        redirectToLogin(pendingTargetPage)
        return null
      }

      const orderData = {
        items: submissionItems.map((item: any) => ({
          productId: item.account.id,
          quantity: item.quantity,
          verificationCount: item.verificationCount,
          verificationUnitPrice: item.account.verificationPrice ?? 0
        })),
        total: total.toString(),
        paymentMethod: paymentMethodLabel,
        referralCode: orderReferralCode
      }

      if (!submissionItems.length) {
        throw new Error("No items provided")
      }

      const response = await apiFetch(apiPath('/orders'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        let errorMessage = 'Failed to create order'
        try {
          const errorData = await response.json()
          errorMessage = errorData?.message || errorMessage
        } catch {
          // ignore parse errors
        }
        throw new Error(errorMessage)
      }

      const order = await response.json()
      return order.id || `ORD-${Date.now().toString(36).toUpperCase()}`
    } catch (error: any) {
      console.error("Error creating order:", error)
      throw error
    }
  }

  // Handle checkout submission (used for both manual and auto-submit)
  const handleCheckoutSubmit = async (method: string, referralCodeOverride?: string, status?: string, methodLabel?: string): Promise<string | undefined> => {
    const paymentMethodToUse = method || paymentMethod
    const statusToUse = status || "processing"
    const methodLabelToUse = methodLabel || (isPayPalMethod(method) ? 'PayPal' : method === 'crypto' ? `Crypto (${selectedCrypto} - ${selectedNetwork})` : 'Credit Card')

    // Prevent proceeding with an unconfigured payment method
    if (!isMethodConfigured(paymentMethodToUse)) {
      try {
        toast.error('This payment method is currently unavailable. Please choose another method.')
      } catch (e) {
        alert('This payment method is currently unavailable. Please choose another method.')
      }
      return
    }

    if (isPayPalMethod(paymentMethodToUse)) {
      // Create order first, then open PayPal
      try {
        setIsProcessing(true)
        const orderId = await createOrderAndCustomer("pending", "PayPal", referralCodeOverride)
        if (!orderId) {
          // User is not authenticated, will be redirected by createOrderAndCustomer
          setIsProcessing(false)
          return
        }
        const payPalDestinationUrl = paymentMethodToUse === 'paypal_link'
          ? paymentSettings.paypalLink
          : paymentMethodToUse === 'paypal_api'
          ? paymentSettings.paypalApiUrl
          : paymentSettings.paypalLinkEnabled
          ? paymentSettings.paypalLink
          : paymentSettings.paypalApiEnabled
          ? paymentSettings.paypalApiUrl
          : ""

        const normalizedPayPalUrl = normalizeExternalUrl(payPalDestinationUrl)

        if (!normalizedPayPalUrl) {
          throw new Error("PayPal is not configured correctly")
        }

        setPendingOrderId(orderId)
        pendingOrderIdRef.current = orderId
        pendingOrderCancelRef.current = true
        window.open(normalizedPayPalUrl, '_blank')
        setShowPendingConfirmation(true)
        persistPendingConfirmationState(orderId, 'paypal')
        setPendingCheckoutAction(false)
        setIsProcessing(false)
      } catch (error: any) {
        console.error("Error creating order:", error)
        alert(error?.message || "Failed to create order. Please try again.")
        setIsProcessing(false)
      }
      return
    }

    if (paymentMethodToUse === 'crypto') {
      // Create order first, then show pending confirmation
      try {
        setIsProcessing(true)
        const orderId = await createOrderAndCustomer("pending", `Crypto (${selectedCrypto} - ${selectedNetwork})`, referralCodeOverride)
        if (!orderId) {
          // User is not authenticated, will be redirected by createOrderAndCustomer
          setIsProcessing(false)
          return
        }
        setPendingOrderId(orderId)
        pendingOrderIdRef.current = orderId
        pendingOrderCancelRef.current = true
        setShowPendingConfirmation(true)
        persistPendingConfirmationState(orderId, 'crypto', selectedCrypto, selectedNetwork)
        setPendingCheckoutAction(false)
        setIsProcessing(false)
      } catch (error: any) {
        console.error("Error creating order:", error)
        alert("Failed to create order. Please try again.")
        setIsProcessing(false)
      }
      return
    }

    // Credit card payment - create order and proceed to success
    try {
      setIsProcessing(true)
      const orderId = await createOrderAndCustomer("processing", "Credit Card", referralCodeOverride)
      if (!orderId) {
        // User is not authenticated, will be redirected by createOrderAndCustomer
        setIsProcessing(false)
        return
      }
      // Clear the appropriate cart based on checkout mode
      if (isBuyNow) {
        clearBuyNowItem()
      } else {
        clearCart()
      }
      clearPendingConfirmationState()
      setPendingCheckoutAction(false)
      router.push(`/checkout/success?orderId=${orderId}`)
    } catch (error: any) {
      console.error("Error processing payment:", error)
      alert("Failed to process payment. Please try again.")
      setIsProcessing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const manualPayment = paymentMethod === 'paypal' || paymentMethod === 'paypal_link' || paymentMethod === 'paypal_api' || paymentMethod === 'crypto'
    if (manualPayment) {
      setShowPaymentWarning(true)
      return
    }
    await handleCheckoutSubmit(paymentMethod)
  }

  const handleConfirmWarning = async () => {
    setShowPaymentWarning(false)
    await handleCheckoutSubmit(paymentMethod)
  }

  const handleConfirmPaymentSent = async () => {
    let confirmedOrderId = pendingOrderId

    try {
      if (!confirmedOrderId) {
        setIsProcessing(true)
        const orderId = await createOrderAndCustomer("pending", paymentMethod === 'paypal' ? 'PayPal' : `Crypto (${selectedCrypto} - ${selectedNetwork})`)
        confirmedOrderId = orderId || null
        setPendingOrderId(orderId)
        if (orderId) {
          persistPendingConfirmationState(orderId, paymentMethod === 'paypal' ? 'paypal' : 'crypto', selectedCrypto, selectedNetwork)
        }
      }

      pendingOrderCancelRef.current = false
      pendingOrderIdRef.current = null
      setIsProcessing(false)

      // Clear the appropriate cart based on checkout mode
      if (isBuyNow) {
        clearBuyNowItem()
      } else {
        clearCart()
      }

      clearPendingConfirmationState()
      setPendingCheckoutAction(false)
      if (confirmedOrderId) {
        router.push(`/checkout/success?pending=true&orderId=${encodeURIComponent(confirmedOrderId)}`)
      } else {
        router.push(`/checkout/success?pending=true`)
      }
    } catch (error: any) {
      console.error("Error confirming payment:", error)
      alert("Failed to confirm payment. Please try again.")
      setIsProcessing(false)
    }
  }

  const handleLeaveCheckout = (href: string) => {
    clearPendingConfirmationState()
    clearPendingAction()
    setPendingCheckoutAction(false)
    setShowPendingConfirmation(false)
    setPendingOrderId(null)
    pendingOrderCancelRef.current = false
    pendingOrderIdRef.current = null
    router.push(href)
  }

  if (isBuyNow && isBuyNowLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Loading checkout…</h1>
            <p className="text-gray-600">Retrieving your selected item.</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (checkoutItems.length === 0 && !showPendingConfirmation) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">No item selected</h1>
            <p className="text-gray-600 mb-6">
              {isBuyNow
                ? 'No buy-now item was found. Please select an account from the shop.'
                : 'Your cart is empty.'}
            </p>
            <Link href={isBuyNow ? "/shop" : "/shop"}>
              <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full">
                Browse Accounts
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // No payment methods available
  if (availablePaymentMethods.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Payment Unavailable</h1>
            <p className="text-gray-600 mb-6">No payment methods are currently available. Please contact support.</p>
            <Link href="/contact">
              <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full">
                Contact Support
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="py-6 sm:py-12">
        <div className="container mx-auto px-3 sm:px-4">
          <button
            type="button"
            onClick={() => handleLeaveCheckout(isBuyNow ? "/shop" : "/cart")}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors mb-4 sm:mb-8 text-xs sm:text-sm"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            {isBuyNow ? "Back to Shop" : "Back to Cart"}
          </button>
          
          <div className="grid lg:grid-cols-2 gap-6 sm:gap-12">
            <div className={showPendingConfirmation ? 'lg:col-span-2' : ''}>
              <h1 className="text-2xl sm:text-3xl font-bold text-black mb-4 sm:mb-8">Checkout</h1>
              
              {!showPendingConfirmation ? (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-8">
                {/* Contact Information */}
                <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100">
                  <h2 className="text-base sm:text-xl font-bold text-black mb-3 sm:mb-4">Contact Information</h2>
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        className="rounded-lg mt-1 text-xs sm:text-sm py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">Credentials will be sent to this email</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div>
                        <Label htmlFor="firstName" className="text-xs sm:text-sm">First Name</Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          value={formData.firstName}
                          onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                          required
                          className="rounded-lg mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          value={formData.lastName}
                          onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                          required
                          className="rounded-lg mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Payment Method Selection */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-black">Payment Method</h2>
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Lock className="w-4 h-4" />
                      <span>Secure</span>
                    </div>
                  </div>
                  
                  <RadioGroup value={paymentMethod} onValueChange={(value) => {
                    setPaymentMethod(value)
                    setSelectedCrypto("")
                    setSelectedNetwork("")
                    setShowPendingConfirmation(false)
                  }} className="space-y-3">
                    {/* Credit Card Option */}
                    {paymentSettings.creditCardEnabled && (
                      <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-colors ${paymentMethod === 'card' ? 'border-[#FE2C55] bg-[#FE2C55]/5' : 'border-gray-200 hover:border-gray-300'} ${!creditCardConfigured ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}>
                        <RadioGroupItem value="card" id="card" disabled={!creditCardConfigured} />
                        <Label htmlFor="card" className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-[#635BFF] rounded-lg flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-black">Credit / Debit Card</p>
                            { !creditCardConfigured ? (
                              <p className="text-sm text-red-500">Unavailable</p>
                            ) : (
                              <p className="text-sm text-gray-500">Visa, Mastercard, Amex</p>
                            )}
                          </div>
                        </Label>
                      </div>
                    )}
                    
                    {/* PayPal.me Link Option */}
                    {hasPayPalLink && (
                      <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-colors ${paymentMethod === 'paypal_link' ? 'border-[#FE2C55] bg-[#FE2C55]/5' : 'border-gray-200 hover:border-gray-300'} ${!paypalLinkConfigured ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}>
                        <RadioGroupItem value="paypal_link" id="paypal_link" disabled={!paypalLinkConfigured} />
                        <Label htmlFor="paypal_link" className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-[#003087] rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">PPL</span>
                          </div>
                          <div>
                            <p className="font-medium text-black">PayPal.me Link</p>
                            { !paypalLinkConfigured && <p className="text-sm text-red-500">Unavailable</p> }
                          </div>
                        </Label>
                      </div>
                    )}

                    {/* PayPal API Option */}
                    {hasPayPalApi && (
                      <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-colors ${paymentMethod === 'paypal_api' ? 'border-[#FE2C55] bg-[#FE2C55]/5' : 'border-gray-200 hover:border-gray-300'} ${!paypalApiConfigured ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}>
                        <RadioGroupItem value="paypal_api" id="paypal_api" disabled={!paypalApiConfigured} />
                        <Label htmlFor="paypal_api" className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-[#003087] rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">PPA</span>
                          </div>
                          <div>
                            <p className="font-medium text-black">PayPal</p>
                            { !paypalApiConfigured && <p className="text-sm text-red-500">Unavailable</p> }
                          </div>
                        </Label>
                      </div>
                    )}

                    {/* Legacy PayPal Option */}
                    {hasPayPalLegacy && !hasPayPalLink && !hasPayPalApi && (
                      <div className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-colors ${paymentMethod === 'paypal' ? 'border-[#FE2C55] bg-[#FE2C55]/5' : 'border-gray-200 hover:border-gray-300'} ${!(paypalLinkConfigured || paypalApiConfigured || hasPayPalLegacy) ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}>
                        <RadioGroupItem value="paypal" id="paypal" disabled={!(paypalLinkConfigured || paypalApiConfigured || hasPayPalLegacy)} />
                        <Label htmlFor="paypal" className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-[#003087] rounded-lg flex items-center justify-center">
                            <span className="text-white text-xs font-bold">PP</span>
                          </div>
                          <div>
                            <p className="font-medium text-black">PayPal</p>
                            { !(paypalLinkConfigured || paypalApiConfigured || hasPayPalLegacy) && <p className="text-sm text-red-500">Unavailable</p> }
                          </div>
                        </Label>
                      </div>
                    )}

                    {/* Crypto Option */}
                    {paymentSettings.cryptoEnabled && paymentSettings.cryptoCurrencies.length > 0 && (
                      <div className={`p-4 rounded-xl border-2 transition-colors ${paymentMethod === 'crypto' ? 'border-[#FE2C55] bg-[#FE2C55]/5' : 'border-gray-200 hover:border-gray-300'} ${!cryptoConfigured ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div className={`flex items-center space-x-3 ${!cryptoConfigured ? '' : 'cursor-pointer'}`}>
                          <RadioGroupItem value="crypto" id="crypto" disabled={!cryptoConfigured} />
                          <Label htmlFor="crypto" className={`flex items-center gap-3 ${!cryptoConfigured ? '' : 'cursor-pointer'} flex-1`}>
                            <div className="w-10 h-10 bg-[#F7931A] rounded-lg flex items-center justify-center">
                              <Bitcoin className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-black">Cryptocurrency</p>
                              <p className="text-sm text-gray-500">Bitcoin, USDT, and more</p>
                            </div>
                          </Label>
                        </div>
                      </div>
                    )}
                  </RadioGroup>
                </div>
                
                {/* Credit Card Form */}
                {paymentMethod === 'card' && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-black mb-4">Card Details</h2>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <div className="relative">
                          <Input
                            id="cardNumber"
                            placeholder="4242 4242 4242 4242"
                            value={formData.cardNumber}
                            onChange={(e) => setFormData({...formData, cardNumber: e.target.value})}
                            required
                            className="rounded-lg mt-1 pl-10"
                          />
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 mt-0.5" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="expiry">Expiry Date</Label>
                          <Input
                            id="expiry"
                            placeholder="MM/YY"
                            value={formData.expiry}
                            onChange={(e) => setFormData({...formData, expiry: e.target.value})}
                            required
                            className="rounded-lg mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cvc">CVC</Label>
                          <Input
                            id="cvc"
                            placeholder="123"
                            value={formData.cvc}
                            onChange={(e) => setFormData({...formData, cvc: e.target.value})}
                            required
                            className="rounded-lg mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Crypto Selection */}
                {paymentMethod === 'crypto' && !showPendingConfirmation && (
                  <div className="bg-white rounded-2xl p-6 border border-gray-100">
                    <h2 className="text-lg font-semibold text-black mb-4">Select Cryptocurrency</h2>
                    <div className="space-y-4">
                      <div>
                        <Label>Currency</Label>
                        <Select value={selectedCrypto} onValueChange={(value) => {
                          setSelectedCrypto(value)
                          setSelectedNetwork("")
                        }}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select cryptocurrency" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentSettings.cryptoCurrencies.map((crypto) => (
                              <SelectItem key={crypto.name} value={crypto.name}>
                                {crypto.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {selectedCrypto && selectedCryptoCurrency && (
                        <div>
                          <Label>Network</Label>
                          <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select network" />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedCryptoCurrency.networks.map((network) => (
                                <SelectItem key={network.network} value={network.network}>
                                  {network.network}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      
                      {selectedNetwork && selectedNetworkData && selectedNetworkData.address && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                          <p className="text-sm text-gray-600 mb-2">Send exactly <span className="font-bold text-black">{formatPrice(total)}</span> worth of {selectedCrypto} to:</p>
                          <div className="flex items-start gap-4">
                            <div className="flex-1">
                              <div className="p-3 bg-white border border-gray-200 rounded-lg font-mono text-sm break-all">
                                {selectedNetworkData.address}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => copyToClipboard(selectedNetworkData.address)}
                                  className="shrink-0"
                                >
                                  {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                                <span className="text-xs text-gray-500">Tap QR to scan in your wallet</span>
                              </div>
                            </div>

                            <div className="flex-none">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedNetworkData.address)}`}
                                alt={`${selectedNetwork} wallet QR code`}
                                className="w-36 h-36 bg-white border border-gray-200 rounded-md p-1"
                              />
                            </div>
                          </div>
                          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Only send {selectedCrypto} on the {selectedNetwork} network
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Pending Confirmation */}
                                
                <div className="flex items-center gap-2 sm:gap-3">
                  <Checkbox 
                    id="terms" 
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) => setFormData({...formData, agreeToTerms: checked as boolean})}
                    required
                    className="shrink-0"
                  />
                  <Label htmlFor="terms" className="text-[10px] sm:text-sm text-gray-600 leading-tight whitespace-nowrap">
                    I agree to <Link href="/terms" className="text-[#FE2C55] hover:underline">Terms</Link> and <Link href="/refund" className="text-[#FE2C55] hover:underline">Refund</Link>
                  </Label>
                </div>
                
                {!showPendingConfirmation && (
                  <Button 
                    type="submit"
                    className="w-full bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white rounded-full text-lg py-6"
                    disabled={
                      isProcessing || 
                      !formData.agreeToTerms || 
                      !paymentMethod ||
                      (paymentMethod === 'crypto' && (!selectedCrypto || !selectedNetwork || !selectedNetworkData?.address))
                    }
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </span>
                    ) : paymentMethod === 'paypal' ? (
                      <span className="flex items-center gap-2">
                        <ExternalLink className="w-5 h-5" />
                        Pay with PayPal - {formatPrice(total)}
                      </span>
                    ) : paymentMethod === 'crypto' ? (
                      <>Proceed with Crypto - {formatPrice(total)}</>
                    ) : (
                      <>Pay {formatPrice(total)}</>
                    )}
                  </Button>
                )}
              </form>
              ) : (
              <div className="space-y-4 sm:space-y-8">
                {showPendingConfirmation && (
                  <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-3xl p-6 sm:p-8">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-red-900 text-lg sm:text-xl">Confirm Payment Sent</h3>
                          <p className="text-sm sm:text-base text-red-700 leading-relaxed mt-2">
                            {paymentMethod === 'paypal' 
                              ? 'You will be redirected to PayPal. Click the button below once you have completed the payment.'
                              : 'Make sure you have sent the exact amount to the address above. Click the button below once your payment is sent.'
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      onClick={handleConfirmPaymentSent}
                      className="w-full bg-yellow-400 hover:bg-yellow-500 text-black rounded-full text-lg py-6"
                    >
                      I&apos;ve Sent the Payment
                    </Button>
                    <div className="text-center mt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await cancelPendingOrder(pendingOrderId)
                          clearPendingConfirmationState()
                          setShowPendingConfirmation(false)
                          setPendingOrderId(null)
                          setIsProcessing(false)
                          pendingOrderCancelRef.current = false
                          pendingOrderIdRef.current = null
                        }}
                        className="text-xs text-gray-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
            
            {/* Order Summary */}
            <div className={showPendingConfirmation ? 'hidden' : ''}>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 sticky top-24">
                <h2 className="text-xl font-bold text-black mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-6">
                  {checkoutItems.map((item: any) => (
                    <div key={item.account.id} className="border-b border-gray-100 pb-4 last:border-0">
                      <div className="flex gap-4 items-start">
                        <div className="bg-black rounded-lg p-3 text-center min-w-[60px]">
                          <div className="text-[#25F4EE] text-[10px]">{item.account.type}</div>
                          <div className="text-white text-xs font-bold">{item.account.platform}</div>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-black">{formatFollowers(item.account.followers)} Followers</p>
                          <p className="text-sm text-gray-500">{item.account.type}</p>
                        </div>
                        <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1">
                          <button 
                            onClick={() => isBuyNow ? updateBuyNowQuantity(Math.max(1, item.quantity - 1)) : updateQuantity(item.account.id, Math.max(1, item.quantity - 1))}
                            className="p-1 hover:bg-gray-100 transition-colors"
                            type="button"
                          >
                            <Minus className="w-4 h-4 text-gray-600" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button 
                            onClick={() => isBuyNow ? updateBuyNowQuantity(item.quantity + 1) : updateQuantity(item.account.id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-100 transition-colors"
                            type="button"
                          >
                            <Plus className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                        <span className="font-bold whitespace-nowrap">{formatPrice(item.account.price * item.quantity)}</span>
                      </div>
                      {/* Verification Option - only for TikTok accounts with verification */}
                      {item.account.platform === "TikTok" && item.account.type !== "Non-TTS/Affiliate" && (
                        <div className="mt-3">
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <Checkbox
                                checked={item.verificationCount > 0}
                                onCheckedChange={() => {
                                  const nextCount = item.verificationCount > 0 ? 0 : item.quantity
                                  if (isBuyNow) {
                                    setBuyNowVerificationCount(nextCount)
                                  } else {
                                    setVerificationCount(item.account.id, nextCount)
                                  }
                                }}
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
                                  onClick={() => {
                                    const count = Math.max(1, item.verificationCount - 1)
                                    if (isBuyNow) {
                                      setBuyNowVerificationCount(count)
                                    } else {
                                      setVerificationCount(item.account.id, count)
                                    }
                                  }}
                                  className="p-1 hover:bg-gray-100 transition-colors"
                                >
                                  <Minus className="w-4 h-4 text-gray-600" />
                                </button>
                                <span className="w-6 text-center font-medium">{item.verificationCount}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const count = Math.min(item.quantity, item.verificationCount + 1)
                                    if (isBuyNow) {
                                      setBuyNowVerificationCount(count)
                                    } else {
                                      setVerificationCount(item.account.id, count)
                                    }
                                  }}
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
                
                <div className="border-t border-gray-100 pt-4 mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">Subtotal</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-500">Processing Fee</span>
                    <span className="text-[#25F4EE]">FREE</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-4 border-t border-gray-100">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="w-4 h-4 text-[#25F4EE]" />
                    <span className="text-gray-600">30-day money-back guarantee</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-[#25F4EE]" />
                    <span className="text-gray-600">Instant account delivery</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="w-4 h-4 text-[#25F4EE]" />
                    <span className="text-gray-600">256-bit SSL encryption</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />

      <Dialog open={showPaymentWarning} onOpenChange={setShowPaymentWarning}>
        <DialogContent className="max-w-lg">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-red-600 text-center text-xl font-semibold">Payment Confirmation Required</DialogTitle>
          </DialogHeader>
          <div className="mt-2 rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-700 text-center">
            After clicking continue, you will be taken to the payment instructions page. You must click the confirmation button there once payment is sent.
          </div>
          <DialogFooter className="mt-6 flex justify-center gap-2">
            <Button type="button" className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white" onClick={handleConfirmWarning}>
              Continue
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowPaymentWarning(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  )
}
