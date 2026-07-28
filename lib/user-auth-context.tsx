"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { apiPath, authHeaders, apiFetch } from "@/lib/api"

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
  referralCode?: string // The referral code of the person who invited this user
}

export interface SupportTicket {
  id: string
  userId: string
  subject: string
  message: string
  status: "open" | "opened" | "replied" | "closed"
  createdAt: string
  responses: {
    id: string
    message: string
    isAdmin: boolean
    senderId: string
    senderName: string
    createdAt: string
  }[]
}

interface UserAuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  favorites: string[]
  supportTickets: SupportTicket[]
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string, referralCode?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  updateProfile: (data: { name?: string; email?: string }) => Promise<{ success: boolean; error?: string }>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  addToFavorites: (productId: string) => void
  removeFromFavorites: (productId: string) => void
  isFavorite: (productId: string) => boolean
  createSupportTicket: (subject: string, message: string, type?: string) => Promise<string | undefined>
  addTicketResponse: (ticketId: string, message: string) => void
  refreshSupportTickets: () => Promise<void>
  updateTicketStatus: (ticketId: string, status: SupportTicket["status"]) => void
  redirectToLogin: (returnUrl?: string) => void
  returnUrl: string | null
  clearReturnUrl: () => void
}

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined)

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || ''

const normalizeSupportTicketStatus = (status?: string): SupportTicket["status"] => {
  switch ((status ?? "").toLowerCase()) {
    case "opened":
      return "opened"
    case "replied":
      return "replied"
    case "closed":
      return "closed"
    default:
      return "open"
  }
}

const mapTicket = (ticket: any, currentUserId?: string): SupportTicket => {
  const ticketOwnerId = ticket.userId ?? ticket.user?.id ?? ""
  const ticketOwnerEmail = (ticket.user?.email ?? "").toLowerCase()
  const messages = Array.isArray(ticket.messages) ? [...ticket.messages] : []
  messages.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const firstMessage = messages[0]
  const responses = messages.slice(1).map((msg: any) => {
    const senderId = msg.sender?.id ?? msg.senderId ?? ""
    const senderName = msg.sender?.name ?? (senderId === ticketOwnerId ? ticket.user?.name ?? "You" : "Support Team")
    const isAdmin = msg.sender?.role === 'ADMIN' || (senderId !== "" && senderId !== ticketOwnerId)

    return {
      id: msg.id,
      message: msg.message,
      isAdmin,
      senderId,
      senderName,
      createdAt: msg.createdAt
    }
  })

  return {
    id: ticket.id,
    userId: ticket.userId,
    subject: ticket.subject,
    message: firstMessage?.message || "",
    status: normalizeSupportTicketStatus(ticket.status),
    createdAt: ticket.createdAt,
    responses
  }
}

const fetchFavorites = async (token: string): Promise<string[]> => {
  try {
    const response = await apiFetch(apiPath('/favorites'), {
      headers: authHeaders()
    })
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data) ? data.map((fav: any) => fav.product?.id).filter(Boolean) : []
  } catch (error) {
    console.error('Failed to load favorites', error)
    return []
  }
}

const fetchSupportTickets = async (token: string, currentUserId?: string): Promise<SupportTicket[]> => {
  try {
    const response = await apiFetch(apiPath('/tickets/me'), {
      headers: authHeaders()
    })
    if (!response.ok) return []
    const data = await response.json()
    return Array.isArray(data) ? data.map((ticket: any) => mapTicket(ticket, currentUserId)) : []
  } catch (error) {
    console.error('Failed to load support tickets', error)
    return []
  }
}

