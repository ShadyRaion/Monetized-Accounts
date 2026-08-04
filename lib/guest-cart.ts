export const GUEST_CART_STORAGE_KEY = 'guest_cart_session_v1'
export const GUEST_CART_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function getGuestCartStorage(): Storage | null {
  if (typeof window !== 'undefined') {
    try {
      return window.localStorage
    } catch {
      return null
    }
  }

  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage !== 'undefined') {
    return (globalThis as any).localStorage as Storage
  }

  return null
}

export function normalizeGuestCartItem(item: any) {
  const account = item?.account ?? item
  const quantity = Math.max(1, Number(item?.quantity ?? account?.quantity ?? 1))

  return {
    id: account?.id ?? item?.id,
    quantity,
    account
  }
}

export function readGuestCart(key = GUEST_CART_STORAGE_KEY) {
  const storage = getGuestCartStorage()
  if (!storage) return []

  try {
    const raw = storage.getItem(key)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.items)) {
      storage.removeItem(key)
      return []
    }

    const expiresAt = Number(parsed.expiresAt ?? 0)
    if (!expiresAt || expiresAt < Date.now()) {
      storage.removeItem(key)
      return []
    }

    return parsed.items
      .map(normalizeGuestCartItem)
      .filter((item: any) => item?.id && item?.account)
  } catch {
    storage.removeItem(key)
    return []
  }
}

export function writeGuestCart(items: any[], key = GUEST_CART_STORAGE_KEY) {
  const storage = getGuestCartStorage()
  if (!storage) return

  const cleaned = (Array.isArray(items) ? items : [])
    .map(normalizeGuestCartItem)
    .filter((item: any) => item?.id && item?.account)

  storage.setItem(
    key,
    JSON.stringify({
      expiresAt: Date.now() + GUEST_CART_TTL_MS,
      items: cleaned
    })
  )
}

export function mergeGuestCartItems(serverItems: any[] = [], guestItems: any[] = []) {
  const merged = new Map<string, any>()

  const addItem = (item: any) => {
    const account = item?.account ?? item
    const id = account?.id ?? item?.id
    if (!id) return

    const existing = merged.get(id) ?? {
      account,
      quantity: 0,
      verificationCount: 0,
      addVerification: false
    }

    existing.quantity += Math.max(1, Number(item?.quantity ?? existing.quantity ?? 1))
    existing.account = account
    merged.set(id, existing)
  }

  serverItems.forEach(addItem)
  guestItems.forEach(addItem)

  return Array.from(merged.values())
    .filter((item: any) => item?.account?.id)
    .map((item: any) => ({
      ...item,
      quantity: Math.max(1, Number(item.quantity ?? 1)),
      verificationCount: 0,
      addVerification: false
    }))
}
