"use client"

import { useState } from "react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import type { Customer } from "@/lib/types"
import { useStoreData } from "@/lib/store-data-context"
import { Search, Users, Download, Eye, Lock, Unlock, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { formatSafeDate } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const formatCustomerDate = (rawDate: string | undefined) => {
  const formatted = formatSafeDate(rawDate, "MMM d, yyyy")
  return formatted || "-"
}

export default function CustomersPage() {
  const { user, isLoading } = useAdminAuth()
  const { orders, customers: registeredCustomers, hasLiveUpdates, toggleCustomerBan, deleteCustomer } = useStoreData()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isBanModalOpen, setIsBanModalOpen] = useState(false)
  const [banTarget, setBanTarget] = useState<Customer | null>(null)
  const [banReason, setBanReason] = useState("")
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  if (isLoading) {
    return (
      <div className="p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 gap-3">
          <div>
            <h1 className="text-lg sm:text-3xl font-bold text-white">Customers</h1>
            <p className="text-xs sm:text-sm text-gray-400">Manage customers</p>
          </div>
          <Button variant="outline" className="text-xs sm:text-sm py-2">
            <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">DL</span>
          </Button>
        </div>
      </div>
    )
  }

  if (!user) return null

  // Use backend-provided customers (already aggregated from completed orders)
  const computedCustomers = (registeredCustomers || []).map(c => ({
    id: c.id,
    email: c.email,
    name: c.name || '',
    referralCode: c.referralCode || '',
    ordersCount: Number((c as any).ordersCount || 0),
    totalSpent: Number((c as any).totalSpent || 0),
    firstPurchaseDate: (c as any).firstPurchaseDate || '',
    lastPurchaseDate: (c as any).lastPurchaseDate || '',
    orders: (c as any).orders || [],
    isBanned: Boolean((c as any).isBanned)
  })).filter(customer => customer.email.toLowerCase() !== user?.email?.toLowerCase() && ((registeredCustomers.find(rc => rc.email === customer.email) as any)?.role !== 'ADMIN'))

  // Filter customers - search by email, name, or referral code
  const filteredCustomers = computedCustomers.filter(customer => {
    const searchLower = searchQuery.toLowerCase()
    return customer.email.toLowerCase().includes(searchLower) ||
      customer.name.toLowerCase().includes(searchLower) ||
      (customer.referralCode?.toLowerCase().includes(searchLower) || false)
  })

  const handleExportCSV = () => {
    const headers = ["Email", "Name", "Referral Code", "Orders Count", "Total Spent", "First Purchase", "Last Purchase"]
    const csvData = filteredCustomers.map(customer => [
      customer.email,
      customer.name,
      customer.referralCode || "",
      customer.ordersCount,
      customer.totalSpent,
      customer.firstPurchaseDate,
      customer.lastPurchaseDate
    ])

    const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `customers-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Customers exported successfully")
  }

  const viewCustomerDetails = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDetailModalOpen(true)
  }

  // Get customer orders
  const getCustomerOrders = (email: string) => {
    return orders.filter(order => order.customerEmail === email)
  }

  const columns: Column<Customer>[] = [
    { key: "email", label: "Email", sortable: true },
    { key: "name", label: "Name", sortable: true },
    {
      key: "referralCode",
      label: "Referral Code",
      sortable: true,
      render: (customer) => (
        customer.referralCode ? (
          <Badge variant="secondary">{customer.referralCode}</Badge>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )
      )
    },
    {
      key: "ordersCount",
      label: "Orders",
      sortable: true,
      render: (customer) => (
        <Badge variant="outline">{customer.ordersCount}</Badge>
      )
    },
    {
      key: "totalSpent",
      label: "Total Spent",
      sortable: true,
      render: (customer) => (
        <span className="font-medium text-green-600">${Number(customer.totalSpent || 0).toLocaleString()}</span>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (customer) => (
        customer.isBanned ? (
          <Badge variant="destructive" className="rounded-full px-2 py-1 text-[10px]">Banned</Badge>
        ) : (
          <Badge variant="secondary" className="rounded-full px-2 py-1 text-[10px]">Active</Badge>
        )
      )
    },
    {
      key: "firstPurchaseDate",
      label: "First Purchase",
      sortable: true,
      render: (customer) => formatCustomerDate(customer.firstPurchaseDate)
    },
    {
      key: "lastPurchaseDate",
      label: "Last Purchase",
      sortable: true,
      render: (customer) => formatCustomerDate(customer.lastPurchaseDate)
    },
    {
      key: "actions",
      label: "Actions",
      render: (customer) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => viewCustomerDetails(customer)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => {
            setDeleteTarget(customer)
            setIsDeleteModalOpen(true)
          }}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={customer.isBanned ? "text-red-400 border-red-500/30" : "text-black border-black/30"}
            onClick={() => {
              setBanTarget(customer)
              setBanReason("")
              setIsBanModalOpen(true)
            }}
          >
            {customer.isBanned ? (
              <Unlock className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </Button>
        </div>
      )
    }
  ]

  // Calculate totals
  const totalCustomers = computedCustomers.length
  const totalLifetimeValue = computedCustomers.reduce((sum, c) => sum + c.totalSpent, 0)
  const avgLifetimeValue = totalCustomers > 0 ? totalLifetimeValue / totalCustomers : 0

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
            <BreadcrumbPage className="text-[8px] sm:text-xs text-white">Customers</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-1.5 sm:gap-2 md:flex-row md:items-center md:justify-between mb-2 sm:mb-3">
        <div>
          <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: '#FE2C55' }}>Customers</h1>
          <p className="text-[9px] sm:text-xs text-white">Manage your customer base</p>
          {hasLiveUpdates && (
            <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-[9px] font-medium text-red-300">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Updated recently
            </div>
          )}
        </div>
        <Button variant="outline" onClick={handleExportCSV} className="text-[10px] sm:text-xs py-1.5 px-2 h-auto">
          <Download className="mr-0.5 sm:mr-1 h-3 w-3" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-1 grid-cols-3 sm:gap-2 mb-2 sm:mb-3">
        <Card>
          <CardContent className="p-1.5 sm:p-2.5 flex items-center justify-center min-h-11.25 sm:min-h-15">
            <div className="text-center">
              <div className="text-[8px] sm:text-xs text-muted-foreground">Customers</div>
              <div className="text-sm sm:text-lg font-bold">{totalCustomers}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-1.5 sm:p-2.5 flex items-center justify-center min-h-11.25 sm:min-h-15">
            <div className="text-center">
              <div className="text-[8px] sm:text-xs text-muted-foreground">LTV</div>
              <div className="text-sm sm:text-lg font-bold text-green-600">${(totalLifetimeValue/1000).toFixed(0)}k</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-1.5 sm:p-2.5 flex items-center justify-center min-h-11.25 sm:min-h-15">
            <div className="text-center">
              <div className="text-[8px] sm:text-xs text-muted-foreground">Avg</div>
              <div className="text-sm sm:text-lg font-bold">${avgLifetimeValue.toFixed(0)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader className="py-2 px-2 sm:py-3 sm:px-4">
          <CardTitle className="flex items-center gap-1 text-sm sm:text-base">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            Customers ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 sm:h-8 text-[10px] sm:text-xs"
            />
          </div>
          <DataTable
            data={filteredCustomers}
            columns={columns}
            emptyMessage="No customers found"
            emptyIcon={<Users className="h-12 w-12" />}
          />
        </CardContent>
      </Card>

      {/* Customer Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="flex flex-col gap-6">
              {/* Customer Info */}
              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="bg-muted rounded-lg p-4">
                  <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Name:</p>
                      <p className="font-semibold">{selectedCustomer.name}</p>
                    </div>
                    <Badge variant={selectedCustomer.isBanned ? "destructive" : "secondary"} className="rounded-full px-2 py-1 text-[10px]">
                      {selectedCustomer.isBanned ? "Banned" : "Active"}
                    </Badge>
                  </div>
                  <p><span className="text-muted-foreground">Email:</span> {selectedCustomer.email}</p>
                  {selectedCustomer.referralCode && (
                    <p><span className="text-muted-foreground">Invited by:</span> <Badge variant="secondary">{selectedCustomer.referralCode}</Badge></p>
                  )}
                  <p><span className="text-muted-foreground">Customer since:</span> {formatCustomerDate(selectedCustomer.firstPurchaseDate)}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{selectedCustomer.ordersCount}</p>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">${selectedCustomer.totalSpent}</p>
                  <p className="text-sm text-muted-foreground">Lifetime Value</p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">${(selectedCustomer.totalSpent / selectedCustomer.ordersCount).toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Avg Order Value</p>
                </div>
              </div>

              {/* Order History */}
              <div>
                <h3 className="font-semibold mb-2">Order History</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left py-2 px-3 text-sm font-medium">Order ID</th>
                        <th className="text-left py-2 px-3 text-sm font-medium">Products</th>
                        <th className="text-left py-2 px-3 text-sm font-medium">Total</th>
                        <th className="text-left py-2 px-3 text-sm font-medium">Status</th>
                        <th className="text-left py-2 px-3 text-sm font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getCustomerOrders(selectedCustomer.email).map(order => (
                        <tr key={order.id} className="border-t">
                          <td className="py-2 px-3 text-sm font-mono">{order.id}</td>
                          <td className="py-2 px-3 text-sm">{order.products.map(p => p.name).join(", ")}</td>
                          <td className="py-2 px-3 text-sm font-medium">${order.total}</td>
                          <td className="py-2 px-3">
                            <Badge className={order.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                              {order.status}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-sm text-muted-foreground">
                            {formatCustomerDate(order.date)}
                          </td>
                        </tr>
                      ))}
                      {getCustomerOrders(selectedCustomer.email).length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            No orders found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ban Confirmation Modal */}
      <Dialog open={isBanModalOpen} onOpenChange={setIsBanModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Ban</DialogTitle>
          </DialogHeader>
          {banTarget && (
            <div className="space-y-4">
              <p>Are you sure you want to ban <strong>{banTarget.email}</strong>?</p>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Reason (optional)</label>
                <Textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setIsBanModalOpen(false); setBanTarget(null); setBanReason("") }}>Cancel</Button>
                <Button onClick={async () => {
                  if (!banTarget) return
                  try {
                    await toggleCustomerBan(banTarget.id, true, banReason || undefined)
                    setSelectedCustomer(prev => prev?.id === banTarget.id ? { ...prev, isBanned: true } : prev)
                    toast.success('Customer banned')
                  } catch (err) {
                    console.error(err)
                    toast.error('Failed to ban customer')
                  } finally {
                    setIsBanModalOpen(false)
                    setBanTarget(null)
                    setBanReason("")
                  }
                }}>Confirm Ban</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4">
              <p>Are you sure you want to delete <strong>{deleteTarget.email}</strong>? This action cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setIsDeleteModalOpen(false); setDeleteTarget(null) }}>Cancel</Button>
                <Button variant="destructive" onClick={async () => {
                  if (!deleteTarget) return
                  try {
                    await deleteCustomer(deleteTarget.id)
                    toast.success('Customer deleted')
                  } catch (err) {
                    console.error(err)
                    toast.error('Failed to delete customer')
                  } finally {
                    setIsDeleteModalOpen(false)
                    setDeleteTarget(null)
                  }
                }}>Delete</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
