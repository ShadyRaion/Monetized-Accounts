import type { Metadata } from "next"
import { Header } from "@/components/header"
import { MarqueeBanner } from "@/components/marquee-banner"
import { Hero } from "@/components/hero"
import { FeaturedAccounts } from "@/components/featured-accounts"
import { Features } from "@/components/features"
import { Testimonials } from "@/components/testimonials"
import { Guarantee } from "@/components/guarantee"
import { Stats } from "@/components/stats"
import { LimitedStock } from "@/components/limited-stock"
import { Affiliate } from "@/components/affiliate"
import { Footer } from "@/components/footer"

export const metadata: Metadata = {
  title: "MonetizedHub | Buy Monetized US TikTok Accounts",
  description: "Premium organic, monetized TikTok accounts, TikTok Shop seller/creator accounts, YouTube channels, and affiliate-ready accounts."
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <MarqueeBanner />
      <Hero />
      <FeaturedAccounts />
      <Features />
      <LimitedStock />
      <Testimonials />
      <Stats />
      <Guarantee />
      <Affiliate />
      <Footer />
    </main>
  )
}
