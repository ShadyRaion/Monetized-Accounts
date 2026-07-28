"use client"

import { Button } from "@/components/ui/button"
import { useStoreData } from "@/lib/store-data-context"
import Link from "next/link"

export function Stats() {
  const { stats } = useStoreData()

  const displayStats = [
    {
      value: `$${Math.round(stats.totalRevenue / 1000)}K+`,
      label: "Total Revenue Generated",
      sublabel: "By our customers in the last 12 months",
    },
    {
      value: `${stats.totalAccountsSold}+`,
      label: "Accounts Sold",
      sublabel: "Happy creators worldwide",
    },
    {
      value: `${stats.customerSatisfaction}%`,
      label: "Customer Satisfaction",
      sublabel: "Would recommend to other creators",
    },
  ]

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-2 sm:mb-4">
            Real Results From Real Creators
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg">
            See how our accounts have transformed content careers
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
          {displayStats.map((stat, index) => (
            <div 
              key={index}
              className="text-center p-4 sm:p-6 md:p-8 bg-white rounded-xl sm:rounded-2xl border border-gray-100"
            >
              <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#FE2C55] mb-1 sm:mb-2">
                {stat.value}
              </div>
              <div className="text-sm sm:text-base md:text-lg md:text-xl font-semibold text-black mb-0.5 sm:mb-1">
                {stat.label}
              </div>
              <div className="text-xs sm:text-sm md:text-base text-gray-500">
                {stat.sublabel}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Link href="/shop">
            <Button 
              size="lg" 
              className="bg-black hover:bg-black/90 text-white px-4 sm:px-8 py-3 sm:py-6 text-[11px] sm:text-lg rounded-full"
            >
              Start Your Success Story Today
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
