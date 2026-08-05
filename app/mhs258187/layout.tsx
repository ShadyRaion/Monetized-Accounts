"use client"

import { useState } from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { usePathname } from "next/navigation"
import { Toaster } from "sonner"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isLoginPage = pathname === "/mhs258187/login"
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[#1e1e2e]">
      {!isLoginPage && (
        <AdminSidebar 
          isCollapsed={isSidebarCollapsed} 
          onCollapsedChange={setIsSidebarCollapsed} 
        />
      )}
      <main 
        className={!isLoginPage 
          ? `min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20 ml-0' : 'lg:ml-64 ml-0'}` 
          : ""
        }
      >
        {children}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  )
}
