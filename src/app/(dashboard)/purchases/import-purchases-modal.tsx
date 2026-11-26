"use client"

import { useState, useRef } from "react"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatINR, formatDateDDMMYYYY } from "@/lib/utils"
import { PurchaseEntry, Item, Vendor } from "@/lib/mockData"
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Merge,
  Plus,
  Ban,
  HelpCircle,
} from "lucide-react"
import { toast } from "sonner"

export type ConflictAction = "new" | "merge" | "skip"

interface ParsedPurchaseRow {
  rowId: string
  isValid: boolean
  validationError?: string
  purchaseDate: string // YYYY-MM-DD
  itemName: string
  vendorName: string
  quantity: number
  unit: string
  rate: number
  total: number
  remarks?: string
  // Duplicate / Match detection
  isDuplicate?: boolean
  duplicateReason?: string
  existingEntryId?: string
  existingQty?: number
  existingUnit?: string
  existingRate?: number
  existingTotal?: number
  action: ConflictAction
}

interface ImportPurchasesModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (
    newEntries: PurchaseEntry[],
    mergedEntries?: { existingId: string; additionalQty: number; remarks?: string }[]
  ) => void
  availableItems: Item[]
  availableVendors: Vendor[]
  existingPurchases?: PurchaseEntry[]
}

// Helper: Convert varied date inputs (DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, Excel serial) to YYYY-MM-DD
function parseToYYYYMMDD(val: any): string {
  if (val === null || val === undefined || val === "") {
    return new Date().toISOString().split("T")[0]
  }

  // Handle Excel numeric serial dates (e.g. 45366)
  if (typeof val === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const d = new Date(excelEpoch.getTime() + val * 86400000)
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0]
    }
  }

  const str = String(val).trim()

  // Format: DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, "0")
    const mm = dmyMatch[2].padStart(2, "0")
    const yyyy = dmyMatch[3]
    return `${yyyy}-${mm}-${dd}`
  }

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }

  // Fallback Date constructor
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0]
  }

  return new Date().toISOString().split("T")[0]
}

