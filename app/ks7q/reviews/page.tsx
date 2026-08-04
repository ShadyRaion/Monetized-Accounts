"use client"

import { useState } from "react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import type { Review } from "@/lib/types"
import { useStoreData } from "@/lib/store-data-context"
import { Star, Plus, Edit, Trash2, Check, X } from "lucide-react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
}

export default function ReviewsPage() {
  const { user, isLoading } = useAdminAuth()
  const { reviews, addReview, updateReview, deleteReview, approveReview, rejectReview } = useStoreData()
  const [activeTab, setActiveTab] = useState<string>("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [deleteReviewId, setDeleteReviewId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    customerName: "",
    orderId: "",
    rating: 5,
    text: ""
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE2C55]" />
      </div>
    )
  }

  if (!user) return null

  // Filter reviews by tab
  const filteredReviews = reviews.filter(review => {
    if (activeTab === "all") return true
    return review.status === activeTab
  })

  // Counts
  const pendingCount = reviews.filter(r => r.status === "pending").length
  const approvedCount = reviews.filter(r => r.status === "approved").length
  const rejectedCount = reviews.filter(r => r.status === "rejected").length

  const handleApprove = async (reviewId: string) => {
    try {
      await approveReview(reviewId)
      toast.success("Review approved")
    } catch (error) {
      console.error("Approve review failed:", error)
      toast.error("Failed to approve review")
    }
  }

  const handleReject = async (reviewId: string) => {
    try {
      await rejectReview(reviewId)
      toast.success("Review rejected")
    } catch (error) {
      console.error("Reject review failed:", error)
      toast.error("Failed to reject review")
    }
  }

  const handleAddReview = () => {
    if (!formData.customerName) {
      toast.error("Please fill in the reviewer name")
      return
    }

    const tempId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `temp-${crypto.randomUUID()}`
      : `temp-${Date.now()}-${Math.floor(Math.random() * 10000)}`

    const newReview: Review = {
      id: tempId,
      productId: "manual",
      orderId: formData.orderId || undefined,
      productName: "Manual Review",
      customerName: formData.customerName,
      title: formData.rating >= 5 ? "Excellent!" : formData.rating >= 4 ? "Great Experience" : "Good Service",
      rating: formData.rating,
      text: formData.text,
      date: format(new Date(), "yyyy-MM-dd"),
      verified: false,
      helpful: 0,
      status: "approved"
    }

    addReview(newReview)
    setIsAddModalOpen(false)
    resetForm()
    toast.success("Review added")
  }

  const handleEditReview = () => {
    if (!editingReview) return

    updateReview(editingReview.id, {
      customerName: formData.customerName,
      rating: formData.rating,
      text: formData.text,
      orderId: formData.orderId || undefined
    })
    setIsEditModalOpen(false)
    setEditingReview(null)
    resetForm()
    toast.success("Review updated")
  }

  const handleDeleteReview = () => {
    if (!deleteReviewId) return
    deleteReview(deleteReviewId)
    setDeleteReviewId(null)
    setIsDeleteDialogOpen(false)
    toast.success("Review deleted")
  }

  const openEditModal = (review: Review) => {
    setEditingReview(review)
    setFormData({
      customerName: review.customerName,
      orderId: review.orderId ?? "",
      rating: review.rating,
      text: review.text
    })
    setIsEditModalOpen(true)
  }

  const resetForm = () => {
    setFormData({ customerName: "", orderId: "", rating: 5, text: "" })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
          />
        ))}
      </div>
    )
  }

  const columns: Column<Review>[] = [
    {
      key: "customerName",
      label: "Customer",
      render: (review) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[#FE2C55] text-white text-xs">
              {review.customerName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span>{review.customerName}</span>
        </div>
      )
    },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      render: (review) => renderStars(review.rating)
    },
    {
      key: "text",
      label: "Review",
      render: (review) => (
        <div className="max-w-[300px] truncate">{review.text}</div>
      )
    },
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (review) => formatSafeDate(review.date, "MMM d, yyyy")
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (review) => (
        <Badge className={statusColors[review.status]}>
          {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (review) => (
        <div className="flex items-center gap-1">
          {review.status === "pending" && (
            <>
              <Button variant="ghost" size="icon" onClick={() => handleApprove(review.id)} className="text-green-600">
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleReject(review.id)} className="text-red-600">
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => openEditModal(review)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600"
            onClick={() => {
              setDeleteReviewId(review.id)
              setIsDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ]

  return (
    <div className="p-2 sm:p-4 lg:p-6 pt-16 sm:pt-6 lg:pt-8">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-2 sm:mb-3 text-[8px] sm:text-xs">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/ks7q" className="text-[8px] sm:text-xs text-white">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[8px] sm:text-xs text-white">Reviews</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-1.5 sm:gap-2 md:flex-row md:items-center md:justify-between mb-2 sm:mb-3">
        <div>
          <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: '#FE2C55' }}>Reviews</h1>
          <p className="text-[9px] sm:text-xs text-white">Manage customer testimonials</p>
        </div>
        <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white text-[10px] sm:text-xs py-1.5 px-2 h-auto" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="mr-0.5 sm:mr-1 h-3 w-3" />
          Add
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-2 sm:mb-3 w-full">
        <TabsList className="h-8 text-[9px] sm:text-xs w-full justify-start overflow-x-auto">
          <TabsTrigger value="all" className="text-[8px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap">All ({reviews.length})</TabsTrigger>
          <TabsTrigger value="pending" className="text-[8px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="approved" className="text-[8px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap">Approv ({approvedCount})</TabsTrigger>
          <TabsTrigger value="rejected" className="text-[8px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap">Reject ({rejectedCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Data Table */}
      <Card>
        <CardHeader className="py-2 px-2 sm:py-3 sm:px-4">
          <CardTitle className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4" />
            Reviews ({filteredReviews.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredReviews}
            columns={columns}
            emptyMessage="No reviews found"
            emptyIcon={<Star className="h-12 w-12" />}
          />
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Testimonial</DialogTitle>
          </DialogHeader>
          <ReviewForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90" onClick={handleAddReview}>
              Add Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
          </DialogHeader>
          <ReviewForm formData={formData} setFormData={setFormData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90" onClick={handleEditReview}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteReview}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface ReviewFormProps {
  formData: { customerName: string; orderId: string; rating: number; text: string }
  setFormData: React.Dispatch<React.SetStateAction<ReviewFormProps["formData"]>>
}

function ReviewForm({ formData, setFormData }: ReviewFormProps) {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="customerName">Customer Name</Label>
        <Input
          id="customerName"
          value={formData.customerName}
          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
          placeholder="e.g., John D."
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="orderId">Order ID (optional)</Label>
        <Input
          id="orderId"
          value={formData.orderId}
          onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
          placeholder="Enter related order ID"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Rating</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData({ ...formData, rating: star })}
              className="p-1"
            >
              <Star
                className={`h-6 w-6 cursor-pointer transition-colors ${
                  star <= formData.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300 hover:text-yellow-300"
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="text">Review Text</Label>
        <Textarea
          id="text"
          value={formData.text}
          onChange={(e) => setFormData({ ...formData, text: e.target.value })}
          placeholder="Customer testimonial..."
          rows={4}
        />
      </div>
    </div>
  )
}
