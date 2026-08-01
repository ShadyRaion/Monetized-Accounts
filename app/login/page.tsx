"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useUserAuth } from "@/lib/user-auth-context"
import { useStoreSettings } from "@/lib/store-settings-context"
import { useStoreData } from "@/lib/store-data-context"
import { useReferral } from "@/lib/referral-context"
import { usePendingAction } from "@/lib/pending-action-context"
import { getPostAuthRedirect } from "@/lib/auth-redirect"
import { Eye, EyeOff, ArrowLeft, Loader2, LogIn as GoogleIcon } from "lucide-react"

function LoginPageContent() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [prefilledEmail, setPrefilledEmail] = useState("")
  const [isGoogleReady, setIsGoogleReady] = useState(false)
  const { pendingAction, clearPendingAction } = usePendingAction()
  const hasPendingAffiliateForm = pendingAction?.type === 'affiliate'
  const hasPendingContactForm = pendingAction?.type === 'contact'
  const hasPendingCheckoutAction = pendingAction?.type === 'checkout'
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  
  // Register form state
  const [registerFirstName, setRegisterFirstName] = useState("")
  const [registerLastName, setRegisterLastName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("")
  const [referralCode, setReferralCode] = useState("")
  
  const { login, loginWithGoogle, register, returnUrl, clearReturnUrl } = useUserAuth()
  const { settings } = useStoreSettings()
  const { addCustomer, affiliates, setAffiliates } = useStoreData()
  const { referralCode: urlReferralCode } = useReferral()
  const router = useRouter()
  const searchParams = useSearchParams()
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
  
  // Check for prefilled email and pending affiliate form on mount
  useEffect(() => {
    const email = searchParams.get("email") || pendingAction?.data?.email
    if (email) {
      setPrefilledEmail(email)
      setLoginEmail(email)
      setRegisterEmail(email)
    }

    if (urlReferralCode) {
      setReferralCode(urlReferralCode)
    }
  }, [searchParams, urlReferralCode, pendingAction])

  const handleGoogleCallback = useCallback(async (response: any) => {
    if (!response?.credential) {
      setError("Google login did not return a valid credential")
      setIsSubmitting(false)
      return
    }

    const result = await loginWithGoogle(response.credential)
    if (result.success) {
      const redirect = getPostAuthRedirect({
        pendingAction,
        hasPendingAffiliateForm,
        hasPendingContactForm,
        returnUrl
      })

      if (redirect.clearPendingAction) {
        clearPendingAction()
      }

      if (redirect.target === returnUrl || redirect.target === "/") {
        clearReturnUrl()
      }

      router.push(redirect.target)
      return
    }

    setError(result.error || "Google login failed")
    setIsSubmitting(false)
  }, [loginWithGoogle, pendingAction, hasPendingAffiliateForm, hasPendingContactForm, returnUrl, clearPendingAction, clearReturnUrl, router])

  useEffect(() => {
    if (!googleClientId) {
      return
    }

    const initializeGoogle = () => {
      const google = (window as any).google
      if (!google || !google.accounts || !google.accounts.id) return

      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
      })
      setIsGoogleReady(true)
    }

    if ((window as any).google?.accounts?.id) {
      initializeGoogle()
      return
    }

    const existingScript = document.getElementById('google-client-script')
    if (existingScript) {
      const timer = window.setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          initializeGoogle()
          window.clearInterval(timer)
        }
      }, 100)
      return () => window.clearInterval(timer)
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.id = 'google-client-script'
    script.onload = initializeGoogle
    document.body.appendChild(script)

    return () => {
      script.onload = null
    }
  }, [googleClientId, handleGoogleCallback])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    
    const result = await login(loginEmail, loginPassword)
    
    if (result.success) {
      const redirect = getPostAuthRedirect({
        pendingAction,
        hasPendingAffiliateForm,
        hasPendingContactForm,
        returnUrl
      })

      if (redirect.clearPendingAction) {
        clearPendingAction()
      }

      if (redirect.target === returnUrl || redirect.target === "/") {
        clearReturnUrl()
      }

      router.push(redirect.target)
    } else {
      setError(result.error || "Login failed")
    }
    
    setIsSubmitting(false)
  }

  const handleGoogleLogin = async () => {
    setError("")
    setIsSubmitting(true)

    const google = (window as any).google
    if (!google || !google.accounts || !google.accounts.id || !isGoogleReady) {
      setError("Google auth is not ready yet")
      setIsSubmitting(false)
      return
    }

    google.accounts.id.prompt((notification: any) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setError("Google login was not completed")
        setIsSubmitting(false)
      }
    })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)
    
    if (registerPassword !== registerConfirmPassword) {
      setError("Passwords do not match")
      setIsSubmitting(false)
      return
    }
    
    const fullName = `${registerFirstName} ${registerLastName}`.trim()
    const result = await register(registerEmail, registerPassword, fullName, referralCode)
    
    if (result.success) {
      const parsedPendingAction = pendingAction || null

      // Add customer to store data with referral code if provided
      addCustomer(registerEmail, fullName, referralCode)
      
      // Update affiliate referral count if a referral code was used
      if (referralCode) {
        const updatedAffiliates = affiliates.map((aff: any) => {
          if (aff.referralCode === referralCode) {
            return {
              ...aff,
              totalReferrals: (aff.totalReferrals || 0) + 1
            }
          }
          return aff
        })
        setAffiliates(updatedAffiliates)
      }
      
      setSuccess("Account created successfully!")

      const redirect = getPostAuthRedirect({
        pendingAction: parsedPendingAction,
        hasPendingAffiliateForm,
        hasPendingContactForm,
        returnUrl
      })

      if (redirect.clearPendingAction) {
        clearPendingAction()
      }

      if (redirect.target === returnUrl || redirect.target === "/") {
        clearReturnUrl()
      }

      setTimeout(() => {
        router.push(redirect.target)
      }, 1000)
    } else {
      setError(result.error || "Registration failed")
    }
    
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-3 sm:py-4">
        <div className="container mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-black transition-colors text-xs sm:text-sm">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Back</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-6 sm:py-12 px-3 sm:px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center py-4 sm:py-6 px-3 sm:px-6">
            <div 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4"
              style={{ backgroundColor: settings.primaryColor }}
            >
              <span className="font-bold text-white text-sm sm:text-lg">
                {settings.storeName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <CardTitle className="text-lg sm:text-2xl">Welcome to {settings.storeName}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {activeTab === "login" 
                ? "Sign in to your account to continue" 
                : "Create an account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4 sm:pb-6">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "login" | "register"); setError(""); setSuccess(""); }}>
              <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 text-xs sm:text-sm">
                <TabsTrigger value="login" className="text-xs sm:text-sm">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="text-xs sm:text-sm">Create Account</TabsTrigger>
              </TabsList>
              
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {success && (
                <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="login-email" className="text-xs sm:text-sm">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="login-password" className="text-xs sm:text-sm">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full text-white"
                    style={{ backgroundColor: settings.primaryColor }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                  <div className="mt-3 text-center text-sm text-gray-500">or</div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full mt-3 flex items-center justify-center gap-2"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting || !isGoogleReady || !googleClientId}
                  >
                    <GoogleIcon className="w-4 h-4" />
                    {isGoogleReady && googleClientId ? "Continue with Google" : "Google login not available"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstname">First Name</Label>
                      <Input
                        id="register-firstname"
                        type="text"
                        placeholder="John"
                        value={registerFirstName}
                        onChange={(e) => setRegisterFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-lastname">Last Name</Label>
                      <Input
                        id="register-lastname"
                        type="text"
                        placeholder="Doe"
                        value={registerLastName}
                        onChange={(e) => setRegisterLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="you@example.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password (min 6 characters)"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">Confirm Password</Label>
                    <Input
                      id="register-confirm"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-referral">Referral Code <span className="text-gray-400">(Optional)</span></Label>
                    <Input
                      id="register-referral"
                      type="text"
                      placeholder="Enter referral code if you have one"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value)}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full text-white"
                    style={{ backgroundColor: settings.primaryColor }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <p className="text-center text-sm text-gray-500 mt-6">
              By continuing, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-black">Terms of Service</Link>
              {" "}and{" "}
              <Link href="/privacy" className="underline hover:text-black">Privacy Policy</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  )
}
