"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatINR, formatDateDDMMYYYY } from "@/lib/utils"
import { PurchaseEntry, Item, Vendor } from "@/lib/mockData"
import {
  Trash2,
  AlertTriangle,
  Calendar,
  Package,
  Factory,
  ShieldAlert,
  RotateCcw,
} from "lucide-react"

export type BulkDateFilterMode = "ALL" | "SINGLE_DATE" | "MONTH" | "DATE_RANGE" | "FY"

interface BulkDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  purchases: PurchaseEntry[]
  availableItems: Item[]
  availableVendors: Vendor[]
  availableFYs: string[]
  onDeletePurchases: (idsToDelete: string[]) => void
}

export function BulkDeleteModal({
  isOpen,
  onClose,
  purchases,
  availableFYs,
  onDeletePurchases,
}: BulkDeleteModalProps) {
  // Criteria filter states
  const [selectedVendor, setSelectedVendor] = useState<string>("ALL")
  const [selectedItem, setSelectedItem] = useState<string>("ALL")
  const [dateFilterMode, setDateFilterMode] = useState<BulkDateFilterMode>("ALL")
  const [singleDate, setSingleDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")
  const [selectedFY, setSelectedFY] = useState<string>("ALL")

  // Safety confirmation dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Extract unique items, vendors, and months present in current purchases
  const uniqueVendorsInLedger = useMemo(() => {
    const set = new Set<string>()
    purchases.forEach((p) => {
      if (p.vendorName?.trim()) set.add(p.vendorName.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [purchases])

  const uniqueItemsInLedger = useMemo(() => {
    const set = new Set<string>()
    purchases.forEach((p) => {
      if (p.itemName?.trim()) set.add(p.itemName.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [purchases])

  const uniqueMonthsInLedger = useMemo(() => {
    const set = new Set<string>()
    purchases.forEach((p) => {
      if (p.monthGroup?.trim()) set.add(p.monthGroup.trim())
    })
    return Array.from(set)
  }, [purchases])

  // Helper to determine financial year of a date
  const getFY = (dateStr: string) => {
    if (!dateStr) return "FY 2025-26"
    const parts = dateStr.split("-")
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    if (isNaN(year) || isNaN(month)) return "FY 2025-26"
    return month >= 4 ? `FY ${year}-${(year + 1).toString().slice(-2)}` : `FY ${year - 1}-${year.toString().slice(-2)}`
  }

  // Calculate matching entries based on criteria
  const matchingEntries = useMemo(() => {
    return purchases.filter((p) => {
      // 1. Vendor filter
      if (selectedVendor !== "ALL" && p.vendorName.trim().toLowerCase() !== selectedVendor.trim().toLowerCase()) {
        return false
      }

      // 2. Item filter
      if (selectedItem !== "ALL" && p.itemName.trim().toLowerCase() !== selectedItem.trim().toLowerCase()) {
        return false
      }

      // 3. Date / Month / Range / FY filter
      if (dateFilterMode === "SINGLE_DATE") {
        if (p.purchaseDate !== singleDate) return false
      } else if (dateFilterMode === "MONTH") {
        if (selectedMonth !== "ALL" && p.monthGroup !== selectedMonth) return false
      } else if (dateFilterMode === "DATE_RANGE") {
        if (customStartDate && p.purchaseDate < customStartDate) return false
        if (customEndDate && p.purchaseDate > customEndDate) return false
      } else if (dateFilterMode === "FY") {
        if (selectedFY !== "ALL" && getFY(p.purchaseDate) !== selectedFY) return false
      }

      return true
    })
  }, [
    purchases,
    selectedVendor,
    selectedItem,
    dateFilterMode,
    singleDate,
    selectedMonth,
    customStartDate,
    customEndDate,
    selectedFY,
  ])

  const totalMatchingAmount = useMemo(() => {
    return matchingEntries.reduce((sum, p) => sum + (p.total || 0), 0)
  }, [matchingEntries])

  // Check if at least one specific filter is applied (to prevent accidental total ledger deletion)
  const isAnyFilterActive = useMemo(() => {
    return (
      selectedVendor !== "ALL" ||
      selectedItem !== "ALL" ||
      dateFilterMode !== "ALL"
    )
  }, [selectedVendor, selectedItem, dateFilterMode])

  const handleResetCriteria = () => {
    setSelectedVendor("ALL")
    setSelectedItem("ALL")
    setDateFilterMode("ALL")
    setSingleDate(new Date().toISOString().split("T")[0])
    setSelectedMonth(uniqueMonthsInLedger[0] || "ALL")
    setCustomStartDate("")
    setCustomEndDate("")
    setSelectedFY("ALL")
  }

  const handleExecuteDelete = () => {
    const ids = matchingEntries.map((p) => p.id)
    if (ids.length === 0) return
    onDeletePurchases(ids)
    setIsConfirmOpen(false)
    onClose()
  }

  const getDateSummaryText = () => {
    if (dateFilterMode === "SINGLE_DATE") return `Date: ${formatDateDDMMYYYY(singleDate)}`
    if (dateFilterMode === "MONTH") return `Month: ${selectedMonth}`
    if (dateFilterMode === "DATE_RANGE") {
      const from = customStartDate ? formatDateDDMMYYYY(customStartDate) : "Beginning"
      const to = customEndDate ? formatDateDDMMYYYY(customEndDate) : "Latest"
      return `Date Range: ${from} to ${to}`
    }
    if (dateFilterMode === "FY") return `Financial Year: ${selectedFY}`
    return "All Dates"
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base text-destructive">
                <Trash2 className="h-5 w-5 text-destructive" />
                Bulk Delete / Mass Cleanup Tool
              </DialogTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetCriteria}
                className="text-xs h-8 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Criteria
              </Button>
            </div>
            <DialogDescription className="text-xs">
              Filter by Vendor, Item, Date, Month, or Range to delete incorrect entries or accidental uploads in bulk.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Multi-Criteria Selection Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-3.5 rounded-xl border border-border bg-muted/20">
              {/* 1. Filter by Vendor */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Factory className="h-3.5 w-3.5 text-muted-foreground" /> Filter by Vendor
                </Label>
                <Select value={selectedVendor} onValueChange={(val) => val && setSelectedVendor(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Vendors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Vendors ({uniqueVendorsInLedger.length})</SelectItem>
                    {uniqueVendorsInLedger.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v} ({purchases.filter((p) => p.vendorName === v).length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Filter by Item */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-muted-foreground" /> Filter by Item
                </Label>
                <Select value={selectedItem} onValueChange={(val) => val && setSelectedItem(val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="All Items" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Items ({uniqueItemsInLedger.length})</SelectItem>
                    {uniqueItemsInLedger.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i} ({purchases.filter((p) => p.itemName === i).length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Date Mode Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Date Criteria
                </Label>
                <Select value={dateFilterMode} onValueChange={(val) => val && setDateFilterMode(val as BulkDateFilterMode)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Dates (No date filter)</SelectItem>
                    <SelectItem value="SINGLE_DATE">Specific Single Date</SelectItem>
                    <SelectItem value="MONTH">Specific Month (e.g. March 2026)</SelectItem>
                    <SelectItem value="DATE_RANGE">Custom Date Range (From - To)</SelectItem>
                    <SelectItem value="FY">Financial Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sub-inputs depending on dateFilterMode */}
              {dateFilterMode === "SINGLE_DATE" && (
                <div className="sm:col-span-3 space-y-1.5 p-2.5 rounded-lg border border-border bg-card">
                  <Label className="text-xs font-semibold">Select Target Date to Delete</Label>
                  <Input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="h-8 text-xs max-w-xs"
                  />
                </div>
              )}

              {dateFilterMode === "MONTH" && (
                <div className="sm:col-span-3 space-y-1.5 p-2.5 rounded-lg border border-border bg-card">
                  <Label className="text-xs font-semibold">Select Month Group to Delete</Label>
                  <Select value={selectedMonth} onValueChange={(val) => val && setSelectedMonth(val)}>
                    <SelectTrigger className="h-8 text-xs max-w-xs">
                      <SelectValue placeholder="Select month..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Recorded Months</SelectItem>
                      {uniqueMonthsInLedger.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m} ({purchases.filter((p) => p.monthGroup === m).length} entries)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {dateFilterMode === "DATE_RANGE" && (
                <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-lg border border-border bg-card">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">From Start Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">To End Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              )}

              {dateFilterMode === "FY" && (
                <div className="sm:col-span-3 space-y-1.5 p-2.5 rounded-lg border border-border bg-card">
                  <Label className="text-xs font-semibold">Select Financial Year</Label>
                  <Select value={selectedFY} onValueChange={(val) => val && setSelectedFY(val)}>
                    <SelectTrigger className="h-8 text-xs max-w-xs">
                      <SelectValue placeholder="All Financial Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Financial Years</SelectItem>
                      {availableFYs.map((fy) => (
                        <SelectItem key={fy} value={fy}>
                          {fy}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Live Matching Summary Banner */}
            <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              matchingEntries.length > 0
                ? "bg-destructive/10 border-destructive/30 text-destructive"
                : "bg-muted/40 border-border text-muted-foreground"
            }`}>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wide">
                    {matchingEntries.length} Entries Match Selected Criteria
                  </span>
                </div>
                <p className="text-[11px] opacity-90 pl-6">
                  {matchingEntries.length > 0
                    ? `Total value to be removed: ${formatINR(totalMatchingAmount)} (${getDateSummaryText()})`
                    : "No purchases match the selected filters. Adjust your criteria above."}
                </p>
              </div>

              {matchingEntries.length > 0 && (
                <Badge variant="destructive" className="self-start sm:self-auto text-xs px-2.5 py-1 font-semibold shrink-0">
                  Total: {formatINR(totalMatchingAmount)}
                </Badge>
              )}
            </div>

            {/* Scrollable Preview Table of Matching Records */}
            {matchingEntries.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">
                  Preview of entries that will be permanently removed ({matchingEntries.length}):
                </p>
                <div className="border border-border rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-table-header sticky top-0 z-10">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-semibold text-left">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-left">Vendor Name</TableHead>
                        <TableHead className="text-xs font-semibold text-left">Item Name</TableHead>
                        <TableHead className="text-xs font-semibold text-left">Quantity</TableHead>
                        <TableHead className="text-xs font-semibold text-left">Unit</TableHead>
                        <TableHead className="text-xs font-semibold text-left">Rate (₹)</TableHead>
                        <TableHead className="text-xs font-semibold text-left">Total (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matchingEntries.slice(0, 50).map((row) => (
                        <TableRow key={row.id} className="hover:bg-destructive/5 text-xs">
                          <TableCell className="font-medium text-left">
                            {formatDateDDMMYYYY(row.purchaseDate)}
                          </TableCell>
                          <TableCell className="font-semibold text-foreground text-left">
                            {row.vendorName}
                          </TableCell>
                          <TableCell className="font-bold text-foreground text-left">
                            {row.itemName}
                          </TableCell>
                          <TableCell className="text-left">{row.quantity}</TableCell>
                          <TableCell className="text-muted-foreground text-left">{row.unit}</TableCell>
                          <TableCell className="text-muted-foreground text-left">{formatINR(row.rate)}</TableCell>
                          <TableCell className="font-bold text-destructive text-left">{formatINR(row.total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {matchingEntries.length > 50 && (
                  <p className="text-[11px] text-muted-foreground text-center pt-1">
                    Showing first 50 of {matchingEntries.length} matching rows. All {matchingEntries.length} entries will be deleted upon confirmation.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border mt-3">
            <span className="text-xs text-muted-foreground">
              {!isAnyFilterActive && (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Note: Select at least one specific criteria (Vendor, Item, or Date) to delete.
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={matchingEntries.length === 0}
                onClick={() => setIsConfirmOpen(true)}
                className="font-semibold shadow-xs"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete {matchingEntries.length} {matchingEntries.length === 1 ? "Entry" : "Entries"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CRITICAL: Permanent Deletion Safety Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md border-destructive/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Confirm Permanent Deletion
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action cannot be undone. Please confirm the criteria before proceeding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30 space-y-2">
              <p className="font-bold text-destructive text-sm">
                Are you sure you want to permanently delete {matchingEntries.length} purchase {matchingEntries.length === 1 ? "entry" : "entries"}?
              </p>
              <div className="text-xs space-y-1 text-foreground/90 pt-1 border-t border-destructive/20">
                <p>• <strong>Total Amount to Remove:</strong> <span className="font-bold text-destructive">{formatINR(totalMatchingAmount)}</span></p>
                <p>• <strong>Target Vendor:</strong> {selectedVendor === "ALL" ? "All Vendors" : selectedVendor}</p>
                <p>• <strong>Target Item:</strong> {selectedItem === "ALL" ? "All Items" : selectedItem}</p>
                <p>• <strong>Date Filter:</strong> {getDateSummaryText()}</p>
              </div>
            </div>

            <p className="text-muted-foreground text-[11px]">
              Clicking <strong>&ldquo;Permanently Delete&rdquo;</strong> will remove all {matchingEntries.length} matching rows from your active ledger, localStorage, and database immediately.
            </p>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setIsConfirmOpen(false)}>
              Cancel & Go Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleExecuteDelete}
              className="font-bold shadow-sm"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Permanently Delete ({matchingEntries.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
