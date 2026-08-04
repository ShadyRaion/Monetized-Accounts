"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { apiPath, authHeaders, apiFetch } from "@/lib/api"

interface AdminUser {
  id: string
  email: string
  name: string
  role?: string
}

interface PendingEmailChange {
  newEmail: string
  verificationCode: string
  expiresAt: number
}

interface AdminAuthContextType {
  user: AdminUser | null
  isLoading: boolean
  isAuthenticated: boolean
  pendingEmailChange: PendingEmailChange | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  requestEmailChange: (newEmail: string, currentPassword: string) => Promise<{ success: boolean; error?: string }>
  verifyEmailChange: (code: string) => Promise<{ success: boolean; error?: string }>
  cancelEmailChange: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [pendingEmailChange, setPendingEmailChange] = useState<PendingEmailChange | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const initializeAdminSession = async () => {
      setIsLoading(true)

      try {
        const response = await apiFetch(apiPath('/auth/profile'), {
          headers: authHeaders()
        })
        if (!response.ok) {
          setUser(null)
          return
        }

        const userData = await response.json()
        if (userData?.role !== 'ADMIN') {
          setUser(null)
          return
        }

        setUser(userData)
      } catch (error) {
        console.warn('Admin session restore failed:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
        setSessionChecked(true)
      }
    }

    initializeAdminSession()
  }, [])

  useEffect(() => {
    // Don't redirect until we've finished checking the session
    if (!sessionChecked) {
      return
    }

    const normalizedPathname = pathname?.replace(/\/$/, "") ?? ""
    const adminBasePath = "/ks7q"
    const isLoginPage = normalizedPathname === `${adminBasePath}/login`
    const isAdminArea = normalizedPathname.startsWith(adminBasePath) && !isLoginPage

    if (!user && isAdminArea) {
      router.replace(`${adminBasePath}/login`)
    } else if (user && isLoginPage) {
      router.replace(adminBasePath)
    }
  }, [user, sessionChecked, pathname, router])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await apiFetch(apiPath('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      if (data.user?.role !== 'ADMIN') {
        return false
      }

      const adminUser: AdminUser = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role
      }
      setUser(adminUser)
      return true
    } catch (error) {
      console.error('Admin login error:', error)
      return false
    }
  }

  const logout = () => {
    void apiFetch(apiPath('/auth/logout'), { method: 'POST' })
    setUser(null)
    setPendingEmailChange(null)
    router.replace("/ks7q/login")
  }

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters' }
    }

    try {
const response = await apiFetch(apiPath('/auth/password'), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.message || 'Failed to change password' }
      }
      return { success: true }
    } catch (error: any) {
      console.error('Admin change password error:', error)
      return { success: false, error: 'Failed to change password' }
    }
  }

  const requestEmailChange = async (newEmail: string, currentPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return { success: false, error: 'Invalid email format' }
    }

    if (newEmail === user.email) {
      return { success: false, error: 'New email must be different from current email' }
    }

    try {
      const response = await apiFetch(apiPath('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: currentPassword })
      })

      if (!response.ok) {
        return { success: false, error: 'Current password is incorrect' }
      }
    } catch (error) {
      console.error('Email change validation error:', error)
      return { success: false, error: 'Unable to verify current password' }
    }

    const verificationCode = generateVerificationCode()
    const pendingChange: PendingEmailChange = {
      newEmail,
      verificationCode,
      expiresAt: Date.now() + 10 * 60 * 1000
    }

    setPendingEmailChange(pendingChange)

    return { success: true }
  }

  const verifyEmailChange = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!pendingEmailChange) {
      return { success: false, error: 'No pending email change request' }
    }

    if (Date.now() > pendingEmailChange.expiresAt) {
      setPendingEmailChange(null)
      return { success: false, error: 'Verification code has expired. Please request a new one.' }
    }

    if (code !== pendingEmailChange.verificationCode) {
      return { success: false, error: 'Invalid verification code' }
    }

    try {
      const response = await apiFetch(apiPath('/auth/profile'), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ email: pendingEmailChange.newEmail })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.message || 'Failed to update email' }
      }

      const updatedUser = await response.json()
      setUser(updatedUser)
      setPendingEmailChange(null)
      return { success: true }
    } catch (error: any) {
      console.error('Verify email change error:', error)
      return { success: false, error: 'Failed to update email' }
    }
  }

  const cancelEmailChange = () => {
    setPendingEmailChange(null)
  }

  const isAuthenticated = !!user

  return (
    <AdminAuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      pendingEmailChange,
      login,
      logout,
      changePassword,
      requestEmailChange,
      verifyEmailChange,
      cancelEmailChange
    }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider")
  }
  return context
}
