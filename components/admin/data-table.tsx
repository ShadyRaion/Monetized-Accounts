"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  selectable?: boolean
  selectedRows?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  idKey?: keyof T
  isLoading?: boolean
  emptyMessage?: string
  emptyIcon?: React.ReactNode
}

export function DataTable<T extends object>({
  data,
  columns,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  idKey = "id" as keyof T,
  isLoading = false,
  emptyMessage = "No data found",
  emptyIcon
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const sortedData = useMemo(() => {
    if (!sortConfig) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T]
      const bValue = b[sortConfig.key as keyof T]

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortConfig.direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue
      }

      return 0
    })
  }, [data, sortConfig])

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, currentPage, pageSize])

  const totalPages = Math.ceil(data.length / pageSize)

  const handleSort = (key: string) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        if (current.direction === "asc") {
          return { key, direction: "desc" }
        }
        return null
      }
      return { key, direction: "asc" }
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = paginatedData.map((item) => String(item[idKey]))
      onSelectionChange?.(allIds)
    } else {
      onSelectionChange?.([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange?.([...selectedRows, id])
    } else {
      onSelectionChange?.(selectedRows.filter((rowId) => rowId !== id))
    }
  }

  const allSelected = paginatedData.length > 0 && paginatedData.every((item) =>
    selectedRows.includes(String(item[idKey]))
  )

  const someSelected = paginatedData.some((item) =>
    selectedRows.includes(String(item[idKey]))
  ) && !allSelected

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="rounded-md sm:border">
          <Table>
            <TableHeader>
              <TableRow className="sm:border-b border-b">
                {selectable && <TableHead className="w-12"><Skeleton className="h-4 w-4" /></TableHead>}
                {columns.map((col) => (
                  <TableHead key={col.key}><Skeleton className="h-4 w-24" /></TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="sm:border-b border-b">
                  {selectable && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                  {columns.map((col) => (
                    <TableCell key={col.key}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="w-full rounded-md sm:border">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          {emptyIcon && <div className="mb-4 text-muted-foreground">{emptyIcon}</div>}
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="rounded-md sm:border sm:rounded-md">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="sm:border-b border-b">
                {selectable && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el) {
                          (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected
                        }
                      }}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
              {columns.map((column) => (
                <TableHead key={column.key} className="py-1 px-1 sm:px-2 text-[9px]">
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        className="h-6 px-1 -ml-2 font-medium text-[9px]"
                        onClick={() => handleSort(column.key)}
                      >
                        {column.label}
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="ml-1 h-3 w-3" />
                          ) : (
                            <ArrowDown className="ml-1 h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                        )}
                      </Button>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, idx) => {
                const itemId = String(item[idKey])
                return (
                  <TableRow key={itemId} className="sm:border-b border-b" data-state={selectedRows.includes(itemId) ? "selected" : undefined}>
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.includes(itemId)}
                          onCheckedChange={(checked) => handleSelectRow(itemId, checked as boolean)}
                          aria-label={`Select row ${itemId}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.key} className="py-1 px-1 sm:px-2 text-[10px]">
                        {column.render
                          ? column.render(item)
                          : String(item[column.key as keyof T] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between py-2 gap-2 text-xs">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="hidden sm:inline text-[9px]">Rows:</span>
          <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1) }}>
            <SelectTrigger className="w-20 h-7 text-[9px]">
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[9px] hidden sm:inline">
            {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, data.length)} of {data.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <span className="px-1.5 text-[9px] whitespace-nowrap">
            {currentPage}/{totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
