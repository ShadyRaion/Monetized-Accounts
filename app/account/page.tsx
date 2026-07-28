"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUserAuth } from "@/lib/user-auth-context"
import { useStoreSettings } from "@/lib/store-settings-context"
import { useStoreData } from "@/lib/store-data-context"
import { Badge } from "@/components/ui/badge"
import { User, Package, Heart, MessageSquare, Settings, ChevronRight } from "lucide-react"

export default function AccountPage() {
  const { user, favorites, supportTickets } = useUserAuth()
  const { settings } = useStoreSettings()
  const { orders, customers } = useStoreData()
  
  // Get user's referral code from customers table
  const userCustomer = customers.find(c => c.email.toLowerCase() === user?.email?.toLowerCase())
  const userReferralCode = userCustomer?.referralCode
  
  // Get user's orders
  const userOrders = orders.filter(order => 
    order.customerEmail.toLowerCase() === user?.email?.toLowerCase()
  )

  const accountSections = [
    {
      title: "My Orders",
      description: `${userOrders.length} order${userOrders.length !== 1 ? 's' : ''}`,
      icon: Package,
      href: "/account/orders"
    },
    {
      title: "Favorites",
      description: `${favorites.length} saved item${favorites.length !== 1 ? 's' : ''}`,
      icon: Heart,
      href: "/account/favorites"
    },
    {
      title: "Support Tickets",
      description: `${supportTickets.length} ticket${supportTickets.length !== 1 ? 's' : ''}`,
      icon: MessageSquare,
      href: "/account/support"
    },
    {
      title: "Account Settings",
      description: "Manage your account",
      icon: Settings,
      href: "/account/settings"
    }
  ]

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div 
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-xl flex-shrink-0"
            style={{ backgroundColor: settings.primaryColor }}
          >
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">{user?.name}</h1>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{user?.email}</p>
            {userReferralCode && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Invited by:</span>
                <Badge variant="secondary" className="text-xs">{userReferralCode}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-lg sm:text-2xl font-bold" style={{ color: settings.primaryColor }}>{userOrders.length}</p>
              <p className="text-xs sm:text-sm text-gray-500">Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-lg sm:text-2xl font-bold" style={{ color: settings.primaryColor }}>{favorites.length}</p>
              <p className="text-xs sm:text-sm text-gray-500">Favorites</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-lg sm:text-2xl font-bold" style={{ color: settings.primaryColor }}>
                ${userOrders.reduce((sum, order) => sum + order.total, 0).toFixed(0)}
              </p>
              <p className="text-sm text-gray-500">Total Spent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: settings.primaryColor }}>
                {supportTickets.filter(t => t.status === "replied").length}
              </p>
              <p className="text-sm text-gray-500">Open Tickets</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Sections */}
        <div className="grid md:grid-cols-2 gap-4">
          {accountSections.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${settings.primaryColor}15` }}
                    >
                      <section.icon className="w-6 h-6" style={{ color: settings.primaryColor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{section.title}</h3>
                      <p className="text-sm text-gray-500">{section.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
