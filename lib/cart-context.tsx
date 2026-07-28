"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import { Account } from "./store-data-context"
import { apiPath, authHeaders, apiFetch } from "./api"
import { useUserAuth } from "./user-auth-context"

interface CartItem {
  cartId?: string
  account: Account
  quantity: number
  addVerification: boolean
  verificationCount: number
}

interface CartContextType {
  items: CartItem[]
  buyNowItem: CartItem | null
  addToCart: (account: Account) => Promise<void>
  removeFromCart: (accountId: string) => Promise<void>
  toggleVerification: (accountId: string) => void
  updateQuantity: (accountId: string, quantity: number) => void
  setVerificationCount: (accountId: string, count: number) => void
  clearCart: () => Promise<void>
  getTotal: () => number
  itemCount: number
  loading: boolean
  setBuyNowItem: (account: Account | null, quantity?: number, verificationCount?: number) => void
  clearBuyNowItem: () => void
  toggleBuyNowVerification: () => void
  setBuyNowVerificationCount: (count: number) => void
  getBuyNowTotal: () => number
  updateBuyNowQuantity: (quantity: number) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [buyNowItem, setBuyNowItemState] = useState<CartItem | null>(null)
  const [loading, setLoading] = useState(false)
  const { user, isLoading: authLoading } = useUserAuth()

  useEffect(() => {
    if (authLoading || !user) {
      setItems([])
      return
    }
    let cancelled = false
    void apiFetch('/cart')
      .then(async response => response.ok ? response.json() : [])
      .then((data: any[]) => {
        if (cancelled) return
        setItems(Array.isArray(data) ? data.map(item => ({
          cartId: item.id,
          account: item.product,
          quantity: item.quantity,
          verificationCount: item.verificationCount || 0,
          addVerification: (item.verificationCount || 0) > 0
        })) : [])
      })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [authLoading, user])

  const addToCart = useCallback(async (account: Account) => {
    setLoading(true)
    try {
      const response = await apiFetch('/cart', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ productId: account.id, quantity: 1 })
      })
      if (!response.ok) {
        throw new Error('Failed to add item to Supabase cart')
      }

      const savedItem = await response.json()
      setItems(prev => {
        const existing = prev.find(item => item.account.id === account.id)
        if (existing) {
          // Increment quantity if item already exists
          return prev.map(item =>
            item.account.id === account.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
        return [...prev, { cartId: savedItem.id, account, quantity: savedItem.quantity || 1, addVerification: false, verificationCount: 0 }]
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const removeFromCart = useCallback(async (accountId: string) => {
    setLoading(true)
    try {
      const item = items.find(entry => entry.account.id === accountId)
      if (!item?.cartId) throw new Error('Cart item is not persisted')
const response = await apiFetch(`/cart/${item.cartId}`, {
        method: 'DELETE',
        headers: authHeaders()
      })
      if (!response.ok) {
        throw new Error('Failed to remove item from Supabase cart')
      }

      setItems(prev => prev.filter(item => item.account.id !== accountId))
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleVerification = (accountId: string) => {
    setItems(prev => prev.map(item => {
      if (item.account.id !== accountId) return item
      const newCount = item.verificationCount > 0 ? 0 : item.quantity
      return {
        ...item,
        verificationCount: newCount,
        addVerification: newCount > 0
      }
    }))
  }

  const updateQuantity = (accountId: string, quantity: number) => {
    if (quantity < 1) return
    const item = items.find(entry => entry.account.id === accountId)
    if (item?.cartId) {
      void apiFetch(`/cart/${item.cartId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ quantity, verificationCount: Math.min(item.verificationCount, quantity) })
      })
    }
    setItems(prev => prev.map(item =>
      item.account.id === accountId
        ? {
            ...item,
            quantity,
            verificationCount: Math.min(item.verificationCount, quantity),
            addVerification: Math.min(item.verificationCount, quantity) > 0
          }
        : item
    ))
  }

  const setVerificationCount = useCallback((accountId: string, count: number) => {
    const item = items.find(entry => entry.account.id === accountId)
    setItems(prev => prev.map(item => {
      if (item.account.id !== accountId) return item
      const clampedCount = Math.max(0, Math.min(count, item.quantity))
      return {
        ...item,
        verificationCount: clampedCount,
        addVerification: clampedCount > 0
      }
    }))
    if (item?.cartId) {
      const clampedCount = Math.max(0, Math.min(count, item.quantity))
      void apiFetch(`/cart/${item.cartId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ quantity: item.quantity, verificationCount: clampedCount })
      })
    }
  }, [items])

  const clearCart = useCallback(async () => {
    setLoading(true)
    try {
      for (const item of items) {
        if (item.cartId) {
          await apiFetch(`/cart/${item.cartId}`, { method: 'DELETE', headers: authHeaders() })
        }
      }

      setItems([])
    } finally {
      setLoading(false)
    }
  }, [items])

  const getTotal = () => {
    return items.reduce((total, item) => {
      const verificationCost = item.verificationCount * item.account.verificationPrice
      return total + item.account.price * item.quantity + verificationCost
    }, 0)
  }

  const setBuyNowItem = useCallback((account: Account | null, quantity: number = 1, verificationCount: number = 0) => {
    if (account) {
      const clampedQuantity = Math.max(1, quantity)
      const clampedVerificationCount = Math.max(0, Math.min(verificationCount, clampedQuantity))
      const buyNowPayload = {
        account,
        quantity: clampedQuantity,
        verificationCount: clampedVerificationCount,
        addVerification: clampedVerificationCount > 0
      }
      setBuyNowItemState(buyNowPayload)
    } else {
      setBuyNowItemState(null)
    }
  }, [])

  const updateBuyNowQuantity = useCallback((quantity: number) => {
    if (quantity < 1) return
    setBuyNowItemState(prev => {
      if (!prev) return null
      const newVerificationCount = Math.min(prev.verificationCount, quantity)
      return { ...prev, quantity, verificationCount: newVerificationCount, addVerification: newVerificationCount > 0 }
    })
  }, [])

  const setBuyNowVerificationCountFn = useCallback((count: number) => {
    setBuyNowItemState(prev => {
      if (!prev) return null
      const clampedCount = Math.max(0, Math.min(count, prev.quantity))
      return {
        ...prev,
        verificationCount: clampedCount,
        addVerification: clampedCount > 0
      }
    })
  }, [])

  const clearBuyNowItem = useCallback(() => {
    setBuyNowItemState(null)
  }, [])

  const toggleBuyNowVerification = useCallback(() => {
    setBuyNowItemState(prev => {
      if (!prev) return null
      const newCount = prev.verificationCount > 0 ? 0 : prev.quantity
      return { ...prev, verificationCount: newCount, addVerification: newCount > 0 }
    })
  }, [])

  const getBuyNowTotal = useCallback(() => {
    if (!buyNowItem) return 0
    const verificationCost = buyNowItem.verificationCount * buyNowItem.account.verificationPrice
    return (buyNowItem.account.price * buyNowItem.quantity) + verificationCost
  }, [buyNowItem])

  const itemCount = items.length

  return (
    <CartContext.Provider value={{
      items,
      buyNowItem,
      addToCart,
      removeFromCart,
      toggleVerification,
      setVerificationCount,
      updateQuantity,
      clearCart,
      getTotal,
      itemCount,
      loading,
      setBuyNowItem,
      clearBuyNowItem,
      toggleBuyNowVerification,
      setBuyNowVerificationCount: setBuyNowVerificationCountFn,
      getBuyNowTotal,
      updateBuyNowQuantity
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
