'use client'

import React, { createContext, useContext, useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

interface ReferralContextType {
  referralCode: string | null
  setReferralCode: (code: string | null) => void
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined)

// Inner component that uses useSearchParams (wrapped in Suspense)
function ReferralProviderContent({ children }: { children: React.ReactNode }) {
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get referral code from URL params
    const refCode = searchParams.get('ref')
    
    const codeToUse = refCode
    
    if (codeToUse) {
      setReferralCode(codeToUse)
    }
  }, [searchParams])

  return (
    <ReferralContext.Provider value={{ referralCode, setReferralCode }}>
      {children}
    </ReferralContext.Provider>
  )
}

// Outer provider with Suspense boundary
export function ReferralProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <ReferralProviderContent>{children}</ReferralProviderContent>
    </Suspense>
  )
}

export function useReferral() {
  const context = useContext(ReferralContext)
  if (context === undefined) {
    throw new Error('useReferral must be used within a ReferralProvider')
  }
  return context
}