export function UserAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [favorites, setFavorites] = useState<string[]>([])
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [returnUrl, setReturnUrl] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const initializeSession = async () => {
      try {
const profileResponse = await apiFetch(apiPath('/auth/profile'), {
          headers: authHeaders()
        })

        if (!profileResponse.ok) {
          throw new Error('Session validation failed')
        }

        const userData = await profileResponse.json()
        if (userData?.role === 'ADMIN') {
          throw new Error('Admin sessions are not valid for customer interface')
        }

        setUser(userData)
        const [favoriteIds, tickets] = await Promise.all([
          fetchFavorites(''),
          fetchSupportTickets('', userData.id)
        ])

        setFavorites(favoriteIds)
        setSupportTickets(tickets)
      } catch (error) {
        console.warn('Failed to restore session:', error)
        setUser(null)
        setFavorites([])
        setSupportTickets([])
      } finally {
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
const response = await apiFetch(apiPath('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user?.role === 'ADMIN') {
          return { success: false, error: 'Admin credentials are not valid for customer login' }
        }
        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          createdAt: data.user.createdAt || new Date().toISOString(),
          referralCode: data.user.referralCode
        }
        setUser(userData)
        const [favoriteIds, tickets] = await Promise.all([
          fetchFavorites(''),
          fetchSupportTickets('', userData.id)
        ])

        setFavorites(favoriteIds)
        setSupportTickets(tickets)

        return { success: true }
      }

      const errorData = await response.json()
      return { success: false, error: errorData.message || "Login failed" }
    } catch (error: any) {
      return { success: false, error: "Login failed: " + error.message }
    }
  }

  const register = async (email: string, password: string, name: string, referralCode?: string): Promise<{ success: boolean; error?: string; userId?: string }> => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { success: false, error: "Invalid email format" }
    }
    
    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" }
    }
    
    if (name.trim().length < 2) {
      return { success: false, error: "Name must be at least 2 characters" }
    }

    try {
const response = await apiFetch(apiPath('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, referralCode })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user?.role === 'ADMIN') {
          return { success: false, error: 'Admin credentials are not valid for customer registration' }
        }
        const userData: User = {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          createdAt: data.user.createdAt || new Date().toISOString(),
          referralCode: data.user.referralCode
        }
        setUser(userData)
        const [favoriteIds, tickets] = await Promise.all([
          fetchFavorites(''),
          fetchSupportTickets('', userData.id)
        ])

        setFavorites(favoriteIds)
        setSupportTickets(tickets)

        return { success: true, userId: userData.id }
      }

      const errorData = await response.json()
      return { success: false, error: errorData.message || "Registration failed" }
    } catch (error: any) {
      return { success: false, error: "Registration failed: " + error.message }
    }
  }

  const logout = () => {
    void apiFetch(apiPath('/auth/logout'), { method: 'POST' })
    setUser(null)
    setFavorites([])
    setSupportTickets([])
    setReturnUrl(null)
    router.push("/")
  }

  const updateProfile = async (data: { name?: string; email?: string }): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not logged in" }
    try {
const response = await apiFetch(apiPath('/auth/profile'), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.message || "Failed to update profile" }
      }

      const updatedUser = await response.json()
      setUser(updatedUser)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: "Failed to update profile: " + error.message }
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: "Not logged in" }
    try {
const response = await apiFetch(apiPath('/auth/password'), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      })

      if (!response.ok) {
        const errorData = await response.json()
        return { success: false, error: errorData.message || "Failed to change password" }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: "Failed to change password: " + error.message }
    }
  }

  const addToFavorites = async (productId: string) => {
    if (!user) return
    try {
      const response = await apiFetch(apiPath('/favorites'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ productId })
      })
      if (!response.ok) {
        console.warn('Failed to add favorite')
        return
      }
      setFavorites(prev => prev.includes(productId) ? prev : [...prev, productId])
    } catch (error) {
      console.error('Error adding favorite', error)
    }
  }

  const removeFromFavorites = async (productId: string) => {
    if (!user) return
    try {
      const response = await apiFetch(apiPath(`/favorites/${productId}`), {
        method: 'DELETE',
        headers: authHeaders()
      })
      if (!response.ok) {
        console.warn('Failed to remove favorite')
        return
      }
      setFavorites(prev => prev.filter(id => id !== productId))
    } catch (error) {
      console.error('Error removing favorite', error)
    }
  }

  const isFavorite = (productId: string) => {
    return favorites.includes(productId)
  }

  const createSupportTicket = async (subject: string, message: string, type: string = 'Account'): Promise<string | undefined> => {
    if (!user) return
    try {
      const response = await apiFetch(apiPath('/tickets'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ type, subject, message })
      })
      if (!response.ok) {
        console.warn('Failed to create support ticket')
        return
      }
      const newTicketData = await response.json()
      const newTicketId = newTicketData.id
      const tickets = await fetchSupportTickets('', user.id)
      setSupportTickets(tickets)
      return newTicketId
    } catch (error) {
      console.error('Error creating support ticket', error)
    }
  }

  const addTicketResponse = async (ticketId: string, message: string) => {
    if (!user) return
    try {
      const response = await apiFetch(apiPath(`/tickets/${ticketId}/messages`), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message })
      })
      if (!response.ok) {
        console.warn('Failed to add ticket response')
        return
      }
      // Backend returns the updated ticket, use it to update local state
      const updatedTicket = await response.json()
      setSupportTickets(prev => prev.map(t => 
        t.id === ticketId ? mapTicket(updatedTicket, user.id) : t
      ))
    } catch (error) {
      console.error('Error adding ticket response', error)
    }
  }

  const refreshSupportTickets = async () => {
    if (!user) return
    try {
      const tickets = await fetchSupportTickets('', user.id)
      setSupportTickets(tickets)
    } catch (err) {
      console.warn('Failed to refresh support tickets', err)
    }
  }

  const updateTicketStatus = async (ticketId: string, status: SupportTicket["status"]) => {
    setSupportTickets(prev => prev.map(ticket => {
      if (ticket.id === ticketId) {
        return { ...ticket, status }
      }
      return ticket
    }))

    try {
      const response = await apiFetch(apiPath(`/tickets/${ticketId}`), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status })
      })
      if (!response.ok) {
        console.warn('Failed to persist ticket status update')
        await refreshSupportTickets()
      }
    } catch (error) {
      console.error('Error updating ticket status', error)
      await refreshSupportTickets()
    }
  }

  const redirectToLogin = (url?: string) => {
    const targetUrl = (url && url.trim())
      ? (url.startsWith("/") ? url : `/${url}`)
      : (typeof window !== "undefined" ? `${pathname}${window.location.search}` : pathname || "/")

    setReturnUrl(targetUrl)
    router.push("/login")
  }

  const clearReturnUrl = () => {
    setReturnUrl(null)
  }

  const isAuthenticated = !!user

  return (
    <UserAuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      favorites,
      supportTickets,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      addToFavorites,
      removeFromFavorites,
      isFavorite,
      createSupportTicket,
      addTicketResponse,
      refreshSupportTickets,
      updateTicketStatus,
      redirectToLogin,
      returnUrl,
      clearReturnUrl
    }}>
      {children}
    </UserAuthContext.Provider>
  )
}

export function useUserAuth() {
  const context = useContext(UserAuthContext)
  if (context === undefined) {
    throw new Error("useUserAuth must be used within a UserAuthProvider")
  }
  return context
}
