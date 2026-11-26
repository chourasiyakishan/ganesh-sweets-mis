"use client"

import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatINR, formatDateDDMMYYYY } from "@/lib/utils"
import { ExpenseEntry } from "@/lib/mockData"
import {
  Merge,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react"

interface DuplicateExpenseGroup {
  key: string
  expenseDate: string
  category: string
  payeeName: string
  entries: ExpenseEntry[]
  totalAmount: number
}

interface ConsolidateExpensesModalProps {
  isOpen: boolean
  onClose: () => void
  expenses: ExpenseEntry[]
  onConsolidate: (newExpenses: ExpenseEntry[], mergedGroupsCount: number, rowsSavedCount: number) => void
}

export function ConsolidateExpensesModal({
  isOpen,
  onClose,
  expenses,
  onConsolidate,
}: ConsolidateExpensesModalProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  // Scan expenses for same date + category + payeeName
  const { duplicateGroups, totalOriginalRows, totalSavedRows, totalConsolidatedAmount } = useMemo(() => {
    const map = new Map<string, ExpenseEntry[]>()

    expenses.forEach((e) => {
      if (!e.expenseDate || !e.category) return
      const key = `${e.expenseDate}|${e.category.trim().toLowerCase()}|${(e.payeeName || "").trim().toLowerCase()}`
      const list = map.get(key) || []
      list.push(e)
      map.set(key, list)
    })

    const groups: DuplicateExpenseGroup[] = []
    let originalRowsCount = 0
    let totalAmt = 0

    map.forEach((entries, key) => {
      if (entries.length > 1) {
        const first = entries[0]
        const groupAmount = entries.reduce((sum, e) => sum + (e.amount || 0), 0)

        groups.push({
          key,
          expenseDate: first.expenseDate,
          category: first.category,
          payeeName: first.payeeName || "General Payee",
          entries,
          totalAmount: Math.round(groupAmount * 100) / 100,
        })

        originalRowsCount += entries.length
        totalAmt += groupAmount
      }
    })

    // Sort by date descending
    groups.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate))

    const savedRows = originalRowsCount > 0 ? originalRowsCount - groups.length : 0

    return {
      duplicateGroups: groups,
      totalOriginalRows: originalRowsCount,
      totalSavedRows: savedRows,
      totalConsolidatedAmount: Math.round(totalAmt * 100) / 100,
    }
  }, [expenses])

  const handleApplyConsolidation = () => {
    if (duplicateGroups.length === 0) {
      onClose()
      return
    }

    const duplicateMap = new Map<string, DuplicateExpenseGroup>()
    duplicateGroups.forEach((g) => duplicateMap.set(g.key, g))

    const processedKeys = new Set<string>()
    const consolidatedList: ExpenseEntry[] = []

    expenses.forEach((e) => {
      const key = `${e.expenseDate}|${e.category.trim().toLowerCase()}|${(e.payeeName || "").trim().toLowerCase()}`
      const group = duplicateMap.get(key)

      if (!group) {
        consolidatedList.push(e)
      } else {
        if (!processedKeys.has(key)) {
          processedKeys.add(key)
          const first = group.entries[0]
          const existingNotes = group.entries
            .map((ent) => ent.remarks)
            .filter(Boolean)
            .join(" | ")

          const vouchersBreakdown = group.entries
            .map((ent) => `${ent.title || ent.category}: ${formatINR(ent.amount)}`)
            .join(" + ")

          const consolidationNote = `Merged ${group.entries.length} same-day entries (${vouchersBreakdown})`

          const mergedRemarks = existingNotes
            ? `${existingNotes} | ${consolidationNote}`
            : consolidationNote

          consolidatedList.push({
            ...first,
            id: `exp-cons-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            amount: group.totalAmount,
            title: first.title.includes("Merged") ? first.title : `${first.category} (Consolidated Daily Total)`,
            remarks: mergedRemarks,
          })
        }
      }
    })

    onConsolidate(consolidatedList, duplicateGroups.length, totalSavedRows)
    setIsConfirming(false)
    onClose()
  }

  const handleClose = () => {
    setIsConfirming(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col p-4 sm:p-5 overflow-hidden">
        <DialogHeader className="shrink-0 pb-1">
          <DialogTitle className="flex items-center gap-2 text-base text-foreground">
            <Merge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Consolidate Same-Day Expense Entries
          </DialogTitle>
          <DialogDescription className="text-xs">
            Merge multiple expense vouchers on the same date for the same category & payee into a single consolidated daily entry with 100% zero data loss.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3.5 pr-1 py-1">
          {duplicateGroups.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-muted/20 border border-border rounded-xl">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  Ledger is Completely Consolidated!
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  No multiple same-day entries found for any category and payee. Your expense ledger is clean and simplified.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Zero Data Loss Guarantee Banner */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-2.5">
                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-blue-950 dark:text-blue-100">
                    Zero Data Loss Guarantee
                  </p>
                  <p className="text-blue-800/90 dark:text-blue-300/80 mt-0.5 leading-relaxed">
                    Total amount paid remains <strong>100% exact to the paisa</strong>. The original individual bills and amounts are safely archived into the entry&apos;s remarks.
                  </p>
                </div>
              </div>

              {/* Metrics Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-card p-3 rounded-lg border border-border">
                  <span className="text-[11px] text-muted-foreground font-semibold">Multiple Batches</span>
                  <div className="text-base font-bold text-foreground mt-0.5">
                    {duplicateGroups.length} Batches
                  </div>
                </div>

                <div className="bg-card p-3 rounded-lg border border-border">
                  <span className="text-[11px] text-muted-foreground font-semibold">Original Rows</span>
                  <div className="text-base font-bold text-foreground mt-0.5">
                    {totalOriginalRows} Rows
                  </div>
                </div>

                <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Rows to be Saved</span>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    -{totalSavedRows} Rows
                  </div>
                </div>

                <div className="bg-saffron-container/30 p-3 rounded-lg border border-saffron/40">
                  <span className="text-[11px] text-saffron font-bold">Total Combined Amount</span>
                  <div className="text-base font-bold text-saffron mt-0.5">
                    {formatINR(totalConsolidatedAmount)}
                  </div>
                </div>
              </div>

              {/* Preview of Groups to be Consolidated */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    Preview: Groups to be Consolidated ({duplicateGroups.length})
                  </span>
                  <span className="text-muted-foreground font-normal text-[11px]">
                    {totalOriginalRows} entries → {duplicateGroups.length} single rows
                  </span>
                </div>

                <div className="border border-border rounded-lg overflow-hidden max-h-56 sm:max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-table-header sticky top-0 z-10">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs font-semibold text-left">Date</TableHead>
                        <TableHead className="text-xs font-semibold text-left">Category</TableHead>
                        <TableHead className="text-xs font-semibold text-left">Payee / Vendor</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Entries</TableHead>
                        <TableHead className="text-xs font-semibold text-left">Bills Breakdown</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Total Amount (₹)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duplicateGroups.map((group) => (
                        <TableRow key={group.key} className="hover:bg-muted/40">
                          <TableCell className="text-xs font-medium whitespace-nowrap text-left">
                            {formatDateDDMMYYYY(group.expenseDate)}
                          </TableCell>
                          <TableCell className="text-xs text-left">
                            <Badge variant="outline" className="text-[10px] bg-muted/50 border-border">
                              {group.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground text-left">
                            {group.payeeName}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-center">
                            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                              {group.entries.length} bills
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground text-left max-w-xs truncate" title={group.entries.map((e) => `${e.title}: ${formatINR(e.amount)}`).join(" + ")}>
                            {group.entries.map((e) => `${formatINR(e.amount)}`).join(" + ")}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-saffron text-right">
                            {formatINR(group.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Confirmation Step */}
              {isConfirming && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/40 rounded-lg flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-amber-900 dark:text-amber-200">
                      Confirm Consolidation?
                    </p>
                    <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                      This will shrink <strong>{totalOriginalRows} rows</strong> into <strong>{duplicateGroups.length} rows</strong> (saving {totalSavedRows} rows). The total monetary expense remains 100% exact to the paisa.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pinned Dialog Footer */}
        <DialogFooter className="shrink-0 pt-2.5 border-t border-border mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card z-10">
          <div className="text-xs text-muted-foreground">
            {duplicateGroups.length > 0 && (
              <span>
                {totalOriginalRows} entries will be condensed into {duplicateGroups.length} daily rows.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>

            {duplicateGroups.length > 0 && (
              !isConfirming ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsConfirming(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  <Merge className="h-3.5 w-3.5 mr-1.5" /> Consolidate {totalSavedRows} Rows
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyConsolidation}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Yes, Consolidate & Save to Ledger
                </Button>
              )
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
