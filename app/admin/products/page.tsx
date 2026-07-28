"use client"

import { useState } from "react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable, type Column } from "@/components/admin/data-table"
import type { Product } from "@/lib/types"
import { useStoreData } from "@/lib/store-data-context"
import { Plus, Search, Trash2, Edit, Package } from "lucide-react"
import { toast } from "sonner"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function ProductsPage() {
  const { user, isLoading } = useAdminAuth()
  const { products, addProduct, updateProduct, deleteProduct, toggleProductStock } = useStoreData()
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [stockFilter, setStockFilter] = useState<string>("all")
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    id: "",
    platform: "TikTok" as "TikTok" | "YouTube",
    type: "",
    followers: "",
    price: 0,
    verificationEnabled: false,
    verificationPrice: 0,
    description: "",
    features: "",
    badge: "",
    transferTime: "24-48 hours",
    inStock: true
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE2C55]" />
      </div>
    )
  }

  if (!user) return null

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.type.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesPlatform = platformFilter === "all" || product.platform === platformFilter
    const matchesType = typeFilter === "all" || product.type === typeFilter
    const matchesStock = stockFilter === "all" ||
      (stockFilter === "inStock" && product.inStock) ||
      (stockFilter === "outOfStock" && !product.inStock)
    return matchesSearch && matchesPlatform && matchesType && matchesStock
  })

  // Get unique types for filter - filter out empty/null values
  const uniqueTypes = [...new Set(products.map(p => p.type).filter((type): type is string => !!(type && type.trim())))]
  const validTypes = uniqueTypes.length > 0 ? uniqueTypes : []

  const handleAddProduct = () => {
    if (!formData.id || !formData.type || formData.price <= 0) {
      toast.error("Please fill in all required fields")
      return
    }

    const newProduct: Product = {
      id: formData.id,
      platform: formData.platform,
      type: formData.type,
      followers: formData.followers,
      price: formData.price,
      verificationPrice: formData.verificationEnabled ? (formData.verificationPrice > 0 ? formData.verificationPrice : 30) : 0,
      description: formData.description,
      features: formData.features.split("\n").filter(f => f.trim()),
      badge: formData.badge,
      transferTime: formData.transferTime,
      inStock: formData.inStock
    }

    addProduct(newProduct)
    setIsAddModalOpen(false)
    resetForm()
    toast.success("Product added successfully")
  }

  const handleEditProduct = () => {
    if (!editingProduct) return

    updateProduct(editingProduct.id, {
      platform: formData.platform,
      type: formData.type,
      followers: formData.followers,
      price: formData.price,
      verificationPrice: formData.verificationEnabled ? (formData.verificationPrice > 0 ? formData.verificationPrice : 30) : 0,
      description: formData.description,
      features: formData.features.split("\n").filter(f => f.trim()),
      badge: formData.badge,
      transferTime: formData.transferTime,
      inStock: formData.inStock
    })
    setIsEditModalOpen(false)
    setEditingProduct(null)
    resetForm()
    toast.success("Product updated successfully")
  }

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return

    setIsDeleteDialogOpen(false)
    setDeleteProductId(null)

    const result = await deleteProduct(deleteProductId)
    if (result?.ok) {
      toast.success("Product deleted successfully")
    } else {
      toast.error(result?.message || "Failed to delete product")
    }
  }

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return

    const rowIds = [...selectedRows]
    setSelectedRows([])

    const results = await Promise.all(rowIds.map(id => deleteProduct(id)))
    const successCount = results.filter(r => r?.ok).length
    const failureCount = results.length - successCount

    if (successCount > 0) {
      toast.success(`${successCount} product${successCount === 1 ? "" : "s"} deleted`)
    }
    if (failureCount > 0) {
      toast.error(`${failureCount} product${failureCount === 1 ? "" : "s"} failed to delete`)
    }
  }

  const handleBulkToggleStock = () => {
    selectedRows.forEach(id => toggleProductStock(id))
    setSelectedRows([])
    toast.success("Stock status updated")
  }

  const handleToggleStock = (productId: string) => {
    toggleProductStock(productId)
    toast.success("Stock status updated")
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      id: product.id,
      platform: product.platform,
      type: product.type,
      followers: product.followers,
      price: product.price,
      verificationEnabled: (product.verificationPrice ?? 0) > 0,
      verificationPrice: (product.verificationPrice ?? 0) > 0 ? product.verificationPrice ?? 0 : 30,
      description: product.description,
      features: product.features.join("\n"),
      badge: product.badge ?? "",
      transferTime: product.transferTime,
      inStock: product.inStock
    })
    setIsEditModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      id: "",
      platform: "TikTok",
      type: "",
      followers: "",
      price: 0,
      verificationEnabled: false,
      verificationPrice: 0,
      description: "",
      features: "",
      badge: "",
      transferTime: "24-48 hours",
      inStock: true
    })
  }

  const columns: Column<Product>[] = [
    { key: "id", label: "ID", sortable: true },
  {
  key: "platform",
  label: "Platform",
  sortable: true,
  render: (product) => (
  <Badge className={product.platform === "TikTok" ? "bg-pink-600 text-white" : "bg-red-600 text-white"}>
  {product.platform}
  </Badge>
  )
  },
    { key: "type", label: "Type", sortable: true },
    { key: "followers", label: "Followers", sortable: true },
    {
      key: "price",
      label: "Price",
      sortable: true,
      render: (product) => <span className="font-medium">${product.price}</span>
    },
    {
      key: "verificationPrice",
      label: "Verification",
      sortable: true,
      render: (product) => (product.verificationPrice ?? 0) > 0 ? `$${product.verificationPrice}` : "-"
    },
    {
      key: "inStock",
      label: "Status",
      sortable: true,
      render: (product) => (
        <Badge className={product.inStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
          {product.inStock ? "In Stock" : "Out of Stock"}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (product) => (
        <div className="flex items-center gap-2">
          <Switch checked={product.inStock} onCheckedChange={() => handleToggleStock(product.id)} />
          <Button variant="ghost" size="icon" onClick={() => openEditModal(product)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-600 hover:text-red-700"
            onClick={() => {
              setDeleteProductId(product.id)
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
            <BreadcrumbLink href="/admin" className="text-[8px] sm:text-xs text-white">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-[8px] sm:text-xs text-white">Products</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-1.5 sm:gap-2 md:flex-row md:items-center md:justify-between mb-2 sm:mb-3">
        <div>
          <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: '#FE2C55' }}>Products</h1>
          <p className="text-[9px] sm:text-xs text-white">Manage inventory</p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90 text-white text-[10px] sm:text-xs py-1.5 px-2 sm:px-3 h-auto">
              <Plus className="mr-0.5 sm:mr-1 h-3 w-3 sm:h-3 sm:w-3" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>Add a new account to your inventory</DialogDescription>
            </DialogHeader>
            <ProductForm formData={formData} setFormData={setFormData} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
              <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90" onClick={handleAddProduct}>
                Add Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="mb-3">
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[110px] h-7 sm:h-8 text-[10px] sm:text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {validTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-full sm:w-[110px] h-7 sm:h-8 text-[10px] sm:text-xs">
                <SelectValue placeholder="All Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="inStock">In Stock</SelectItem>
                <SelectItem value="outOfStock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-muted rounded text-xs">
          <span className="font-medium text-[10px]">{selectedRows.length} selected</span>
          <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={handleBulkToggleStock}>
            Toggle
          </Button>
          <Button variant="destructive" size="sm" className="h-7 text-[10px] px-2" onClick={handleBulkDelete}>
            <Trash2 className="mr-1 h-2.5 w-2.5" />
            Delete
          </Button>
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader className="py-2 px-2 sm:py-3 sm:px-4">
          <CardTitle className="flex items-center gap-1 text-sm">
            <Package className="h-4 w-4" />
            Products ({filteredProducts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredProducts}
            columns={columns}
            selectable
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            emptyMessage="No products found"
            emptyIcon={<Package className="h-12 w-12" />}
          />
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product details</DialogDescription>
          </DialogHeader>
          <ProductForm formData={formData} setFormData={setFormData} isEdit />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90" onClick={handleEditProduct}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteProduct}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface ProductFormProps {
  formData: {
    id: string
    platform: "TikTok" | "YouTube"
    type: string
    followers: string
    price: number
    verificationEnabled: boolean
    verificationPrice: number
    description: string
    features: string
    badge: string
    transferTime: string
    inStock: boolean
  }
  setFormData: React.Dispatch<React.SetStateAction<ProductFormProps["formData"]>>
  isEdit?: boolean
}

function ProductForm({ formData, setFormData, isEdit }: ProductFormProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="id">Product ID *</Label>
          <Input
            id="id"
            value={formData.id}
            onChange={(e) => setFormData({ ...formData, id: e.target.value })}
            placeholder="e.g., us-tts-25k"
            disabled={isEdit}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="platform">Platform *</Label>
          <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: v as "TikTok" | "YouTube" })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TikTok">TikTok</SelectItem>
              <SelectItem value="YouTube">YouTube</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="type">Type *</Label>
          <Input
            id="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            placeholder="e.g., US TikTok Shop"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="followers">Followers</Label>
          <Input
            id="followers"
            value={formData.followers}
            onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
            placeholder="e.g., 25K+"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="price">Price ($) *</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="verificationEnabled">Verification Fee</Label>
            <Checkbox
              id="verificationEnabled"
              checked={formData.verificationEnabled}
              onCheckedChange={(checked) => {
                const enabled = Boolean(checked)
                setFormData({
                  ...formData,
                  verificationEnabled: enabled,
                  verificationPrice: enabled ? (formData.verificationPrice > 0 ? formData.verificationPrice : 30) : 0
                })
              }}
            />
          </div>
          <Input
            id="verificationPrice"
            type="number"
            min="0"
            value={formData.verificationPrice}
            disabled={!formData.verificationEnabled}
            onChange={(e) => {
              const value = Number(e.target.value)
              setFormData({
                ...formData,
                verificationEnabled: value > 0,
                verificationPrice: value
              })
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Product description..."
          rows={2}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="features">Features (one per line)</Label>
        <Textarea
          id="features"
          value={formData.features}
          onChange={(e) => setFormData({ ...formData, features: e.target.value })}
          placeholder="TikTok Shop enabled&#10;US region account&#10;Original email included"
          rows={4}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="badge">Badge (optional)</Label>
          <Input
            id="badge"
            value={formData.badge}
            onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
            placeholder="e.g., Popular, Best Value"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="transferTime">Transfer Time</Label>
          <Input
            id="transferTime"
            value={formData.transferTime}
            onChange={(e) => setFormData({ ...formData, transferTime: e.target.value })}
            placeholder="e.g., 24-48 hours"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="inStock"
          checked={formData.inStock}
          onCheckedChange={(checked) => setFormData({ ...formData, inStock: checked })}
        />
        <Label htmlFor="inStock">In Stock</Label>
      </div>
    </div>
  )
}
