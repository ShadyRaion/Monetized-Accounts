import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AuthForm } from '@/components/auth-form'

export const metadata = {
  title: 'Sign Up',
  description: 'Create a new account',
}

export default async function SignUpPage() {
  // Note: Session checking removed as we're now using JWT tokens
  // Check will happen client-side in AuthForm component
  
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthForm mode="sign-up" />
    </Suspense>
  )
}
