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
import { ExpenseEntry, ExpenseCategory, initialExpenseCategories } from "@/lib/mockData"
import {
  Trash2,
  AlertTriangle,
  Calendar,
  Building,
  User,
  ShieldAlert,
  RotateCcw,
} from "lucide-react"

export type BulkExpenseDateFilterMode = "ALL" | "SINGLE_DATE" | "MONTH" | "DATE_RANGE" | "FY"

interface BulkDeleteExpensesModalProps {
  isOpen: boolean
  onClose: () => void
  expenses: ExpenseEntry[]
  availableFYs: string[]
  onDeleteExpenses: (idsToDelete: string[]) => void
}

export function BulkDeleteExpensesModal({
  isOpen,
  onClose,
  expenses,
  availableFYs,
  onDeleteExpenses,
}: BulkDeleteExpensesModalProps) {
  // Criteria filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [selectedPayee, setSelectedPayee] = useState<string>("ALL")
  const [dateFilterMode, setDateFilterMode] = useState<BulkExpenseDateFilterMode>("ALL")
  const [singleDate, setSingleDate] = useState<string>(() => new Date().toISOString().split("T")[0])
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")
  const [selectedFY, setSelectedFY] = useState<string>("ALL")

  // Safety confirmation dialog state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Extract unique payees and categories in current expenses
  const uniquePayeesInLedger = useMemo(() => {
    const set = new Set<string>()
    expenses.forEach((e) => {
      if (e.payeeName?.trim()) set.add(e.payeeName.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [expenses])

  const uniqueMonthsInLedger = useMemo(() => {
    const set = new Set<string>()
    expenses.forEach((e) => {
      if (e.expenseDate && e.expenseDate.length >= 7) {
        set.add(e.expenseDate.slice(0, 7)) // "YYYY-MM"
      }
    })
    return Array.from(set).sort().reverse()
  }, [expenses])

  // Reset criteria filters
  const handleResetFilters = () => {
    setSelectedCategory("ALL")
    setSelectedPayee("ALL")
    setDateFilterMode("ALL")
    setSingleDate(new Date().toISOString().split("T")[0])
    setSelectedMonth("ALL")
    setCustomStartDate("")
    setCustomEndDate("")
    setSelectedFY("ALL")
  }

  // Filter expenses matching the criteria
  const matchingExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedCategory !== "ALL" && e.category !== selectedCategory) {
        return false
      }

      if (selectedPayee !== "ALL") {
        if (!e.payeeName || e.payeeName.trim().toLowerCase() !== selectedPayee.trim().toLowerCase()) {
          return false
        }
      }

      if (selectedFY !== "ALL") {
        // Quick FY match
        if (e.expenseDate) {
          const parts = e.expenseDate.split("-")
          const y = parseInt(parts[0], 10)
          const m = parseInt(parts[1], 10)
          const fyStr = m <= 3 ? `FY ${y - 1}-${String(y).slice(-2)}` : `FY ${y}-${String(y + 1).slice(-2)}`
          if (fyStr !== selectedFY) return false
        }
      }

      if (dateFilterMode === "SINGLE_DATE") {
        if (e.expenseDate !== singleDate) return false
      } else if (dateFilterMode === "MONTH") {
        if (selectedMonth !== "ALL" && (!e.expenseDate || !e.expenseDate.startsWith(selectedMonth))) {
          return false
        }
      } else if (dateFilterMode === "DATE_RANGE") {
        if (customStartDate && e.expenseDate < customStartDate) return false
        if (customEndDate && e.expenseDate > customEndDate) return false
      }

      return true
    })
  }, [
    expenses,
    selectedCategory,
    selectedPayee,
    selectedFY,
    dateFilterMode,
    singleDate,
    selectedMonth,
    customStartDate,
    customEndDate,
  ])

  const totalMatchingAmount = useMemo(() => {
    return matchingExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  }, [matchingExpenses])

  const hasActiveCriteria =
    selectedCategory !== "ALL" ||
    selectedPayee !== "ALL" ||
    selectedFY !== "ALL" ||
    dateFilterMode !== "ALL"

  const handleExecuteDelete = () => {
    const idsToDelete = matchingExpenses.map((e) => e.id)
    onDeleteExpenses(idsToDelete)
    setIsConfirmOpen(false)
    handleResetFilters()
    onClose()
  }

  const handleClose = () => {
    setIsConfirmOpen(false)
    onClose()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-5 overflow-hidden">
          <DialogHeader className="shrink-0 pb-1">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base text-destructive">
                <Trash2 className="h-5 w-5" />
                Bulk Delete Expense Entries by Criteria
              </DialogTitle>
              {hasActiveCriteria && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Criteria
                </Button>
              )}
            </div>
            <DialogDescription className="text-xs">
              Select any criteria (category, payee, specific date, month, or custom date range) to delete matching entries in a single click.
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Criteria & Preview Body */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1 py-1">
            {/* Criteria Selection Cards */}
            <div className="bg-card p-3.5 rounded-xl border border-border space-y-3">
              <div className="text-xs font-bold text-foreground">Filter Deletion Criteria:</div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Category Filter */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-saffron" /> Filter by Category
                  </Label>
                  <Select value={selectedCategory} onValueChange={(val) => val && setSelectedCategory(val)}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Categories</SelectItem>
                      {initialExpenseCategories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 2. Payee / Vendor Filter */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-saffron" /> Filter by Payee
                  </Label>
                  <Select value={selectedPayee} onValueChange={(val) => val && setSelectedPayee(val)}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="All Payees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Payees ({uniquePayeesInLedger.length})</SelectItem>
                      {uniquePayeesInLedger.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Financial Year Filter */}
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-saffron" /> Financial Year
                  </Label>
                  <Select value={selectedFY} onValueChange={(val) => val && setSelectedFY(val)}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="All FYs" />
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
              </div>

              {/* Date Filtering Mode Options */}
              <div className="pt-2 border-t border-border/80 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-muted-foreground mr-1">Date Option:</span>
                  {(
                    [
                      { id: "ALL", label: "Any Date" },
                      { id: "SINGLE_DATE", label: "Specific Single Date" },
                      { id: "MONTH", label: "Specific Month" },
                      { id: "DATE_RANGE", label: "Custom Date Range" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDateFilterMode(opt.id)}
                      className={`text-xs px-2.5 py-1 rounded-md border font-medium cursor-pointer transition-colors ${
                        dateFilterMode === opt.id
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-background border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Sub-inputs depending on dateFilterMode */}
                {dateFilterMode === "SINGLE_DATE" && (
                  <div className="pt-2 flex items-center gap-3">
                    <div className="space-y-1 w-52">
                      <Label className="text-[11px] text-muted-foreground">Select Exact Date</Label>
                      <Input
                        type="date"
                        value={singleDate}
                        onChange={(e) => setSingleDate(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                )}

                {dateFilterMode === "MONTH" && (
                  <div className="pt-2 flex items-center gap-3">
                    <div className="space-y-1 w-60">
                      <Label className="text-[11px] text-muted-foreground">Select Month</Label>
                      <Select value={selectedMonth} onValueChange={(val) => val && setSelectedMonth(val)}>
                        <SelectTrigger className="w-full h-8 text-xs">
                          <SelectValue placeholder="All Months" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Available Months</SelectItem>
                          {uniqueMonthsInLedger.map((ym) => {
                            const [year, month] = ym.split("-")
                            const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1)
                            const label = d.toLocaleString("en-IN", { month: "long", year: "numeric" })
                            return (
                              <SelectItem key={ym} value={ym}>
                                {label}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {dateFilterMode === "DATE_RANGE" && (
                  <div className="pt-2 flex items-center gap-3 flex-wrap">
                    <div className="space-y-1 w-44">
                      <Label className="text-[11px] text-muted-foreground">From Date</Label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div className="space-y-1 w-44">
                      <Label className="text-[11px] text-muted-foreground">To Date</Label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Impact Live Metrics Card */}
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-destructive">
                    {matchingExpenses.length} Entries Match Selected Criteria
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Combined Impact: <strong>{formatINR(totalMatchingAmount)}</strong>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Remaining After Delete
                </span>
                <span className="text-xs font-bold text-foreground">
                  {expenses.length - matchingExpenses.length} entries
                </span>
              </div>
            </div>

            {/* Matching Entries Preview Table */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-foreground">
                Matching Entries Preview ({matchingExpenses.length}):
              </div>

              <div className="border border-border rounded-lg overflow-hidden max-h-56 sm:max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-table-header sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-left">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Category</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Title / Expense</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Payee</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchingExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs py-8 text-muted-foreground">
                          No expense entries match the selected criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      matchingExpenses.slice(0, 100).map((row) => (
                        <TableRow key={row.id} className="hover:bg-muted/40">
                          <TableCell className="text-xs font-medium text-left">
                            {formatDateDDMMYYYY(row.expenseDate)}
                          </TableCell>
                          <TableCell className="text-xs text-left">
                            <Badge variant="outline" className="text-[10px] bg-muted/50 border-border">
                              {row.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground text-left">
                            {row.title}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground text-left">
                            {row.payeeName}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-destructive text-right">
                            {formatINR(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Pinned Dialog Footer */}
          <DialogFooter className="shrink-0 pt-2.5 border-t border-border mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card z-10">
            <div className="text-xs text-muted-foreground">
              {matchingExpenses.length > 0 ? (
                <span>
                  Ready to delete <strong>{matchingExpenses.length}</strong> entries ({formatINR(totalMatchingAmount)}).
                </span>
              ) : (
                <span>No records selected for deletion.</span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={matchingExpenses.length === 0}
                onClick={() => setIsConfirmOpen(true)}
                className="font-semibold gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Matching ({matchingExpenses.length})
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Step Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Confirm Permanent Deletion
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to permanently delete these <strong>{matchingExpenses.length}</strong> expense entries? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Entries:</span>
              <span className="font-bold text-foreground">{matchingExpenses.length} rows</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Combined Amount:</span>
              <span className="font-bold text-destructive">{formatINR(totalMatchingAmount)}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleExecuteDelete}
              className="font-semibold gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Yes, Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
