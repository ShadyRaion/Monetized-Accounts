"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu, X, ShoppingCart, User, LogOut, Package, Heart, MessageSquare, Settings, ChevronRight, Bell } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useStoreSettings } from "@/lib/store-settings-context"
import { useUserAuth } from "@/lib/user-auth-context"
import { useStoreData } from "@/lib/store-data-context"
import { useReferral } from "@/lib/referral-context"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userPanelOpen, setUserPanelOpen] = useState(false)
  const { itemCount } = useCart()
  const { settings, isLoaded } = useStoreSettings()
  const { user, isAuthenticated, isLoading, logout, redirectToLogin } = useUserAuth()
  const { tickets, subscribers, deleteSubscriber, hasOpenTickets, clearOpenTickets, hasLiveUpdates, hasNewOrders, clearNewOrders } = useStoreData()
  const { referralCode } = useReferral()
  
  // Check if user is subscribed
  const isUserSubscribed = isAuthenticated && user && subscribers.some(s => s.email.toLowerCase() === user.email.toLowerCase() && s.status === "active")
  
  const handleUnsubscribe = () => {
    if (isAuthenticated && user) {
      const subscriber = subscribers.find(s => s.email.toLowerCase() === user.email.toLowerCase())
      if (subscriber) {
        deleteSubscriber(subscriber.id)
      }
    }
  }

  // When opening support tickets from the profile panel, mark open tickets as seen
  useEffect(() => {
    if (!user) return
    if (userPanelOpen) {
      if (clearOpenTickets) {
        clearOpenTickets()
      }
    }
  }, [userPanelOpen, user, clearOpenTickets])
  
  // Check if current user has unread messages for customer-visible Open tickets.
  const userUnreadTickets = user ? tickets.filter(t => t.userId === user.id && t.status === "replied") : []
  const hasUnreadMessages = userUnreadTickets.length > 0
  // Show profile notification when there are unread support messages or new orders
  const showProfileNotification = hasUnreadMessages || Boolean(hasNewOrders) || Boolean(hasOpenTickets)
  
  // Helper function to add referral code to links
  const getLinkWithRef = (path: string) => {
    if (!referralCode || user) return path // Don't add ref if user is already logged in
    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}ref=${encodeURIComponent(referralCode)}`
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2">
            {isLoaded ? (
              settings.logoUrl ? (
                <img src={settings.logoUrl} alt={settings.storeName} className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs sm:text-sm" style={{ backgroundColor: settings.primaryColor || '#000' }}>
                  <span className="font-bold text-white">{settings.storeName.slice(0, 2).toUpperCase()}</span>
                </div>
              )
            ) : (
              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gray-200 animate-pulse" />
            )}
            <span className="font-bold text-sm sm:text-lg text-black">{isLoaded ? settings.storeName : <span className="inline-block h-4 w-24 rounded-full bg-gray-200 animate-pulse" />}</span>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-6 lg:gap-8">
            <Link href={getLinkWithRef("/shop")} className="text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">Accounts</Link>
            <Link href={getLinkWithRef("/faq")} className="text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">FAQ</Link>
            <Link href={getLinkWithRef("/affiliate")} className="text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">Affiliate</Link>
            <Link href={getLinkWithRef("/contact")} className="text-xs sm:text-sm text-gray-600 hover:text-black transition-colors">Contact</Link>
          </nav>
          
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            <Link href={getLinkWithRef("/cart")} className="relative p-1.5 sm:p-2 text-gray-600 hover:text-black transition-colors">
              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              {itemCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 text-white text-xs rounded-full flex items-center justify-center text-[10px] sm:text-xs"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  {itemCount}
                </span>
              )}
            </Link>
            {isAuthenticated ? (
              <Sheet open={userPanelOpen} onOpenChange={setUserPanelOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline"
                    className="rounded-full px-2 sm:px-4 py-1 sm:py-2 gap-1 sm:gap-2 text-xs sm:text-sm h-auto relative"
                  >
                          <User className="w-3 h-3 sm:w-4 sm:h-4" />
                          {showProfileNotification && (
                            <Bell className="absolute -right-1 -top-1 w-4 h-4 sm:w-5 sm:h-5 text-red-500" aria-hidden />
                          )}
                    <span className="max-w-20 sm:max-w-25 truncate hidden sm:inline">{user?.name?.split(' ')[0]}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80 sm:w-100">
                  <SheetHeader>
                    <SheetTitle>My Account</SheetTitle>
                  </SheetHeader>
                  <div className="py-6">
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: settings.primaryColor }}
                      >
                        {user?.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{user?.name}</p>
                        <p className="text-sm text-gray-500">{user?.email}</p>
                      </div>
                    </div>
                    <nav className="space-y-1">
                      <Link 
                        href="/account" 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setUserPanelOpen(false)}
                      >
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-gray-500" />
                          <span>Profile</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                      <Link 
                        href="/account/orders" 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          setUserPanelOpen(false)
                          if (clearNewOrders) {
                            clearNewOrders()
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-gray-500" />
                          <span>My Orders</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasNewOrders && (
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: settings.primaryColor }} />
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      </Link>
                      <Link 
                        href="/account/favorites" 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setUserPanelOpen(false)}
                      >
                        <div className="flex items-center gap-3">
                          <Heart className="w-5 h-5 text-gray-500" />
                          <span>Favorites</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                      <Link 
                        href="/account/support" 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors relative"
                        onClick={() => setUserPanelOpen(false)}
                      >
                        <div className="flex items-center gap-3">
                          <MessageSquare className="w-5 h-5 text-gray-500" />
                          <span>Support Tickets</span>
                          {hasUnreadMessages && (
                            <div 
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: settings.primaryColor }}
                            />
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                      <Link 
                        href="/account/settings" 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setUserPanelOpen(false)}
                      >
                        <div className="flex items-center gap-3">
                          <Settings className="w-5 h-5 text-gray-500" />
                          <span>Settings</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    </nav>
                    <div className="mt-6 pt-6 border-t space-y-2">
                      {isUserSubscribed && (
                        <button
                          onClick={handleUnsubscribe}
                          className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-orange-50 text-orange-600 transition-colors text-sm"
                        >
                          <Bell className="w-5 h-5" />
                          <span>Unsubscribe</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          logout()
                          setUserPanelOpen(false)
                        }}
                        className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                      >
                        <LogOut className="w-5 h-5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            ) : isLoading ? (
            <div className="h-9 w-24 rounded-full bg-gray-100 animate-pulse" />
          ) : (
            <Button 
              className="text-white rounded-full px-6"
              style={{ backgroundColor: settings.primaryColor }}
              onClick={() => redirectToLogin()}
            >
              Sign In
            </Button>
          )}
          </div>
          <div className="md:hidden flex items-center gap-2">
            <Link href="/cart" className="relative p-2 text-gray-600 hover:text-black transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span 
                  className="absolute -top-1 -right-1 w-5 h-5 text-white text-xs rounded-full flex items-center justify-center"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  {itemCount}
                </span>
              )}
            </Link>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="p-2">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-1/2 max-h-screen overflow-y-auto pt-20">
                <nav className="flex flex-col gap-4 text-center">
                  <Link href="/shop" className="text-gray-600 hover:text-black transition-colors text-sm font-semibold" onClick={() => setMobileMenuOpen(false)}>Accounts</Link>
                  <Link href="/faq" className="text-gray-600 hover:text-black transition-colors text-sm font-semibold" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
                  <Link href="/affiliate" className="text-gray-600 hover:text-black transition-colors text-sm font-semibold" onClick={() => setMobileMenuOpen(false)}>Affiliate</Link>
                  <Link href="/contact" className="text-gray-600 hover:text-black transition-colors text-sm font-semibold" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
                  {isAuthenticated ? (
                    <>
                      <div className="border-t border-b py-3 my-2">
                        <p className="text-xs text-gray-500 mb-3">Signed in</p>
                        <div className="flex flex-col gap-3">
                          <Link href="/account" className="text-gray-600 hover:text-black transition-colors text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}>Account</Link>
                          <Link href="/account/orders" className="text-gray-600 hover:text-black transition-colors text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}>Orders</Link>
                          <Link href="/account/favorites" className="text-gray-600 hover:text-black transition-colors text-xs font-semibold" onClick={() => setMobileMenuOpen(false)}>Favorites</Link>
                          <button 
                            onClick={() => { logout(); setMobileMenuOpen(false); }} 
                            className="text-red-600 hover:text-red-700 transition-colors text-xs font-semibold"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  ) : isLoading ? (
                    <div className="h-10 w-full rounded-full bg-gray-100 animate-pulse" />
                  ) : (
                    <Button 
                      className="text-white rounded-full w-full text-xs py-2"
                      style={{ backgroundColor: settings.primaryColor }}
                      onClick={() => { redirectToLogin(); setMobileMenuOpen(false) }}
                    >
                      Sign In
                    </Button>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}
