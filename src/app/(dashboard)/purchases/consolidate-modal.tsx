"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatINR, formatDateDDMMYYYY } from "@/lib/utils"
import { PurchaseEntry } from "@/lib/mockData"
import {
  Merge,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react"

interface DuplicateGroup {
  key: string
  purchaseDate: string
  vendorName: string
  itemName: string
  entries: PurchaseEntry[]
  totalQty: number
  unit: string
  totalAmount: number
  weightedRate: number
}

interface ConsolidatePurchasesModalProps {
  isOpen: boolean
  onClose: () => void
  purchases: PurchaseEntry[]
  onConsolidate: (newPurchases: PurchaseEntry[], mergedGroupsCount: number, rowsSavedCount: number) => void
}

export function ConsolidatePurchasesModal({
  isOpen,
  onClose,
  purchases,
  onConsolidate,
}: ConsolidatePurchasesModalProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  // Scan purchases for same date + vendor + item multiples
  const { duplicateGroups, totalOriginalRows, totalSavedRows, totalConsolidatedAmount, totalConsolidatedQty } = useMemo(() => {
    const map = new Map<string, PurchaseEntry[]>()

    purchases.forEach((p) => {
      if (!p.purchaseDate || !p.itemName || !p.vendorName) return
      const key = `${p.purchaseDate}|${p.vendorName.trim().toLowerCase()}|${p.itemName.trim().toLowerCase()}`
      const list = map.get(key) || []
      list.push(p)
      map.set(key, list)
    })

    const groups: DuplicateGroup[] = []
    let originalRowsCount = 0
    let totalAmt = 0
    let totalQ = 0

    map.forEach((entries, key) => {
      if (entries.length > 1) {
        originalRowsCount += entries.length
        const first = entries[0]
        const totalQty = entries.reduce((sum, e) => sum + (e.quantity || 0), 0)
        const totalAmount = entries.reduce((sum, e) => sum + (e.total || 0), 0)
        const weightedRate = totalQty > 0 ? Math.round((totalAmount / totalQty) * 100) / 100 : first.rate || 0

        totalAmt += totalAmount
        totalQ += totalQty

        groups.push({
          key,
          purchaseDate: first.purchaseDate,
          vendorName: first.vendorName,
          itemName: first.itemName,
          entries,
          totalQty: Math.round(totalQty * 1000) / 1000,
          unit: first.unit || "Kg",
          totalAmount: Math.round(totalAmount * 100) / 100,
          weightedRate,
        })
      }
    })

    // Sort by date descending
    groups.sort((a, b) => (a.purchaseDate < b.purchaseDate ? 1 : -1))

    const saved = originalRowsCount - groups.length
    return {
      duplicateGroups: groups,
      totalOriginalRows: originalRowsCount,
      totalSavedRows: saved,
      totalConsolidatedAmount: totalAmt,
      totalConsolidatedQty: totalQ,
    }
  }, [purchases])

  const handleExecuteConsolidation = () => {
    if (duplicateGroups.length === 0) return

    // Group all purchases and merge duplicates
    const groupMap = new Map<string, PurchaseEntry[]>()
    purchases.forEach((p) => {
      const key = `${p.purchaseDate}|${p.vendorName.trim().toLowerCase()}|${p.itemName.trim().toLowerCase()}`
      const list = groupMap.get(key) || []
      list.push(p)
      groupMap.set(key, list)
    })

    const newPurchases: PurchaseEntry[] = []

    groupMap.forEach((entries) => {
      if (entries.length === 1) {
        newPurchases.push(entries[0])
      } else {
        const first = entries[0]
        const totalQty = entries.reduce((sum, e) => sum + (e.quantity || 0), 0)
        const totalAmount = entries.reduce((sum, e) => sum + (e.total || 0), 0)
        const weightedRate = totalQty > 0 ? Math.round((totalAmount / totalQty) * 100) / 100 : first.rate || 0
        const qtyBreakdown = entries.map((e) => `${e.quantity} ${e.unit}`).join(" + ")
        const existingNotes = entries
          .map((e) => e.remarks)
          .filter(Boolean)
          .join(" | ")

        const consolidationNote = `Merged ${entries.length} same-day entries (${qtyBreakdown})`
        const finalRemarks = existingNotes ? `${existingNotes} | ${consolidationNote}` : consolidationNote

        newPurchases.push({
          ...first,
          id: first.id, // Keep first entry's ID
          quantity: Math.round(totalQty * 1000) / 1000,
          total: Math.round(totalAmount * 100) / 100,
          rate: weightedRate,
          remarks: finalRemarks,
        })
      }
    })

    // Keep chronological order descending
    newPurchases.sort((a, b) => (a.purchaseDate < b.purchaseDate ? 1 : -1))

    setIsConfirming(false)
    onConsolidate(newPurchases, duplicateGroups.length, totalSavedRows)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col p-4 sm:p-5 overflow-hidden">
        <DialogHeader className="shrink-0 pb-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Merge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Merge Same-Day Deliveries (Consolidate Ledger)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Combine multiple purchases of the same item from the same vendor on the same date into clean daily totals. Total ₹ amounts and quantities are 100% preserved.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3.5 pr-1 py-1">
          {/* Analysis Metrics */}
          {duplicateGroups.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground font-semibold">Multiple Deliveries</span>
                <div className="text-base font-bold text-foreground mt-0.5">
                  {totalOriginalRows} rows
                </div>
                <p className="text-[10px] text-muted-foreground">across {duplicateGroups.length} dates</p>
              </div>

              <div className="bg-blue-500/10 p-2.5 rounded-lg border border-blue-500/30">
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">After Consolidating</span>
                <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {duplicateGroups.length} rows
                </div>
                <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80">1 clean row per day</p>
              </div>

              <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/30">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Rows Saved</span>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  -{totalSavedRows} rows
                </div>
                <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Ledger shrunk</p>
              </div>

              <div className="bg-saffron-container/20 p-2.5 rounded-lg border border-saffron/40">
                <span className="text-[11px] text-saffron font-bold">Consolidated Value</span>
                <div className="text-base font-bold text-saffron mt-0.5">
                  {formatINR(totalConsolidatedAmount)}
                </div>
                <p className="text-[10px] text-muted-foreground">Exact ₹ match (Zero loss)</p>
              </div>
            </div>
          ) : (
            <div className="p-8 border border-border rounded-xl text-center space-y-2 bg-muted/20">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Ledger is Already Fully Consolidated!</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No multiple entries found on the same date for the same vendor and item. Every delivery is already neat and singular.
              </p>
            </div>
          )}

          {/* Zero Data Loss Guarantee Banner */}
          {duplicateGroups.length > 0 && (
            <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200 text-xs flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Zero Data Loss Guarantee</p>
                <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                  Combining intra-day entries sums the quantities and total amounts exactly. All original delivery quantities ({duplicateGroups.slice(0, 3).map((g) => `${g.entries.length} items`).join(", ")}...) are noted in the remarks field for complete audit clarity.
                </p>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {duplicateGroups.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">
                  Preview: Entries to be Consolidated ({duplicateGroups.length} groups)
                </span>
                <Badge variant="outline" className="text-[10px]">
                  Showing {Math.min(duplicateGroups.length, 50)} of {duplicateGroups.length}
                </Badge>
              </div>

              <div className="border border-border rounded-lg overflow-hidden max-h-56 sm:max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-table-header sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-left">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Vendor Name</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Item Name</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Entries</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Deliveries Breakdown</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Merged Qty</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Rate (₹)</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Total Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {duplicateGroups.slice(0, 50).map((group) => (
                      <TableRow key={group.key} className="hover:bg-muted/40">
                        <TableCell className="text-xs font-medium text-left whitespace-nowrap">
                          {formatDateDDMMYYYY(group.purchaseDate)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground text-left">
                          {group.vendorName}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground text-left">
                          {group.itemName}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/40 bg-blue-500/10">
                            {group.entries.length} Deliveries
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[11px] text-muted-foreground text-left font-mono">
                          {group.entries.map((e) => `${e.quantity} ${e.unit}`).join(" + ")}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground text-left">
                          {group.totalQty} {group.unit}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-left">
                          {formatINR(group.weightedRate)}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-saffron text-left">
                          {formatINR(group.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Confirmation Warning if triggered */}
          {isConfirming && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-destructive">Confirm Ledger Consolidation</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  This will shrink <strong>{totalOriginalRows} entries</strong> into <strong>{duplicateGroups.length} clean daily rows</strong> across your ledger. Total ₹ amount remains 100% exact. Proceed?
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer: Always Visible */}
        <DialogFooter className="shrink-0 pt-2.5 border-t border-border mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card z-10">
          <div className="text-xs text-muted-foreground">
            {duplicateGroups.length > 0 ? (
              <span>
                Ready to shrink: <strong>{totalSavedRows} duplicate rows</strong> will be removed.
              </span>
            ) : (
              <span>No duplicate same-day records found.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="cursor-pointer">
              {duplicateGroups.length === 0 ? "Close" : "Cancel"}
            </Button>
            {duplicateGroups.length > 0 && (
              !isConfirming ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsConfirming(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 cursor-pointer"
                >
                  <Merge className="h-3.5 w-3.5" />
                  Consolidate ({totalSavedRows} Rows Saved)
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={handleExecuteConsolidation}
                  className="font-semibold gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Yes, Execute Consolidation
                </Button>
              )
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
