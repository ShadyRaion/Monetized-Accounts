"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bell, Flame, Star, Mail, Disc, Copy, CheckCircle } from "lucide-react"
import { useStoreSettings } from "@/lib/store-settings-context"
import { useStoreData } from "@/lib/store-data-context"
import { useUserAuth } from "@/lib/user-auth-context"

export function Footer() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const { settings } = useStoreSettings()
  const { stats, addSubscriber, subscribers } = useStoreData()
  const { user, isAuthenticated } = useUserAuth()

  // Check if current logged-in user is already subscribed
  const isUserSubscribed = isAuthenticated && user && subscribers.some(s => s.email.toLowerCase() === user.email.toLowerCase() && s.status === "active")

  // Pre-fill email if user is logged in
  useEffect(() => {
    if (isAuthenticated && user && !email) {
      setEmail(user.email)
    }
  }, [isAuthenticated, user, email])

  const normalizeUrl = (url?: string) => {
    if (!url) return ""
    if (url.startsWith("http://") || url.startsWith("https://")) return url
    return `https://${url.replace(/^\/+/, "")}`
  }

  const discordUrl = normalizeUrl(settings.storeDiscordLink)

  const copyEmail = () => {
    if (settings.storeEmail) {
      navigator.clipboard.writeText(settings.storeEmail)
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      addSubscriber(email)
      setSubmitted(true)
      setEmail("")
    }
  }

  // Hide newsletter section if user is subscribed
  if (isUserSubscribed) {
    return (
      <footer className="bg-black text-white">
        <div className="container mx-auto px-4 py-4 sm:py-12">
          <div className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr] justify-items-stretch gap-3 sm:gap-3 md:gap-x-10 lg:gap-x-16 mb-4 sm:mb-8">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 mb-3 sm:mb-4 hover:opacity-80 transition-opacity">
                <div 
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  <span className="font-bold text-white text-[10px] sm:text-sm">{settings.storeName.slice(0, 2).toUpperCase()}</span>
                </div>
                <span className="font-bold text-xs sm:text-lg">{settings.storeName}</span>
              </Link>
              <p className="text-gray-400 text-xs sm:text-sm hidden sm:block max-w-[16rem]">
                The #1 marketplace for pre-monetized social media accounts.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold mb-2 sm:mb-4 text-xs sm:text-base">Company</h4>
              <nav className="flex flex-col items-start gap-1 sm:gap-2 text-gray-400 text-xs sm:text-sm">
                <Link href="/faq" className="inline-block w-fit self-start hover:text-white transition-colors">FAQ</Link>
                <Link href="/affiliate" className="inline-block w-fit self-start hover:text-white transition-colors">Affiliate</Link>
                <Link href="/contact" className="inline-block w-fit self-start hover:text-white transition-colors">Contact</Link>
              </nav>
            </div>
            
            <div>
              <h4 className="font-bold mb-2 sm:mb-4 text-xs sm:text-base">Legal</h4>
              <nav className="flex flex-col items-start gap-1 sm:gap-2 text-gray-400 text-xs sm:text-sm">
                <Link href="/terms" className="inline-block w-fit self-start hover:text-white transition-colors">Terms</Link>
                <Link href="/privacy" className="inline-block w-fit self-start hover:text-white transition-colors">Privacy</Link>
                <Link href="/refund" className="inline-block w-fit self-start hover:text-white transition-colors">Refund</Link>
              </nav>
            </div>

            <div>
              <h4 className="font-bold mb-2 sm:mb-4 text-xs sm:text-base">Support</h4>
              <div className="flex flex-col gap-3 text-gray-400 text-xs sm:text-sm">
                {settings.storeEmail ? (
                  <button 
                    onClick={copyEmail}
                    className="inline-flex items-center gap-2 hover:text-white transition-colors w-fit"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{settings.storeEmail}</span>
                    {copiedEmail ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2 text-gray-500">
                    <Mail className="w-4 h-4" />
                    <span>Email not set</span>
                  </div>
                )}
                {discordUrl ? (
                  <a href={discordUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit self-start items-center gap-2 hover:text-white transition-colors">
                    <Disc className="w-4 h-4" />
                    <span>Join our community</span>
                  </a>
                ) : (
                  <div className="inline-flex items-center gap-2 text-gray-500">
                    <Disc className="w-4 h-4" />
                    <span>Discord not set</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-3 sm:pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-gray-400 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <Flame className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" style={{ color: settings.primaryColor }} />
                  <span>Sold this month</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 text-[#25F4EE]" />
                  <span>{stats.averageRating}/5 rating</span>
                </div>
              </div>
              
              <div className="text-gray-600 text-[10px] sm:text-sm">
                &copy; {new Date().getFullYear()} {settings.storeName}
              </div>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="bg-black text-white">
      <div className="border-b border-white/10">
        <div className="container mx-auto px-4 py-4 sm:py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div 
              className="inline-flex items-center gap-2 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-full text-[10px] sm:text-sm font-medium mb-2 sm:mb-6"
              style={{ backgroundColor: settings.primaryColor }}
            >
              <Bell className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
              <span>Get Notified</span>
            </div>
            <h3 className="text-sm sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-4">
              Premium accounts sell fast!
            </h3>
            <p className="text-gray-400 text-[11px] sm:text-sm md:text-base mb-3 sm:mb-6">
              Enter your email for restocks.
            </p>
            {submitted ? (
              <p className="text-[#25F4EE] font-medium text-[10px] sm:text-sm">Thank you! Check your email.</p>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-500 rounded-full px-3 sm:px-6 py-1.5 sm:py-3 text-[10px] sm:text-sm"
                  required
                />
                <Button 
                  type="submit" 
                  className="text-white rounded-full px-4 sm:px-8 py-1.5 sm:py-3 text-[10px] sm:text-sm whitespace-nowrap"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Notify
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-4 sm:py-12">
        <div className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr] justify-items-stretch gap-3 sm:gap-3 md:gap-x-10 lg:gap-x-16 mb-4 sm:mb-8">
          <div className="pr-6 sm:pr-8 md:pr-12 lg:pr-20">
            <Link href="/" className="inline-flex items-center gap-2 mb-3 sm:mb-4 hover:opacity-80 transition-opacity">
              <div 
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: settings.primaryColor }}
              >
                <span className="font-bold text-white text-[10px] sm:text-sm">{settings.storeName.slice(0, 2).toUpperCase()}</span>
              </div>
              <span className="font-bold text-xs sm:text-lg">{settings.storeName}</span>
            </Link>
            <p className="text-gray-400 text-xs sm:text-sm hidden sm:block max-w-[14rem]">
              The #1 marketplace for pre-monetized social media accounts.
            </p>
          </div>
          
          <div className="min-w-0">
            <h4 className="font-bold mb-2 sm:mb-4 text-xs sm:text-base">Company</h4>
            <nav className="flex flex-col items-start gap-1 sm:gap-2 text-gray-400 text-xs sm:text-sm">
              <Link href="/faq" className="inline-block w-fit self-start hover:text-white transition-colors">FAQ</Link>
              <Link href="/affiliate" className="inline-block w-fit self-start hover:text-white transition-colors">Affiliate</Link>
              <Link href="/contact" className="inline-block w-fit self-start hover:text-white transition-colors">Contact</Link>
            </nav>
          </div>
          
          <div className="min-w-0">
            <h4 className="font-bold mb-2 sm:mb-4 text-xs sm:text-base">Legal</h4>
            <nav className="flex flex-col items-start gap-1 sm:gap-2 text-gray-400 text-xs sm:text-sm">
              <Link href="/terms" className="inline-block w-fit self-start hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="inline-block w-fit self-start hover:text-white transition-colors">Privacy</Link>
              <Link href="/refund" className="inline-block w-fit self-start hover:text-white transition-colors">Refund</Link>
            </nav>
          </div>

          <div>
            <h4 className="font-bold mb-2 sm:mb-4 text-xs sm:text-base">Support</h4>
            <div className="flex flex-col items-start gap-3 text-gray-400 text-xs sm:text-sm">
              {settings.storeEmail ? (
                <button 
                  onClick={copyEmail}
                  className="inline-flex w-fit self-start items-center gap-2 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>{settings.storeEmail}</span>
                  {copiedEmail ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 text-gray-500">
                  <Mail className="w-4 h-4" />
                  <span>Email not set</span>
                </div>
              )}
              {discordUrl ? (
                <a href={discordUrl} target="_blank" rel="noreferrer" className="inline-flex w-fit self-start items-center gap-2 hover:text-white transition-colors">
                  <Disc className="w-4 h-4" />
                  <span>Join our community</span>
                </a>
              ) : (
                <div className="inline-flex items-center gap-2 text-gray-500">
                  <Disc className="w-4 h-4" />
                  <span>Discord not set</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-3 sm:pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-gray-400 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Flame className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" style={{ color: settings.primaryColor }} />
                <span>Sold this month</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 text-[#25F4EE]" />
                <span>{stats.averageRating}/5 rating</span>
              </div>
            </div>
            
            <div className="text-gray-600 text-[10px] sm:text-sm">
              &copy; {new Date().getFullYear()} {settings.storeName}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}