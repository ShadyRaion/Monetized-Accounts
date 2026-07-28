"use client"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({ title, value, description, icon, trend, className }: StatsCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-1.5 sm:p-3 flex items-center justify-center min-h-[70px] sm:min-h-[90px]">
        <div className="flex flex-col items-center gap-0.5 text-center">
          <span className="text-[9px] sm:text-sm font-medium text-muted-foreground">{title}</span>
          <span className="text-base sm:text-xl font-bold">{value}</span>
          {trend && (
            <span className={cn(
              "text-[8px] sm:text-xs font-medium whitespace-nowrap",
              trend.isPositive ? "text-green-600" : "text-red-600"
            )}>
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            </span>
          )}
          {description && (
            <span className="text-[8px] sm:text-xs text-muted-foreground">{description}</span>
          )}
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-muted flex-shrink-0 mt-1">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
