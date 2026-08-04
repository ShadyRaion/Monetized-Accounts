"use client"

import { useState, useEffect } from "react"
import { useAdminAuth } from "@/lib/admin-auth-context"
import { useStoreData } from "@/lib/store-data-context"
import { useUserAuth } from "@/lib/user-auth-context"
import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiPath, authHeaders, apiFetch } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { DataTable, type Column } from "@/components/admin/data-table"
import type { Affiliate } from "@/lib/types"
import { UserPlus, Check, X, Eye, DollarSign, Users, TrendingUp } from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  suspended: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-800"
}

export default function AffiliatesPage() {
  const { user, isLoading } = useAdminAuth()
  const { affiliates, setAffiliates, updateAffiliateStatus, updateAffiliateCommissionRate } = useStoreData()
  const [activeTab, setActiveTab] = useState<string>("all")
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEditRateModalOpen, setIsEditRateModalOpen] = useState(false)
  const [newCommissionRate, setNewCommissionRate] = useState<number>(20)
  const [referralPurchases, setReferralPurchases] = useState<number>(0)

  // Sync selectedAffiliate with latest data from affiliates array
  useEffect(() => {
    if (selectedAffiliate) {
      const updatedAffiliate = affiliates.find(a => a.id === selectedAffiliate.id)
      if (updatedAffiliate) {
        setSelectedAffiliate(updatedAffiliate)
      }
    }
  }, [affiliates, selectedAffiliate?.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FE2C55]" />
      </div>
    )
  }

  const handleToggleAutoUpgrade = async (affiliateId: string) => {
    const affiliate = affiliates.find(a => a.id === affiliateId)
    if (!affiliate) return

    const newValue = !affiliate.commissionRateAutoUpgradeEnabled

    // Optimistically update local state
    const previousAffiliates = affiliates
    setAffiliates(prev => prev.map(a => a.id === affiliateId ? { ...a, commissionRateAutoUpgradeEnabled: newValue } : a))

    // Persist to backend
    try {
      const res = await apiFetch(apiPath(`/affiliate/${affiliateId}`), {
        method: "PUT",
        headers: authHeaders(undefined, true),
        body: JSON.stringify({ commissionRateAutoUpgradeEnabled: newValue })
      })
      if (!res.ok) {
        console.error("Failed to update affiliate auto-upgrade flag")
        setAffiliates(previousAffiliates)
      } else {
        const updatedAffiliate = await res.json().catch(() => null)
        if (updatedAffiliate) setAffiliates(prev => prev.map(a => a.id === affiliateId ? { ...a, ...updatedAffiliate } : a))
      }
    } catch (err) {
      console.error("Error updating affiliate auto-upgrade flag:", err)
      setAffiliates(previousAffiliates)
    }
  }

  if (!user) return null

  // Filter affiliates by tab
  const filteredAffiliates = affiliates.filter(affiliate => {
    if (activeTab === "all") return true
    return affiliate.status === activeTab
  })

  // Counts and stats
  const pendingCount = affiliates.filter(a => a.status === "pending").length
  const activeCount = affiliates.filter(a => a.status === "active").length
  const totalReferrals = affiliates.reduce((sum, a) => sum + (a.totalReferrals || 0), 0)
  const totalEarnings = affiliates.reduce((sum, a) => sum + (a.totalEarnings || 0), 0)
  const pendingPayouts = affiliates.reduce((sum, a) => {
    const payouts = a.payoutHistory || []
    return sum + payouts.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0)
  }, 0)

  const handleApprove = (affiliateId: string) => {
    updateAffiliateStatus(affiliateId, "active")
    toast.success("Affiliate approved - Referral code auto-generated")
  }

  const handleReject = async (affiliateId: string) => {
    await updateAffiliateStatus(affiliateId, "rejected")
    toast.success("Affiliate application rejected")
  }

  const handleToggleSuspend = async (affiliateId: string) => {
    const affiliate = affiliates.find(a => a.id === affiliateId)
    if (!affiliate) return

    const newStatus: "active" | "suspended" = affiliate.status === "suspended" ? "active" : "suspended"
    
    // Update local state
    const updated = affiliates.map(a => {
      if (a.id === affiliateId) {
        return { ...a, status: newStatus }
      }
      return a
    })
    setAffiliates(updated)
    
    // Sync to backend
    try {
      const res = await apiFetch(apiPath(`/affiliate/${affiliate.userId}`), {
        method: "PUT",
        headers: authHeaders(undefined, true),
        body: JSON.stringify({ status: newStatus })
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        console.error("Backend error response:", error, "Status:", res.status)
        throw new Error(error.message || `Failed to update affiliate status (${res.status})`)
      }
      
      toast.success(`Affiliate ${newStatus === "suspended" ? "suspended" : "activated"}`)
    } catch (error) {
      console.error("Error updating affiliate status:", error)
      toast.error(`Failed to update affiliate status: ${error instanceof Error ? error.message : String(error)}`)
      // Revert to previous state
      setAffiliates(affiliates)
    }
  }

  const handleUpdateCommissionRate = () => {
    if (!selectedAffiliate) return
    updateAffiliateCommissionRate(selectedAffiliate.id, newCommissionRate)
    setIsEditRateModalOpen(false)
    toast.success("Commission rate updated")
  }

  const handleMarkPaid = (affiliateId: string, payoutIndex: number) => {
    const updated = affiliates.map(a => {
      if (a.id === affiliateId) {
        const updatedPayouts = [...a.payoutHistory]
        updatedPayouts[payoutIndex] = { ...updatedPayouts[payoutIndex], status: "paid" }
        return { ...a, payoutHistory: updatedPayouts }
      }
      return a
    })
    setAffiliates(updated)
    toast.success("Payout marked as paid")
  }

  const viewAffiliateDetails = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate)
    setReferralPurchases(affiliate.totalReferralPurchases || 0)
    setIsDetailModalOpen(true)
  }

  const openEditRateModal = (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate)
    setNewCommissionRate(affiliate.commissionRate)
    setIsEditRateModalOpen(true)
  }

  const columns: Column<Affiliate>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    {
      key: "referralCode",
      label: "Referral Code",
      render: (affiliate) => (
        <code className="bg-muted px-2 py-1 rounded text-sm">{affiliate.referralCode}</code>
      )
    },
    {
      key: "totalReferrals",
      label: "Referrals",
      sortable: true,
      render: (affiliate) => <Badge variant="outline">{affiliate.totalReferrals}</Badge>
    },
    {
      key: "totalReferralPurchases",
      label: "Referral Purchases",
      sortable: true,
      render: (affiliate) => <Badge variant="secondary">{affiliate.totalReferralPurchases || 0}</Badge>
    },
    {
      key: "totalEarnings",
      label: "Earnings",
      sortable: true,
      render: (affiliate) => (
        <span className="font-medium text-green-600">${(Math.round(affiliate.totalEarnings * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      )
    },
    {
      key: "commissionRate",
      label: "Commission",
      sortable: true,
      render: (affiliate) => `${affiliate.commissionRate}%`
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (affiliate) => (
        <Badge className={statusColors[affiliate.status]}>
          {affiliate.status.charAt(0).toUpperCase() + affiliate.status.slice(1)}
        </Badge>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (affiliate) => (
        <div className="flex items-center gap-1">
          {affiliate.status === "pending" && (
            <>
              <Button variant="ghost" size="icon" onClick={() => handleApprove(affiliate.id)} className="text-green-600">
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleReject(affiliate.id)} className="text-red-600">
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => viewAffiliateDetails(affiliate)}>
            <Eye className="h-4 w-4" />
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
            <BreadcrumbPage className="text-[8px] sm:text-xs text-white">Affiliates</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-1.5 sm:gap-2 md:flex-row md:items-center md:justify-between mb-2 sm:mb-3">
        <div>
          <h1 className="text-sm sm:text-base lg:text-lg font-bold" style={{ color: '#FE2C55' }}>Affiliates</h1>
          <p className="text-[9px] sm:text-xs text-white">Manage your affiliate program</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-yellow-100 text-yellow-800 text-[9px] py-0.5 px-1.5">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-1 grid-cols-2 sm:gap-2 mb-2 sm:mb-3">
        <Card>
          <CardContent className="p-1 sm:p-2 flex items-center justify-center min-h-[45px] sm:min-h-[60px]">
            <div className="text-center">
              <p className="text-[9px] sm:text-xs text-muted-foreground">Active</p>
              <p className="text-base sm:text-lg font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-1 sm:p-2 flex items-center justify-center min-h-[45px] sm:min-h-[60px]">
            <div className="text-center">
              <p className="text-[9px] sm:text-xs text-muted-foreground">Referrals</p>
              <p className="text-base sm:text-lg font-bold">{totalReferrals}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-1 sm:p-2 flex items-center justify-center min-h-[45px] sm:min-h-[60px]">
            <div className="text-center">
              <p className="text-[9px] sm:text-xs text-muted-foreground">Paid Out</p>
              <p className="text-base sm:text-lg font-bold">${(totalEarnings/1000).toFixed(0)}k</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-1 sm:p-2 flex items-center justify-center min-h-[45px] sm:min-h-[60px]">
            <div className="text-center">
              <p className="text-[9px] sm:text-xs text-muted-foreground">Pending</p>
              <p className="text-base sm:text-lg font-bold">${(pendingPayouts/1000).toFixed(0)}k</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-2 sm:mb-3">
        <TabsList className="h-8 text-[9px] sm:text-xs w-full justify-start overflow-x-auto">
          <TabsTrigger value="all" className="text-[8px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap">All ({affiliates.length})</TabsTrigger>
          <TabsTrigger value="pending" className="text-[8px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="active" className="text-[8px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="suspended" className="text-[8px] sm:text-xs px-1.5 sm:px-2 whitespace-nowrap">Suspended</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Affiliates ({filteredAffiliates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredAffiliates}
            columns={columns}
            emptyMessage="No affiliates found"
            emptyIcon={<UserPlus className="h-12 w-12" />}
          />
        </CardContent>
      </Card>

      {/* Affiliate Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Affiliate Details</DialogTitle>
          </DialogHeader>
          {selectedAffiliate && (
            <div className="flex flex-col gap-6">
              {/* Basic Info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{selectedAffiliate.name}</p>
                  <p className="text-muted-foreground">{selectedAffiliate.email}</p>
                </div>
                <Badge className={statusColors[selectedAffiliate.status]}>
                  {selectedAffiliate.status}
                </Badge>
              </div>

              {/* Application Details */}
              <div className="border-t pt-4">
                <p className="font-semibold text-sm mb-2">Application Details</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Content Creator:</span>{" "}
                    <span className="font-medium">{selectedAffiliate.isContentCreator ? "Yes" : "No"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Platforms:</span>{" "}
                    {(selectedAffiliate.socialMediaPlatforms && selectedAffiliate.socialMediaPlatforms.length > 0) ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedAffiliate.socialMediaPlatforms.map((platform, idx) => (
                          <Badge key={idx} variant="secondary">{platform}</Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="font-medium">None selected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{selectedAffiliate.totalReferrals}</p>
                  <p className="text-sm text-muted-foreground">Referrals</p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{referralPurchases}</p>
                  <p className="text-sm text-muted-foreground">Purchases</p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">${(Math.round(selectedAffiliate.totalEarnings * 100) / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Earnings</p>
                </div>
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{selectedAffiliate.commissionRate}%</p>
                  <p className="text-sm text-muted-foreground">Commission</p>
                </div>
              </div>

              {/* Tier Info */}
              {selectedAffiliate.totalReferrals >= 10 && selectedAffiliate.commissionRate === 20 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">Tier Upgrade Available</p>
                    <p className="text-sm text-blue-700">This affiliate has 10+ referral purchases and qualifies for 25% commission tier. Update the commission rate in the settings below.</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEditRateModal(selectedAffiliate)}>
                    Edit Commission Rate
                  </Button>
                  {selectedAffiliate.status !== "pending" && (
                    <Button
                      variant={selectedAffiliate.status === "suspended" ? "default" : "destructive"}
                      onClick={() => handleToggleSuspend(selectedAffiliate.id)}
                    >
                      {selectedAffiliate.status === "suspended" ? "Activate" : "Suspend"}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="autoUpgrade"
                    checked={Boolean(selectedAffiliate?.commissionRateAutoUpgradeEnabled)}
                    onCheckedChange={() => selectedAffiliate && handleToggleAutoUpgrade(selectedAffiliate.id)}
                  />
                  <span className="text-sm">Auto-upgrade</span>
                </div>
              </div>

              {/* Referral History */}
              <div>
                <h3 className="font-semibold mb-2">Referral History</h3>
                {(!selectedAffiliate.referralHistory || selectedAffiliate.referralHistory.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No referrals yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Order Amount</TableHead>
                        <TableHead>Commission</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAffiliate.referralHistory.map((referral, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{referral.orderId}</TableCell>
                          <TableCell>{formatSafeDate(referral.date, "MMM d, yyyy")}</TableCell>
                          <TableCell>${referral.amount}</TableCell>
                          <TableCell className="text-green-600">${referral.commission}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Payout History */}
              <div>
                <h3 className="font-semibold mb-2">Payout History</h3>
                {(!selectedAffiliate.payoutHistory || selectedAffiliate.payoutHistory.length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No payouts yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedAffiliate.payoutHistory.map((payout, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{formatSafeDate(payout.date, "MMM d, yyyy")}</TableCell>
                          <TableCell>${payout.amount}</TableCell>
                          <TableCell>
                            <Badge className={payout.status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                              {payout.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payout.status === "pending" && (
                              <Button size="sm" onClick={() => handleMarkPaid(selectedAffiliate.id, idx)}>
                                Mark Paid
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Commission Rate Modal */}
      <Dialog open={isEditRateModalOpen} onOpenChange={setIsEditRateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Commission Rate</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Label htmlFor="commissionRate">Commission Rate (%)</Label>
            <Input
              id="commissionRate"
              type="number"
              min={0}
              max={100}
              value={newCommissionRate}
              onChange={(e) => setNewCommissionRate(Number(e.target.value))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditRateModalOpen(false)}>Cancel</Button>
            <Button className="bg-[#FE2C55] hover:bg-[#FE2C55]/90" onClick={handleUpdateCommissionRate}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
