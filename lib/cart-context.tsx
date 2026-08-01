"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"
import { Account } from "./store-data-context"
import { apiPath, authHeaders, apiFetch } from "./api"
import { useUserAuth } from "./user-auth-context"
import { readGuestCart, writeGuestCart, mergeGuestCartItems } from "./guest-cart"

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

  const persistGuestCart = useCallback((nextItems: CartItem[]) => {
    const guestItems = nextItems.map(item => ({
      id: item.account.id,
      quantity: item.quantity,
      account: item.account
    }))
    writeGuestCart(guestItems)
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      const guestItems = readGuestCart()
      setItems(guestItems.map((item: any) => ({
        account: item.account,
        quantity: item.quantity,
        verificationCount: 0,
        addVerification: false
      })))
      return
    }

    let cancelled = false

    void apiFetch('/cart')
      .then(async response => response.ok ? response.json() : [])
      .then(async (data: any[]) => {
        if (cancelled) return

        const serverItems = Array.isArray(data) ? data.map(item => ({
          cartId: item.id,
          account: item.product,
          quantity: item.quantity,
          verificationCount: item.verificationCount || 0,
          addVerification: (item.verificationCount || 0) > 0
        })) : []

        const guestItems = readGuestCart().map((item: any) => ({
          account: item.account,
          quantity: item.quantity,
          verificationCount: 0,
          addVerification: false
        }))

        const merged = mergeGuestCartItems(serverItems, guestItems)
        const hydrated = merged.map((item: any) => ({
          cartId: item.cartId,
          account: item.account,
          quantity: item.quantity,
          verificationCount: item.verificationCount || 0,
          addVerification: item.addVerification || false
        }))

        setItems(hydrated)

        if (guestItems.length > 0) {
          for (const guestItem of guestItems) {
            const existingServerItem = serverItems.find(item => item.account.id === guestItem.account.id)
            if (existingServerItem) {
              const nextQuantity = existingServerItem.quantity + guestItem.quantity
              await apiFetch(`/cart/${existingServerItem.cartId}`, {
                method: 'PUT',
                headers: authHeaders(),
                body: JSON.stringify({ quantity: nextQuantity, verificationCount: 0 })
              })
            } else {
              await apiFetch('/cart', {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ productId: guestItem.account.id, quantity: guestItem.quantity })
              })
            }
          }

          writeGuestCart([])
        }
      })
      .catch(() => { if (!cancelled) setItems([]) })

    return () => { cancelled = true }
  }, [authLoading, user])

  const addToCart = useCallback(async (account: Account) => {
    if (!user) {
      setItems(prev => {
        const existing = prev.find(item => item.account.id === account.id)
        const next = existing
          ? prev.map(item => item.account.id === account.id ? { ...item, quantity: item.quantity + 1 } : item)
          : [...prev, { account, quantity: 1, addVerification: false, verificationCount: 0 }]

        persistGuestCart(next)
        return next
      })
      return
    }

    const previousItems = items
    const optimisticItems = previousItems.some(item => item.account.id === account.id)
      ? previousItems.map(item => item.account.id === account.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...previousItems, { account, quantity: 1, addVerification: false, verificationCount: 0 }]

    setItems(optimisticItems)
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
          return prev.map(item =>
            item.account.id === account.id
              ? { ...item, cartId: savedItem.id, quantity: item.quantity, addVerification: item.addVerification, verificationCount: item.verificationCount }
              : item
          )
        }
        return [...prev, { cartId: savedItem.id, account, quantity: savedItem.quantity || 1, addVerification: false, verificationCount: 0 }]
      })
    } catch (error) {
      setItems(previousItems)
      console.error('Error adding item to cart:', error)
    } finally {
      setLoading(false)
    }
  }, [persistGuestCart, user, items])

  const removeFromCart = useCallback(async (accountId: string) => {
    if (!user) {
      setItems(prev => {
        const next = prev.filter(item => item.account.id !== accountId)
        persistGuestCart(next)
        return next
      })
      return
    }

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
  }, [items, persistGuestCart, user])

  const toggleVerification = (accountId: string) => {
    setItems(prev => {
      const next = prev.map(item => {
        if (item.account.id !== accountId) return item
        const newCount = item.verificationCount > 0 ? 0 : item.quantity
        return {
          ...item,
          verificationCount: newCount,
          addVerification: newCount > 0
        }
      })

      if (!user) {
        persistGuestCart(next)
      }

      return next
    })
  }

  const updateQuantity = (accountId: string, quantity: number) => {
    if (quantity < 1) return
    const item = items.find(entry => entry.account.id === accountId)
    if (item?.cartId && user) {
      void apiFetch(`/cart/${item.cartId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ quantity, verificationCount: Math.min(item.verificationCount, quantity) })
      })
    }
    setItems(prev => {
      const next = prev.map(item =>
        item.account.id === accountId
          ? {
              ...item,
              quantity,
              verificationCount: Math.min(item.verificationCount, quantity),
              addVerification: Math.min(item.verificationCount, quantity) > 0
            }
          : item
      )

      if (!user) {
        persistGuestCart(next)
      }

      return next
    })
  }

  const setVerificationCount = useCallback((accountId: string, count: number) => {
    const item = items.find(entry => entry.account.id === accountId)
    setItems(prev => {
      const next = prev.map(item => {
        if (item.account.id !== accountId) return item
        const clampedCount = Math.max(0, Math.min(count, item.quantity))
        return {
          ...item,
          verificationCount: clampedCount,
          addVerification: clampedCount > 0
        }
      })

      if (!user) {
        persistGuestCart(next)
      }

      return next
    })
    if (item?.cartId && user) {
      const clampedCount = Math.max(0, Math.min(count, item.quantity))
      void apiFetch(`/cart/${item.cartId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ quantity: item.quantity, verificationCount: clampedCount })
      })
    }
  }, [items, persistGuestCart, user])

  const clearCart = useCallback(async () => {
    if (!user) {
      setItems([])
      writeGuestCart([])
      return
    }

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
  }, [items, user])

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
