import { Leaf, FileCheck, UserCheck, Shield } from "lucide-react"

const features = [
  {
    icon: Leaf,
    title: "100% Organic Growth",
    description: "All accounts grown organically with real followers. Zero bots, zero fake engagement - guaranteed",
    color: "bg-[#25F4EE]",
  },
  {
    icon: FileCheck,
    title: "No Tax Verification Needed",
    description: "All accounts come tax-approved. Simply connect your PayPal and start cashing out immediately",
    color: "bg-[#FE2C55]",
  },
  {
    icon: UserCheck,
    title: "Full Account Ownership",
    description: "Complete control from day one. Change login details, email, and all account information as you wish",
    color: "bg-[#25F4EE]",
  },
  {
    icon: Shield,
    title: "Replacement Guarantee",
    description: "30-day replacement warranty on every account. If anything goes wrong, we'll replace it immediately—no questions asked",
    color: "bg-[#FE2C55]",
  },
]

export function Features() {
  return (
    <section className="py-12 sm:py-16 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-black mb-2 sm:mb-4">
            Why Our Accounts Are Better
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm md:text-base lg:text-lg">
            100% organic growth, full account ownership, and zero tax verification hassles
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 hover:border-[#FE2C55]/30 transition-all hover:shadow-lg group"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${feature.color} rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
              </div>
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-black mb-1 sm:mb-2">{feature.title}</h3>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
