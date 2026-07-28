"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Play, Sparkles } from "lucide-react"
import { useStoreSettings } from "@/lib/store-settings-context"
import { useStoreData } from "@/lib/store-data-context"

export function Hero() {
  const { settings } = useStoreSettings()
  const { stats } = useStoreData()
  
  return (
    <section className="relative overflow-hidden bg-white py-12 sm:py-16 md:py-20 lg:py-32">
      {/* Background decorations */}
      <div 
        className="absolute top-0 left-0 w-64 h-64 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-10" 
        style={{ backgroundColor: settings.primaryColor }}
      />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#25F4EE]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="container relative mx-auto px-4">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-1 sm:gap-2 bg-black text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-8 whitespace-nowrap">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" style={{ color: settings.primaryColor }} />
            <span>{stats.totalAccountsSold.toLocaleString()}+ accounts sold</span>
            <span className="text-[#25F4EE]">•</span>
            <span>{stats.averageRating} rating</span>
          </div>
          
          {/* Main heading */}
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-bold text-black mb-4 sm:mb-6 tracking-tight leading-tight">
            <div>{settings.storeName}</div>
            <span className="relative inline-block">
              <span className="relative z-10">Earn Instantly</span>
              <span 
                className="absolute bottom-0.5 sm:bottom-2 left-0 w-full h-2 sm:h-3 -z-0 opacity-30" 
                style={{ backgroundColor: settings.primaryColor }}
              />
            </span>
          </h1>
          
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-10 max-w-2xl text-pretty">
            {settings.storeDescription}
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <Link href="/shop" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                className="text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-full w-full"
                style={{ backgroundColor: settings.primaryColor }}
              >
                Browse Accounts
              </Button>
            </Link>
            <Link href="/faq" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                variant="outline"
                className="border-2 border-black text-black hover:bg-black hover:text-white px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg rounded-full w-full"
              >
                <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
