"use client"

import { useState, useMemo, useEffect, Fragment } from "react"
import {
  Receipt,
  Plus,
  Search,
  Download,
  Upload,
  Trash2,
  Edit,
  StickyNote,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar,
  Layers,
  ListPlus,
  CheckCircle2,
  Clock,
  RotateCcw,
  Wallet,
  Building,
  TrendingDown,
  TrendingUp,
  Merge,
  ShieldAlert,
} from "lucide-react"
import * as XLSX from "xlsx"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatINR, formatDateDDMMYYYY } from "@/lib/utils"
import {
  initialExpenses,
  initialExpenseCategories,
  ExpenseEntry,
  ExpenseCategory,
} from "@/lib/mockData"
import { fetchExpenses, saveExpensesToDb, deleteExpensesFromDb, saveExpenseToDb } from "@/lib/supabase/data-service"
import { ImportExpensesModal } from "./import-expenses-modal"
import { ConsolidateExpensesModal } from "./consolidate-modal"
import { BulkDeleteExpensesModal } from "./bulk-delete-modal"
import { FY_MONTHS, parseFYYears } from "../purchases/page"
import { toast } from "sonner"

type SortField = "expenseDate" | "category" | "title" | "amount" | "remarks"
type SortOrder = "asc" | "desc"
type DateDurationOption = "ALL" | "THIS_MONTH" | "LAST_MONTH" | "THIS_QUARTER" | "LAST_QUARTER" | "SELECTED_MONTH" | "CUSTOM"

interface BulkExpenseRow {
  id: string
  date: string
  category: ExpenseCategory
  title: string
  payeeName?: string
  amount: string
  paymentMode?: "Cash" | "Bank Transfer / NEFT" | "UPI / GPay / PhonePe" | "Cheque"
  status?: "PAID" | "PENDING"
  remarks: string
}

const STORAGE_KEY = "ganesh_sweets_expenses"

