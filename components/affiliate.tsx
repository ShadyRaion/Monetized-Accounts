"use client"

import Link from "next/link"
import { DollarSign, Heart, Headphones, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStoreData } from "@/lib/store-data-context"

const formatAffiliateCount = (count: number): string => {
  if (count < 10) return String(count)
  return Math.floor(count / 10) * 10 + "+"
}

const benefits = [
  {
    icon: DollarSign,
    title: "Earn 20% per sale",
    description: "Simple 20% commission structure. The more you sell, the more you earn.",
  },
  {
    icon: Heart,
    title: "Your audience will love these",
    description: "Premium monetized accounts that actually deliver results. High satisfaction = high conversions.",
  },
  {
    icon: Headphones,
    title: "We handle everything else",
    description: "You promote, we deliver. Support and fulfillment all taken care of.",
  },
]

export function Affiliate() {
  const { affiliates } = useStoreData()
  const affiliateCount = affiliates.filter(a => a.status === "active").length
  const displayCount = formatAffiliateCount(affiliateCount)

  return (
    <section className="py-12 sm:py-20 bg-gradient-to-br from-[#FE2C55]/5 via-white to-[#25F4EE]/5">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-black mb-2 sm:mb-4">
              Promote Our Accounts.
              <br />
              <span className="text-[#FE2C55]">Get Paid Generously.</span>
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm md:text-lg">
              20% commission on every sale. No strings attached.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="bg-white rounded-lg sm:rounded-2xl p-4 sm:p-6 border border-gray-100 hover:shadow-lg transition-all"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                  <benefit.icon className="w-5 h-5 sm:w-6 sm:h-6 text-[#25F4EE]" />
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-black mb-1 sm:mb-2">{benefit.title}</h3>
                <p className="text-xs sm:text-sm md:text-base text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <Link href="/affiliate" className="inline-block">
              <Button 
                size="lg" 
                className="bg-black hover:bg-black/90 text-white px-4 sm:px-8 py-3 sm:py-6 text-[11px] sm:text-lg rounded-full flex items-center gap-2 justify-center"
              >
                Learn More About Our Program
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <p className="text-gray-500 mt-3 sm:mt-4 text-xs sm:text-sm">Join {displayCount} creators earning with us</p>
          </div>
        </div>
      </div>
    </section>
  )
}
