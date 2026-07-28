"use client"

import { CheckCircle, Star, Users, Flame } from "lucide-react"
import { useStoreData } from "@/lib/store-data-context"

const formatPayingCustomers = (count: number): string => {
  if (count < 10) return String(count)
  return Math.floor(count / 10) * 10 + "+"
}

export function MarqueeBanner() {
  const { orders, customers } = useStoreData()
  
  // Count customers who have at least one order
  const payingCustomers = customers.filter(customer => 
    orders.some(order => customer.orders.includes(order.id))
  )
  const payingCustomerCount = payingCustomers.length
  const displayCount = formatPayingCustomers(payingCustomerCount)
  
  const items = [
    { icon: CheckCircle, text: "New Monetized Accounts Restocked", color: "text-[#25F4EE]" },
    { icon: Star, text: `Loved By ${displayCount} Users`, color: "text-[#FE2C55]" },
    { icon: Users, text: "100% Organic Followers - No Bots", color: "text-[#25F4EE]" },
    { icon: Flame, text: "Start Earning On Your First Post", color: "text-[#FE2C55]" },
  ]

  return (
    <div className="bg-black py-3 overflow-hidden">
      <div className="flex animate-marquee">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex shrink-0">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 px-8 text-white text-sm font-medium whitespace-nowrap">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
