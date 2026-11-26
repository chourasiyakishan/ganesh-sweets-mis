"use client"

import { useState, useRef, useMemo } from "react"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatINR, formatDateDDMMYYYY } from "@/lib/utils"
import { ExpenseEntry, ExpenseCategory, initialExpenseCategories } from "@/lib/mockData"
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Trash2,
  Merge,
  Plus,
  Ban,
} from "lucide-react"
import { toast } from "sonner"

export type ExpenseConflictAction = "new" | "merge" | "skip"

export interface ParsedExpenseRow {
  rowId: string
  isValid: boolean
  validationError?: string
  expenseDate: string // YYYY-MM-DD
  category: ExpenseCategory
  title: string
  payeeName: string
  amount: number
  paymentMode: "Cash" | "Bank Transfer / NEFT" | "UPI / GPay / PhonePe" | "Cheque"
  status: "PAID" | "PENDING"
  billInvoiceNo?: string
  remarks?: string
  // Duplicate / Match detection against existing expenses in ledger
  isDuplicate?: boolean
  duplicateReason?: string
  existingEntryId?: string
  existingAmount?: number
  action: ExpenseConflictAction
  // Same-day consolidation within the file
  isMergedIntraDay?: boolean
  mergedCount?: number
  mergedBreakdown?: string
}

interface ImportExpensesModalProps {
  isOpen: boolean
  onClose: () => void
  existingExpenses: ExpenseEntry[]
  onImport: (
    newEntries: ExpenseEntry[],
    mergedEntries: { existingId: string; additionalAmount: number; remarks?: string }[]
  ) => void
}

const MONTH_NAMES_MAP: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
}