// Financial Year calculation (1 April - 31 March)
function getFinancialYear(dateStr: string): string {
  if (!dateStr) return "FY 2025-26"
  let year: number
  let month: number
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const parts = dateStr.split("-")
    year = parseInt(parts[0], 10)
    month = parseInt(parts[1], 10)
  } else {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "FY 2025-26"
    year = d.getFullYear()
    month = d.getMonth() + 1
  }
  if (month <= 3) {
    const prevYear = year - 1
    const shortCurr = String(year).slice(-2)
    return `FY ${prevYear}-${shortCurr}`
  } else {
    const nextYearShort = String(year + 1).slice(-2)
    return `FY ${year}-${nextYearShort}`
  }
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(initialExpenses)

  const loadExpensesFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setExpenses(parsed)
          return
        }
      }
      setExpenses([])
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
    } catch (e) {
      console.error("Failed to read expenses from localStorage:", e)
    }
  }

  useEffect(() => {
    loadExpensesFromStorage()
    fetchExpenses().then((data) => {
      if (data && data.length > 0) {
        setExpenses(data)
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch {}
      }
    })
  }, [])

  // Sync helper that updates state, localStorage, and broadcasts
  const updateExpenses = (newList: ExpenseEntry[]) => {
    setExpenses(newList)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
      window.dispatchEvent(new Event("expenses-updated"))
    } catch (e) {
      console.error("Failed to save expenses to localStorage:", e)
    }
  }

  // Cross-tab and cross-component sync listener
  useEffect(() => {
    window.addEventListener("expenses-updated", loadExpensesFromStorage)
    window.addEventListener("data-cleared", loadExpensesFromStorage)
    window.addEventListener("data-restored", loadExpensesFromStorage)
    window.addEventListener("storage", loadExpensesFromStorage)
    return () => {
      window.removeEventListener("expenses-updated", loadExpensesFromStorage)
      window.removeEventListener("data-cleared", loadExpensesFromStorage)
      window.removeEventListener("data-restored", loadExpensesFromStorage)
      window.removeEventListener("storage", loadExpensesFromStorage)
    }
  }, [])

  // Filter States
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDuration, setSelectedDuration] = useState<DateDurationOption>("ALL")
  const [selectedFY, setSelectedFY] = useState<string>("FY 2025-26")
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>("ALL")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("expenseDate")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null)
  const [noteExpense, setNoteExpense] = useState<ExpenseEntry | null>(null)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isConsolidateOpen, setIsConsolidateOpen] = useState(false)
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false)

  // Selected Month filter state (defaults to April "04")
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>("04")
  const currentFYYears = useMemo(() => parseFYYears(selectedFY), [selectedFY])

  const selectedMonthObj = FY_MONTHS.find((m) => m.value === selectedMonthFilter)
  const selectedMonthYear = currentFYYears
    ? (parseInt(selectedMonthFilter, 10) >= 4 ? currentFYYears.startYear : currentFYYears.endYear)
    : null
  const selectedMonthLabel = selectedMonthObj
    ? `${selectedMonthObj.name}${selectedMonthYear ? ` (${selectedMonthYear})` : ""}`
    : "April"

  // Single Form State
  const [formData, setFormData] = useState({
    expenseDate: new Date().toISOString().split("T")[0],
    category: "Salaries & Wages" as ExpenseCategory,
    title: "",
    payeeName: "",
    amount: "",
    paymentMode: "Bank Transfer / NEFT" as "Cash" | "Bank Transfer / NEFT" | "UPI / GPay / PhonePe" | "Cheque",
    status: "PAID" as "PAID" | "PENDING",
    billInvoiceNo: "",
    remarks: "",
  })

  // Bulk Form State
  const [bulkRows, setBulkRows] = useState<BulkExpenseRow[]>([
    {
      id: "b-1",
      date: new Date().toISOString().split("T")[0],
      category: "Salaries & Wages",
      title: "",
      amount: "",
      remarks: "",
    },
  ])

  // Sorting Toggle Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-table-header-text opacity-50 group-hover:opacity-100" />
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-table-header-text font-bold" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-table-header-text font-bold" />
    )
  }

  // Filtered and Sorted Expenses
  const filteredAndSortedExpenses = useMemo(() => {
    return expenses
      .filter((exp) => {
        // Search Query
        const q = searchQuery.toLowerCase().trim()
        if (q) {
          const matchSearch =
            exp.title.toLowerCase().includes(q) ||
            exp.category.toLowerCase().includes(q) ||
            (exp.billInvoiceNo && exp.billInvoiceNo.toLowerCase().includes(q)) ||
            (exp.remarks && exp.remarks.toLowerCase().includes(q))
          if (!matchSearch) return false
        }

        // Category Filter
        if (selectedCategory !== "ALL" && exp.category !== selectedCategory) return false

        // Financial Year Filter
        if (selectedFY !== "ALL" && getFinancialYear(exp.expenseDate) !== selectedFY) return false

        // Duration / Date Filter
        if (selectedDuration === "THIS_MONTH") {
          // Current Month (March 2026 based on mock system date, or matching YYYY-03)
          if (!exp.expenseDate.startsWith("2026-03")) return false
        } else if (selectedDuration === "LAST_MONTH") {
          if (!exp.expenseDate.startsWith("2026-02")) return false
        } else if (selectedDuration === "THIS_QUARTER") {
          // Q4 FY 2025-26: Jan, Feb, Mar 2026
          const isQ4 =
            exp.expenseDate.startsWith("2026-01") ||
            exp.expenseDate.startsWith("2026-02") ||
            exp.expenseDate.startsWith("2026-03")
          if (!isQ4) return false
        } else if (selectedDuration === "LAST_QUARTER") {
          // Q3 FY 2025-26: Oct, Nov, Dec 2025
          const isQ3 =
            exp.expenseDate.startsWith("2025-10") ||
            exp.expenseDate.startsWith("2025-11") ||
            exp.expenseDate.startsWith("2025-12")
          if (!isQ3) return false
        } else if (selectedDuration === "SELECTED_MONTH") {
          if (selectedFY !== "ALL" && currentFYYears) {
            const mNum = parseInt(selectedMonthFilter, 10)
            const year = mNum >= 4 ? currentFYYears.startYear : currentFYYears.endYear
            const prefix = `${year}-${selectedMonthFilter}`
            if (!exp.expenseDate.startsWith(prefix)) return false
          } else {
            if (exp.expenseDate.slice(5, 7) !== selectedMonthFilter) return false
          }
        } else if (selectedDuration === "CUSTOM") {
          if (customStartDate && exp.expenseDate < customStartDate) return false
          if (customEndDate && exp.expenseDate > customEndDate) return false
        }

        return true
      })
      .sort((a, b) => {
        let valA: string | number = ""
        let valB: string | number = ""

        if (sortField === "expenseDate") {
          valA = a.expenseDate
          valB = b.expenseDate
        } else if (sortField === "category") {
          valA = a.category
          valB = b.category
        } else if (sortField === "title") {
          valA = a.title
          valB = b.title
        } else if (sortField === "amount") {
          valA = a.amount
          valB = b.amount
        } else if (sortField === "remarks") {
          valA = a.remarks || ""
          valB = b.remarks || ""
        }

        let comparison = 0
        if (typeof valA === "number" && typeof valB === "number") {
          comparison = valA - valB
        } else {
          comparison = String(valA).localeCompare(String(valB), undefined, { sensitivity: "base" })
        }

        return sortOrder === "asc" ? comparison : -comparison
      })
  }, [
    expenses,
    searchQuery,
    selectedDuration,
    selectedFY,
    selectedCategory,
    selectedMonthFilter,
    currentFYYears,
    customStartDate,
    customEndDate,
    sortField,
    sortOrder,
  ])

  // Grouped by Month Structure (for visual monthly ledger sections)
  const groupedExpensesByMonth = useMemo(() => {
    const groups: { monthGroup: string; items: ExpenseEntry[]; totalAmount: number }[] = []

    filteredAndSortedExpenses.forEach((exp) => {
      let monthGroup: string
      if (/^\d{4}-\d{2}-\d{2}/.test(exp.expenseDate)) {
        const [y, m, d] = exp.expenseDate.split("-").map(Number)
        const dateObj = new Date(y, m - 1, d)
        monthGroup = dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      } else {
        monthGroup = exp.monthGroup || "Other"
      }

      let group = groups.find((g) => g.monthGroup === monthGroup)
      if (!group) {
        group = { monthGroup, items: [], totalAmount: 0 }
        groups.push(group)
      }
      group.items.push(exp)
      group.totalAmount += exp.amount
    })

    return groups
  }, [filteredAndSortedExpenses])

  // Summary Metrics Computations
  const totalFilteredValue = useMemo(() => {
    return filteredAndSortedExpenses.reduce((sum, e) => sum + e.amount, 0)
  }, [filteredAndSortedExpenses])

  const currentMonthExpensesTotal = useMemo(() => {
    return expenses
      .filter((e) => e.expenseDate.startsWith("2026-03"))
      .reduce((sum, e) => sum + e.amount, 0)
  }, [expenses])

  const prevMonthExpensesTotal = useMemo(() => {
    return expenses
      .filter((e) => e.expenseDate.startsWith("2026-02"))
      .reduce((sum, e) => sum + e.amount, 0)
  }, [expenses])

  const momExpenseDiff = currentMonthExpensesTotal - prevMonthExpensesTotal
  const momExpensePct = prevMonthExpensesTotal > 0 ? (momExpenseDiff / prevMonthExpensesTotal) * 100 : 0

  const paidAmount = useMemo(() => {
    return filteredAndSortedExpenses
      .filter((e) => e.status === "PAID")
      .reduce((sum, e) => sum + e.amount, 0)
  }, [filteredAndSortedExpenses])

  const pendingAmount = useMemo(() => {
    return filteredAndSortedExpenses
      .filter((e) => e.status === "PENDING")
      .reduce((sum, e) => sum + e.amount, 0)
  }, [filteredAndSortedExpenses])

  const topCategoryData = useMemo(() => {
    const map = new Map<string, number>()
    filteredAndSortedExpenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount)
    })
    let topCat = "None"
    let topVal = 0
    map.forEach((val, key) => {
      if (val > topVal) {
        topVal = val
        topCat = key
      }
    })
    const share = totalFilteredValue > 0 ? (topVal / totalFilteredValue) * 100 : 0
    return { category: topCat, amount: topVal, share }
  }, [filteredAndSortedExpenses, totalFilteredValue])

  // Available Financial Years extracted from expenses
  const availableFYs = useMemo(() => {
    const set = new Set<string>()
    expenses.forEach((e) => {
      set.add(getFinancialYear(e.expenseDate))
    })
    set.add("FY 2025-26")
    return Array.from(set).sort().reverse()
  }, [expenses])

  // --- Modal Open Handlers ---
  const handleOpenAdd = () => {
    const nextNum = expenses.length + 1
    const vchStr = `EXP-2026-${String(nextNum).padStart(3, "0")}`

    setFormData({
      expenseDate: new Date().toISOString().split("T")[0],
      category: "Salaries & Wages",
      title: "",
      payeeName: "",
      amount: "",
      paymentMode: "Bank Transfer / NEFT",
      status: "PAID",
      billInvoiceNo: "",
      remarks: "",
    })
    setIsAddOpen(true)
  }

  const handleOpenEdit = (exp: ExpenseEntry) => {
    setEditingExpense(exp)
    setFormData({
      expenseDate: exp.expenseDate,
      category: exp.category,
      title: exp.title,
      payeeName: exp.payeeName,
      amount: exp.amount.toString(),
      paymentMode: exp.paymentMode,
      status: exp.status,
      billInvoiceNo: exp.billInvoiceNo || "",
      remarks: exp.remarks || "",
    })
    setIsEditOpen(true)
  }

  // --- Create Single Expense Handler ---
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(formData.amount)
    if (!formData.title.trim() || isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid expense title and positive amount")
      return
    }

    let dateObj: Date
    let day: number
    if (/^\d{4}-\d{2}-\d{2}/.test(formData.expenseDate)) {
      const [y, m, d] = formData.expenseDate.split("-").map(Number)
      dateObj = new Date(y, m - 1, d, 11, 0, 0)
      day = d
    } else {
      dateObj = new Date(formData.expenseDate)
      day = dateObj.getDate()
    }
    const monthStr = dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    const nextNum = expenses.length + 1
    const vchStr = `EXP-2026-${String(nextNum).padStart(3, "0")}`

    const newEntry: ExpenseEntry = {
      id: `exp-${Date.now()}`,
      voucherNumber: vchStr,
      date: `${day} ${dateObj.toLocaleString("en-IN", { month: "short" })}, 11:30`,
      expenseDate: formData.expenseDate,
      monthGroup: monthStr,
      category: formData.category,
      title: formData.title.trim(),
      payeeName: formData.payeeName?.trim() || "—",
      amount: amt,
      paymentMode: "Cash",
      status: "PAID",
      billInvoiceNo: formData.billInvoiceNo.trim() || undefined,
      remarks: formData.remarks.trim() || undefined,
    }

    const updated = [newEntry, ...expenses]
    updateExpenses(updated)
    saveExpenseToDb(newEntry)
    setIsAddOpen(false)
    toast.success(`Logged ${newEntry.category} expense: ${formatINR(newEntry.amount)}`)
  }

  // --- Update Single Expense Handler ---
  const handleUpdateExpense = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return
    const amt = parseFloat(formData.amount)
    if (!formData.title.trim() || isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid expense title and positive amount")
      return
    }

    let dateObj: Date
    let day: number
    if (/^\d{4}-\d{2}-\d{2}/.test(formData.expenseDate)) {
      const [y, m, d] = formData.expenseDate.split("-").map(Number)
      dateObj = new Date(y, m - 1, d, 11, 0, 0)
      day = d
    } else {
      dateObj = new Date(formData.expenseDate)
      day = dateObj.getDate()
    }
    const monthStr = dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" })

    let updatedRecord: ExpenseEntry | null = null
    const updated = expenses.map((e) => {
      if (e.id === editingExpense.id) {
        updatedRecord = {
          ...e,
          expenseDate: formData.expenseDate,
          date: `${day} ${dateObj.toLocaleString("en-IN", { month: "short" })}, 11:30`,
          monthGroup: monthStr,
          category: formData.category,
          title: formData.title.trim(),
          amount: amt,
          billInvoiceNo: formData.billInvoiceNo.trim() || undefined,
          remarks: formData.remarks.trim() || undefined,
        }
        return updatedRecord
      }
      return e
    })

    updateExpenses(updated)
    if (updatedRecord) {
      saveExpenseToDb(updatedRecord)
    }
    setIsEditOpen(false)
    setEditingExpense(null)
    toast.success("Expense entry updated successfully")
  }

  // --- Delete Expense Handler ---
  const handleDeleteExpense = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete expense record: "${title}"?`)) {
      const updated = expenses.filter((e) => e.id !== id)
      updateExpenses(updated)
      await deleteExpensesFromDb([id])
      setSelectedRowIds((prev) => prev.filter((i) => i !== id))
      toast.success("Expense voucher deleted")
    }
  }

  // --- Bulk Delete Operations ---
  const handleBulkDeleteExpenses = async (idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return
    const idsSet = new Set(idsToDelete)
    const nextExpenses = expenses.filter((e) => !idsSet.has(e.id))
    updateExpenses(nextExpenses)
    await deleteExpensesFromDb(idsToDelete)
    setSelectedRowIds((prev) => prev.filter((id) => !idsSet.has(id)))
    setIsBatchConfirmOpen(false)
    toast.success(`Successfully deleted ${idsToDelete.length} expense entries`)
  }

  // --- Same-Day Intraday Consolidation Handler ---
  const handleConsolidateExpenses = async (
    newExpenses: ExpenseEntry[],
    mergedGroupsCount: number,
    rowsSavedCount: number
  ) => {
    updateExpenses(newExpenses)
    await saveExpensesToDb(newExpenses)
    toast.success(`Consolidated ${rowsSavedCount} same-day duplicate entries across ${mergedGroupsCount} batches! Saved ${rowsSavedCount} rows with zero data loss.`)
  }

  // --- Bulk Import Handler ---
  const handleImportExpenses = async (
    newEntries: ExpenseEntry[],
    mergedEntries: { existingId: string; additionalAmount: number; remarks?: string }[] = []
  ) => {
    let updatedExpenses = [...expenses]

    if (mergedEntries.length > 0) {
      updatedExpenses = updatedExpenses.map((e) => {
        const merge = mergedEntries.find((m) => m.existingId === e.id)
        if (merge) {
          const newAmount = (e.amount || 0) + merge.additionalAmount
          const updatedRemarks = e.remarks
            ? `${e.remarks} | Merged +${formatINR(merge.additionalAmount)}`
            : `Merged +${formatINR(merge.additionalAmount)}`
          return {
            ...e,
            amount: newAmount,
            remarks: updatedRemarks,
          }
        }
        return e
      })
    }

    const nextExpenses = [...newEntries, ...updatedExpenses]
    updateExpenses(nextExpenses)
    await saveExpensesToDb(nextExpenses)
    setSelectedFY("ALL")

    toast.success(`Import complete: ${newEntries.length} new entries added, ${mergedEntries.length} entries merged.`)
  }

  const selectedRowSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds])

  const handleToggleRowSelection = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAllVisible = () => {
    const visibleIds = filteredAndSortedExpenses.map((e) => e.id)
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedRowSet.has(id))
    if (allSelected) {
      setSelectedRowIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
    } else {
      const combined = new Set([...selectedRowIds, ...visibleIds])
      setSelectedRowIds(Array.from(combined))
    }
  }

  const selectedTotalAmount = useMemo(() => {
    if (selectedRowIds.length === 0) return 0
    let sum = 0
    for (let i = 0; i < expenses.length; i++) {
      if (selectedRowSet.has(expenses[i].id)) {
        sum += expenses[i].amount || 0
      }
    }
    return sum
  }, [selectedRowSet, selectedRowIds.length, expenses])

  // --- Toggle Status Quick Action ---
  const handleToggleStatus = (exp: ExpenseEntry) => {
    const nextStatus: "PAID" | "PENDING" = exp.status === "PAID" ? "PENDING" : "PAID"
    const updated: ExpenseEntry[] = expenses.map((e) => (e.id === exp.id ? { ...e, status: nextStatus } : e))
    updateExpenses(updated)
    toast.success(`Voucher ${exp.voucherNumber} marked as ${nextStatus}`)
  }

  // --- Bulk Add Handlers ---
  const handleOpenBulk = () => {
    setBulkRows([
      {
        id: `br-${Date.now()}-1`,
        date: new Date().toISOString().split("T")[0],
        category: "Salaries & Wages",
        title: "",
        amount: "",
        remarks: "",
      },
    ])
    setIsBulkOpen(true)
  }

  const handleAddBulkRow = () => {
    setBulkRows((prev) => [
      ...prev,
      {
        id: `br-${Date.now()}-${prev.length + 1}`,
        date: new Date().toISOString().split("T")[0],
        category: "Miscellaneous Expenses",
        title: "",
        amount: "",
        remarks: "",
      },
    ])
  }

  const handleRemoveBulkRow = (id: string) => {
    if (bulkRows.length <= 1) {
      toast.error("At least one expense row is required")
      return
    }
    setBulkRows((prev) => prev.filter((r) => r.id !== id))
  }

  const handleBulkRowChange = (id: string, field: keyof BulkExpenseRow, val: any) => {
    setBulkRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)))
  }

  const handleSaveBulkExpenses = (e: React.FormEvent) => {
    e.preventDefault()
    const validRows = bulkRows.filter((r) => r.title.trim() && parseFloat(r.amount) > 0)
    if (validRows.length === 0) {
      toast.error("Please fill in title and amount for at least one row")
      return
    }

    const startNum = expenses.length + 1
    const newEntries: ExpenseEntry[] = validRows.map((r, idx) => {
      let dateObj: Date
      let day: number
      if (/^\d{4}-\d{2}-\d{2}/.test(r.date)) {
        const [y, m, d] = r.date.split("-").map(Number)
        dateObj = new Date(y, m - 1, d, 11, 0, 0)
        day = d
      } else {
        dateObj = new Date(r.date)
        day = dateObj.getDate()
      }
      const monthStr = dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      const vchStr = `EXP-2026-${String(startNum + idx).padStart(3, "0")}`

      return {
        id: `exp-bulk-${Date.now()}-${idx}`,
        voucherNumber: vchStr,
        date: `${day} ${dateObj.toLocaleString("en-IN", { month: "short" })}, 11:30`,
        expenseDate: r.date,
        monthGroup: monthStr,
        category: r.category,
        title: r.title.trim(),
        payeeName: "—",
        amount: parseFloat(r.amount),
        paymentMode: "Cash",
        status: "PAID",
        remarks: r.remarks.trim() || undefined,
      }
    })

    const updated = [...newEntries, ...expenses]
    updateExpenses(updated)
    setIsBulkOpen(false)
    toast.success(`Logged ${newEntries.length} expense vouchers successfully`)
  }

  // --- Export to Excel ---
  const handleExportExcel = () => {
    const dataToExport = filteredAndSortedExpenses.map((e) => ({
      "Voucher No": e.voucherNumber,
      Date: e.expenseDate,
      Month: e.monthGroup,
      Category: e.category,
      "Expense Title": e.title,
      Payee: e.payeeName,
      "Payment Mode": e.paymentMode,
      Status: e.status,
      "Amount (₹)": e.amount,
      "Bill / Invoice No": e.billInvoiceNo || "N/A",
      Remarks: e.remarks || "",
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Expenses")
    XLSX.writeFile(wb, `Ganesh_Sweets_Expenses_${new Date().toISOString().split("T")[0]}.xlsx`)
    toast.success("Exported expense ledger to Excel")
  }

  // Reset Filters
  const resetFilters = () => {
    setSearchQuery("")
    setSelectedDuration("ALL")
    setSelectedFY("FY 2025-26")
    setSelectedCategory("ALL")
    setSelectedMonthFilter("04")
    setCustomStartDate("")
    setCustomEndDate("")
  }

  const isFiltered =
    searchQuery !== "" ||
    selectedDuration !== "ALL" ||
    selectedFY !== "FY 2025-26" ||
    selectedCategory !== "ALL" ||
    customStartDate !== "" ||
    customEndDate !== ""

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-saffron-container/30 border border-saffron/20 text-saffron shadow-xs">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-headline text-foreground font-bold tracking-tight">
                Expenses Management
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Record, track & audit operational expenditure (Salaries, Rent, Utilities, Maintenance, Packaging)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          {/* Row 1: Add New Expense, Bulk Expense Entry, Bulk Delete */}
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="h-8 text-xs bg-primary hover:bg-saffron-dark text-white font-semibold shadow-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add New Expense
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenBulk}
              className="h-8 text-xs border-saffron text-saffron hover:bg-saffron/10 font-semibold"
            >
              <ListPlus className="h-3.5 w-3.5 mr-1.5" /> Bulk Expense Entry
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkDeleteOpen(true)}
              className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold"
              title="Bulk delete incorrect expense entries by category, payee, date or month"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Bulk Delete
            </Button>
          </div>

          {/* Row 2: Import, Export, Merge Entries */}
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(true)}
              className="h-8 text-xs border-border text-foreground hover:bg-muted font-medium"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5 text-saffron" /> Import Excel / CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-8 text-xs border-border text-foreground hover:bg-muted font-medium"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-saffron" /> Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConsolidateOpen(true)}
              className="h-8 text-xs border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-semibold"
              title="Consolidate duplicate expense entries on the same date with zero data loss"
            >
              <Merge className="h-3.5 w-3.5 mr-1.5" /> Merge Entries
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Filtered Expenses */}
        <Card className="border-l-4 border-l-saffron shadow-card transition-all hover:shadow-md flex flex-col justify-between h-full">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between min-h-[36px]">
              <div>
                <span className="text-label text-muted-foreground uppercase tracking-wider text-[11px] font-bold block">
                  Total Expenses
                </span>
                <span className="text-[11px] text-muted-foreground font-semibold block mt-0.5">
                  ({selectedFY === "ALL" ? "All FYs" : selectedFY})
                </span>
              </div>
              <div className="p-2 rounded-lg bg-saffron-container text-saffron shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-headline font-bold text-foreground">
                {formatINR(totalFilteredValue)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {filteredAndSortedExpenses.length} expense vouchers
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Current Month Expenses */}
        <Card className="border-l-4 border-l-deep-green shadow-card transition-all hover:shadow-md flex flex-col justify-between h-full">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between min-h-[36px]">
              <span className="text-label text-muted-foreground uppercase tracking-wider text-[11px] font-bold">
                Current Month
              </span>
              <div className="p-2 rounded-lg bg-deep-green-container text-deep-green shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-headline font-bold text-foreground">
                {formatINR(currentMonthExpensesTotal)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold">
                {momExpenseDiff > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                    <TrendingUp className="h-3.5 w-3.5" /> +{momExpensePct.toFixed(1)}% vs Feb
                  </span>
                ) : (
                  <span className="text-deep-green flex items-center gap-0.5">
                    <TrendingDown className="h-3.5 w-3.5" /> {momExpensePct.toFixed(1)}% vs Feb
                  </span>
                )}
                <span className="text-muted-foreground font-normal">({formatINR(prevMonthExpensesTotal)})</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Total Expense Records */}
        <Card className="border-l-4 border-l-emerald-600 shadow-card transition-all hover:shadow-md flex flex-col justify-between h-full">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between min-h-[36px]">
              <span className="text-label text-muted-foreground uppercase tracking-wider text-[11px] font-bold">
                Total Expense Records
              </span>
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-headline font-bold text-foreground">
                {filteredAndSortedExpenses.length} Records
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg. spend: {formatINR(filteredAndSortedExpenses.length > 0 ? Math.round(totalFilteredValue / filteredAndSortedExpenses.length) : 0)} / record
              </p>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Top Expense Driver */}
        <Card className="border-l-4 border-l-blue-600 shadow-card transition-all hover:shadow-md flex flex-col justify-between h-full">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between min-h-[36px]">
              <span className="text-label text-muted-foreground uppercase tracking-wider text-[11px] font-bold">
                Top Spending Category
              </span>
              <div className="p-2 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                <Building className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-title font-bold text-foreground truncate">
                {topCategoryData.category}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatINR(topCategoryData.amount)} ({topCategoryData.share.toFixed(1)}% of total)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control & Filter Deck */}
      <Card className="border border-border shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by title, category, bill no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs bg-background"
              />
            </div>

            {/* Duration Pills Switcher */}
            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border overflow-x-auto shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDuration("ALL")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  selectedDuration === "ALL"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setSelectedDuration("THIS_MONTH")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  selectedDuration === "THIS_MONTH"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setSelectedDuration("LAST_MONTH")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  selectedDuration === "LAST_MONTH"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={() => setSelectedDuration("SELECTED_MONTH")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  selectedDuration === "SELECTED_MONTH"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Selected Month
              </button>
              <button
                type="button"
                onClick={() => setSelectedDuration("THIS_QUARTER")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  selectedDuration === "THIS_QUARTER"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                This Quarter
              </button>
              <button
                type="button"
                onClick={() => setSelectedDuration("LAST_QUARTER")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  selectedDuration === "LAST_QUARTER"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Last Quarter
              </button>
              <button
                type="button"
                onClick={() => setSelectedDuration("CUSTOM")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  selectedDuration === "CUSTOM"
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {/* Selected Month Dropdown (Shown only if Duration == SELECTED_MONTH) */}
          {selectedDuration === "SELECTED_MONTH" && (
            <div className="flex items-center gap-3 pt-2 border-t border-border/60">
              <div className="space-y-1 w-full max-w-xs">
                <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-saffron" />
                  Select Month ({selectedFY !== "ALL" ? selectedFY : "All Years"})
                </Label>
                <Select value={selectedMonthFilter} onValueChange={(val) => val && setSelectedMonthFilter(val)}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select Month...">
                      {selectedMonthLabel}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {FY_MONTHS.map((m) => {
                      const mNum = parseInt(m.value, 10)
                      const year = currentFYYears ? (mNum >= 4 ? currentFYYears.startYear : currentFYYears.endYear) : null
                      return (
                        <SelectItem key={m.value} value={m.value}>
                          {m.name} {year ? `(${year})` : ""}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Secondary Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-2.5 py-1 shadow-2xs">
                <span className="text-[11px] font-bold text-muted-foreground">Category:</span>
                <Select value={selectedCategory} onValueChange={(val) => val && setSelectedCategory(val)}>
                  <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-semibold text-foreground focus:ring-0 shadow-none w-36">
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

              {/* Financial Year Filter */}
              <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg px-2.5 py-1 shadow-2xs">
                <span className="text-[11px] font-bold text-muted-foreground">FY:</span>
                <Select value={selectedFY} onValueChange={(val) => val && setSelectedFY(val)}>
                  <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-semibold text-foreground focus:ring-0 shadow-none w-28">
                    <SelectValue placeholder="Financial Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All FY</SelectItem>
                    {availableFYs.map((fy) => (
                      <SelectItem key={fy} value={fy}>
                        {fy}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range Inputs */}
              {selectedDuration === "CUSTOM" && (
                <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg p-1">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-6 text-xs w-32 border-0 p-1"
                  />
                  <span className="text-muted-foreground font-bold">to</span>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-6 text-xs w-32 border-0 p-1"
                  />
                </div>
              )}
            </div>

            {/* Reset Filters */}
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 text-xs text-saffron hover:text-saffron-dark hover:bg-saffron-container/20 px-2 cursor-pointer font-semibold"
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Reset Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Expenses Table Grouped By Month (Styled matching Purchases Table) */}
      <Card className="border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader className="bg-table-header">
            <TableRow className="hover:bg-transparent">
              {/* Checkbox Select All */}
              <TableHead className="w-10 px-3 text-center">
                <Checkbox
                  checked={
                    filteredAndSortedExpenses.length > 0 &&
                    filteredAndSortedExpenses.every((e) => selectedRowSet.has(e.id))
                  }
                  onCheckedChange={handleToggleSelectAllVisible}
                  aria-label="Select all visible"
                />
              </TableHead>

              {/* 1. Date */}
              <TableHead
                onClick={() => handleSort("expenseDate")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Date {renderSortIcon("expenseDate")}
                </div>
              </TableHead>

              {/* 2. Category */}
              <TableHead
                onClick={() => handleSort("category")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Category {renderSortIcon("category")}
                </div>
              </TableHead>

              {/* 3. Expense Title / Particulars */}
              <TableHead
                onClick={() => handleSort("title")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Expense Title / Particulars {renderSortIcon("title")}
                </div>
              </TableHead>

              {/* 4. Amount */}
              <TableHead
                onClick={() => handleSort("amount")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Amount {renderSortIcon("amount")}
                </div>
              </TableHead>

              {/* 5. Remarks */}
              <TableHead
                onClick={() => handleSort("remarks")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Remarks {renderSortIcon("remarks")}
                </div>
              </TableHead>

              {/* 6. Action */}
              <TableHead className="text-table-header-text font-semibold text-xs text-left">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {groupedExpensesByMonth.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-left py-10 text-muted-foreground text-sm">
                  No expense records found matching filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              groupedExpensesByMonth.map((group, groupIdx) => (
                <Fragment key={group.monthGroup}>
                  {/* Clean Blank Space Divider between Month Blocks */}
                  {groupIdx > 0 && (
                    <TableRow className="hover:bg-transparent border-none">
                      <TableCell colSpan={7} className="h-6 py-2 border-none bg-transparent" />
                    </TableRow>
                  )}

                  {/* Month Heading Row */}
                  <TableRow className="bg-saffron-container/40 dark:bg-saffron/20 hover:bg-saffron-container/50 border-t-4 border-t-saffron border-b-2 border-b-saffron/30 transition-colors shadow-2xs">
                    <TableCell colSpan={7} className="py-3 px-4 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-md bg-saffron/20 text-saffron dark:text-saffron-light">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-extrabold text-foreground tracking-tight">
                              {group.monthGroup}
                            </span>
                            <span className="text-sm font-bold text-muted-foreground">
                              ({group.items.length} {group.items.length === 1 ? "Entry" : "Entries"})
                            </span>
                          </div>
                        </div>

                        {/* Right-aligned Monthly Total Badge */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/90 dark:bg-card border border-saffron/40 dark:border-saffron/60 shadow-2xs">
                          <span className="text-xs font-bold text-muted-foreground">Monthly total —</span>
                          <span className="text-sm font-extrabold text-saffron dark:text-saffron-light">
                            {formatINR(group.totalAmount)}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expense Rows for this Month */}
                  {group.items.map((exp) => (
                    <TableRow key={exp.id} className="hover:bg-muted/50 transition-colors">
                      {/* Checkbox Select Row */}
                      <TableCell className="w-10 px-3 text-center">
                        <Checkbox
                          checked={selectedRowSet.has(exp.id)}
                          onCheckedChange={() => handleToggleRowSelection(exp.id)}
                          aria-label={`Select ${exp.title}`}
                        />
                      </TableCell>

                      {/* 1. Date (DD-MM-YYYY) - NO voucher code */}
                      <TableCell className="text-xs font-semibold text-foreground text-left whitespace-nowrap">
                        {formatDateDDMMYYYY(exp.expenseDate)}
                      </TableCell>

                      {/* 2. Category */}
                      <TableCell className="text-xs font-medium text-foreground text-left whitespace-nowrap">
                        {exp.category}
                      </TableCell>

                      {/* 3. Expense Title / Description */}
                      <TableCell className="text-left">
                        <div className="text-sm font-bold text-foreground">{exp.title}</div>
                        {exp.billInvoiceNo && (
                          <span className="text-[11px] text-muted-foreground block mt-0.5">
                            Bill / Inv: {exp.billInvoiceNo}
                          </span>
                        )}
                      </TableCell>

                      {/* 4. Amount */}
                      <TableCell className="text-sm font-bold text-saffron text-left whitespace-nowrap">
                        {formatINR(exp.amount)}
                      </TableCell>

                      {/* 5. Remarks */}
                      <TableCell className="text-left">
                        {exp.remarks ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setNoteExpense(exp)}
                            className="h-8 w-8 text-saffron hover:text-saffron-dark hover:bg-saffron/10"
                            title="View Remarks"
                          >
                            <StickyNote className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground select-none">—</span>
                        )}
                      </TableCell>

                      {/* 6. Action */}
                      <TableCell className="text-left whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(exp)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Edit Expense"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExpense(exp.id, exp.title)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete Expense"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* MODAL 1: ADD SINGLE EXPENSE */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-saffron" /> Log New Expense Entry
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record operational expenses such as salaries, rent, maintenance, bills, gas or packaging.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateExpense} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Date */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Expense Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Expense Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val: any) => val && setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {initialExpenseCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Title & Amount */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Expense Title / Description *</Label>
                <Input
                  placeholder="e.g. Monthly Staff Salary, Shop Rent, Power Bill..."
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="₹ Amount"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Bill / Invoice Number */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Bill / Invoice No (Optional)</Label>
              <Input
                placeholder="e.g. INV-9821, ELEC-MAR-26"
                value={formData.billInvoiceNo}
                onChange={(e) => setFormData({ ...formData, billInvoiceNo: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Remarks / Notes (Optional)</Label>
              <Input
                placeholder="Additional audit, beneficiary or payment reference details..."
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary hover:bg-saffron-dark text-primary-foreground text-xs font-semibold">
                Save Expense Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EDIT EXPENSE */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit className="h-4 w-4 text-saffron" /> Edit Expense Entry
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateExpense} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Expense Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Expense Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val: any) => val && setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {initialExpenseCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Expense Title / Description *</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Bill / Invoice No</Label>
              <Input
                value={formData.billInvoiceNo}
                onChange={(e) => setFormData({ ...formData, billInvoiceNo: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Remarks / Notes</Label>
              <Input
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary hover:bg-saffron-dark text-primary-foreground text-xs font-semibold">
                Update Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: BULK EXPENSE ENTRY */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="sm:max-w-5xl lg:max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ListPlus className="h-4 w-4 text-saffron" /> Bulk Expense Entry
            </DialogTitle>
            <DialogDescription className="text-xs">
              Quickly record multiple expenses at once (such as utility bills, repairs, packaging, tea/snacks).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBulkExpenses} className="space-y-4 pt-2">
            <div className="border border-border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-xs font-bold w-36">Date</TableHead>
                    <TableHead className="text-xs font-bold w-52">Category</TableHead>
                    <TableHead className="text-xs font-bold min-w-60">Title / Particulars</TableHead>
                    <TableHead className="text-xs font-bold w-32">Amount (₹)</TableHead>
                    <TableHead className="text-xs font-bold min-w-44">Remarks</TableHead>
                    <TableHead className="text-xs font-bold w-12 text-center" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="p-2">
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) => handleBulkRowChange(row.id, "date", e.target.value)}
                          className="h-8 text-xs p-1"
                          required
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Select
                          value={row.category}
                          onValueChange={(val: any) => handleBulkRowChange(row.id, "category", val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {initialExpenseCategories.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          placeholder="e.g. Milk Boiler repair"
                          value={row.title}
                          onChange={(e) => handleBulkRowChange(row.id, "title", e.target.value)}
                          className="h-8 text-xs"
                          required
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          value={row.amount}
                          onChange={(e) => handleBulkRowChange(row.id, "amount", e.target.value)}
                          className="h-8 text-xs font-mono font-bold"
                          required
                        />
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          placeholder="Notes / bill no..."
                          value={row.remarks}
                          onChange={(e) => handleBulkRowChange(row.id, "remarks", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </TableCell>
                      <TableCell className="p-2 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBulkRow(row.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddBulkRow}
                className="text-xs gap-1 border-dashed"
              >
                <Plus className="h-3.5 w-3.5" /> Add Another Row
              </Button>

              <div className="text-xs font-bold text-foreground">
                Total:{" "}
                <span className="font-mono text-saffron font-bold text-sm">
                  {formatINR(bulkRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0))}
                </span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBulkOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-primary hover:bg-saffron-dark text-primary-foreground text-xs font-semibold">
                Save All Expense Entries
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: NOTE VIEWER */}
      <Dialog open={!!noteExpense} onOpenChange={() => setNoteExpense(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-500" /> Expense Remarks
            </DialogTitle>
            <DialogDescription className="text-xs">
              {noteExpense?.title} • {noteExpense?.expenseDate ? formatDateDDMMYYYY(noteExpense.expenseDate) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted/40 rounded-lg text-xs text-foreground whitespace-pre-wrap leading-relaxed border border-border">
            {noteExpense?.remarks}
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setNoteExpense(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Bottom Selection Bar for Bulk Delete */}
      {selectedRowIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-xs font-semibold text-foreground">
            <span className="text-destructive font-bold">{selectedRowIds.length}</span> entries selected
            <span className="text-muted-foreground ml-2">Total: <strong>{formatINR(selectedTotalAmount)}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs cursor-pointer"
              onClick={() => setSelectedRowIds([])}
            >
              Clear Selection
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs font-semibold gap-1.5 shadow-sm cursor-pointer"
              onClick={() => setIsBatchConfirmOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected ({selectedRowIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Dialog: Confirm Deletion of Selected Checkbox Rows */}
      <Dialog open={isBatchConfirmOpen} onOpenChange={setIsBatchConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Confirm Batch Deletion
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              Are you sure you want to delete the selected <strong>{selectedRowIds.length}</strong> expense entries? This action will permanently remove them from the ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 my-2 space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Total Entries Selected:</span>
              <span className="text-foreground">{selectedRowIds.length} rows</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Total Combined Amount:</span>
              <span className="text-destructive font-bold">{formatINR(selectedTotalAmount)}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsBatchConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleBulkDeleteExpenses(selectedRowIds)}
              className="font-semibold gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Yes, Delete {selectedRowIds.length} Entries
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Criteria-Based Bulk Delete */}
      <BulkDeleteExpensesModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        expenses={expenses}
        availableFYs={availableFYs}
        onDeleteExpenses={handleBulkDeleteExpenses}
      />

      {/* Modal: Same-Day Entries Consolidation (Zero Data Loss) */}
      <ConsolidateExpensesModal
        isOpen={isConsolidateOpen}
        onClose={() => setIsConsolidateOpen(false)}
        expenses={expenses}
        onConsolidate={handleConsolidateExpenses}
      />

      {/* Modal: Import Bulk Expenses from Excel/CSV */}
      <ImportExpensesModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        existingExpenses={expenses}
        onImport={handleImportExpenses}
      />
    </div>
  )
}
