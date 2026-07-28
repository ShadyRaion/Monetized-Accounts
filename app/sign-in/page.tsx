import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'

export const metadata = {
  title: 'Sign In',
  description: 'Sign in to your account',
}

export default async function SignInPage() {
  // Note: Session checking removed as we're now using JWT tokens
  // Check will happen client-side in AuthForm component
  
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthForm mode="sign-in" />
    </Suspense>
  )
}
