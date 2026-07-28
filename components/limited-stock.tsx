"use client"

import { Clock, Flame, Star, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useStoreData } from "@/lib/store-data-context"
import Link from "next/link"

export function LimitedStock() {
  const { stats } = useStoreData()

  return (
    <section className="py-8 sm:py-12 bg-[#FE2C55]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-white">Limited Stock Available</h3>
              <p className="text-xs sm:text-sm text-white/80">Premium accounts sell out fast. Don&apos;t miss out!</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 sm:gap-4 md:gap-6 text-white/90 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>{stats.monthlyAccountsSold} sold this month</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>{stats.averageRating}/5</span>
            </div>
          </div>
          
          <Link href="/shop" className="w-full sm:w-auto">
            <Button 
              size="lg"
              className="bg-white text-[#FE2C55] hover:bg-white/90 rounded-full px-6 sm:px-8 py-2 sm:py-3 font-bold text-sm sm:text-base w-full sm:w-auto"
            >
              Shop Now
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
