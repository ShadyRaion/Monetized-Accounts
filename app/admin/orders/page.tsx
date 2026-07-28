"use client"

import { useState } from "react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type Column } from "@/components/admin/data-table"
import type { Order } from "@/lib/types"
import { useStoreData } from "@/lib/store-data-context"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Search, ShoppingCart, Download, Eye, Calendar, Send, Edit2 } from "lucide-react"
import { toast } from "sonner"
import { formatRevenue } from "@/lib/utils"
import { format } from "date-fns"
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

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  delivered: "bg-teal-100 text-teal-800",
  completed: "bg-green-100 text-green-800",
  refunded: "bg-orange-100 text-orange-800",
  cancelled: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800"
}

export default function OrdersPage() {
  const { user, isLoading } = useAdminAuth()
  const { orders, updateOrderStatus, updateOrderProductDelivery, updateOrder } = useStoreData()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [startMonth, setStartMonth] = useState<Date>(new Date())
  const [endMonth, setEndMonth] = useState<Date>(new Date())
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [deliveryInfoInputs, setDeliveryInfoInputs] = useState<Record<string, string>>({})
  const [editingDelivery, setEditingDelivery] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-3">
          <div>
            <h1 className="text-lg sm:text-3xl font-bold text-white">Orders</h1>
            <p className="text-xs sm:text-sm text-gray-400">Manage orders</p>
          </div>
          <Button variant="outline" className="text-xs sm:text-sm py-2">
            <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Export Orders</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>
    )
  }

  if (!user) return null

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    
    // Platform filter based on product names
    const hasTikTok = order.products.some(p => p.name.toLowerCase().includes("tiktok"))
    const hasYouTube = order.products.some(p => p.name.toLowerCase().includes("youtube"))
    const matchesPlatform = platformFilter === "all" ||
      (platformFilter === "TikTok" && hasTikTok) ||
      (platformFilter === "YouTube" && hasYouTube)
    
    // Date range filter
    let matchesDate = true
    const orderDate = new Date(order.date)
    if (startDate) {
      matchesDate = orderDate >= startDate
    }
    if (endDate && matchesDate) {
      matchesDate = orderDate <= endDate
    }
    
    return matchesSearch && matchesStatus && matchesPlatform && matchesDate
  })

  const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
    try {
      await updateOrderStatus(orderId, newStatus)
      toast.success(`Order status updated to ${newStatus}`)
    } catch (error) {
      console.error("Order status update failed:", error)
      toast.error(`Unable to update order status to ${newStatus}`)
    }
  }

  const handleExportCSV = () => {
    const headers = ["Order ID", "Customer Email", "Products", "Total", "Verification", "Status", "Date", "Payment Method"]
    const csvData = filteredOrders.map(order => [
      order.id,
      order.customerEmail,
      order.products.map(p => p.name).join("; "),
      order.total,
      order.verificationAdded ? "Yes" : "No",
      order.status,
      format(new Date(order.date), "yyyy-MM-dd"),
      order.paymentMethod
    ])

    const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `orders-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Orders exported successfully")
  }

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailModalOpen(true)
  }

  const columns: Column<Order>[] = [
    { key: "id", label: "Order ID", sortable: true },
    { key: "customerEmail", label: "Customer", sortable: true },
    {
      key: "products",
      label: "Products",
      render: (order) => (
        <div className="max-w-[200px] truncate">
          {order.products.map(p => p.name).join(", ")}
        </div>
      )
    },
    {
      key: "total",
      label: "Total",
      sortable: true,
      render: (order) => <span className="font-medium">${order.total}</span>
    },
    {
      key: "verificationAdded",
      label: "Verification",
      render: (order) => (
        <Badge variant="outline" className={order.verificationAdded ? "border-green-500 text-green-600" : "border-gray-300 text-gray-500"}>
          {order.verificationAdded ? "Yes" : "No"}
        </Badge>
      )
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (order) => (
        <Select value={order.status} onValueChange={(v) => handleStatusChange(order.id, v as Order["status"])}>
          <SelectTrigger className="w-[130px] h-8">
            <Badge className={statusColors[order.status]}>
              {order.status === "processing" ? "Processing" : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      )
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (order) => format(new Date(order.date), "MMM d, yyyy")
    },
    {
      key: "actions",
      label: "Actions",
      render: (order) => (
        <Button variant="ghost" size="icon" onClick={() => viewOrderDetails(order)}>
          <Eye className="h-4 w-4" />
        </Button>
      )
    }
  ]

  // Calculate stats
  const totalRevenue = filteredOrders.filter(o => o.status === "completed").reduce((sum, o) => sum + o.total, 0)
  const pendingOrders = filteredOrders.filter(o => o.status === "pending").length
  const completedOrders = filteredOrders.filter(o => o.status === "completed").length

  return (
    <div className="p-2 sm:p-4 lg:p-6 pt-16 sm:pt-6 lg:pt-8">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-2 sm:mb-3 text-[8px] sm:text-xs">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin" className="text-[8px] sm:text-xs text-white">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[8px] sm:text-xs text-white">Orders</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-1.5 sm:gap-2 md:flex-row md:items-center md:justify-between mb-2 sm:mb-3">
        <div>
          <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: '#FE2C55' }}>Orders</h1>
          <p className="text-[9px] sm:text-xs text-white">Manage and track customer orders</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} className="text-[10px] sm:text-xs py-1.5 px-2 h-auto">
          <Download className="mr-0.5 sm:mr-1 h-3 w-3" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-1 grid-cols-3 sm:gap-2 mb-2 sm:mb-3">
        <Card>
          <CardContent className="p-2 sm:p-3 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[9px] sm:text-sm text-muted-foreground">Revenue</div>
              <div className="text-base sm:text-xl font-bold text-green-600">{formatRevenue(totalRevenue)}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[9px] sm:text-sm text-muted-foreground">Pending</div>
              <div className="text-base sm:text-xl font-bold text-yellow-600">{pendingOrders}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 sm:p-3 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[9px] sm:text-sm text-muted-foreground">Completed</div>
              <div className="text-base sm:text-xl font-bold text-green-600">{completedOrders}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-2 sm:mb-3">
        <CardContent className="p-1.5 sm:pt-3 sm:px-3">
          <div className="flex flex-col gap-1 sm:gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-7 sm:h-8 text-[10px] sm:text-xs"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[100px] h-7 sm:h-8 text-[10px] sm:text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full sm:w-[120px] h-7 sm:h-8 text-[10px] sm:text-xs">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="TikTok">TikTok</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto h-7 sm:h-8 text-[10px] sm:text-xs px-1.5 sm:px-3">
                  <Calendar className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
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
                    disabled={(date) => {
                      const today = new Date()
                      return date > today
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto h-7 sm:h-8 text-[10px] sm:text-xs px-1.5 sm:px-3">
                  <Calendar className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
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
                    disabled={(date) => {
                      const today = new Date()
                      return date > today
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
            {(startDate || endDate) && (
              <Button variant="ghost" size="sm" className="h-7 text-[10px] px-1" onClick={() => { setStartDate(undefined); setEndDate(undefined); setStartMonth(new Date()); setEndMonth(new Date()) }}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Orders ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredOrders}
            columns={columns}
            emptyMessage="No orders found"
            emptyIcon={<ShoppingCart className="h-12 w-12" />}
          />
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-md sm:max-w-lg w-[95vw] sm:w-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm sm:text-base">Order {selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="flex flex-col gap-2 sm:gap-3 max-h-[60vh] overflow-y-auto">
              {/* Customer Info */}
              <div>
                <h3 className="font-semibold text-[10px] sm:text-xs mb-1">Customer</h3>
                <div className="bg-muted rounded p-2 text-[9px] sm:text-xs space-y-0.5">
                  <p><span className="text-muted-foreground">Name:</span> {selectedOrder.customerName}</p>
                  <p className="truncate"><span className="text-muted-foreground">Email:</span> {selectedOrder.customerEmail}</p>
                </div>
              </div>

              {/* Products */}
              <div>
                <h3 className="font-semibold text-[10px] sm:text-xs mb-1">Products</h3>
                <div className="bg-muted rounded p-2 text-[9px] sm:text-xs space-y-1">
                  {selectedOrder.products.map((product, idx) => (
                    <div key={idx} className="py-2 border-b last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-muted-foreground">Qty: {product.quantity}</p>
                        </div>
                        <div className="text-right ml-1">
                          <p className="font-medium">${product.price}</p>
                          {product.hasVerification && product.verificationPrice !== undefined && (
                            <p className="text-muted-foreground">Verification: ${product.verificationPrice}</p>
                          )}
                        </div>
                      </div>
                      {/* Delivery Info Section */}
                      <div className="mt-2">
                        {editingDelivery === `${selectedOrder.id}-${product.productId}` ? (
                          <div className="space-y-2">
                            <Label className="text-[9px]">Account Credentials / Delivery Info</Label>
                            <Textarea
                              placeholder="Enter account credentials or delivery information..."
                              value={deliveryInfoInputs[`${selectedOrder.id}-${product.productId}`] || product.deliveryInfo || ''}
                              onChange={(e) => setDeliveryInfoInputs(prev => ({
                                ...prev,
                                [`${selectedOrder.id}-${product.productId}`]: e.target.value
                              }))}
                              className="text-[9px] min-h-[60px]"
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                className="h-6 text-[9px]"
                                onClick={() => {
                                  const info = deliveryInfoInputs[`${selectedOrder.id}-${product.productId}`]
                                  if (info) {
                                    updateOrderProductDelivery(selectedOrder.id, product.productId, info)
                                    // Refresh the selected order
                                    const updatedOrders = orders.find(o => o.id === selectedOrder.id)
                                    if (updatedOrders) setSelectedOrder(updatedOrders)
                                    toast.success("Delivery info saved!")
                                  }
                                  setEditingDelivery(null)
                                }}
                              >
                                <Send className="w-3 h-3 mr-1" />
                                Save
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-6 text-[9px]"
                                onClick={() => setEditingDelivery(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            {product.deliveryInfo ? (
                              <div className="flex-1 bg-green-50 border border-green-200 rounded p-1.5">
                                <p className="text-[8px] text-green-700 font-medium mb-0.5">Delivery Info Sent:</p>
                                <p className="text-[9px] text-green-800 whitespace-pre-wrap">{product.deliveryInfo}</p>
                              </div>
                            ) : (
                              <p className="text-[8px] text-orange-600">No delivery info sent yet</p>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-5 text-[8px] px-1.5 shrink-0"
                              onClick={() => {
                                setEditingDelivery(`${selectedOrder.id}-${product.productId}`)
                                setDeliveryInfoInputs(prev => ({
                                  ...prev,
                                  [`${selectedOrder.id}-${product.productId}`]: product.deliveryInfo || ''
                                }))
                              }}
                            >
                              <Edit2 className="w-2.5 h-2.5 mr-0.5" />
                              {product.deliveryInfo ? 'Edit' : 'Add'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1 font-bold">
                    <p>Total</p>
                    <p>${selectedOrder.total}</p>
                  </div>
                </div>
              </div>

              {/* Payment & Status */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <h3 className="font-semibold text-[10px] sm:text-xs mb-1">Payment</h3>
                  <div className="bg-muted rounded p-2 text-[9px] sm:text-xs space-y-0.5">
                    <p className="truncate"><span className="text-muted-foreground">Method:</span> {selectedOrder.paymentMethod}</p>
                    <p className="text-muted-foreground text-[8px] sm:text-[9px]">{format(new Date(selectedOrder.date), "MMM d, yyyy")}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-[10px] sm:text-xs mb-1">Status</h3>
                  <div className="bg-muted rounded p-2 flex items-center">
                    <Badge className={statusColors[selectedOrder.status] + " text-[8px] sm:text-xs py-0.5 px-1"}>
                      {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