function parseAnyDateToYYYYMMDD(raw: any): string | null {
  if (raw === null || raw === undefined) return null

  // 1. If it's already an Excel numeric serial number
  if (typeof raw === "number") {
    try {
      const parsed = XLSX.SSF.parse_date_code(raw)
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const y = String(parsed.y)
        const m = String(parsed.m).padStart(2, "0")
        const d = String(parsed.d).padStart(2, "0")
        return `${y}-${m}-${d}`
      }
    } catch {
      // ignore
    }
  }

  // 2. If it's a JS Date object
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, "0")
    const d = String(raw.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  let str = String(raw).trim()
  if (!str) return null

  // Handle potential time part
  if (str.includes("T")) str = str.split("T")[0].trim()
  if (str.includes(" ")) {
    const parts = str.split(/\s+/)
    if (parts.length > 1 && parts[0].includes("-") || parts[0].includes("/")) {
      str = parts[0]
    }
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, "0")
    const m = dmyMatch[2].padStart(2, "0")
    const y = dmyMatch[3]
    return `${y}-${m}-${d}`
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/)
  if (ymdMatch) {
    const y = ymdMatch[1]
    const m = ymdMatch[2].padStart(2, "0")
    const d = ymdMatch[3].padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  // Text month: 15-Mar-2026 or 15 March 2026
  const textMonthMatch = str.match(/^(\d{1,2})[-/ ]+([A-Za-z]+)[-/ ]+(\d{4})$/)
  if (textMonthMatch) {
    const d = textMonthMatch[1].padStart(2, "0")
    const monthKey = textMonthMatch[2].toLowerCase()
    const m = MONTH_NAMES_MAP[monthKey]
    const y = textMonthMatch[3]
    if (m) {
      return `${y}-${m}-${d}`
    }
  }

  const nativeParsed = new Date(str)
  if (!isNaN(nativeParsed.getTime())) {
    const y = nativeParsed.getFullYear()
    const m = String(nativeParsed.getMonth() + 1).padStart(2, "0")
    const d = String(nativeParsed.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  return null
}

export function ImportExpensesModal({
  isOpen,
  onClose,
  existingExpenses,
  onImport,
}: ImportExpensesModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedExpenseRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [consolidateSameDay, setConsolidateSameDay] = useState(true)

  const handleClose = () => {
    setSelectedFile(null)
    setParsedRows([])
    setIsProcessing(false)
    setIsDragging(false)
    setConsolidateSameDay(true)
    onClose()
  }

  const handleDownloadSample = () => {
    const sampleData = [
      {
        "Date (DD-MM-YYYY)": "01-04-2024",
        "Category": "Shop & Godown Rent",
        "Title / Expense Name": "Main Market Showroom Monthly Rent",
        "Payee / Vendor Name": "Ramesh Kumar Sharma",
        "Amount (₹)": 45000,
        "Payment Mode": "Bank Transfer / NEFT",
        "Status": "PAID",
        "Bill / Invoice No": "RENT-2024-04",
        "Notes": "Paid via NEFT for April 2024",
      },
      {
        "Date (DD-MM-YYYY)": "02-04-2024",
        "Category": "Electricity & Water Bills",
        "Title / Expense Name": "Factory 3-Phase Electricity Bill",
        "Payee / Vendor Name": "MPPKVVCL Discom",
        "Amount (₹)": 18450,
        "Payment Mode": "UPI / GPay / PhonePe",
        "Status": "PAID",
        "Bill / Invoice No": "EB-987123",
        "Notes": "April commercial connection bill",
      },
      {
        "Date (DD-MM-YYYY)": "04-04-2024",
        "Category": "LPG & Commercial Gas",
        "Title / Expense Name": "Commercial LPG 19kg Cylinders (5 units)",
        "Payee / Vendor Name": "Bharat Gas Agency",
        "Amount (₹)": 9100,
        "Payment Mode": "Cash",
        "Status": "PAID",
        "Bill / Invoice No": "INV-7721",
        "Notes": "5 cylinders delivery for sweet production",
      },
      {
        "Date (DD-MM-YYYY)": "04-04-2024",
        "Category": "LPG & Commercial Gas",
        "Title / Expense Name": "Evening Extra Commercial Cylinder (1 unit)",
        "Payee / Vendor Name": "Bharat Gas Agency",
        "Amount (₹)": 1820,
        "Payment Mode": "Cash",
        "Status": "PAID",
        "Bill / Invoice No": "INV-7729",
        "Notes": "Evening emergency cylinder for festival rush",
      },
      {
        "Date (DD-MM-YYYY)": "05-04-2024",
        "Category": "Packaging & Printing",
        "Title / Expense Name": "Custom Sweet Boxes 1kg & 500g",
        "Payee / Vendor Name": "National Packaging",
        "Amount (₹)": 32000,
        "Payment Mode": "Bank Transfer / NEFT",
        "Status": "PAID",
        "Bill / Invoice No": "NP-4431",
        "Notes": "Gold foil sweet gift boxes 2000 pcs",
      },
      {
        "Date (DD-MM-YYYY)": "07-04-2024",
        "Category": "Salaries & Wages",
        "Title / Expense Name": "Halwai & Production Staff Weekly Advance",
        "Payee / Vendor Name": "Staff Welfare Account",
        "Amount (₹)": 15000,
        "Payment Mode": "Cash",
        "Status": "PAID",
        "Bill / Invoice No": "",
        "Notes": "Production workers advance wages",
      },
    ]

    const ws = XLSX.utils.json_to_sheet(sampleData)
    ws["!cols"] = [
      { wch: 18 },
      { wch: 25 },
      { wch: 35 },
      { wch: 24 },
      { wch: 16 },
      { wch: 22 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sample_Expenses")
    XLSX.writeFile(wb, "ganesh_sweets_expenses_sample_template.xlsx")
    toast.success("Sample Excel template downloaded!")
  }

  const findMatchingExpense = (
    expenseDate: string,
    category: string,
    payeeName: string,
    title: string
  ): ExpenseEntry | undefined => {
    const cleanCat = category.trim().toLowerCase()
    const cleanPayee = payeeName.trim().toLowerCase()
    const cleanTitle = title.trim().toLowerCase()

    return existingExpenses.find((exp) => {
      if (exp.expenseDate !== expenseDate) return false
      const expCat = exp.category.trim().toLowerCase()
      const expPayee = (exp.payeeName || "").trim().toLowerCase()
      const expTitle = exp.title.trim().toLowerCase()

      // Same date + same category AND (same payee or same title)
      if (expCat === cleanCat) {
        if (cleanPayee && expPayee && cleanPayee === expPayee) return true
        if (cleanTitle && expTitle && cleanTitle === expTitle) return true
      }
      return false
    })
  }

  const processFile = async (file: File) => {
    setIsProcessing(true)
    setSelectedFile(file)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { cellDates: false })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        defval: "",
        raw: true,
      })

      if (rawJson.length === 0) {
        toast.error("The uploaded spreadsheet is empty")
        setIsProcessing(false)
        return
      }

      const rows: ParsedExpenseRow[] = []

      rawJson.forEach((raw, idx) => {
        let rawDate: any = ""
        let rawCat: any = ""
        let rawTitle: any = ""
        let rawPayee: any = ""
        let rawAmount: any = ""
        let rawPayMode: any = ""
        let rawStatus: any = ""
        let rawBillNo: any = ""
        let rawNotes: any = ""

        for (const [key, val] of Object.entries(raw)) {
          const k = key.trim().toLowerCase()
          if (k.includes("date")) rawDate = val
          else if (k.includes("category") || k.includes("head") || k.includes("type")) rawCat = val
          else if (k.includes("title") || k.includes("name") && !k.includes("vendor") && !k.includes("payee") || k.includes("description") || k.includes("particular")) rawTitle = val
          else if (k.includes("payee") || k.includes("vendor") || k.includes("supplier") || k.includes("person") || k.includes("to")) rawPayee = val
          else if (k.includes("amount") || k.includes("cost") || k.includes("total") || k.includes("price") || k.includes("rs") || k.includes("₹")) rawAmount = val
          else if (k.includes("mode") || k.includes("payment")) rawPayMode = val
          else if (k.includes("status")) rawStatus = val
          else if (k.includes("invoice") || k.includes("bill") || k.includes("voucher")) rawBillNo = val
          else if (k.includes("note") || k.includes("remark")) rawNotes = val
        }

        const dateStr = parseAnyDateToYYYYMMDD(rawDate)
        const payee = String(rawPayee || "").trim() || "General Payee"
        const title = String(rawTitle || "").trim() || (rawCat ? `${rawCat} Expense` : "Miscellaneous Expense")
        
        // Find best category match
        let category: ExpenseCategory = "Miscellaneous Expenses"
        const catStr = String(rawCat || "").trim().toLowerCase()
        if (catStr) {
          const match = initialExpenseCategories.find(
            (c) => c.toLowerCase() === catStr || c.toLowerCase().includes(catStr) || catStr.includes(c.toLowerCase())
          )
          if (match) category = match
        }

        let amount = 0
        if (typeof rawAmount === "number") amount = rawAmount
        else if (typeof rawAmount === "string") {
          const cleaned = rawAmount.replace(/[^0-9.-]+/g, "")
          amount = parseFloat(cleaned) || 0
        }

        let payMode: "Cash" | "Bank Transfer / NEFT" | "UPI / GPay / PhonePe" | "Cheque" = "Cash"
        const modeStr = String(rawPayMode || "").toLowerCase()
        if (modeStr.includes("upi") || modeStr.includes("gpay") || modeStr.includes("phonepe") || modeStr.includes("online")) {
          payMode = "UPI / GPay / PhonePe"
        } else if (modeStr.includes("neft") || modeStr.includes("bank") || modeStr.includes("rtgs") || modeStr.includes("transfer")) {
          payMode = "Bank Transfer / NEFT"
        } else if (modeStr.includes("cheque") || modeStr.includes("check")) {
          payMode = "Cheque"
        }

        let status: "PAID" | "PENDING" = "PAID"
        const statusStr = String(rawStatus || "").toLowerCase()
        if (statusStr.includes("pend") || statusStr.includes("due") || statusStr.includes("unpaid")) {
          status = "PENDING"
        }

        const billNo = String(rawBillNo || "").trim() || undefined
        const remarks = String(rawNotes || "").trim() || undefined

        let isValid = true
        let validationError = ""

        if (!dateStr) {
          isValid = false
          validationError = "Invalid or missing date"
        } else if (!amount || amount <= 0) {
          isValid = false
          validationError = "Invalid or zero amount"
        }

        let isDuplicate = false
        let duplicateReason = ""
        let existingEntryId: string | undefined
        let existingAmount: number | undefined
        let action: ExpenseConflictAction = "new"

        if (isValid && dateStr) {
          const existing = findMatchingExpense(dateStr, category, payee, title)
          if (existing) {
            isDuplicate = true
            existingEntryId = existing.id
            existingAmount = existing.amount
            duplicateReason = `Matches existing expense on ${formatDateDDMMYYYY(dateStr)} (${category} - ₹${existing.amount.toLocaleString("en-IN")})`
            action = "skip" // Default to skip so user doesn't double pay/double record
          }
        }

        rows.push({
          rowId: `exp-imp-${idx + 1}-${Date.now()}`,
          isValid,
          validationError,
          expenseDate: dateStr || "",
          category,
          title,
          payeeName: payee,
          amount,
          paymentMode: payMode,
          status,
          billInvoiceNo: billNo,
          remarks,
          isDuplicate,
          duplicateReason,
          existingEntryId,
          existingAmount,
          action,
        })
      })

      setParsedRows(rows)
      toast.success(`Read ${rows.length} rows from ${file.name}`)
    } catch (err: any) {
      console.error("Excel parse error:", err)
      toast.error("Failed to parse file: " + (err.message || "Unknown format"))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const handleBulkAction = (action: ExpenseConflictAction) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.isDuplicate && r.isValid ? { ...r, action } : r))
    )
  }

  const handleSetRowAction = (rowId: string, action: ExpenseConflictAction) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, action } : r))
    )
  }

  // Intra-file same-day duplicates analysis
  const intraDayDuplicateSummary = useMemo(() => {
    const map = new Map<string, ParsedExpenseRow[]>()
    parsedRows.forEach((r) => {
      if (!r.isValid || r.action !== "new") return
      const key = `${r.expenseDate}|${r.category.trim().toLowerCase()}|${r.payeeName.trim().toLowerCase()}`
      const list = map.get(key) || []
      list.push(r)
      map.set(key, list)
    })

    let duplicateGroups = 0
    let duplicateRowsCount = 0
    map.forEach((rows) => {
      if (rows.length > 1) {
        duplicateGroups++
        duplicateRowsCount += rows.length
      }
    })

    const rowsSaved = duplicateRowsCount > 0 ? duplicateRowsCount - duplicateGroups : 0
    return { duplicateGroups, duplicateRowsCount, rowsSaved }
  }, [parsedRows])

  // Effective rows after applying same-day consolidation if enabled
  const effectiveRows = useMemo<ParsedExpenseRow[]>(() => {
    if (!consolidateSameDay) return parsedRows

    const map = new Map<string, ParsedExpenseRow[]>()
    const otherRows: ParsedExpenseRow[] = []

    parsedRows.forEach((r) => {
      if (!r.isValid || r.action !== "new") {
        otherRows.push(r)
        return
      }
      const key = `${r.expenseDate}|${r.category.trim().toLowerCase()}|${r.payeeName.trim().toLowerCase()}`
      const list = map.get(key) || []
      list.push(r)
      map.set(key, list)
    })

    const consolidated: ParsedExpenseRow[] = []
    map.forEach((group) => {
      if (group.length === 1) {
        consolidated.push(group[0])
      } else {
        const first = group[0]
        const totalAmount = group.reduce((sum, g) => sum + g.amount, 0)
        const amtBreakdown = group.map((g) => formatINR(g.amount)).join(" + ")
        const existingNotes = group
          .map((g) => g.remarks)
          .filter(Boolean)
          .join(" | ")
        const consolidationNote = `Merged ${group.length} same-day expenses (${amtBreakdown})`

        consolidated.push({
          ...first,
          rowId: `merged-exp-${first.rowId}-${group.length}`,
          amount: Math.round(totalAmount * 100) / 100,
          remarks: existingNotes ? `${existingNotes} | ${consolidationNote}` : consolidationNote,
          isMergedIntraDay: true,
          mergedCount: group.length,
          mergedBreakdown: amtBreakdown,
        })
      }
    })

    return [...consolidated, ...otherRows]
  }, [parsedRows, consolidateSameDay])

  const handleConfirmImport = () => {
    const validRows = effectiveRows.filter((r) => r.isValid)
    if (validRows.length === 0) {
      toast.error("No valid entries found to import")
      return
    }

    const rowsToAdd = validRows.filter((r) => r.action === "new")
    const rowsToMerge = validRows.filter((r) => r.action === "merge" && r.existingEntryId)

    if (rowsToAdd.length === 0 && rowsToMerge.length === 0) {
      toast.info("All rows were skipped. No changes made.")
      handleClose()
      return
    }

    const newEntries: ExpenseEntry[] = rowsToAdd.map((r, idx) => {
      const dateObj = new Date(r.expenseDate)
      const monthStr = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
        : "March 2026"

      const vNum = `EXP-${Date.now().toString().slice(-6)}-${String(idx + 1).padStart(2, "0")}`

      return {
        id: `exp-imp-${Date.now()}-${idx}`,
        voucherNumber: vNum,
        date: `${dateObj.getDate()} ${dateObj.toLocaleString("en-IN", { month: "short" })}, 10:00`,
        expenseDate: r.expenseDate,
        monthGroup: monthStr,
        category: r.category,
        title: r.title,
        payeeName: r.payeeName,
        amount: r.amount,
        paymentMode: r.paymentMode,
        status: r.status,
        billInvoiceNo: r.billInvoiceNo,
        remarks: r.remarks,
      }
    })

    const mergedEntries = rowsToMerge.map((r) => ({
      existingId: r.existingEntryId!,
      additionalAmount: r.amount,
      remarks: r.remarks,
    }))

    onImport(newEntries, mergedEntries)
    handleClose()
  }

  const toAddEntries = effectiveRows.filter((r) => r.isValid && r.action === "new")
  const toMergeEntries = effectiveRows.filter((r) => r.isValid && r.action === "merge")
  const toSkipEntries = effectiveRows.filter((r) => !r.isValid || r.action === "skip")
  const duplicateEntries = effectiveRows.filter((r) => r.isValid && r.isDuplicate)
  const totalValue = toAddEntries.reduce((sum, r) => sum + r.amount, 0)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[88vh] flex flex-col p-4 sm:p-5 overflow-hidden">
        <DialogHeader className="shrink-0 pb-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-5 w-5 text-saffron" />
              Import Bulk Expenses (Excel / CSV)
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              className="text-xs h-8 border-border text-muted-foreground hover:text-foreground"
              title="Download pre-formatted Excel template"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-saffron" /> Download Sample Template
            </Button>
          </div>
          <DialogDescription className="text-xs">
            Upload an Excel (.xlsx, .xls) or CSV (.csv) file. Supports any date format (DD-MM-YYYY, YYYY-MM-DD, 15-Mar-2026, etc.).
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1 py-1">
          {/* Dropzone Area */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  processFile(e.dataTransfer.files[0])
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                isDragging ? "border-saffron bg-saffron-container/20" : "border-border hover:border-saffron/50 hover:bg-muted/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-12 h-12 rounded-full bg-saffron-container/30 flex items-center justify-center text-saffron">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    Click to browse or drag & drop Expense Excel / CSV file
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Columns: <strong>Date</strong>, <strong>Category</strong>, <strong>Title</strong>, <strong>Payee / Vendor</strong>, <strong>Amount</strong>, <strong>Payment Mode</strong>.
                  </p>
                </div>
                <Button type="button" variant="secondary" size="sm" className="mt-1 text-xs font-semibold">
                  Select File
                </Button>
              </div>
            </div>
          ) : (
            /* File Selected Header Bar */
            <div className="bg-card p-3 rounded-lg border border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5 truncate">
                <FileSpreadsheet className="h-5 w-5 text-saffron shrink-0" />
                <div className="truncate">
                  <p className="text-xs font-bold text-foreground truncate">{selectedFile.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {parsedRows.length} total rows read
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null)
                    setParsedRows([])
                  }}
                  className="h-7 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Replace File
                </Button>
              </div>
            </div>
          )}

          {/* Live Preview & Verification Section */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              {/* KPI Summary Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
                  <span className="text-[11px] text-muted-foreground font-semibold">Total Rows</span>
                  <div className="text-base font-bold text-foreground mt-0.5">{parsedRows.length}</div>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/30">
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">To Add (New)</span>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-baseline gap-1">
                    <span>{toAddEntries.length}</span>
                    {consolidateSameDay && intraDayDuplicateSummary.rowsSaved > 0 && (
                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">
                        (-{intraDayDuplicateSummary.rowsSaved} merged)
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-blue-500/10 p-2.5 rounded-lg border border-blue-500/30">
                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">To Merge</span>
                  <div className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">{toMergeEntries.length}</div>
                </div>
                <div className="bg-slate-500/10 p-2.5 rounded-lg border border-slate-500/30">
                  <span className="text-[11px] text-muted-foreground font-semibold">Skipped</span>
                  <div className="text-base font-bold text-muted-foreground mt-0.5">{toSkipEntries.length}</div>
                </div>
                <div className="bg-saffron-container/30 p-2.5 rounded-lg border border-saffron/40 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-saffron font-bold">New Import Value</span>
                  <div className="text-base font-bold text-saffron mt-0.5">{formatINR(totalValue)}</div>
                </div>
              </div>

              {/* Same-Day Multiple Expenses Consolidation Option */}
              {intraDayDuplicateSummary.duplicateRowsCount > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                      <Merge className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-blue-950 dark:text-blue-100">
                          Intra-Day Multiple Expenses Detected ({intraDayDuplicateSummary.duplicateGroups} expense batches, {intraDayDuplicateSummary.duplicateRowsCount} entries)
                        </span>
                        <Badge variant="outline" className="text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40 font-semibold">
                          Zero Data Loss
                        </Badge>
                      </div>
                      <p className="text-[11px] text-blue-800/90 dark:text-blue-300/80 mt-0.5">
                        Multiple payments or bills on the same date for the same category/payee can be merged into 1 clean daily row (amounts are 100% summed).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <label className="flex items-center gap-2 cursor-pointer bg-card px-3 py-1.5 rounded-md border border-blue-500/40 shadow-xs hover:bg-muted/40 transition-colors">
                      <Checkbox
                        checked={consolidateSameDay}
                        onCheckedChange={(checked) => setConsolidateSameDay(Boolean(checked))}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <span className="text-xs font-semibold text-foreground">
                        {consolidateSameDay
                          ? `Consolidate (Saves ${intraDayDuplicateSummary.rowsSaved} rows)`
                          : "Keep Separate Expenses"}
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Duplicate Resolution Notice */}
              {duplicateEntries.length > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          {duplicateEntries.length} Duplicate / Matching Expenses Detected in Ledger
                        </p>
                        <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                          Matching records exist on the same date with the same category/payee. Choose an action:
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      <span className="text-[11px] text-muted-foreground font-medium mr-1">Bulk Action:</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction("skip")}
                        className="text-[11px] h-7 px-2.5 bg-background hover:bg-muted border-amber-500/40 text-amber-900 dark:text-amber-200 font-medium"
                      >
                        <Ban className="h-3 w-3 mr-1 text-rose-500" /> Skip All
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction("new")}
                        className="text-[11px] h-7 px-2.5 bg-background hover:bg-muted border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-medium"
                      >
                        <Plus className="h-3 w-3 mr-1 text-emerald-500" /> Add All as New
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleBulkAction("merge")}
                        className="text-[11px] h-7 px-2.5 bg-background hover:bg-muted border-blue-500/40 text-blue-800 dark:text-blue-300 font-medium"
                      >
                        <Merge className="h-3 w-3 mr-1 text-blue-500" /> Merge All
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-border rounded-lg overflow-hidden max-h-56 sm:max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-table-header sticky top-0 z-10">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold text-left">Action / Status</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Category</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Title / Expense</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Payee / Vendor</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Mode</TableHead>
                      <TableHead className="text-xs font-semibold text-left">Amount (₹)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {effectiveRows.map((row) => (
                      <TableRow
                        key={row.rowId}
                        className={
                          !row.isValid
                            ? "bg-destructive/5 hover:bg-destructive/10"
                            : row.isMergedIntraDay
                            ? "bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70"
                            : row.isDuplicate
                            ? "bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50/70"
                            : "hover:bg-muted/40"
                        }
                      >
                        {/* Action / Resolution Cell */}
                        <TableCell className="text-xs text-left whitespace-nowrap">
                          {!row.isValid ? (
                            <Badge variant="destructive" className="text-[10px]" title={row.validationError}>
                              {row.validationError || "Error"}
                            </Badge>
                          ) : row.isMergedIntraDay ? (
                            <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/40 bg-blue-500/10 font-medium" title={row.mergedBreakdown}>
                              Merged ({row.mergedCount} bills)
                            </Badge>
                          ) : !row.isDuplicate ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40 bg-emerald-500/10">
                              New Entry
                            </Badge>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSetRowAction(row.rowId, "new")}
                                title="Add as a new separate voucher on this date"
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                  row.action === "new"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-muted text-muted-foreground hover:bg-emerald-100 dark:hover:bg-emerald-950 hover:text-emerald-700"
                                }`}
                              >
                                + New
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetRowAction(row.rowId, "merge")}
                                title={`Merge amount: existing ₹${row.existingAmount} + new ₹${row.amount}`}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                  row.action === "merge"
                                    ? "bg-blue-600 text-white shadow-xs"
                                    : "bg-muted text-muted-foreground hover:bg-blue-100 dark:hover:bg-blue-950 hover:text-blue-700"
                                }`}
                              >
                                Merge (+₹{row.amount})
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSetRowAction(row.rowId, "skip")}
                                title="Do not import this row"
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                  row.action === "skip"
                                    ? "bg-rose-600 text-white shadow-xs"
                                    : "bg-muted text-muted-foreground hover:bg-rose-100 dark:hover:bg-rose-950 hover:text-rose-700"
                                }`}
                              >
                                Skip
                              </button>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-left font-medium">
                          {formatDateDDMMYYYY(row.expenseDate)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground text-left">
                          <Badge variant="outline" className="text-[10px] bg-muted/50 border-border">
                            {row.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground text-left">
                          <div>
                            <span>{row.title}</span>
                            {row.isMergedIntraDay && (
                              <p className="text-[10px] font-normal text-blue-700 dark:text-blue-300 mt-0.5">
                                Breakdown: {row.mergedBreakdown}
                              </p>
                            )}
                            {row.isDuplicate && (
                              <p className="text-[10px] font-normal text-amber-700 dark:text-amber-300 mt-0.5">
                                {row.duplicateReason}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-left">
                          {row.payeeName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground text-left">
                          {row.paymentMode}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-saffron text-left">
                          {formatINR(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Pinned Dialog Footer */}
        <DialogFooter className="shrink-0 pt-2.5 border-t border-border mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card z-10">
          <div className="text-xs text-muted-foreground">
            {parsedRows.length > 0 && (
              <span>
                Applying: <strong>{toAddEntries.length}</strong> new, <strong>{toMergeEntries.length}</strong> merged, <strong>{toSkipEntries.length}</strong> skipped.
                {consolidateSameDay && intraDayDuplicateSummary.rowsSaved > 0 && (
                  <span className="text-blue-600 dark:text-blue-400 font-medium ml-1">
                    (Shrunk {intraDayDuplicateSummary.duplicateRowsCount} intra-day expenses into {intraDayDuplicateSummary.duplicateRowsCount - intraDayDuplicateSummary.rowsSaved} rows)
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={(toAddEntries.length === 0 && toMergeEntries.length === 0) || isProcessing}
              onClick={handleConfirmImport}
              className="bg-primary hover:bg-saffron-dark text-white font-semibold"
            >
              Confirm Import ({toAddEntries.length + toMergeEntries.length} Processed)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
