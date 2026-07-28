'use client'

import { useUserAuth } from '@/lib/user-auth-context'
import { useEffect, useState } from 'react'

export function useCustomer() {
  const { user, isLoading } = useUserAuth()
  const [customer, setCustomer] = useState<any>(null)

  useEffect(() => {
    if (user) {
      setCustomer({ id: user.id, email: user.email, name: user.name })
    } else {
      setCustomer(null)
    }
  }, [user])

  return { customer, loading: isLoading, isAuthenticated: !!user }
}
