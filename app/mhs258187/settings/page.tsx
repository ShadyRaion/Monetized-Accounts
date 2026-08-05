"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { useStoreSettings, hasSettingsChanged, type StoreSettings } from "@/lib/store-settings-context"
import { apiPath, authHeaders, apiFetch } from "@/lib/api"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { 
  Settings,
  Store,
  Shield, 
  CreditCard, 
  Mail, 
  Globe, 
  Palette,
  Save,
  Upload,
  Key,
  Users,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  EyeOff,
  Check,
  Plus,
  Trash2,
  Bitcoin,
  ExternalLink,
  Copy,
  Edit
} from "lucide-react"
import type { CryptoCurrency } from "@/lib/store-settings-context"

function PayPalLinkEdit({ link, onUpdate }: { link: string; onUpdate: (link: string) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempLink, setTempLink] = useState(link)

  return (
    <div className="flex gap-1">
      {isEditing ? (
        <>
          <Input
            value={tempLink}
            onChange={(e) => setTempLink(e.target.value)}
            placeholder="paypal.me/..."
            className="bg-zinc-800 border-zinc-700 text-white h-7 text-[8px]"
            autoFocus
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              onUpdate(tempLink)
              setIsEditing(false)
            }}
            className="border-green-500/50 text-green-400 hover:bg-green-500/20 h-7 w-7"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setTempLink(link)
              setIsEditing(false)
            }}
            className="border-zinc-700 text-black hover:bg-zinc-100 h-7 w-7"
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      ) : (
        <>
          <div className="bg-zinc-800 border border-zinc-700 rounded px-2 h-7 flex items-center text-white text-[8px] flex-1 overflow-hidden">
            <span className="truncate">{link}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsEditing(true)}
            className="border-zinc-700 text-black hover:bg-zinc-100 h-7 w-7"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="border-zinc-700 text-black hover:bg-zinc-100 h-7 w-7"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open(link, '_blank')
              }
            }}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { 
    user, 
    isAuthenticated, 
    isLoading,
    pendingEmailChange,
    changePassword,
    requestEmailChange,
    verifyEmailChange,
    cancelEmailChange
  } = useAdminAuth()
  const { settings: storeSettings, updateSettings: updateStoreSettings, saveSettings: saveStoreSettings, isSaving: isStoreSaving } = useStoreSettings()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [lastSavedSettings, setLastSavedSettings] = useState<StoreSettings | null>(null)
  
  // Email change state
  const [newEmail, setNewEmail] = useState("")
  const [emailPassword, setEmailPassword] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [emailChangeLoading, setEmailChangeLoading] = useState(false)
  const [emailChangeError, setEmailChangeError] = useState("")
  const [emailChangeSuccess, setEmailChangeSuccess] = useState("")
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false)
  const [passwordChangeError, setPasswordChangeError] = useState("")
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Countdown for verification code expiry
  const [countdown, setCountdown] = useState(0)
  
  useEffect(() => {
    if (pendingEmailChange) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((pendingEmailChange.expiresAt - Date.now()) / 1000))
        setCountdown(remaining)
        if (remaining === 0) {
          clearInterval(interval)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [pendingEmailChange])

  // Store Settings - now using context
  const [primaryColor, setPrimaryColor] = useState(storeSettings.primaryColor)
  
  // Sync local state with store settings
  useEffect(() => {
    setPrimaryColor(storeSettings.primaryColor)
  }, [storeSettings.primaryColor])

  useEffect(() => {
    if (lastSavedSettings === null) {
      setLastSavedSettings(JSON.parse(JSON.stringify(storeSettings)))
    }
  }, [storeSettings, lastSavedSettings])

  // Security Settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState("30")
  // New crypto currency modal state
  const [newCryptoName, setNewCryptoName] = useState("")
  const [newNetworkName, setNewNetworkName] = useState("")
  const [newNetworkAddress, setNewNetworkAddress] = useState("")
  const [selectedCryptoIndex, setSelectedCryptoIndex] = useState<number | null>(null)
  const [editingNetwork, setEditingNetwork] = useState<{ cryptoIndex: number; networkIndex: number } | null>(null)
  
  // File upload handlers
  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Unable to read file as data URL'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })

  const uploadBrandImage = async (file: File, kind: "logo" | "favicon") => {
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const response = await apiFetch(apiPath(`/settings/upload-image?kind=${kind}`), {
        method: 'POST',
        headers: authHeaders(undefined, true),
        body: JSON.stringify({ image: dataUrl })
      })

      const responseText = await response.text()
      let data: { url?: string; message?: string } = {}

      if (responseText) {
        try {
          data = JSON.parse(responseText)
        } catch {
          data = { message: responseText }
        }
      }

      if (!response.ok) {
        throw new Error(data.message || `Upload failed (${response.status})`)
      }

      const normalizedUrl = data.url || null

      if (kind === 'logo') {
        updateStoreSettings({ logoUrl: normalizedUrl })
      } else {
        updateStoreSettings({ faviconUrl: normalizedUrl })
      }

      await saveStoreSettings()
      toast.success(`${kind === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`)
    } catch (error) {
      console.error('Brand image upload failed', error)
      toast.error(error instanceof Error ? error.message : 'Unable to upload image right now')
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadBrandImage(file, 'logo')
    }
  }
  
  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadBrandImage(file, 'favicon')
    }
  }
  
  // Helper functions for payment settings
  const updatePaymentSettings = (updates: Partial<typeof storeSettings.paymentSettings>) => {
    updateStoreSettings({
      paymentSettings: {
        ...storeSettings.paymentSettings,
        ...updates
      }
    })
  }
  
  const deriveSymbolFromName = (name: string) => {
    const cleaned = name.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
    if (!cleaned) return ""
    if (cleaned.length <= 3) return cleaned
    return cleaned.slice(0, 3)
  }

  const addCryptoCurrency = () => {
    if (!newCryptoName) return
    const newCurrency: CryptoCurrency = {
      name: newCryptoName,
      symbol: deriveSymbolFromName(newCryptoName),
      networks: []
    }
    updatePaymentSettings({
      cryptoCurrencies: [...storeSettings.paymentSettings.cryptoCurrencies, newCurrency]
    })
    setNewCryptoName("")
    setNewNetworkName("")
    setNewNetworkAddress("")
  }
  
  const removeCryptoCurrency = (index: number) => {
    const updated = storeSettings.paymentSettings.cryptoCurrencies.filter((_, i) => i !== index)
    updatePaymentSettings({ cryptoCurrencies: updated })
    if (selectedCryptoIndex === index) setSelectedCryptoIndex(null)
  }
  
  const addNetwork = (cryptoIndex: number) => {
    if (!newNetworkName) return
    const updated = [...storeSettings.paymentSettings.cryptoCurrencies]
    updated[cryptoIndex].networks.push({
      network: newNetworkName,
      address: newNetworkAddress
    })
    updatePaymentSettings({ cryptoCurrencies: updated })
    setNewNetworkName("")
    setNewNetworkAddress("")
  }
  
  const removeNetwork = (cryptoIndex: number, networkIndex: number) => {
    const updated = [...storeSettings.paymentSettings.cryptoCurrencies]
    updated[cryptoIndex].networks = updated[cryptoIndex].networks.filter((_, i) => i !== networkIndex)
    updatePaymentSettings({ cryptoCurrencies: updated })
  }
  
  const updateNetworkAddress = (cryptoIndex: number, networkIndex: number, address: string) => {
    const updated = [...storeSettings.paymentSettings.cryptoCurrencies]
    updated[cryptoIndex].networks[networkIndex].address = address
    updatePaymentSettings({ cryptoCurrencies: updated })
  }

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/mhs258187/login")
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE2C55]" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const hasUnsavedChanges = hasSettingsChanged(storeSettings, lastSavedSettings)

  const handleSave = async () => {
    if (!hasUnsavedChanges) {
      toast.info("Nothing to save.")
      return
    }

    setSaving(true)
    await saveStoreSettings()
    await new Promise(resolve => setTimeout(resolve, 500))
    setLastSavedSettings(JSON.parse(JSON.stringify(storeSettings)))
    setSaving(false)
    toast.success("Saved successfully")
  }
  
  const handleRequestEmailChange = async () => {
    setEmailChangeError("")
    setEmailChangeSuccess("")
    setEmailChangeLoading(true)
    
    const result = await requestEmailChange(newEmail, emailPassword)
    
    if (result.success) {
      setEmailChangeSuccess("Verification code sent! Check console for demo code.")
      setEmailPassword("")
    } else {
      setEmailChangeError(result.error || "Failed to request email change")
    }
    
    setEmailChangeLoading(false)
  }
  
  const handleVerifyEmailChange = async () => {
    setEmailChangeError("")
    setEmailChangeLoading(true)
    
    const result = await verifyEmailChange(verificationCode)
    
    if (result.success) {
      setEmailChangeSuccess("Email changed successfully!")
      setNewEmail("")
      setVerificationCode("")
    } else {
      setEmailChangeError(result.error || "Failed to verify email change")
    }
    
    setEmailChangeLoading(false)
  }
  
  const handleCancelEmailChange = () => {
    cancelEmailChange()
    setVerificationCode("")
    setEmailChangeError("")
    setEmailChangeSuccess("")
  }
  
  const handlePasswordChange = async () => {
    setPasswordChangeError("")
    setPasswordChangeSuccess("")
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordChangeError("New passwords do not match")
      return
    }
    
    setPasswordChangeLoading(true)
    
    const result = await changePassword(currentPassword, newPassword)
    
    if (result.success) {
      setPasswordChangeSuccess("Password changed successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } else {
      setPasswordChangeError(result.error || "Failed to change password")
    }
    
    setPasswordChangeLoading(false)
  }
  
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-1 sm:p-2 md:p-4 pt-14 sm:pt-6">
      <div className="w-full max-w-full">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base md:text-lg font-bold flex items-center gap-1 sm:gap-2" style={{ color: '#FE2C55' }}>
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className="truncate">Settings</span>
              </h1>
              <p className="text-zinc-400 mt-0.5 text-[8px] sm:text-[10px] truncate">Manage store config</p>
            </div>
            <Button 
              onClick={handleSave} 
              disabled={saving || isStoreSaving || !hasUnsavedChanges}
              className="bg-cyan-500 hover:bg-cyan-600 text-black text-[8px] sm:text-xs px-2 sm:px-3 py-1 h-auto flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
              <span className="hidden sm:inline">{saving || isStoreSaving ? "Saving..." : hasUnsavedChanges ? "Save" : "Saved"}</span>
            </Button>
          </div>

          <Tabs defaultValue="account" className="w-full">
            <TabsList className="bg-zinc-900 border border-zinc-800 h-auto p-0.5 sm:p-1 overflow-x-auto flex-nowrap">
              <TabsTrigger value="account" className="text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-zinc-800 text-[8px] sm:text-xs px-1.5 sm:px-2 py-1 whitespace-nowrap flex items-center gap-0.5 sm:gap-1">
                <User className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">Account</span>
                <span className="sm:hidden">Acc</span>
              </TabsTrigger>
              <TabsTrigger value="general" className="text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-zinc-800 text-[8px] sm:text-xs px-1.5 sm:px-2 py-1 whitespace-nowrap flex items-center gap-0.5 sm:gap-1">
                <Store className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">General</span>
                <span className="sm:hidden">Gen</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-zinc-800 text-[8px] sm:text-xs px-1.5 sm:px-2 py-1 whitespace-nowrap flex items-center gap-0.5 sm:gap-1">
                <Shield className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">Security</span>
                <span className="sm:hidden">Sec</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="text-zinc-400 data-[state=active]:text-white data-[state=active]:bg-zinc-800 text-[8px] sm:text-xs px-1.5 sm:px-2 py-1 whitespace-nowrap flex items-center gap-0.5 sm:gap-1">
                <CreditCard className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">Payments</span>
                <span className="sm:hidden">Pay</span>
              </TabsTrigger>
            </TabsList>

            {/* Account Settings */}
            <TabsContent value="account" className="space-y-2">
              {/* Change Email */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="p-2 sm:p-3">
                  <CardTitle className="text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-400" />
                    Change Email
                  </CardTitle>
                  <CardDescription className="text-[8px] sm:text-xs">
                    Update your email. Requires verification.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 space-y-2">
                  <div className="p-2 sm:p-3 bg-zinc-800/50 rounded-lg">
                    <p className="text-[8px] sm:text-xs text-zinc-400">Current Email</p>
                    <p className="text-white font-medium text-[9px] sm:text-sm truncate">{user?.email}</p>
                  </div>
                  
                  {emailChangeSuccess && (
                    <Alert className="bg-green-500/10 border-green-500/50">
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                      <AlertDescription className="text-green-400">
                        {emailChangeSuccess}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {emailChangeError && (
                    <Alert className="bg-red-500/10 border-red-500/50">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                      <AlertDescription className="text-red-400">
                        {emailChangeError}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {!pendingEmailChange ? (
                    <div className="space-y-2 max-w-md">
                      <div className="space-y-1">
                        <Label htmlFor="newEmail" className="text-zinc-300 text-[8px] sm:text-xs">New Email</Label>
                        <Input
                          id="newEmail"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="newemail@example.com"
                          className="bg-zinc-800 border-zinc-700 text-white h-7 text-[9px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="emailPassword" className="text-zinc-300 text-[8px] sm:text-xs">Password</Label>
                        <Input
                          id="emailPassword"
                          type="password"
                          value={emailPassword}
                          onChange={(e) => setEmailPassword(e.target.value)}
                          placeholder="Password"
                          className="bg-zinc-800 border-zinc-700 text-white h-7 text-[9px]"
                        />
                        <p className="text-[7px] text-zinc-500">Required to confirm</p>
                      </div>
                      <Button 
                        onClick={handleRequestEmailChange}
                        disabled={emailChangeLoading || !newEmail || !emailPassword}
                        className="bg-cyan-500 hover:bg-cyan-600 text-black text-[8px] h-7"
                      >
                        {emailChangeLoading ? "Sending..." : "Send Code"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-md">
                      <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <p className="text-cyan-400 text-sm">
                          Verification code sent to <span className="font-medium">{pendingEmailChange.newEmail}</span>
                        </p>
                        <p className="text-zinc-400 text-sm mt-1">
                          Code expires in: <span className="text-cyan-400 font-mono">{formatCountdown(countdown)}</span>
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="verificationCode" className="text-zinc-300">Verification Code</Label>
                        <Input
                          id="verificationCode"
                          type="text"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          className="bg-zinc-800 border-zinc-700 text-white font-mono text-lg tracking-widest"
                        />
                        <p className="text-xs text-zinc-500">Check browser console for demo verification code</p>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          onClick={handleVerifyEmailChange}
                          disabled={emailChangeLoading || verificationCode.length !== 6}
                          className="bg-cyan-500 hover:bg-cyan-600 text-black"
                        >
                          {emailChangeLoading ? "Verifying..." : "Verify & Change Email"}
                        </Button>
                        <Button 
                          onClick={handleCancelEmailChange}
                          variant="outline"
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Change Password */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="p-2 sm:p-3">
                  <CardTitle className="text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Key className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-400" />
                    Change Password
                  </CardTitle>
                  <CardDescription className="text-[8px] sm:text-xs">
                    Min 8 characters
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 space-y-2">
                  {passwordChangeSuccess && (
                    <Alert className="bg-green-500/10 border-green-500/50 p-2">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      <AlertDescription className="text-green-400 text-[8px]">
                        {passwordChangeSuccess}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {passwordChangeError && (
                    <Alert className="bg-red-500/10 border-red-500/50 p-2">
                      <AlertCircle className="h-3 w-3 text-red-400" />
                      <AlertDescription className="text-red-400 text-[8px]">
                        {passwordChangeError}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2 max-w-md">
                    <div className="space-y-1">
                      <Label htmlFor="currentPassword" className="text-zinc-300 text-[8px] sm:text-xs">Current</Label>
                      <div className="relative">
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white pr-7 h-7 text-[9px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                        >
                          {showCurrentPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="newPassword" className="text-zinc-300 text-[8px] sm:text-xs">New</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white pr-7 h-7 text-[9px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                        >
                          {showNewPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                      {newPassword && newPassword.length < 8 && (
                        <p className="text-[7px] text-amber-400">Min 8 chars</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="confirmPassword" className="text-zinc-300 text-[8px] sm:text-xs">Confirm</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="bg-zinc-800 border-zinc-700 text-white pr-7 h-7 text-[9px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300"
                        >
                          {showConfirmPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-[7px] text-red-400">Mismatch</p>
                      )}
                    </div>
                    <Button 
                      onClick={handlePasswordChange}
                      disabled={passwordChangeLoading || !currentPassword || !newPassword || !confirmPassword || newPassword.length < 8 || newPassword !== confirmPassword}
                      className="bg-cyan-500 hover:bg-cyan-600 text-black text-[8px] h-7 mt-1"
                    >
                      {passwordChangeLoading ? "Updating..." : "Update"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-2">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="p-2 sm:p-3">
                  <CardTitle className="text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Store className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-400" />
                    Store Info
                  </CardTitle>
                  <CardDescription className="text-[8px] sm:text-xs">Basic information</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="storeName" className="text-zinc-300 text-[8px] sm:text-xs">Store Name</Label>
                      <Input
                        id="storeName"
                        value={storeSettings.storeName}
                        onChange={(e) => updateStoreSettings({ storeName: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white h-7 text-[9px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="storeEmail" className="text-zinc-300 text-[8px] sm:text-xs">Email</Label>
                      <Input
                        id="storeEmail"
                        type="email"
                        value={storeSettings.storeEmail}
                        onChange={(e) => updateStoreSettings({ storeEmail: e.target.value })}
                        className="bg-zinc-800 border-zinc-700 text-white h-7 text-[9px]"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="storeDiscordLink" className="text-zinc-300 text-[8px] sm:text-xs">Discord Link</Label>
                    <Input
                      id="storeDiscordLink"
                      value={storeSettings.storeDiscordLink}
                      onChange={(e) => updateStoreSettings({ storeDiscordLink: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white h-7 text-[9px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="storeDescription" className="text-zinc-300 text-[8px] sm:text-xs">Description</Label>
                    <Textarea
                      id="storeDescription"
                      value={storeSettings.storeDescription}
                      onChange={(e) => updateStoreSettings({ storeDescription: e.target.value })}
                      className="bg-zinc-800 border-zinc-700 text-white text-[9px] h-16"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="p-2 sm:p-3">
                  <CardTitle className="text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-base">
                    <Palette className="h-3 w-3 sm:h-5 sm:w-5 text-cyan-400" />
                    Branding
                  </CardTitle>
                  <CardDescription className="text-[8px] sm:text-xs">Customize your store appearance</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-6 space-y-3 sm:space-y-6">
                  <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3 sm:gap-6">
                    <div className="space-y-2">
                      <Label className="text-zinc-300 text-[8px] sm:text-xs">Store Logo</Label>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <div 
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex-shrink-0 flex items-center justify-center border border-zinc-700 overflow-hidden"
                          style={{ backgroundColor: storeSettings.logoUrl ? 'transparent' : storeSettings.primaryColor }}
                        >
                          {storeSettings.logoUrl ? (
                            <img src={storeSettings.logoUrl} alt="Store Logo" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-white text-lg sm:text-xl">{storeSettings.storeName.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="logo-upload"
                          />
                          <label htmlFor="logo-upload">
                            <Button variant="outline" className="w-full sm:w-auto border-zinc-700 text-black hover:bg-zinc-100 cursor-pointer text-[9px] sm:text-xs h-7 px-2" asChild>
                              <span>
                                <Upload className="h-3 w-3 mr-1" />
                                Upload
                              </span>
                            </Button>
                          </label>
                          {storeSettings.logoUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                updateStoreSettings({ logoUrl: null })
                                await saveStoreSettings()
                                toast.success('Logo removed successfully')
                              }}
                              className="w-full sm:w-auto border-red-500/50 text-red-400 hover:bg-red-500/20 text-[9px] h-7 px-2"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-300 text-[8px] sm:text-xs">Favicon</Label>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-zinc-800 rounded-lg flex items-center justify-center border border-zinc-700 overflow-hidden">
                          {storeSettings.faviconUrl ? (
                            <img src={storeSettings.faviconUrl} alt="Favicon" className="w-full h-full object-cover" />
                          ) : (
                            <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-zinc-500" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFaviconUpload}
                            className="hidden"
                            id="favicon-upload"
                          />
                          <label htmlFor="favicon-upload">
                            <Button variant="outline" className="w-full sm:w-auto border-zinc-700 text-black hover:bg-zinc-100 cursor-pointer text-[9px] sm:text-xs h-7 px-2" asChild>
                              <span>
                                <Upload className="h-3 w-3 mr-1" />
                                Upload
                              </span>
                            </Button>
                          </label>
                          {storeSettings.faviconUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={async () => {
                                updateStoreSettings({ faviconUrl: null })
                                await saveStoreSettings()
                                toast.success('Favicon removed successfully')
                              }}
                              className="w-full sm:w-auto border-red-500/50 text-red-400 hover:bg-red-500/20 text-[9px] h-7 px-2"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Label className="text-zinc-300">Primary Color</Label>
                    <p className="text-sm text-zinc-500">Choose a color that represents your brand. This will be applied throughout your store.</p>
                    
                    {/* Color Presets */}
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-400 uppercase tracking-wider">Presets</p>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { color: "#FE2C55", name: "TikTok Red" },
                          { color: "#06b6d4", name: "Cyan" },
                          { color: "#8b5cf6", name: "Purple" },
                          { color: "#ec4899", name: "Pink" },
                          { color: "#f59e0b", name: "Amber" },
                          { color: "#10b981", name: "Emerald" },
                          { color: "#3b82f6", name: "Blue" },
                          { color: "#ef4444", name: "Red" },
                          { color: "#f97316", name: "Orange" },
                          { color: "#84cc16", name: "Lime" },
                          { color: "#14b8a6", name: "Teal" },
                          { color: "#6366f1", name: "Indigo" },
                        ].map(({ color, name }) => (
                          <button
                            key={color}
                            onClick={() => {
                              setPrimaryColor(color)
                              updateStoreSettings({ primaryColor: color })
                            }}
                            className={`w-10 h-10 rounded-lg border-2 transition-all relative ${
                              storeSettings.primaryColor === color 
                                ? 'border-white scale-110 shadow-lg' 
                                : 'border-transparent hover:border-zinc-500 hover:scale-105'
                            }`}
                            style={{ backgroundColor: color }}
                            title={name}
                          >
                            {storeSettings.primaryColor === color && (
                              <Check className="h-5 w-5 text-white absolute inset-0 m-auto drop-shadow-md" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Custom Color Picker */}
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-400 uppercase tracking-wider">Custom Color</p>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => {
                              setPrimaryColor(e.target.value)
                              updateStoreSettings({ primaryColor: e.target.value })
                            }}
                            className="w-16 h-16 rounded-lg cursor-pointer border-2 border-zinc-700 bg-transparent"
                            style={{ padding: 0 }}
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-zinc-400 text-sm w-12">HEX</Label>
                            <Input
                              value={primaryColor}
                              onChange={(e) => {
                                const val = e.target.value
                                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                                  setPrimaryColor(val)
                                  if (val.length === 7) {
                                    updateStoreSettings({ primaryColor: val })
                                  }
                                }
                              }}
                              className="bg-zinc-800 border-zinc-700 text-white font-mono w-28 uppercase"
                              placeholder="#FE2C55"
                            />
                          </div>
                          <p className="text-xs text-zinc-500">Click the color box to open the color picker</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Preview */}
                    <div className="space-y-3 pt-4 border-t border-zinc-800">
                      <p className="text-xs text-zinc-400 uppercase tracking-wider">Preview</p>
                      <div className="flex items-center gap-4">
                        <Button 
                          className="text-white"
                          style={{ backgroundColor: storeSettings.primaryColor }}
                        >
                          Sample Button
                        </Button>
                        <Badge 
                          className="text-white"
                          style={{ backgroundColor: storeSettings.primaryColor }}
                        >
                          Sample Badge
                        </Badge>
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: storeSettings.primaryColor }}
                        >
                          3
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="space-y-2">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="p-2 sm:p-3">
                  <CardTitle className="text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Shield className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-400" />
                    Security
                  </CardTitle>
                  <CardDescription className="text-[8px] sm:text-xs">Security preferences</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-medium text-[9px] sm:text-xs">2FA</p>
                      <p className="text-[8px] text-zinc-400 truncate">Extra security</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {twoFactorEnabled && <Badge className="bg-green-500/20 text-green-400 text-[8px] py-0 px-1">On</Badge>}
                      <Switch
                        checked={twoFactorEnabled}
                        onCheckedChange={setTwoFactorEnabled}
                      />
                    </div>
                  </div>
                  <Separator className="bg-zinc-800" />
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-medium text-[9px] sm:text-xs">Timeout</p>
                      <p className="text-[8px] text-zinc-400 truncate">Auto logout</p>
                    </div>
                    <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                      <SelectTrigger className="w-20 sm:w-32 h-7 bg-zinc-800 border-zinc-700 text-white text-[8px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="15" className="text-white focus:bg-zinc-700 focus:text-white text-[9px]">15min</SelectItem>
                        <SelectItem value="30" className="text-white focus:bg-zinc-700 focus:text-white text-[9px]">30min</SelectItem>
                        <SelectItem value="60" className="text-white focus:bg-zinc-700 focus:text-white text-[9px]">1h</SelectItem>
                        <SelectItem value="120" className="text-white focus:bg-zinc-700 focus:text-white text-[9px]">2h</SelectItem>
                        <SelectItem value="never" className="text-white focus:bg-zinc-700 focus:text-white text-[9px]">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator className="bg-zinc-800" />
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="p-2 sm:p-3">
                  <CardTitle className="text-white flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 text-cyan-400" />
                    Sessions
                  </CardTitle>
                  <CardDescription className="text-[8px] sm:text-xs">Active login sessions</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 p-2 bg-zinc-800/50 rounded">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <Globe className="h-3 w-3 text-green-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-[9px] sm:text-xs truncate">Current</p>
                          <p className="text-[8px] text-zinc-400 truncate">Chrome - NY</p>
                        </div>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 text-[8px] py-0 px-1 flex-shrink-0">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2 bg-zinc-800/50 rounded">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <Globe className="h-3 w-3 text-zinc-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-[9px] sm:text-xs truncate">Mobile</p>
                          <p className="text-[8px] text-zinc-400 truncate">iPhone - 2h ago</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/20 h-6 text-[8px] px-1.5 flex-shrink-0">
                        Revoke
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payment Settings */}
            <TabsContent value="payments" className="space-y-2">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader className="p-2 sm:p-3">
                  <CardTitle className="text-white text-xs sm:text-sm">Methods</CardTitle>
                  <CardDescription className="text-[8px] sm:text-xs">Payment methods</CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 space-y-2">
                  {/* Credit Card */}
                  <div className="p-2 bg-zinc-800/50 rounded">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-5 bg-[#635BFF] rounded flex items-center justify-center flex-shrink-0">
                          <CreditCard className="h-3 w-3 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-[9px] sm:text-xs">Stripe</p>
                          <p className="text-[8px] text-zinc-400 truncate">Card payments</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {storeSettings.paymentSettings.creditCardEnabled ? (
                          <Badge className="bg-green-500/20 text-green-400 text-[8px] py-0 px-1">On</Badge>
                        ) : (
                          <Badge className="bg-zinc-700 text-zinc-400 text-[8px] py-0 px-1">Off</Badge>
                        )}
                        <Switch
                          checked={storeSettings.paymentSettings.creditCardEnabled}
                          onCheckedChange={(checked) => updatePaymentSettings({ creditCardEnabled: checked })}
                        />
                      </div>
                    </div>
                    {storeSettings.paymentSettings.creditCardEnabled && (
                      <div className="space-y-2 pt-2 pl-10">
                        <div className="space-y-1">
                          <Label className="text-zinc-300 text-[8px] sm:text-xs">Stripe API URL</Label>
                          <Input
                            value={storeSettings.paymentSettings.stripeApiUrl}
                            onChange={(e) => updatePaymentSettings({ stripeApiUrl: e.target.value })}
                            placeholder="https://api.stripe.com/..."
                            className="bg-zinc-800 border-zinc-700 text-white h-7 text-[9px]"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-zinc-300 text-[8px] sm:text-xs">Stripe Webhook URL</Label>
                          <Input
                            value={storeSettings.paymentSettings.stripeWebhookUrl}
                            onChange={(e) => updatePaymentSettings({ stripeWebhookUrl: e.target.value })}
                            placeholder="https://yourdomain.com/stripe-webhook"
                            className="bg-zinc-800 border-zinc-700 text-white h-7 text-[9px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* PayPal Link */}
                  <div className="p-2 bg-zinc-800/50 rounded space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-5 bg-[#003087] rounded flex items-center justify-center shrink-0">
                          <span className="text-white text-[8px] font-bold">PPL</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-[9px] sm:text-xs">PayPal Link</p>
                          <p className="text-[8px] text-zinc-400 truncate">Direct payout link</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {storeSettings.paymentSettings.paypalLinkEnabled ? (
                          <Badge className="bg-green-500/20 text-green-400 text-[8px] py-0 px-1">On</Badge>
                        ) : (
                          <Badge className="bg-zinc-700 text-zinc-400 text-[8px] py-0 px-1">Off</Badge>
                        )}
                        <Switch
                          checked={storeSettings.paymentSettings.paypalLinkEnabled}
                          onCheckedChange={(checked) => updatePaymentSettings({ paypalLinkEnabled: checked, paypalEnabled: checked || storeSettings.paymentSettings.paypalApiEnabled })}
                        />
                      </div>
                    </div>
                    {storeSettings.paymentSettings.paypalLinkEnabled && (
                      <div className="space-y-2 pl-10">
                        <div className="space-y-1">
                          <Label className="text-zinc-300 text-[8px] sm:text-xs">PayPal Link</Label>
                          <PayPalLinkEdit link={storeSettings.paymentSettings.paypalLink} onUpdate={(link) => updatePaymentSettings({ paypalLink: link })} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PayPal API */}
                  <div className="p-2 bg-zinc-800/50 rounded space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-5 bg-[#003087] rounded flex items-center justify-center shrink-0">
                          <span className="text-white text-[8px] font-bold">PPA</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-[9px] sm:text-xs">PayPal API</p>
                          <p className="text-[8px] text-zinc-400 truncate">API / Webhook</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {storeSettings.paymentSettings.paypalApiEnabled ? (
                          <Badge className="bg-green-500/20 text-green-400 text-[8px] py-0 px-1">On</Badge>
                        ) : (
                          <Badge className="bg-zinc-700 text-zinc-400 text-[8px] py-0 px-1">Off</Badge>
                        )}
                        <Switch
                          checked={storeSettings.paymentSettings.paypalApiEnabled}
                          onCheckedChange={(checked) => updatePaymentSettings({ paypalApiEnabled: checked, paypalEnabled: checked || storeSettings.paymentSettings.paypalLinkEnabled })}
                        />
                      </div>
                    </div>
                    {storeSettings.paymentSettings.paypalApiEnabled && (
                      <div className="space-y-2 pl-10">
                        <div className="space-y-1">
                          <Label className="text-zinc-300 text-[8px] sm:text-xs">PayPal API URL</Label>
                          <Input
                            value={storeSettings.paymentSettings.paypalApiUrl}
                            onChange={(e) => updatePaymentSettings({ paypalApiUrl: e.target.value })}
                            placeholder="https://api.paypal.com/..."
                            className="bg-zinc-800 border-zinc-700 text-white h-7 text-[9px]"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-zinc-300 text-[8px] sm:text-xs">PayPal Webhook URL</Label>
                          <Input
                            value={storeSettings.paymentSettings.paypalWebhookUrl}
                            onChange={(e) => updatePaymentSettings({ paypalWebhookUrl: e.target.value })}
                            placeholder="https://yourdomain.com/paypal-webhook"
                            className="bg-zinc-800 border-zinc-700 text-white h-7 text-[9px]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Cryptocurrency */}
                  <div className="p-2 sm:p-3 bg-zinc-800/50 rounded space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-7 h-5 sm:w-8 sm:h-6 bg-[#F7931A] rounded flex-shrink-0 flex items-center justify-center">
                          <Bitcoin className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-[9px] sm:text-xs">Crypto</p>
                          <p className="text-[8px] text-zinc-400">Custom wallets</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {storeSettings.paymentSettings.cryptoEnabled ? (
                          <Badge className="bg-green-500/20 text-green-400 text-[8px] py-0 px-1">On</Badge>
                        ) : (
                          <Badge className="bg-zinc-700 text-zinc-400 text-[8px] py-0 px-1">Off</Badge>
                        )}
                        <Switch
                          checked={storeSettings.paymentSettings.cryptoEnabled}
                          onCheckedChange={(checked) => updatePaymentSettings({ cryptoEnabled: checked })}
                        />
                      </div>
                    </div>
                    
                    {storeSettings.paymentSettings.cryptoEnabled && (
                      <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-3 border-t border-zinc-700">
                        {/* Add new cryptocurrency */}
                        <div className="p-2 sm:p-3 border border-dashed border-zinc-700 rounded space-y-2">
                          <p className="text-[8px] sm:text-xs text-zinc-400 font-medium">Add Crypto (Name required)</p>
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                            <Input
                              value={newCryptoName}
                              onChange={(e) => setNewCryptoName(e.target.value)}
                              placeholder="Name (Required)"
                              className="bg-zinc-800 border-zinc-700 text-white h-7 text-[9px]"
                            />
                            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-2 text-[9px] text-zinc-400 h-7 sm:w-24">
                              <span className="truncate">Symbol: {deriveSymbolFromName(newCryptoName) || "—"}</span>
                            </div>
                            <Button
                              onClick={addCryptoCurrency}
                              disabled={!newCryptoName}
                              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-600 text-black h-7 px-2 text-[9px]"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* List of cryptocurrencies */}
                        {storeSettings.paymentSettings.cryptoCurrencies.map((crypto, cryptoIndex) => (
                          <div key={cryptoIndex} className="p-2 sm:p-3 bg-zinc-900 rounded space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-cyan-500/20 rounded-full flex-shrink-0 flex items-center justify-center">
                                  <span className="text-cyan-400 text-[8px] sm:text-xs font-bold">{crypto.symbol.slice(0, 2)}</span>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-medium text-[9px] sm:text-xs">{crypto.name}</p>
                                  <p className="text-[8px] text-zinc-500">{crypto.networks.length} net</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedCryptoIndex(selectedCryptoIndex === cryptoIndex ? null : cryptoIndex)}
                                  className="border-zinc-700 text-black hover:bg-zinc-100 text-[8px] h-7 px-2"
                                >
                                  {selectedCryptoIndex === cryptoIndex ? 'Hide' : 'Set'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeCryptoCurrency(cryptoIndex)}
                                  className="border-red-500/50 text-red-400 hover:bg-red-500/20 h-7 w-7"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {selectedCryptoIndex === cryptoIndex && (
                              <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-3 border-t border-zinc-800">
                                {/* Add network */}
                                <p className="text-[8px] text-zinc-400">Add Network (All fields required)</p>
                                <div className="flex flex-col gap-1">
                                  <Input
                                    value={newNetworkName}
                                    onChange={(e) => setNewNetworkName(e.target.value)}
                                    placeholder="Network Name (Required)"
                                    className="bg-zinc-800 border-zinc-700 text-white h-7 text-[9px]"
                                  />
                                  <Input
                                    value={newNetworkAddress}
                                    onChange={(e) => setNewNetworkAddress(e.target.value)}
                                    placeholder="Wallet Address (Required)"
                                    className="bg-zinc-800 border-zinc-700 text-white w-full h-7 text-[9px] break-all"
                                  />
                                  <Button
                                    onClick={() => addNetwork(cryptoIndex)}
                                    disabled={!newNetworkName || !newNetworkAddress}
                                    className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-zinc-600 text-black h-7 text-[9px]"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Network
                                  </Button>
                                </div>
                                
                                {/* List networks */}
                                {crypto.networks.map((network, networkIndex) => {
                                  const isEditing = editingNetwork?.cryptoIndex === cryptoIndex && editingNetwork?.networkIndex === networkIndex
                                  
                                  return (
                                  <div key={networkIndex} className="flex flex-col gap-1 p-2 sm:p-2.5 bg-zinc-800/50 rounded">
                                    <div className="flex items-center gap-1.5 justify-between">
                                      <Badge className="bg-zinc-700 text-zinc-300 text-[8px] py-0 px-1">{network.network}</Badge>
                                      <div className="flex gap-1">
                                        {isEditing ? (
                                          <>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() => setEditingNetwork(null)}
                                              className="border-green-500/50 text-green-400 hover:bg-green-500/20 h-6 w-6"
                                            >
                                              <Check className="h-2.5 w-2.5" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() => setEditingNetwork(null)}
                                              className="border-zinc-700 text-black hover:bg-zinc-100 h-6 w-6"
                                            >
                                              <X className="h-2.5 w-2.5" />
                                            </Button>
                                          </>
                                        ) : (
                                          <>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() => setEditingNetwork({ cryptoIndex, networkIndex })}
                                              className="border-zinc-700 text-black hover:bg-zinc-100 h-6 w-6"
                                            >
                                              <Edit className="h-2.5 w-2.5" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() => {
                                                navigator.clipboard.writeText(network.address)
                                              }}
                                              className="border-zinc-700 text-black hover:bg-zinc-100 h-6 w-6"
                                            >
                                              <Copy className="h-2.5 w-2.5" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="icon"
                                              onClick={() => removeNetwork(cryptoIndex, networkIndex)}
                                              className="border-red-500/50 text-red-400 hover:bg-red-500/20 h-6 w-6"
                                            >
                                              <Trash2 className="h-2.5 w-2.5" />
                                            </Button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    {isEditing ? (
                                      <Input
                                        value={network.address}
                                        onChange={(e) => updateNetworkAddress(cryptoIndex, networkIndex, e.target.value)}
                                        placeholder="Enter wallet address"
                                        className="bg-zinc-800 border-zinc-700 text-white w-full font-mono text-[8px] h-7 break-all"
                                        autoFocus
                                      />
                                    ) : (
                                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                                        <div className="bg-zinc-800 border border-zinc-700 rounded p-1.5 font-mono text-[8px] text-white break-all overflow-auto max-h-20">
                                          {network.address}
                                        </div>
                                        <img
                                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(network.address)}`}
                                          alt={`${network.network} wallet QR code`}
                                          loading="lazy"
                                          className="w-20 h-20 rounded border border-zinc-700 object-contain"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  )
                                })}
                                
                                {crypto.networks.length === 0 && (
                                  <p className="text-sm text-zinc-500 text-center py-2">No networks configured. Add a network above.</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {storeSettings.paymentSettings.cryptoCurrencies.length === 0 && (
                          <p className="text-sm text-zinc-500 text-center py-4">No cryptocurrencies configured. Add one above.</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
      </div>
    </div>
  )
}