export function ImportPurchasesModal({
  isOpen,
  onClose,
  onImport,
  availableItems,
  availableVendors,
  existingPurchases = [],
}: ImportPurchasesModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedPurchaseRow[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset modal state
  const handleClose = () => {
    setSelectedFile(null)
    setParsedRows([])
    setIsProcessing(false)
    setIsDragging(false)
    onClose()
  }

  // Generate and download sample Excel template
  const handleDownloadSample = () => {
    const sampleData = [
      {
        "Date (DD-MM-YYYY)": "15-03-2026",
        "Item Name": "Pure Cow Ghee",
        "Vendor Name": "Mahi Dairy Farms",
        "Quantity": 50,
        "Unit": "Litre",
        "Price Amount (₹)": 850,
        "Notes": "A2 Pure Ghee batch",
      },
      {
        "Date (DD-MM-YYYY)": "16-03-2026",
        "Item Name": "Kaju (Cashew W320)",
        "Vendor Name": "Shreeji Dry Fruits",
        "Quantity": 25,
        "Unit": "Kg",
        "Price Amount (₹)": 680,
        "Notes": "Premium wholesale",
      },
      {
        "Date (DD-MM-YYYY)": "18-03-2026",
        "Item Name": "Refined Sugar (M-30)",
        "Vendor Name": "Gujarat Sugar Mills",
        "Quantity": 100,
        "Unit": "Kg",
        "Price Amount (₹)": 38.5,
        "Notes": "50kg sacks",
      },
      {
        "Date (DD-MM-YYYY)": "20-03-2026",
        "Item Name": "Cardamom (Elaichi)",
        "Vendor Name": "Kerala Spices Co.",
        "Quantity": 1.5,
        "Unit": "Kg",
        "Price Amount (₹)": 2400,
        "Notes": "Fresh green cardamom",
      },
    ]

    const ws = XLSX.utils.json_to_sheet(sampleData)
    ws["!cols"] = [
      { wch: 18 },
      { wch: 25 },
      { wch: 24 },
      { wch: 12 },
      { wch: 10 },
      { wch: 16 },
      { wch: 25 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Purchase_Template")
    XLSX.writeFile(wb, "purchase_ledger_import_template.xlsx")
    toast.success("Downloaded sample template 'purchase_ledger_import_template.xlsx'")
  }

  // Parse uploaded file (.xlsx, .xls, .csv)
  const processFile = async (file: File) => {
    setIsProcessing(true)
    setSelectedFile(file)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const firstSheet = workbook.SheetNames[0]
      if (!firstSheet) {
        toast.error("The uploaded file does not contain any sheets")
        setIsProcessing(false)
        return
      }

      const worksheet = workbook.Sheets[firstSheet]
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" })

      if (rawRows.length === 0) {
        toast.error("The uploaded spreadsheet is empty")
        setIsProcessing(false)
        return
      }

      // Flexible column key finder
      const findField = (row: any, candidates: string[]): any => {
        const keys = Object.keys(row)
        for (const candidate of candidates) {
          const matchedKey = keys.find(
            (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === candidate.toLowerCase().replace(/[^a-z0-9]/g, "")
          )
          if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== "") {
            return row[matchedKey]
          }
        }
        return ""
      }

      const parsed: ParsedPurchaseRow[] = rawRows.map((row, idx) => {
        const rawDate = findField(row, ["date", "purchasedate", "dateddmmyyyy", "entrydate", "invoicedate"])
        const rawItem = String(findField(row, ["itemname", "item", "product", "productname", "material"])).trim()
        const rawVendor = String(findField(row, ["vendorname", "vendor", "supplier", "suppliername"])).trim()
        const rawQty = parseFloat(String(findField(row, ["quantity", "qty", "amount_qty"])))
        const rawUnit = String(findField(row, ["unit", "uom"])).trim()
        const rawPrice = parseFloat(String(findField(row, ["price", "rate", "priceamount", "unitprice", "rateperunit"])))
        const rawRemarks = String(findField(row, ["notes", "remarks", "comment", "description"])).trim()

        const dateStr = parseToYYYYMMDD(rawDate)

        // Find fallback unit from available items if not provided
        let finalUnit = rawUnit
        if (!finalUnit && rawItem) {
          const matchedItem = availableItems.find(
            (i) => i.name.toLowerCase() === rawItem.toLowerCase()
          )
          if (matchedItem) finalUnit = matchedItem.unit
        }
        if (!finalUnit) finalUnit = "Kg"

        // Basic validation
        let isValid = true
        let validationError: string | undefined = undefined

        if (!rawItem) {
          isValid = false
          validationError = "Missing Item Name"
        } else if (isNaN(rawQty) || rawQty <= 0) {
          isValid = false
          validationError = "Invalid Quantity"
        } else if (isNaN(rawPrice) || rawPrice <= 0) {
          isValid = false
          validationError = "Invalid Price"
        }

        const validQty = isNaN(rawQty) || rawQty <= 0 ? 0 : rawQty
        const validPrice = isNaN(rawPrice) || rawPrice <= 0 ? 0 : rawPrice
        const total = validQty * validPrice

        // --- DUPLICATE / CONFLICT DETECTION AGAINST CURRENT LEDGER ---
        let isDuplicate = false
        let duplicateReason: string | undefined = undefined
        let existingEntryId: string | undefined = undefined
        let existingQty: number | undefined = undefined
        let existingUnit: string | undefined = undefined
        let existingRate: number | undefined = undefined
        let existingTotal: number | undefined = undefined
        let defaultAction: ConflictAction = "new"

        if (isValid && rawItem && existingPurchases.length > 0) {
          const matched = existingPurchases.find(
            (p) =>
              p.purchaseDate === dateStr &&
              p.itemName.trim().toLowerCase() === rawItem.toLowerCase() &&
              p.vendorName.trim().toLowerCase() === (rawVendor || "General Supplier").toLowerCase()
          )

          if (matched) {
            isDuplicate = true
            existingEntryId = matched.id
            existingQty = matched.quantity
            existingUnit = matched.unit
            existingRate = matched.rate
            existingTotal = matched.total
            duplicateReason = `Matched entry in ledger: ${matched.quantity} ${matched.unit} @ ${formatINR(matched.rate)}`

            // If exact duplicate (same quantity and rate), default to skip to protect against double upload
            // Otherwise, default to "new" (separate delivery) while highlighting conflict
            if (matched.quantity === validQty && matched.rate === validPrice) {
              defaultAction = "skip"
            } else {
              defaultAction = "new"
            }
          }
        }

        return {
          rowId: `imp-row-${idx}-${Date.now()}`,
          isValid,
          validationError,
          purchaseDate: dateStr,
          itemName: rawItem || `Unnamed Item (Row ${idx + 1})`,
          vendorName: rawVendor || "General Supplier",
          quantity: validQty,
          unit: finalUnit,
          rate: validPrice,
          total: total,
          remarks: rawRemarks || undefined,
          isDuplicate,
          duplicateReason,
          existingEntryId,
          existingQty,
          existingUnit,
          existingRate,
          existingTotal,
          action: isDuplicate ? defaultAction : "new",
        }
      })

      setParsedRows(parsed)
      const validCount = parsed.filter((r) => r.isValid).length
      const duplicateCount = parsed.filter((r) => r.isValid && r.isDuplicate).length
      if (duplicateCount > 0) {
        toast.warning(`Parsed ${parsed.length} rows (${duplicateCount} duplicate/conflicting entries detected)`)
      } else {
        toast.info(`Parsed ${parsed.length} rows (${validCount} valid entries ready)`)
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to parse file. Please ensure it is a valid Excel or CSV file.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Update single row conflict action
  const handleSetRowAction = (rowId: string, action: ConflictAction) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, action } : r))
    )
  }

  // Bulk set action for all conflicting rows
  const handleBulkAction = (action: ConflictAction) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.isValid && r.isDuplicate ? { ...r, action } : r))
    )
    if (action === "skip") {
      toast.info("All duplicate entries marked to Skip")
    } else if (action === "new") {
      toast.info("All duplicate entries marked as New Rows")
    } else {
      toast.info("All duplicate entries marked to Merge Quantity")
    }
  }

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      processFile(files[0])
    }
  }

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  // Commit valid rows to ledger with actions
  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid)
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

    const newEntries: PurchaseEntry[] = rowsToAdd.map((r, idx) => {
      const dateObj = new Date(r.purchaseDate)
      const monthStr = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
        : "March 2026"

      return {
        id: `p-imp-${Date.now()}-${idx}`,
        date: `${dateObj.getDate()} ${dateObj.toLocaleString("en-IN", { month: "short" })}, 10:00`,
        purchaseDate: r.purchaseDate,
        monthGroup: monthStr,
        itemName: r.itemName,
        vendorName: r.vendorName,
        quantity: r.quantity,
        unit: r.unit,
        rate: r.rate,
        total: r.total,
        remarks: r.remarks,
      }
    })

    const mergedEntries = rowsToMerge.map((r) => ({
      existingId: r.existingEntryId!,
      additionalQty: r.quantity,
      remarks: r.remarks,
    }))

    onImport(newEntries, mergedEntries)
    handleClose()
  }

  const validEntries = parsedRows.filter((r) => r.isValid)
  const invalidEntries = parsedRows.filter((r) => !r.isValid)
  const duplicateEntries = parsedRows.filter((r) => r.isValid && r.isDuplicate)
  const toAddEntries = parsedRows.filter((r) => r.isValid && r.action === "new")
  const toMergeEntries = parsedRows.filter((r) => r.isValid && r.action === "merge")
  const toSkipEntries = parsedRows.filter((r) => !r.isValid || r.action === "skip")

  const totalValue = toAddEntries.reduce((sum, r) => sum + r.total, 0)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-5 w-5 text-saffron" />
              Import Bulk Purchases (Excel / CSV)
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
            Upload an Excel (.xlsx, .xls) or CSV (.csv) file. Intelligent conflict detection will identify any existing purchases on the same date.
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone Area */}
        {!selectedFile ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
                  Click to browse or drag & drop Excel / CSV file
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Supports .xlsx, .xls, and .csv files. Columns: Date, Item Name, Vendor, Quantity, Unit, Price Amount.
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
          <div className="space-y-3.5">
            {/* KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground font-semibold">Total Rows</span>
                <div className="text-base font-bold text-foreground mt-0.5">{parsedRows.length}</div>
              </div>
              <div className="bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/30">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">To Add (New)</span>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{toAddEntries.length}</div>
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

            {/* Smart Conflict / Duplicate Resolution Notice */}
            {duplicateEntries.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg space-y-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        {duplicateEntries.length} Duplicate / Matching Entries Detected in Ledger
                      </p>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 mt-0.5">
                        These items already have records on the same date with the same vendor. Choose how each should be handled:
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
            <div className="border border-border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <Table>
                <TableHeader className="bg-table-header sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-left">Action / Status</TableHead>
                    <TableHead className="text-xs font-semibold text-left">Date</TableHead>
                    <TableHead className="text-xs font-semibold text-left">Item Name</TableHead>
                    <TableHead className="text-xs font-semibold text-left">Vendor Name</TableHead>
                    <TableHead className="text-xs font-semibold text-left">Quantity</TableHead>
                    <TableHead className="text-xs font-semibold text-left">Unit</TableHead>
                    <TableHead className="text-xs font-semibold text-left">Rate (₹)</TableHead>
                    <TableHead className="text-xs font-semibold text-left">Total (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow
                      key={row.rowId}
                      className={
                        !row.isValid
                          ? "bg-destructive/5 hover:bg-destructive/10"
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
                        ) : !row.isDuplicate ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40 bg-emerald-500/10">
                            New Entry
                          </Badge>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSetRowAction(row.rowId, "new")}
                              title="Add as a new separate row on this date"
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                row.action === "new"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "bg-muted text-muted-foreground hover:bg-emerald-100 dark:hover:bg-emerald-950 hover:text-emerald-700"
                              }`}
                            >
                              + New Row
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetRowAction(row.rowId, "merge")}
                              title={`Merge quantity: existing ${row.existingQty} + new ${row.quantity} ${row.unit}`}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                row.action === "merge"
                                  ? "bg-blue-600 text-white shadow-xs"
                                  : "bg-muted text-muted-foreground hover:bg-blue-100 dark:hover:bg-blue-950 hover:text-blue-700"
                              }`}
                            >
                              Merge (+{row.quantity})
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
                        {formatDateDDMMYYYY(row.purchaseDate)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-foreground text-left">
                        <div>
                          <span>{row.itemName}</span>
                          {row.isDuplicate && (
                            <p className="text-[10px] font-normal text-amber-700 dark:text-amber-300 mt-0.5">
                              {row.duplicateReason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-left">
                        {row.vendorName}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground text-left">
                        {row.quantity}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-left">
                        {row.unit}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-left">
                        {formatINR(row.rate)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-saffron text-left">
                        {formatINR(row.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {parsedRows.length > 0 && (
              <span>
                Applying: <strong>{toAddEntries.length}</strong> new, <strong>{toMergeEntries.length}</strong> merged, <strong>{toSkipEntries.length}</strong> skipped.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
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
