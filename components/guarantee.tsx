import Link from "next/link"
import { RefreshCw, BadgeDollarSign, MessageCircle, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

const guarantees = [
  {
    icon: RefreshCw,
    title: "30-Day Replacement",
    description: "Account issues within 30 days? We'll replace it immediately at no cost. Zero questions asked.",
  },
  {
    icon: BadgeDollarSign,
    title: "30-Day Money Back",
    description: "Not satisfied? Full refund or replacement within 30 days. Account must be returned. 100% guaranteed.",
  },
  {
    icon: MessageCircle,
    title: "1-Hour Response",
    description: "Expert support team available on weekdays. Get help when you need it. Fast & friendly.",
  },
]

export function Guarantee() {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-black text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-[#FE2C55] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-3 sm:mb-6">
            <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Your purchase is 100% protected</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4">
            Risk-Free Purchase Guarantee
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm md:text-base lg:text-lg">
            Your success is our priority. We stand behind every account we sell.
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {guarantees.map((guarantee, index) => (
            <div 
              key={index}
              className="bg-white/5 backdrop-blur-sm rounded-lg sm:rounded-2xl p-4 sm:p-6 border border-white/10 hover:border-[#25F4EE]/50 transition-all"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#25F4EE] rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4">
                <guarantee.icon className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold mb-1 sm:mb-2">{guarantee.title}</h3>
              <p className="text-xs sm:text-sm md:text-base text-gray-400">{guarantee.description}</p>
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Link href="/shop">
            <Button 
              size="lg" 
              className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-lg rounded-full"
            >
              Start Earning Risk-Free
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
