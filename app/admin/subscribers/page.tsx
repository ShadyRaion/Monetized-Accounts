"use client"

import { useState, useEffect } from "react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { useStoreData } from "@/lib/store-data-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import type { Subscriber } from "@/lib/types"
import { Mail, Search, Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

const sourceColors: Record<string, string> = {
  checkout: "bg-green-100 text-green-800",
  newsletter: "bg-blue-100 text-blue-800",
  popup: "bg-purple-100 text-purple-800"
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  unsubscribed: "bg-gray-100 text-gray-800"
}

export default function SubscribersPage() {
  const { user, isLoading } = useAdminAuth()
  const { subscribers, deleteSubscriber } = useStoreData()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteSubscriberId, setDeleteSubscriberId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE2C55]" />
      </div>
    )
  }

  if (!user) return null

  // Filter subscribers
  const filteredSubscribers = subscribers.filter(subscriber => {
    return subscriber.email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handleExportCSV = () => {
    const headers = ["Email", "Subscribed Date", "Source", "Status"]
    const csvData = filteredSubscribers.map(subscriber => [
      subscriber.email,
      subscriber.subscribedDate,
      subscriber.source,
      subscriber.status
    ])

    const csvContent = [headers, ...csvData].map(row => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Subscribers exported successfully")
  }

  const handleDeleteSubscriber = async () => {
    if (!deleteSubscriberId) return
    setIsDeleting(true)
    try {
      await deleteSubscriber(deleteSubscriberId)
      setDeleteSubscriberId(null)
      setIsDeleteDialogOpen(false)
      toast.success("Subscriber deleted")
    } catch (err) {
      console.error("Failed to delete subscriber:", err)
      toast.error("Failed to delete subscriber")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    setIsDeleting(true)
    try {
      for (const id of selectedRows) {
        await deleteSubscriber(id)
      }
      setSelectedRows([])
      toast.success(`${selectedRows.length} subscribers deleted`)
    } catch (err) {
      console.error("Failed to delete subscribers:", err)
      toast.error("Failed to delete subscribers")
    } finally {
      setIsDeleting(false)
    }
  }

  // Stats
  const totalSubscribers = subscribers.length
  const activeSubscribers = subscribers.filter(s => s.status === "active").length
  const checkoutSubs = subscribers.filter(s => s.source === "checkout").length
  const newsletterSubs = subscribers.filter(s => s.source === "newsletter").length
  const popupSubs = subscribers.filter(s => s.source === "popup").length

  const columns: Column<Subscriber>[] = [
    { key: "email", label: "Email", sortable: true },
    {
      key: "subscribedDate",
      label: "Subscribed",
      sortable: true,
      render: (subscriber) => format(new Date(subscriber.subscribedDate), "MMM d, yyyy")
    },
    {
      key: "source",
      label: "Source",
      sortable: true,
      render: (subscriber) => (
        <Badge className={sourceColors[subscriber.source]}>
          {subscriber.source.charAt(0).toUpperCase() + subscriber.source.slice(1)}
        </Badge>
      )
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (subscriber) => (
        <Badge className={statusColors[subscriber.status]}>
          {subscriber.status.charAt(0).toUpperCase() + subscriber.status.slice(1)}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (subscriber) => (
        <Button
          variant="ghost"
          size="icon"
          className="text-red-600 hover:text-red-700"
          disabled={isDeleting}
          onClick={() => {
            setDeleteSubscriberId(subscriber.id)
            setIsDeleteDialogOpen(true)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )
    }
  ]

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
            <BreadcrumbPage className="text-[8px] sm:text-xs text-white">Subscribers</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-1.5 sm:gap-2 md:flex-row md:items-center md:justify-between mb-2 sm:mb-3">
        <div>
          <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: '#FE2C55' }}>Subscribers</h1>
          <p className="text-[9px] sm:text-xs text-white">Manage your email list</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV} className="text-[10px] sm:text-xs py-1.5 px-2 h-auto">
          <Download className="mr-0.5 sm:mr-1 h-3 w-3" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-1 sm:gap-2 mb-2 sm:mb-3">
        <Card>
          <CardContent className="p-1 sm:p-2 flex items-center justify-center min-h-[40px] sm:min-h-[55px]">
            <div className="text-center">
              <div className="text-[9px] sm:text-xs text-muted-foreground">Total</div>
              <div className="text-base sm:text-lg font-bold">{totalSubscribers}</div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-1 grid-cols-2 sm:gap-2">
          <Card>
            <CardContent className="p-1 sm:p-2 flex items-center justify-center min-h-[40px] sm:min-h-[55px]">
              <div className="text-center">
                <div className="text-[9px] sm:text-xs text-muted-foreground">Active</div>
                <div className="text-base sm:text-lg font-bold text-green-600">{activeSubscribers}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-1 sm:p-2 flex items-center justify-center min-h-[40px] sm:min-h-[55px]">
              <div className="text-center">
                <div className="text-[9px] sm:text-xs text-muted-foreground">Checkout</div>
                <div className="text-base sm:text-lg font-bold">{checkoutSubs}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-1 sm:p-2 flex items-center justify-center min-h-[40px] sm:min-h-[55px]">
              <div className="text-center">
                <div className="text-[9px] sm:text-xs text-muted-foreground">Newsletter</div>
                <div className="text-base sm:text-lg font-bold">{newsletterSubs}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-1 sm:p-2 flex items-center justify-center min-h-[40px] sm:min-h-[55px]">
              <div className="text-center">
                <div className="text-[9px] sm:text-xs text-muted-foreground">Popup</div>
                <div className="text-base sm:text-lg font-bold">{popupSubs}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <div className="mb-4 flex items-center gap-4 p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">{selectedRows.length} selected</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={isDeleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Selected"}
          </Button>
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader className="py-2 px-2 sm:py-3 sm:px-4">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
            Subscribers ({filteredSubscribers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 h-7 sm:h-8 text-[10px] sm:text-xs"
            />
          </div>
          <DataTable
            data={filteredSubscribers}
            columns={columns}
            selectable
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            emptyMessage="No subscribers found"
            emptyIcon={<Mail className="h-12 w-12" />}
          />
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subscriber</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this subscriber? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteSubscriber}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
