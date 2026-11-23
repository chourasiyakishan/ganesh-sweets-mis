"use client"

import { useState, useRef } from "react"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatINR, formatDateDDMMYYYY } from "@/lib/utils"
import { PurchaseEntry, Item, Vendor } from "@/lib/mockData"
import { Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle, FileText, Trash2, ArrowRight } from "lucide-react"
import { toast } from "sonner"

interface ParsedPurchaseRow {
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
}

interface ImportPurchasesModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (newEntries: PurchaseEntry[]) => void
  availableItems: Item[]
  availableVendors: Vendor[]
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
        "Notes": "A2 Pure Ghee batch"
      },
      {
        "Date (DD-MM-YYYY)": "16-03-2026",
        "Item Name": "Kaju (Cashew W320)",
        "Vendor Name": "Shreeji Dry Fruits",
        "Quantity": 25,
        "Unit": "Kg",
        "Price Amount (₹)": 680,
        "Notes": "Premium wholesale"
      },
      {
        "Date (DD-MM-YYYY)": "18-03-2026",
        "Item Name": "Refined Sugar (M-30)",
        "Vendor Name": "Gujarat Sugar Mills",
        "Quantity": 100,
        "Unit": "Kg",
        "Price Amount (₹)": 38.5,
        "Notes": "50kg sacks"
      },
      {
        "Date (DD-MM-YYYY)": "20-03-2026",
        "Item Name": "Cardamom (Elaichi)",
        "Vendor Name": "Kerala Spices Co.",
        "Quantity": 1.5,
        "Unit": "Kg",
        "Price Amount (₹)": 2400,
        "Notes": "Fresh green cardamom"
      }
    ]

    const ws = XLSX.utils.json_to_sheet(sampleData)
    // Set column widths for readability
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
          const matchedKey = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === candidate.toLowerCase().replace(/[^a-z0-9]/g, ""))
          if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== "") {
            return row[matchedKey]
          }
        }
        return ""
      }

      const parsed: ParsedPurchaseRow[] = rawRows.map((row, idx) => {
        const rawDate = findField(row, ["date", "purchasedate", "dateddmmyyyy", "entrydate", "invoice date"])
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

        // Validation
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

        return {
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
        }
      })

      setParsedRows(parsed)
      const validCount = parsed.filter((r) => r.isValid).length
      toast.info(`Parsed ${parsed.length} rows (${validCount} valid entries ready)`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to parse file. Please ensure it is a valid Excel or CSV file.")
    } finally {
      setIsProcessing(false)
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

  // Commit valid rows to ledger
  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid)
    if (validRows.length === 0) {
      toast.error("No valid entries found to import")
      return
    }

    const newEntries: PurchaseEntry[] = validRows.map((r, idx) => {
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

    const totalImportValue = newEntries.reduce((sum, e) => sum + e.total, 0)
    onImport(newEntries)
    toast.success(`Successfully imported ${newEntries.length} purchase entries (${formatINR(totalImportValue)})`)
    handleClose()
  }

  const validEntries = parsedRows.filter((r) => r.isValid)
  const invalidEntries = parsedRows.filter((r) => !r.isValid)
  const totalValue = validEntries.reduce((sum, r) => sum + r.total, 0)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
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
            Upload an Excel (.xlsx, .xls) or CSV (.csv) file to import multiple purchase entries into the ledger at once.
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
          <div className="space-y-3">
            {/* KPI Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/40 p-3 rounded-lg border border-border">
                <span className="text-[11px] text-muted-foreground font-semibold">Total Rows</span>
                <div className="text-base font-bold text-foreground mt-0.5">{parsedRows.length}</div>
              </div>
              <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Valid Entries</span>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{validEntries.length}</div>
              </div>
              {invalidEntries.length > 0 ? (
                <div className="bg-rose-500/10 p-3 rounded-lg border border-rose-500/30">
                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">Skipped / Errors</span>
                  <div className="text-base font-bold text-rose-600 dark:text-rose-400 mt-0.5">{invalidEntries.length}</div>
                </div>
              ) : (
                <div className="bg-muted/40 p-3 rounded-lg border border-border">
                  <span className="text-[11px] text-muted-foreground font-semibold">Status</span>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> All Valid
                  </div>
                </div>
              )}
              <div className="bg-saffron-container/30 p-3 rounded-lg border border-saffron/40">
                <span className="text-[11px] text-saffron font-bold">Total Import Amount</span>
                <div className="text-base font-bold text-saffron mt-0.5">{formatINR(totalValue)}</div>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <Table>
                <TableHeader className="bg-table-header sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-left">Status</TableHead>
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
                  {parsedRows.map((row, idx) => (
                    <TableRow key={idx} className={row.isValid ? "hover:bg-muted/40" : "bg-destructive/5 hover:bg-destructive/10"}>
                      <TableCell className="text-xs text-left">
                        {row.isValid ? (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40 bg-emerald-500/10">
                            Valid
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]" title={row.validationError}>
                            {row.validationError || "Error"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-left font-medium">
                        {formatDateDDMMYYYY(row.purchaseDate)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-foreground text-left">
                        {row.itemName}
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

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={validEntries.length === 0 || isProcessing}
            onClick={handleConfirmImport}
            className="bg-primary hover:bg-saffron-dark text-white font-semibold"
          >
            Confirm & Import {validEntries.length} Entries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
