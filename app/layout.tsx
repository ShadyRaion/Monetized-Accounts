import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/lib/cart-context'
import { StoreSettingsProvider } from '@/lib/store-settings-context'
import { StoreDataProvider } from '@/lib/store-data-context'
import { UserAuthProvider } from '@/lib/user-auth-context'
import { AdminAuthProvider } from '@/lib/admin-auth-context'
import { ReferralProvider } from '@/lib/referral-context'
import { PendingActionProvider } from '@/lib/pending-action-context'
import { FaviconUpdater } from '@/components/favicon-updater'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-background">
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ReferralProvider>
          <StoreSettingsProvider>
            <UserAuthProvider>
              <AdminAuthProvider>
                <StoreDataProvider>
                  <PendingActionProvider>
                    <CartProvider>
                      {children}
                      <FaviconUpdater />
                    </CartProvider>
                  </PendingActionProvider>
                </StoreDataProvider>
              </AdminAuthProvider>
            </UserAuthProvider>
          </StoreSettingsProvider>
        </ReferralProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
