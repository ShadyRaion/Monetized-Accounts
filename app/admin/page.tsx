"use client"

import { useAdminAuth } from "@/lib/admin-auth-context"
import { StatsCard } from "@/components/admin/stats-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Package,
  MessageSquare,
  Download,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { useStoreData } from "@/lib/store-data-context"
import { formatRevenue, getGrowthPercentage } from "@/lib/utils"
import { format } from "date-fns"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  refunded: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800"
}

export default function AdminDashboardPage() {
  const { user, isLoading } = useAdminAuth()
  const { orders, products, customers, stats } = useStoreData()
  const [revenueView, setRevenueView] = useState<"daily" | "weekly" | "monthly">("daily")

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE2C55]" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Calculate stats from real data
  const totalRevenue = stats.totalRevenue
  const totalOrders = orders.length
  const totalCustomers = customers.length
  const completedOrders = orders.filter(o => o.status === "completed")
  const conversionRate = totalOrders > 0 ? ((completedOrders.length / totalOrders) * 100).toFixed(1) : "0"

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const revenueToday = completedOrders.reduce((sum, order) => {
    const orderDate = new Date(order.date)
    return format(orderDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd") ? sum + Number(order.total || 0) : sum
  }, 0)

  const revenueYesterday = completedOrders.reduce((sum, order) => {
    const orderDate = new Date(order.date)
    return format(orderDate, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd") ? sum + Number(order.total || 0) : sum
  }, 0)

  const ordersToday = completedOrders.filter(order => format(new Date(order.date), "yyyy-MM-dd") === format(today, "yyyy-MM-dd")).length
  const ordersYesterday = completedOrders.filter(order => format(new Date(order.date), "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")).length

  const customersToday = customers.filter(customer => format(new Date(customer.firstPurchaseDate), "yyyy-MM-dd") === format(today, "yyyy-MM-dd")).length
  const customersYesterday = customers.filter(customer => format(new Date(customer.firstPurchaseDate), "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")).length

  const conversionToday = totalOrders > 0 ? ((ordersToday / totalOrders) * 100) : 0
  const conversionYesterday = totalOrders > 0 ? ((ordersYesterday / totalOrders) * 100) : 0

  // Create stats array for display
  const statsArray = [
    {
      title: "Total Revenue",
      value: formatRevenue(totalRevenue),
      icon: <DollarSign className="h-4 w-4" />,
      trend: { value: getGrowthPercentage(revenueToday, revenueYesterday), isPositive: revenueToday >= revenueYesterday }
    },
    {
      title: "Total Orders",
      value: totalOrders.toString(),
      icon: <ShoppingCart className="h-4 w-4" />,
      trend: { value: getGrowthPercentage(ordersToday, ordersYesterday), isPositive: ordersToday >= ordersYesterday }
    },
    {
      title: "Customers",
      value: totalCustomers.toString(),
      icon: <Users className="h-4 w-4" />,
      trend: { value: getGrowthPercentage(customersToday, customersYesterday), isPositive: customersToday >= customersYesterday }
    },
    {
      title: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: <TrendingUp className="h-4 w-4" />,
      trend: { value: getGrowthPercentage(conversionToday, conversionYesterday), isPositive: conversionToday >= conversionYesterday }
    }
  ]

  // Grid layout for stats
  const statsGrid = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4"

  // Get low stock products
  const lowStockProducts = products.filter(p => !p.inStock)

  // Get recent orders (last 10)
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  // Build revenue chart data from real completed orders
  const getRevenueData = () => {
    const completedOrders = orders.filter(order => order.status === "completed")

    if (completedOrders.length === 0) {
      const fallbackPoints = Array.from({ length: 15 }, (_, index) => ({
        date: format(new Date(Date.now() - (14 - index) * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        week: `Week ${index + 1}`,
        month: format(new Date(Date.now() - (14 - index) * 24 * 60 * 60 * 1000), "MMM"),
        revenue: 0
      }))

      return fallbackPoints
    }

    const now = new Date()
    const points = Array.from({ length: revenueView === "monthly" ? 6 : revenueView === "weekly" ? 8 : 15 }, (_, index) => {
      const targetDate = new Date(now)
      if (revenueView === "monthly") {
        targetDate.setMonth(now.getMonth() - (5 - index))
        targetDate.setDate(1)
      } else if (revenueView === "weekly") {
        targetDate.setDate(now.getDate() - (7 * (7 - index)))
      } else {
        targetDate.setDate(now.getDate() - (14 - index))
      }

      const key = revenueView === "monthly"
        ? format(targetDate, "yyyy-MM")
        : revenueView === "weekly"
          ? `${format(targetDate, "yyyy-MM-dd")}`
          : format(targetDate, "yyyy-MM-dd")

      const revenue = completedOrders.reduce((sum, order) => {
        const orderDate = new Date(order.date)
        const matches = revenueView === "monthly"
          ? format(orderDate, "yyyy-MM") === key
          : revenueView === "weekly"
            ? orderDate >= targetDate && orderDate <= new Date(targetDate.getTime() + 6 * 24 * 60 * 60 * 1000)
            : format(orderDate, "yyyy-MM-dd") === key

        return matches ? sum + Number(order.total || 0) : sum
      }, 0)

      return {
        date: format(targetDate, "yyyy-MM-dd"),
        week: `Week ${index + 1}`,
        month: format(targetDate, "MMM"),
        revenue
      }
    })

    return points
  }

  const revenueData = getRevenueData()

  return (
    <div className="p-2 sm:p-4 lg:p-6 pt-16 sm:pt-6 lg:pt-8">
      {/* Header */}
      <div className="flex flex-col gap-1.5 sm:gap-2 md:flex-row md:items-center md:justify-between mb-2 sm:mb-4">
        <div>
          <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: '#FE2C55' }}>Dashboard</h1>
          <p className="text-[9px] sm:text-xs text-white">Welcome, {user.name}</p>
        </div>
        <div className="flex gap-1 flex-wrap">
          <Link href="/admin/products">
            <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white text-[10px] sm:text-xs py-1.5 px-2 sm:px-3 h-auto">
              <Package className="mr-0.5 sm:mr-1 h-3 w-3" />
              Add Product
            </Button>
          </Link>
          <Link href="/admin/messages">
            <Button variant="outline" className="text-[10px] sm:text-xs py-1.5 px-2 sm:px-3 h-auto">
              <MessageSquare className="mr-0.5 sm:mr-1 h-3 w-3" />
              Messages
            </Button>
          </Link>
          <Button variant="outline" className="text-[10px] sm:text-xs py-1.5 px-2 sm:px-3 h-auto">
            <Download className="mr-0.5 sm:mr-1 h-3 w-3" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-1 sm:gap-2 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 mb-2 sm:mb-4">
        {statsArray.map((stat, index) => (
          <StatsCard key={index} title={stat.title} value={stat.value} icon={stat.icon} trend={stat.trend} />
        ))}
      </div>

      <div className="grid gap-3 sm:gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-3 sm:gap-0">
            <div>
              <CardTitle className="text-base sm:text-lg">Revenue</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Track revenue over time</CardDescription>
            </div>
            <Tabs value={revenueView} onValueChange={(v) => setRevenueView(v as typeof revenueView)}>
              <TabsList className="h-7 sm:h-8">
                <TabsTrigger value="daily" className="text-[10px] sm:text-xs px-1.5 sm:px-2">Daily</TabsTrigger>
                <TabsTrigger value="weekly" className="text-[10px] sm:text-xs px-1.5 sm:px-2">Weekly</TabsTrigger>
                <TabsTrigger value="monthly" className="text-[10px] sm:text-xs px-1.5 sm:px-2">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="h-50 sm:h-75">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey={revenueView === "daily" ? "date" : revenueView === "weekly" ? "week" : "month"}
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (revenueView === "daily") {
                        return format(new Date(value), "MMM d")
                      }
                      return value
                    }}
                  />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatRevenue(Number(value))} />
                  <Tooltip
                    formatter={(value: number) => [formatRevenue(value), "Revenue"]}
                    labelFormatter={(label) => {
                      if (revenueView === "daily") {
                        return format(new Date(label), "MMMM d, yyyy")
                      }
                      return label
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#FE2C55"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>Products that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                All products are in stock
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-100"
                  >
                    <div>
                      <p className="font-medium text-sm">{product.type}</p>
                      <p className="text-xs text-muted-foreground">{product.followers}</p>
                    </div>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                      Out of Stock
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="mt-4 sm:mt-6">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-2 px-2 sm:py-3 sm:px-4">
          <div>
            <CardTitle className="text-xs sm:text-base">Recent Orders</CardTitle>
            <CardDescription className="text-[8px] sm:text-sm">Latest 10 orders from your store</CardDescription>
          </div>
          <Link href="/admin/orders">
            <Button variant="outline" size="sm" className="text-[10px] sm:text-xs py-1 px-2 h-auto">View All</Button>
          </Link>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] sm:text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 sm:py-2 px-1 sm:px-2 text-[9px] sm:text-xs font-medium text-muted-foreground">Order ID</th>
                  <th className="text-left py-1.5 sm:py-2 px-1 sm:px-2 text-[9px] sm:text-xs font-medium text-muted-foreground">Customer</th>
                  <th className="text-left py-1.5 sm:py-2 px-1 sm:px-2 text-[9px] sm:text-xs font-medium text-muted-foreground">Products</th>
                  <th className="text-left py-1.5 sm:py-2 px-1 sm:px-2 text-[9px] sm:text-xs font-medium text-muted-foreground">Total</th>
                  <th className="text-left py-1.5 sm:py-2 px-1 sm:px-2 text-[9px] sm:text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-1.5 sm:py-2 px-1 sm:px-2 text-[9px] sm:text-xs font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[9px] sm:text-xs font-mono whitespace-nowrap">{order.id}</td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[9px] sm:text-xs">{order.customerEmail}</td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[9px] sm:text-xs">
                      {order.products.map(p => p.name).join(", ")}
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[9px] sm:text-xs font-medium whitespace-nowrap">${order.total}</td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2">
                      <Badge className={`${statusColors[order.status]} text-[8px] sm:text-xs py-0.5 px-1 whitespace-nowrap`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[9px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(order.date), "MMM d")}
                    </td>
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
