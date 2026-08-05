"use client"

import { useState } from "react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { formatRevenue } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useStoreData } from "@/lib/store-data-context"
import { BarChart3, TrendingUp, Users, DollarSign, ShoppingCart, Calendar } from "lucide-react"
import { format, subDays } from "date-fns"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"

const COLORS = ["#FE2C55", "#25F4EE", "#FF6B35", "#7C3AED", "#10B981"]

export default function AnalyticsPage() {
  const { user, isLoading } = useAdminAuth()
  const { orders } = useStoreData()
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30))
  const [endDate, setEndDate] = useState<Date | undefined>(new Date())
  const [startMonth, setStartMonth] = useState<Date>(subDays(new Date(), 30))
  const [endMonth, setEndMonth] = useState<Date>(new Date())

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE2C55]" />
      </div>
    )
  }

  if (!user) return null

  // Calculate metrics
  const completedOrders = orders.filter(o => o.status === "completed")
  const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0)
  const totalOrders = completedOrders.length
  const avgOrderValue = totalRevenue / (totalOrders || 1)
  const conversionRate = orders.length > 0 ? ((totalOrders / orders.length) * 100).toFixed(1) : "0"

  // Best selling products
  const productSales: Record<string, { name: string; count: number; revenue: number }> = {}
  completedOrders.forEach(order => {
    order.products.forEach(product => {
      if (!productSales[product.productId]) {
        productSales[product.productId] = { name: product.name, count: 0, revenue: 0 }
      }
      productSales[product.productId].count += product.quantity
      productSales[product.productId].revenue += product.price * product.quantity
    })
  })
  const bestSellingProducts = Object.values(productSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  // Revenue by platform (TikTok vs YouTube)
  const revenueByPlatform = [
    { 
      platform: "TikTok", 
      revenue: completedOrders
        .filter(o => o.products.some(p => p.name.toLowerCase().includes("tiktok")))
        .reduce((sum, o) => sum + o.total, 0)
    },
    { 
      platform: "YouTube", 
      revenue: completedOrders
        .filter(o => o.products.some(p => p.name.toLowerCase().includes("youtube")))
        .reduce((sum, o) => sum + o.total, 0)
    }
  ].filter(p => p.revenue > 0)

  // Revenue by product type
  const revenueByType: Record<string, number> = {}
  completedOrders.forEach(order => {
    order.products.forEach(product => {
      const type = product.name.split(" - ")[0] || product.name
      revenueByType[type] = (revenueByType[type] || 0) + (product.price * product.quantity)
    })
  })
  const revenueByTypeData = Object.entries(revenueByType).map(([type, revenue]) => ({
    type,
    revenue
  }))

const renderPlatformLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
  const radius = innerRadius + (outerRadius - innerRadius) * 0.25
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)
  
  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      fontSize="8"
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

  return (
    <div className="p-2 sm:p-4 lg:p-6 pt-16 sm:pt-6 lg:pt-8">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-2 sm:mb-3 text-[8px] sm:text-xs">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/mhs258187" className="text-[8px] sm:text-xs text-white">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[8px] sm:text-xs text-white">Analytics</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-1.5 sm:gap-2 md:flex-row md:items-center md:justify-between mb-2 sm:mb-3">
        <div>
          <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: '#FE2C55' }}>Analytics</h1>
          <p className="text-[9px] sm:text-xs text-white">Track your store performance</p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="text-[10px] sm:text-xs py-1.5 px-2 h-auto">
                <Calendar className="mr-0.5 sm:mr-1 h-3 w-3" />
                <span className="hidden sm:inline">
                  {startDate ? format(startDate, "MMM d, yyyy") : "From"}
                </span>
                <span className="sm:hidden">From</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-3">
                <div className="flex gap-2 items-center justify-between">
                  <Button variant="outline" size="sm" className="h-6 text-[9px]" onClick={() => setStartMonth(new Date(startMonth.getFullYear() - 1, startMonth.getMonth()))}>Prev Year</Button>
                  <span className="text-xs font-medium">{startMonth.getFullYear()}</span>
                  <Button variant="outline" size="sm" className="h-6 text-[9px]" onClick={() => setStartMonth(new Date(startMonth.getFullYear() + 1, startMonth.getMonth()))}>Next Year</Button>
                </div>
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  defaultMonth={startMonth}
                  disabled={(date: Date) => {
                    const today = new Date()
                    return date > today
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="text-[10px] sm:text-xs py-1.5 px-2 h-auto">
                <Calendar className="mr-0.5 sm:mr-1 h-3 w-3" />
                <span className="hidden sm:inline">
                  {endDate ? format(endDate, "MMM d, yyyy") : "To"}
                </span>
                <span className="sm:hidden">To</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-3">
                <div className="flex gap-2 items-center justify-between">
                  <Button variant="outline" size="sm" className="h-6 text-[9px]" onClick={() => setEndMonth(new Date(endMonth.getFullYear() - 1, endMonth.getMonth()))}>Prev Year</Button>
                  <span className="text-xs font-medium">{endMonth.getFullYear()}</span>
                  <Button variant="outline" size="sm" className="h-6 text-[9px]" onClick={() => setEndMonth(new Date(endMonth.getFullYear() + 1, endMonth.getMonth()))}>Next Year</Button>
                </div>
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  defaultMonth={endMonth}
                  disabled={(date: Date) => {
                    const today = new Date()
                    return date > today
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
          {(startDate || endDate) && (
            <Button variant="ghost" size="sm" className="h-auto text-[10px] px-1 py-1.5" onClick={() => { setStartDate(undefined); setEndDate(undefined); setStartMonth(subDays(new Date(), 30)); setEndMonth(new Date()) }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-1 grid-cols-2 sm:gap-2 mb-2 sm:mb-3">
        <Card>
          <CardContent className="p-2 sm:p-3 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[9px] sm:text-sm text-muted-foreground">Revenue</p>
              <p className="text-base sm:text-xl font-bold">{formatRevenue(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[9px] sm:text-sm text-muted-foreground">Orders</p>
              <p className="text-base sm:text-xl font-bold">{totalOrders}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[9px] sm:text-sm text-muted-foreground">Avg Value</p>
              <p className="text-base sm:text-xl font-bold">{formatRevenue(avgOrderValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[9px] sm:text-sm text-muted-foreground">Conv Rate</p>
              <p className="text-base sm:text-xl font-bold">{conversionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>



      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Revenue by Platform */}
        {revenueByPlatform.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Revenue by Platform</CardTitle>
              <CardDescription className="text-[8px]">TikTok vs YouTube sales</CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="h-[150px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueByPlatform}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      paddingAngle={3}
                      dataKey="revenue"
                      nameKey="platform"
                      label={renderPlatformLabel}
                      labelLine={false}
                    >
                      {revenueByPlatform.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatRevenue(value), "Revenue"]} />
                    <Legend verticalAlign="bottom" height={20} wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-2 sm:gap-6 mb-2 sm:mb-6">
        {/* Revenue by Product Type */}
        {revenueByTypeData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Revenue by Product Type</CardTitle>
              <CardDescription className="text-[8px]">Sales breakdown by account type</CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="h-[150px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="type" tick={{ fontSize: 8 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => formatRevenue(Number(v))} />
                    <Tooltip formatter={(value: number) => [formatRevenue(value), "Revenue"]} />
                    <Bar dataKey="revenue" fill="#FE2C55" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Best Selling Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Best Selling Products
          </CardTitle>
          <CardDescription>Top 5 products by revenue</CardDescription>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] sm:text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 px-1 sm:py-2 sm:px-2 font-medium text-muted-foreground">Rank</th>
                  <th className="text-left py-1.5 px-1 sm:py-2 sm:px-2 font-medium text-muted-foreground">Product</th>
                  <th className="text-left py-1.5 px-1 sm:py-2 sm:px-2 font-medium text-muted-foreground">Units</th>
                  <th className="text-left py-1.5 px-1 sm:py-2 sm:px-2 font-medium text-muted-foreground">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {bestSellingProducts.map((product, index) => (
                  <tr key={product.name} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-1.5 px-1 sm:py-2 sm:px-2">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[8px] font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-800' : index === 1 ? 'bg-gray-100 text-gray-800' : index === 2 ? 'bg-orange-100 text-orange-800' : 'bg-muted text-muted-foreground'}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-1.5 px-1 sm:py-2 sm:px-2 font-medium truncate">{product.name}</td>
                    <td className="py-1.5 px-1 sm:py-2 sm:px-2">{product.count}</td>
                    <td className="py-1.5 px-1 sm:py-2 sm:px-2 font-medium text-green-600">{formatRevenue(product.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
