import test from 'node:test'
import assert from 'node:assert/strict'
import { readGuestCart, writeGuestCart, mergeGuestCartItems, GUEST_CART_TTL_MS } from '../lib/guest-cart'
import { selectFeaturedAccounts } from '../components/featured-accounts'

function createLocalStorageMock() {
  let store = new Map<string, string>()

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key) ?? null : null
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    get length() {
      return store.size
    }
  } as unknown as Storage
}

if (typeof globalThis.localStorage === 'undefined') {
  ;(globalThis as any).localStorage = createLocalStorageMock()
}

test.beforeEach(() => {
  globalThis.localStorage.clear()
})

test('selectFeaturedAccounts takes the cheapest account per requested featured type before filling any gaps', () => {
  const featured = selectFeaturedAccounts([
    { id: 'creator-2', type: 'Tiktok Shop (Creator)', price: 75 },
    { id: 'creator-1', type: 'Tiktok Shop (Creator)', price: 50 },
    { id: 'seller-2', type: 'Tiktok Shop (Seller)', price: 150 },
    { id: 'seller-1', type: 'Tiktok Shop (Seller)', price: 90 },
    { id: 'monetized-1', type: 'Tiktok Monetized', price: 100 },
    { id: 'video-2', type: 'Youtube Monetized', price: 200 },
    { id: 'video-1', type: 'Youtube Monetized', price: 120 }
  ] as any)

  assert.equal(featured.length, 4)
  assert.deepEqual(featured.map(account => account.type), [
    'Tiktok Shop (Creator)',
    'Tiktok Shop (Seller)',
    'Tiktok Monetized',
    'Youtube Monetized'
  ])
  assert.deepEqual(featured.map(account => account.id), ['creator-1', 'seller-1', 'monetized-1', 'video-1'])
})

test('selectFeaturedAccounts prefers US over UK for the same type and price band', () => {
  const featured = selectFeaturedAccounts([
    { id: 'creator-uk', type: 'Tiktok Shop (Creator)', price: 40, region: 'UK' },
    { id: 'creator-us', type: 'Tiktok Shop (Creator)', price: 45, region: 'US' },
    { id: 'seller-uk', type: 'Tiktok Shop (Seller)', price: 45, region: 'UK' },
    { id: 'seller-us', type: 'Tiktok Shop (Seller)', price: 40, region: 'US' }
  ] as any)

  assert.equal(featured.length, 4)
  assert.deepEqual(featured.map(account => account.id), ['creator-us', 'seller-us', 'creator-uk', 'seller-uk'])
})

test('selectFeaturedAccounts falls back from the requested premium family to the remaining catalog when a priority type is unavailable', () => {
  const featured = selectFeaturedAccounts([
    { id: 'legacy-1', type: 'Non-TTS/Affiliate', price: 30 },
    { id: 'legacy-2', type: 'Aged Youtube', price: 50 },
    { id: 'creator-1', type: 'Tiktok Shop (Creator)', price: 45 }
  ] as any)

  assert.equal(featured.length, 3)
  assert.deepEqual(featured.map(account => account.type), [
    'Tiktok Shop (Creator)',
    'Non-TTS/Affiliate',
    'Aged Youtube'
  ])
})

test('readGuestCart returns empty array for expired guest carts', () => {
  const key = 'guest_cart_session_test'
  const expiredValue = JSON.stringify({
    expiresAt: Date.now() - 1000,
    items: [{ id: 'a1', quantity: 1 }]
  })

  globalThis.localStorage.setItem(key, expiredValue)

  const result = readGuestCart(key)

  assert.deepEqual(result, [])
  assert.equal(globalThis.localStorage.getItem(key), null)
})

test('mergeGuestCartItems keeps unique product ids and adds quantities', () => {
  const serverItems = [
    { account: { id: 'a1' }, quantity: 2 },
    { account: { id: 'a2' }, quantity: 1 }
  ]

  const guestItems = [
    { account: { id: 'a1' }, quantity: 3 },
    { account: { id: 'a3' }, quantity: 1 }
  ]

  const merged = mergeGuestCartItems(serverItems as any, guestItems as any)

  assert.equal(merged.length, 3)
  assert.equal(merged.find((item: any) => item.account.id === 'a1')?.quantity, 5)
  assert.equal(merged.find((item: any) => item.account.id === 'a3')?.quantity, 1)
})

test('writeGuestCart stores a 30 day expiry window', () => {
  const key = 'guest_cart_session_test_2'
  const items = [{ id: 'b1', quantity: 2 }]

  writeGuestCart(items as any, key)

  const raw = globalThis.localStorage.getItem(key)
  assert.ok(raw)

  const parsed = JSON.parse(raw as string)
  assert.ok(parsed.expiresAt >= Date.now())
  assert.ok(parsed.expiresAt <= Date.now() + GUEST_CART_TTL_MS)
  assert.equal(parsed.items.length, 1)
})
