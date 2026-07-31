import test from 'node:test'
import assert from 'node:assert/strict'
import { readGuestCart, writeGuestCart, mergeGuestCartItems, GUEST_CART_TTL_MS } from '../lib/guest-cart'

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
