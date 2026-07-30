type CacheEntry = {
  expires: number
  value: any
}

const store = new Map<string, CacheEntry>()

export function cacheSet(key: string, value: any, ttlMs = 5000) {
  const expires = Date.now() + ttlMs
  store.set(key, { expires, value })
}

export function cacheGet<T = any>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

export function cacheDelete(key: string) {
  store.delete(key)
}

export function cacheDeletePrefix(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key)
    }
  }
}

export function cacheClear() {
  store.clear()
}

export default { cacheGet, cacheSet, cacheDelete, cacheClear }
