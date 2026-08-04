"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Users,
  MessageSquare,
  Star,
  UserPlus,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft
} from "lucide-react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { useStoreSettings } from "@/lib/store-settings-context"
import { useStoreData } from "@/lib/store-data-context"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: "unread"
}

interface AdminSidebarProps {
  isCollapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

export function AdminSidebar({ isCollapsed, onCollapsedChange }: AdminSidebarProps) {
  const pathname = usePathname()
  const { logout, user } = useAdminAuth()
  const { settings } = useStoreSettings()
  const { tickets, hasLiveUpdates, hasNewOrders, hasNewCustomers, hasNewReviews, hasNewSubscribers, hasOpenTickets } = useStoreData()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  
  // Check if there are any unresolved tickets that still need attention
  const hasUnreadMessages = tickets.some(t => t.status === "open" || t.status === "opened")
  const showUpdateIndicator = hasOpenTickets

  const adminBasePath = "/ks7q"
  const navItems: NavItem[] = [
    { label: "Dashboard", href: adminBasePath, icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: "Products", href: `${adminBasePath}/products`, icon: <Package className="h-5 w-5" /> },
    { label: "Orders", href: `${adminBasePath}/orders`, icon: <ShoppingCart className="h-5 w-5" />, badge: hasNewOrders ? 'unread' : undefined },
    { label: "Analytics", href: `${adminBasePath}/analytics`, icon: <BarChart3 className="h-5 w-5" /> },
    { label: "Customers", href: `${adminBasePath}/customers`, icon: <Users className="h-5 w-5" />, badge: hasNewCustomers ? 'unread' : undefined },
    { label: "Messages", href: `${adminBasePath}/messages`, icon: <MessageSquare className="h-5 w-5" />, badge: showUpdateIndicator ? "unread" : undefined },
    { label: "Reviews", href: `${adminBasePath}/reviews`, icon: <Star className="h-5 w-5" />, badge: hasNewReviews ? 'unread' : undefined },
    { label: "FAQ", href: `${adminBasePath}/faq`, icon: <MessageSquare className="h-5 w-5" /> },
    { label: "Affiliates", href: `${adminBasePath}/affiliates`, icon: <UserPlus className="h-5 w-5" /> },
    { label: "Subscribers", href: `${adminBasePath}/subscribers`, icon: <Mail className="h-5 w-5" />, badge: hasNewSubscribers ? 'unread' : undefined },
    { label: "Settings", href: `${adminBasePath}/settings`, icon: <Settings className="h-5 w-5" /> },
  ]

  const isActive = (href: string) => {
    if (href === adminBasePath) {
      return pathname === adminBasePath
    }
    return pathname?.startsWith(href)
  }

  return (
    <>
      {/* Mobile menu button */}
      {!isMobileOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 lg:hidden bg-[#1a1a2e] text-white hover:bg-[#2a2a4e]"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-[#1a1a2e] text-white transition-all duration-300 flex flex-col",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex items-center h-16 px-4 border-b border-white/10",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <span className="text-lg font-bold">Admin Panel</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:flex hover:bg-white/10"
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsMobileOpen(false)
              } else {
                onCollapsedChange(!isCollapsed)
              }
            }}
          >
            <ChevronLeft className={cn("h-5 w-5 transition-transform", isCollapsed && "rotate-180")} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive(item.href)
                      ? "text-white"
                      : "text-gray-300 hover:bg-white/10 hover:text-white",
                    isCollapsed && "justify-center px-2"
                  )}
                  style={isActive(item.href) ? { backgroundColor: settings.primaryColor } : {}}
                >
                  {item.icon}
                  {!isCollapsed && (
                    <span className="flex-1">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge === "unread" && (
                    <div 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: settings.primaryColor }}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className={cn(
          "border-t border-white/10 p-4",
          isCollapsed && "flex flex-col items-center"
        )}>
          {!isCollapsed && user && (
            <div className="mb-3 text-sm">
              <p className="font-medium">{user.name}</p>
              <p className="text-gray-400 text-xs truncate">{user.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            className={cn(
              "text-gray-300 hover:bg-white/10 hover:text-white",
              isCollapsed ? "w-10 h-10 p-0" : "w-full justify-start"
            )}
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span className="ml-3">Logout</span>}
          </Button>
        </div>
      </aside>
    </>
  )
}
