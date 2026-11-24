"use client"

import { useState, useMemo, useEffect, Fragment } from "react"
import {
  ShoppingCart,
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
  RotateCcw,
} from "lucide-react"
import * as XLSX from "xlsx"
import { ImportPurchasesModal } from "./import-purchases-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { formatINR, formatDateDDMMYYYY } from "@/lib/utils"
import { initialPurchases, initialItems, initialVendors, PurchaseEntry, Item, Vendor } from "@/lib/mockData"
import { fetchPurchases } from "@/lib/supabase/data-service"
import { toast } from "sonner"

type SortField = "purchaseDate" | "vendorName" | "itemName" | "quantity" | "unit" | "rate" | "total" | "remarks"
type SortOrder = "asc" | "desc"
type DateRangeOption = "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM"

interface BulkPurchaseRow {
  id: string
  date: string
  quantity: string
  rate: string
  remarks: string
}

const STORAGE_KEY = "ganesh_sweets_purchases"

// Indian Financial Year calculation (1 April - 31 March)
function getFinancialYear(dateStr: string): string {
  if (!dateStr) return "FY 2025-26"
  let year: number
  let month: number // 1-12
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

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseEntry[]>(initialPurchases)
  const [items] = useState<Item[]>(initialItems)
  const [vendors] = useState<Vendor[]>(initialVendors)

  // Load persisted purchases on mount
  const loadPurchasesFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setPurchases(parsed)
          return
        }
      }
      // Demo mode is explicitly true only when enabled by user
      const isDemo = localStorage.getItem("ganesh_sweets_demo_mode") === "true"
      if (isDemo) {
        setPurchases(initialPurchases)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPurchases))
      } else {
        setPurchases([])
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
      }
    } catch (e) {
      console.error("Failed to read from localStorage:", e)
    }
  }

  useEffect(() => {
    loadPurchasesFromStorage()
    // Also try fetching from Supabase if configured
    fetchPurchases().then((data) => {
      if (data && data.length > 0) {
        setPurchases(data)
      }
    })
  }, [])

  // Sync helper that updates state, localStorage, and broadcasts
  const updatePurchases = (newList: PurchaseEntry[]) => {
    setPurchases(newList)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
      window.dispatchEvent(new Event("purchases-updated"))
    } catch (e) {
      console.error("Failed to save purchases to localStorage:", e)
    }
  }

  // Cross-tab, clear-data, and cross-component sync listener
  useEffect(() => {
    window.addEventListener("purchases-updated", loadPurchasesFromStorage)
    window.addEventListener("data-cleared", loadPurchasesFromStorage)
    window.addEventListener("data-restored", loadPurchasesFromStorage)
    window.addEventListener("storage", loadPurchasesFromStorage)
    return () => {
      window.removeEventListener("purchases-updated", loadPurchasesFromStorage)
      window.removeEventListener("data-cleared", loadPurchasesFromStorage)
      window.removeEventListener("data-restored", loadPurchasesFromStorage)
      window.removeEventListener("storage", loadPurchasesFromStorage)
    }
  }, [])

  // Dynamic Financial Years list from purchases & current date
  const availableFinancialYears = useMemo(() => {
    const fySet = new Set<string>()
    purchases.forEach((p) => {
      if (p.purchaseDate) {
        fySet.add(getFinancialYear(p.purchaseDate))
      }
    })
    fySet.add(getFinancialYear(new Date().toISOString().split("T")[0]))
    return Array.from(fySet).sort().reverse()
  }, [purchases])

  // Current Financial Year (used as default filter and for resets)
  const currentFinancialYear = useMemo(() => {
    return getFinancialYear(new Date().toISOString().split("T")[0])
  }, [])

  // Filter States - Default FY to current financial year
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFY, setSelectedFY] = useState<string>(() =>
    getFinancialYear(new Date().toISOString().split("T")[0])
  )
  const [selectedItemFilter, setSelectedItemFilter] = useState("ALL")
  const [selectedVendorFilter, setSelectedVendorFilter] = useState("ALL")
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeOption>("ALL")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  // Check if any filter has been modified from default
  const hasActiveFilters = useMemo(() => {
    return (
      selectedItemFilter !== "ALL" ||
      selectedVendorFilter !== "ALL" ||
      selectedDateRange !== "ALL" ||
      selectedFY !== currentFinancialYear ||
      searchQuery.trim() !== "" ||
      customStartDate !== "" ||
      customEndDate !== ""
    )
  }, [
    selectedItemFilter,
    selectedVendorFilter,
    selectedDateRange,
    selectedFY,
    currentFinancialYear,
    searchQuery,
    customStartDate,
    customEndDate,
  ])

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSelectedItemFilter("ALL")
    setSelectedVendorFilter("ALL")
    setSelectedDateRange("ALL")
    setSelectedFY(currentFinancialYear)
    setSearchQuery("")
    setCustomStartDate("")
    setCustomEndDate("")
  }

  // Listen for search parameters from URL or Topbar universal search event
  useEffect(() => {
    const handleUrlParams = () => {
      if (typeof window === "undefined") return
      const params = new URLSearchParams(window.location.search)
      const q = params.get("search")
      const item = params.get("item")
      const vendor = params.get("vendor")
      if (q !== null) setSearchQuery(q)
      if (item !== null) setSelectedItemFilter(item)
      if (vendor !== null) setSelectedVendorFilter(vendor)
    }

    handleUrlParams()

    const onSearchNavigate = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail) {
        if (customEvent.detail.search !== undefined) setSearchQuery(customEvent.detail.search)
        if (customEvent.detail.item !== undefined) setSelectedItemFilter(customEvent.detail.item)
        if (customEvent.detail.vendor !== undefined) setSelectedVendorFilter(customEvent.detail.vendor)
      }
    }

    window.addEventListener("mis-search-navigate", onSearchNavigate)
    window.addEventListener("popstate", handleUrlParams)
    return () => {
      window.removeEventListener("mis-search-navigate", onSearchNavigate)
      window.removeEventListener("popstate", handleUrlParams)
    }
  }, [])

  // Sorting State
  const [sortField, setSortField] = useState<SortField>("purchaseDate")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")

  // Single Modal State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingPurchase, setEditingPurchase] = useState<PurchaseEntry | null>(null)

  // Bulk Entry Modal State
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [bulkItemName, setBulkItemName] = useState("")
  const [bulkVendorName, setBulkVendorName] = useState("")
  const [bulkUnit, setBulkUnit] = useState("Kg")
  const [bulkRows, setBulkRows] = useState<BulkPurchaseRow[]>([
    { id: "br-1", date: new Date().toISOString().split("T")[0], quantity: "", rate: "", remarks: "" },
  ])

  // Import Modal State
  const [isImportOpen, setIsImportOpen] = useState(false)

  // Note Viewer Modal State
  const [notePurchase, setNotePurchase] = useState<PurchaseEntry | null>(null)

  // Form Fields State (Single Add/Edit)
  const [selectedItemName, setSelectedItemName] = useState("")
  const [selectedVendorName, setSelectedVendorName] = useState("")
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0])
  const [qty, setQty] = useState("")
  const [unit, setUnit] = useState("Kg")
  const [rate, setRate] = useState("")
  const [remarks, setRemarks] = useState("")

  const calculatedTotal = (parseFloat(qty) || 0) * (parseFloat(rate) || 0)

  // Alphabetically Sorted Items (A-Z)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  }, [items])

  // Dependent Available Vendors based on Selected Item (Alphabetically Sorted A-Z)
  const availableVendorsForItem = useMemo(() => {
    if (!selectedItemName) return vendors
    const matchingItem = items.find((i) => i.name === selectedItemName)

    const matched = vendors.filter(
      (v) =>
        v.materials.includes(selectedItemName) ||
        (matchingItem?.vendorNames && matchingItem.vendorNames.includes(v.name))
    )

    const list = matched.length > 0 ? matched : vendors
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  }, [selectedItemName, items, vendors])

  // Bulk Dependent Vendors (Alphabetically Sorted A-Z)
  const bulkAvailableVendors = useMemo(() => {
    if (!bulkItemName) return vendors
    const matchingItem = items.find((i) => i.name === bulkItemName)

    const matched = vendors.filter(
      (v) =>
        v.materials.includes(bulkItemName) ||
        (matchingItem?.vendorNames && matchingItem.vendorNames.includes(v.name))
    )

    const list = matched.length > 0 ? matched : vendors
    return [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
  }, [bulkItemName, items, vendors])

  // Unique lists for filter dropdowns (Alphabetically Sorted A-Z)
  const uniqueItemsList = useMemo(() => {
    const set = new Set<string>()
    items.forEach((i) => set.add(i.name))
    purchases.forEach((p) => set.add(p.itemName))
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  }, [items, purchases])

  const uniqueVendorsList = useMemo(() => {
    const set = new Set<string>()
    vendors.forEach((v) => set.add(v.name))
    purchases.forEach((p) => set.add(p.vendorName))
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  }, [vendors, purchases])

  // Sorting Toggle Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  // Handle Item Selection in Single Form -> Auto populates Vendor, Unit, Rate
  const handleItemSelectInForm = (itemNameVal: string) => {
    setSelectedItemName(itemNameVal)
    const matchedItem = items.find((i) => i.name === itemNameVal)
    if (matchedItem) {
      setUnit(matchedItem.unit)
      setRate(matchedItem.currentPrice.toString())

      const mappedVendors = vendors.filter(
        (v) =>
          v.materials.includes(itemNameVal) ||
          (matchedItem.vendorNames && matchedItem.vendorNames.includes(v.name))
      )
      const sortedMapped = [...mappedVendors].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
      if (sortedMapped.length > 0) {
        setSelectedVendorName(sortedMapped[0].name)
      } else {
        const sortedAll = [...vendors].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        setSelectedVendorName(sortedAll[0]?.name || "")
      }
    }
  }

  // Handle Item Selection in Bulk Form -> Auto populates Vendor, Unit, Rate
  const handleItemSelectInBulkForm = (itemNameVal: string) => {
    setBulkItemName(itemNameVal)
    const matchedItem = items.find((i) => i.name === itemNameVal)
    if (matchedItem) {
      setBulkUnit(matchedItem.unit)
      const defaultRate = matchedItem.currentPrice.toString()

      const mappedVendors = vendors.filter(
        (v) =>
          v.materials.includes(itemNameVal) ||
          (matchedItem.vendorNames && matchedItem.vendorNames.includes(v.name))
      )
      const sortedMapped = [...mappedVendors].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
      if (sortedMapped.length > 0) {
        setBulkVendorName(sortedMapped[0].name)
      } else {
        const sortedAll = [...vendors].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
        setBulkVendorName(sortedAll[0]?.name || "")
      }

      // Update rate in all existing bulk rows to the newly selected ingredient's price
      setBulkRows((prev) =>
        prev.map((r) => ({ ...r, rate: defaultRate }))
      )
    }
  }

  // Bulk Rows Builder Handlers
  const handleAddBulkRow = () => {
    const matchedItem = items.find((i) => i.name === bulkItemName)
    const defaultRate = matchedItem ? matchedItem.currentPrice.toString() : ""

    setBulkRows((prev) => [
      ...prev,
      {
        id: `br-${Date.now()}-${prev.length + 1}`,
        date: new Date().toISOString().split("T")[0],
        quantity: "",
        rate: defaultRate,
        remarks: "",
      },
    ])
  }

  const handleRemoveBulkRow = (index: number) => {
    if (bulkRows.length <= 1) {
      toast.error("At least one entry row is required for bulk purchase.")
      return
    }
    setBulkRows(bulkRows.filter((_, i) => i !== index))
  }

  const handleUpdateBulkRow = (index: number, field: keyof BulkPurchaseRow, value: string) => {
    const updated = [...bulkRows]
    updated[index] = { ...updated[index], [field]: value }
    setBulkRows(updated)
  }

  // Bulk Total Calculation
  const bulkTotalValue = useMemo(() => {
    return bulkRows.reduce((acc, curr) => {
      const q = parseFloat(curr.quantity) || 0
      const r = parseFloat(curr.rate) || 0
      return acc + q * r
    }, 0)
  }, [bulkRows])

  // Submit Bulk Purchase Entries Handler
  const handleSaveBulkPurchases = (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkItemName || !bulkVendorName) {
      toast.error("Please select a valid item and vendor for bulk entries")
      return
    }

    const invalidRow = bulkRows.find((r) => !r.quantity || parseFloat(r.quantity) <= 0 || !r.rate)
    if (invalidRow) {
      toast.error("Please complete valid Quantity and Rate for all entry rows")
      return
    }

    const firstRowDate = bulkRows[0]?.date || new Date().toISOString().split("T")[0]
    const bulkFY = getFinancialYear(firstRowDate)

    const newEntries: PurchaseEntry[] = bulkRows.map((row, idx) => {
      let dateObj: Date
      let day: number
      if (/^\d{4}-\d{2}-\d{2}/.test(row.date)) {
        const [y, m, d] = row.date.split("-").map(Number)
        dateObj = new Date(y, m - 1, d, 10, 0, 0)
        day = d
      } else {
        dateObj = new Date(row.date)
        day = dateObj.getDate()
      }
      const monthStr = dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      const q = parseFloat(row.quantity) || 0
      const r = parseFloat(row.rate) || 0
      const total = q * r

      return {
        id: `p-bulk-${Date.now()}-${idx}`,
        date: `${day} ${dateObj.toLocaleString("en-IN", { month: "short" })}, 10:00`,
        purchaseDate: row.date,
        monthGroup: monthStr,
        itemName: bulkItemName,
        vendorName: bulkVendorName,
        quantity: q,
        unit: bulkUnit,
        rate: r,
        total: total,
        remarks: row.remarks.trim() || undefined,
      }
    })

    const nextPurchases = [...newEntries, ...purchases]
    updatePurchases(nextPurchases)
    setIsBulkOpen(false)

    // Ensure newly created bulk entries are immediately visible
    if (selectedFY !== "ALL" && selectedFY !== bulkFY) {
      setSelectedFY("ALL")
    }
    if (selectedItemFilter !== "ALL" && selectedItemFilter !== bulkItemName) {
      setSelectedItemFilter("ALL")
    }
    if (selectedVendorFilter !== "ALL" && selectedVendorFilter !== bulkVendorName) {
      setSelectedVendorFilter("ALL")
    }
    if (selectedDateRange !== "ALL") {
      setSelectedDateRange("ALL")
    }
    if (searchQuery) {
      setSearchQuery("")
    }

    toast.success(`Logged ${newEntries.length} bulk purchase entries for ${bulkItemName} (${formatINR(bulkTotalValue)})`)
  }

  // Simultaneous Filter & Universal Sorting Logic
  const filteredAndSortedPurchases = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split("T")[0]

    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    const startOfWeekStr = startOfWeek.toISOString().split("T")[0]

    const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`

    return purchases
      .filter((p) => {
        const q = searchQuery.toLowerCase()
        const matchesSearch =
          p.itemName.toLowerCase().includes(q) ||
          p.vendorName.toLowerCase().includes(q) ||
          (p.remarks && p.remarks.toLowerCase().includes(q))

        const matchesItem = selectedItemFilter === "ALL" || p.itemName === selectedItemFilter
        const matchesVendor = selectedVendorFilter === "ALL" || p.vendorName === selectedVendorFilter

        let matchesDate = true
        if (selectedDateRange === "TODAY") {
          matchesDate = p.purchaseDate === todayStr
        } else if (selectedDateRange === "THIS_WEEK") {
          matchesDate = p.purchaseDate >= startOfWeekStr && p.purchaseDate <= todayStr
        } else if (selectedDateRange === "THIS_MONTH") {
          matchesDate = p.purchaseDate >= startOfMonthStr && p.purchaseDate <= todayStr
        } else if (selectedDateRange === "CUSTOM") {
          if (customStartDate && p.purchaseDate < customStartDate) matchesDate = false
          if (customEndDate && p.purchaseDate > customEndDate) matchesDate = false
        }

        const matchesFY = selectedFY === "ALL" || getFinancialYear(p.purchaseDate) === selectedFY

        return matchesSearch && matchesItem && matchesVendor && matchesDate && matchesFY
      })
      .sort((a, b) => {
        let valA: string | number = ""
        let valB: string | number = ""

        if (sortField === "purchaseDate") {
          valA = a.purchaseDate
          valB = b.purchaseDate
        } else if (sortField === "vendorName") {
          valA = a.vendorName
          valB = b.vendorName
        } else if (sortField === "itemName") {
          valA = a.itemName
          valB = b.itemName
        } else if (sortField === "quantity") {
          valA = a.quantity
          valB = b.quantity
        } else if (sortField === "unit") {
          valA = a.unit
          valB = b.unit
        } else if (sortField === "rate") {
          valA = a.rate
          valB = b.rate
        } else if (sortField === "total") {
          valA = a.total
          valB = b.total
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
    purchases,
    searchQuery,
    selectedFY,
    selectedItemFilter,
    selectedVendorFilter,
    selectedDateRange,
    customStartDate,
    customEndDate,
    sortField,
    sortOrder,
  ])

  // Month-wise Grouped Structure for Table Display
  const groupedPurchasesByMonth = useMemo(() => {
    const groups: { monthGroup: string; items: PurchaseEntry[]; totalAmount: number }[] = []

    filteredAndSortedPurchases.forEach((p) => {
      let monthGroup: string
      if (/^\d{4}-\d{2}-\d{2}/.test(p.purchaseDate)) {
        const [y, m, d] = p.purchaseDate.split("-").map(Number)
        const dateObj = new Date(y, m - 1, d)
        monthGroup = dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      } else {
        const dateObj = new Date(p.purchaseDate)
        monthGroup = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
          : p.monthGroup || "Other"
      }

      let group = groups.find((g) => g.monthGroup === monthGroup)
      if (!group) {
        group = { monthGroup, items: [], totalAmount: 0 }
        groups.push(group)
      }
      group.items.push(p)
      group.totalAmount += p.total
    })

    return groups
  }, [filteredAndSortedPurchases])

  // Total filtered value calculation
  const totalPurchaseValue = useMemo(() => {
    return filteredAndSortedPurchases.reduce((acc, curr) => acc + curr.total, 0)
  }, [filteredAndSortedPurchases])

  // --- Handlers for Open Modals ---
  const handleOpenAddModal = () => {
    const defaultItem = sortedItems[0]?.name || "Pure Cow Ghee"
    setSelectedItemName(defaultItem)
    setPurchaseDate(new Date().toISOString().split("T")[0])
    setQty("")
    setRemarks("")

    handleItemSelectInForm(defaultItem)
    setIsAddOpen(true)
  }

  const handleOpenBulkModal = () => {
    const defaultItem = sortedItems[0] || items[0]
    const defaultItemName = defaultItem?.name || "Pure Cow Ghee"
    const defaultRate = defaultItem ? defaultItem.currentPrice.toString() : ""
    const defaultUnit = defaultItem?.unit || "Kg"

    setBulkItemName(defaultItemName)
    setBulkUnit(defaultUnit)

    const mappedVendors = vendors.filter(
      (v) =>
        v.materials.includes(defaultItemName) ||
        (defaultItem?.vendorNames && defaultItem.vendorNames.includes(v.name))
    )
    const sortedMapped = [...mappedVendors].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    if (sortedMapped.length > 0) {
      setBulkVendorName(sortedMapped[0].name)
    } else {
      const sortedAll = [...vendors].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
      setBulkVendorName(sortedAll[0]?.name || "")
    }

    setBulkRows([
      { id: `br-${Date.now()}-1`, date: new Date().toISOString().split("T")[0], quantity: "", rate: defaultRate, remarks: "" },
    ])
    setIsBulkOpen(true)
  }

  const handleOpenEditModal = (purchase: PurchaseEntry) => {
    setEditingPurchase(purchase)
    setSelectedItemName(purchase.itemName)
    setSelectedVendorName(purchase.vendorName)
    setPurchaseDate(purchase.purchaseDate)
    setQty(purchase.quantity.toString())
    setUnit(purchase.unit)
    setRate(purchase.rate.toString())
    setRemarks(purchase.remarks || "")
    setIsEditOpen(true)
  }

  // --- Create Single Purchase Handler ---
  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItemName || !selectedVendorName || !qty || !rate) {
      toast.error("Please complete all required purchase fields")
      return
    }

    let dateObj: Date
    let day: number
    if (/^\d{4}-\d{2}-\d{2}/.test(purchaseDate)) {
      const [y, m, d] = purchaseDate.split("-").map(Number)
      dateObj = new Date(y, m - 1, d, 10, 0, 0)
      day = d
    } else {
      dateObj = new Date(purchaseDate)
      day = dateObj.getDate()
    }
    const monthStr = dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    const entryFY = getFinancialYear(purchaseDate)

    const newEntry: PurchaseEntry = {
      id: `p-${Date.now()}`,
      date: `${day} ${dateObj.toLocaleString("en-IN", { month: "short" })}, 10:00`,
      purchaseDate: purchaseDate,
      monthGroup: monthStr,
      itemName: selectedItemName,
      vendorName: selectedVendorName,
      quantity: parseFloat(qty),
      unit: unit,
      rate: parseFloat(rate),
      total: calculatedTotal,
      remarks: remarks.trim() || undefined,
    }

    const nextPurchases = [newEntry, ...purchases]
    updatePurchases(nextPurchases)
    setIsAddOpen(false)

    // Ensure newly created purchase is immediately visible
    if (selectedFY !== "ALL" && selectedFY !== entryFY) {
      setSelectedFY("ALL")
    }
    if (selectedItemFilter !== "ALL" && selectedItemFilter !== selectedItemName) {
      setSelectedItemFilter("ALL")
    }
    if (selectedVendorFilter !== "ALL" && selectedVendorFilter !== selectedVendorName) {
      setSelectedVendorFilter("ALL")
    }
    if (selectedDateRange !== "ALL") {
      setSelectedDateRange("ALL")
    }
    if (searchQuery) {
      setSearchQuery("")
    }

    toast.success(`Logged purchase for ${selectedItemName} (${formatINR(calculatedTotal)})`)
  }

  // --- Update Purchase Handler ---
  const handleUpdatePurchase = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPurchase) return
    if (!selectedItemName || !selectedVendorName || !qty || !rate) {
      toast.error("Please complete all required fields")
      return
    }

    let dateObj: Date
    if (/^\d{4}-\d{2}-\d{2}/.test(purchaseDate)) {
      const [y, m, d] = purchaseDate.split("-").map(Number)
      dateObj = new Date(y, m - 1, d, 10, 0, 0)
    } else {
      dateObj = new Date(purchaseDate)
    }
    const monthStr = dateObj.toLocaleDateString("en-IN", { month: "long", year: "numeric" })

    const updated = purchases.map((p) =>
      p.id === editingPurchase.id
        ? {
            ...p,
            purchaseDate: purchaseDate,
            monthGroup: monthStr,
            itemName: selectedItemName,
            vendorName: selectedVendorName,
            quantity: parseFloat(qty),
            unit: unit,
            rate: parseFloat(rate),
            total: calculatedTotal,
            remarks: remarks.trim() || undefined,
          }
        : p
    )

    updatePurchases(updated)
    setIsEditOpen(false)
    setEditingPurchase(null)
    toast.success(`Purchase entry for ${selectedItemName} updated!`)
  }

  const handleDeletePurchase = (id: string, itemName: string) => {
    if (confirm(`Are you sure you want to delete purchase entry for "${itemName}"?`)) {
      const nextPurchases = purchases.filter((p) => p.id !== id)
      updatePurchases(nextPurchases)
      toast.success("Purchase entry removed")
    }
  }

  const handleExportCSV = () => {
    if (filteredAndSortedPurchases.length === 0) {
      toast.error("No purchase records found to export")
      return
    }

    const exportData = filteredAndSortedPurchases.map((p) => ({
      "Date (DD-MM-YYYY)": formatDateDDMMYYYY(p.purchaseDate),
      "Item Name": p.itemName,
      "Vendor Name": p.vendorName,
      "Quantity": p.quantity,
      "Unit": p.unit,
      "Price Amount (₹)": p.rate,
      "Total Amount (₹)": p.total,
      "Notes": p.remarks || ""
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    ws["!cols"] = [
      { wch: 18 },
      { wch: 25 },
      { wch: 24 },
      { wch: 12 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 25 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Purchase_Ledger")
    XLSX.writeFile(wb, `purchase_ledger_${new Date().toISOString().split("T")[0]}.xlsx`)
    toast.success(`Exported ${filteredAndSortedPurchases.length} purchase entries to Excel file`)
  }

  const handleImportPurchases = (newEntries: PurchaseEntry[]) => {
    const nextPurchases = [...newEntries, ...purchases]
    updatePurchases(nextPurchases)
    setSelectedFY("ALL")
    toast.success(`Imported ${newEntries.length} purchase entries successfully`)
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-table-header-text opacity-50 group-hover:opacity-100" />
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-table-header-text font-bold" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-table-header-text font-bold" />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 sm:p-5 rounded-xl border border-border shadow-xs">
        <div>
          <h1 className="text-headline text-foreground font-bold tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="h-6 w-6 text-saffron" />
            Purchases Entry Ledger
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Raw material inventory receipts, vendor mappings & multi-date bulk purchase recording
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          {/* Line 1: Single purchase aur bulk purchase */}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleOpenAddModal} className="h-8 text-xs bg-primary hover:bg-saffron-dark text-white font-semibold shadow-xs">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Add New Purchase
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenBulkModal}
              className="h-8 text-xs border-saffron text-saffron hover:bg-saffron/10 font-semibold"
            >
              <ListPlus className="h-3.5 w-3.5 mr-1.5" /> Bulk Purchase Entry
            </Button>
          </div>
          {/* Line 2: Import aur Export */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(true)}
              className="h-8 text-xs border-border text-foreground hover:bg-muted font-medium"
            >
              <Upload className="h-3.5 w-3.5 mr-1.5 text-saffron" /> Import Excel / CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 text-xs border-border text-foreground hover:bg-muted font-medium">
              <Download className="h-3.5 w-3.5 mr-1.5 text-saffron" /> Export Excel
            </Button>
          </div>
        </div>
      </div>

      {/* KPI & Simultaneous Multi-Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <Card className="sm:col-span-1 bg-saffron-container/20 border-saffron/40 dark:border-saffron/60 flex items-center">
          <CardContent className="p-3.5 w-full">
            <div>
              <span className="text-[13px] sm:text-sm font-bold text-saffron uppercase tracking-wider block">
                Total Purchase
              </span>
              {selectedFY !== "ALL" && (
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold border-saffron/40 dark:border-saffron/60 text-saffron bg-saffron-container/30 px-1.5 py-0"
                  >
                    {selectedFY}
                  </Badge>
                </div>
              )}
            </div>
            <div className="text-xl font-bold text-foreground mt-1.5">{formatINR(totalPurchaseValue)}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Total {filteredAndSortedPurchases.length} {filteredAndSortedPurchases.length === 1 ? "Entry" : "Entries"}
            </p>
          </CardContent>
        </Card>

        {/* Labeled Multi-Filter Card */}
        <Card className="sm:col-span-3 border border-border shadow-card">
          <CardContent className="p-3.5">
            <div className="flex flex-col space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                {/* 1. Search Bar */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search Item, Vendor..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8.5 text-xs h-8"
                    />
                  </div>
                </div>

                {/* 2. Filter by Financial Year */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Filter by Year</Label>
                  <Select value={selectedFY} onValueChange={(val) => val && setSelectedFY(val)}>
                    <SelectTrigger className="w-full h-8 text-xs font-semibold">
                      <SelectValue placeholder="Financial Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Financial Years ({purchases.length})</SelectItem>
                      {availableFinancialYears.map((fy) => {
                        const count = purchases.filter((p) => getFinancialYear(p.purchaseDate) === fy).length
                        return (
                          <SelectItem key={fy} value={fy}>
                            {fy} ({count})
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Filter by Item (Alphabetical A-Z) */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Filter by Item</Label>
                  <Select value={selectedItemFilter} onValueChange={(val) => val && setSelectedItemFilter(val)}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All ({purchases.length})</SelectItem>
                      {uniqueItemsList.map((item) => {
                        const count = purchases.filter((p) => p.itemName === item).length
                        return (
                          <SelectItem key={item} value={item}>
                            {item} ({count})
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* 4. Filter by Vendor (Alphabetical A-Z) */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Filter by Vendor</Label>
                  <Select value={selectedVendorFilter} onValueChange={(val) => val && setSelectedVendorFilter(val)}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      {uniqueVendorsList.map((v) => {
                        const count = purchases.filter((p) => p.vendorName === v).length
                        return (
                          <SelectItem key={v} value={v}>
                            {v} ({count})
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* 5. Date Range Filter */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground">Date Range</Label>
                  <Select value={selectedDateRange} onValueChange={(val: any) => setSelectedDateRange(val)}>
                    <SelectTrigger className="w-full h-8 text-xs">
                      <SelectValue placeholder="All Time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Time</SelectItem>
                      <SelectItem value="TODAY">Today</SelectItem>
                      <SelectItem value="THIS_WEEK">This Week</SelectItem>
                      <SelectItem value="THIS_MONTH">This Month</SelectItem>
                      <SelectItem value="CUSTOM">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 6. Reset Filters Button Slot (Fixed Col 3, never shifts Row 2 Col 2) */}
                <div className="flex items-end justify-end h-8">
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetFilters}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Custom Date Pickers (Shown only if Date Range == CUSTOM) */}
              {selectedDateRange === "CUSTOM" && (
                <div className="flex items-center gap-3 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">From Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-xs h-8 w-40"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">To Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-xs h-8 w-40"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Ledger Table (Grouped Month-Wise with Headings) */}
      <Card className="border border-border shadow-card overflow-hidden">
        <Table>
          <TableHeader className="bg-table-header">
            <TableRow className="hover:bg-transparent">
              {/* 1. Date */}
              <TableHead
                onClick={() => handleSort("purchaseDate")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Date {renderSortIcon("purchaseDate")}
                </div>
              </TableHead>

              {/* 2. Vendor */}
              <TableHead
                onClick={() => handleSort("vendorName")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Vendor {renderSortIcon("vendorName")}
                </div>
              </TableHead>

              {/* 3. Item */}
              <TableHead
                onClick={() => handleSort("itemName")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Item {renderSortIcon("itemName")}
                </div>
              </TableHead>

              {/* 4. Quantity */}
              <TableHead
                onClick={() => handleSort("quantity")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Quantity {renderSortIcon("quantity")}
                </div>
              </TableHead>

              {/* 5. Unit */}
              <TableHead
                onClick={() => handleSort("unit")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Unit {renderSortIcon("unit")}
                </div>
              </TableHead>

              {/* 6. Price */}
              <TableHead
                onClick={() => handleSort("rate")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Price {renderSortIcon("rate")}
                </div>
              </TableHead>

              {/* 7. Total */}
              <TableHead
                onClick={() => handleSort("total")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Total {renderSortIcon("total")}
                </div>
              </TableHead>

              {/* 8. Notes */}
              <TableHead
                onClick={() => handleSort("remarks")}
                className="text-table-header-text font-semibold text-xs text-left cursor-pointer select-none group"
              >
                <div className="flex items-center gap-1.5">
                  Notes {renderSortIcon("remarks")}
                </div>
              </TableHead>

              {/* 9. Action */}
              <TableHead className="text-table-header-text font-semibold text-xs text-left">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {groupedPurchasesByMonth.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-left py-10 text-muted-foreground text-sm">
                  No purchase entries found matching filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              groupedPurchasesByMonth.map((group, groupIdx) => (
                <Fragment key={group.monthGroup}>
                  {/* Clean Blank Space Divider between Month Blocks */}
                  {groupIdx > 0 && (
                    <TableRow className="hover:bg-transparent border-none">
                      <TableCell colSpan={9} className="h-6 py-2 border-none bg-transparent" />
                    </TableRow>
                  )}

                  {/* Month Heading Row */}
                    <TableRow className="bg-saffron-container/40 dark:bg-saffron/20 hover:bg-saffron-container/50 border-t-4 border-t-saffron border-b-2 border-b-saffron/30 transition-colors shadow-2xs">
                      <TableCell colSpan={9} className="py-3 px-4 text-left">
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

                    {/* Purchase Rows for this Month */}
                    {group.items.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                        {/* 1. Date (DD-MM-YYYY format) */}
                        <TableCell className="text-xs font-semibold text-foreground text-left whitespace-nowrap">
                          {formatDateDDMMYYYY(p.purchaseDate)}
                        </TableCell>

                        {/* 2. Vendor */}
                        <TableCell className="text-xs text-foreground font-medium text-left">{p.vendorName}</TableCell>

                        {/* 3. Item */}
                        <TableCell className="text-sm font-bold text-foreground text-left">{p.itemName}</TableCell>

                        {/* 4. Quantity */}
                        <TableCell className="text-xs text-foreground font-semibold text-left">{p.quantity}</TableCell>

                        {/* 5. Unit */}
                        <TableCell className="text-xs text-muted-foreground text-left">{p.unit}</TableCell>

                        {/* 6. Price (Amount only) */}
                        <TableCell className="text-xs text-muted-foreground font-medium text-left">
                          {formatINR(p.rate)}
                        </TableCell>

                        {/* 7. Total */}
                        <TableCell className="text-sm font-bold text-saffron text-left">
                          {formatINR(p.total)}
                        </TableCell>

                        {/* 8. Notes (Sticky Note Icon) */}
                        <TableCell className="text-left">
                          {p.remarks ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setNotePurchase(p)}
                              className="h-8 w-8 text-saffron hover:text-saffron-dark hover:bg-saffron/10"
                              title="View Remarks"
                            >
                              <StickyNote className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground select-none">—</span>
                          )}
                        </TableCell>

                        {/* 9. Action (Both Edit & Delete) */}
                        <TableCell className="text-left">
                          <div className="flex items-center justify-start gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditModal(p)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Edit Purchase"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePurchase(p.id, p.itemName)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              title="Delete Purchase"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Note View Dialog */}
      <Dialog open={!!notePurchase} onOpenChange={(open) => !open && setNotePurchase(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <StickyNote className="h-5 w-5 text-saffron" /> Remarks for {notePurchase?.itemName}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Vendor: {notePurchase?.vendorName} ({formatDateDDMMYYYY(notePurchase?.purchaseDate)})
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 rounded-lg bg-muted/50 border border-border my-2">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {notePurchase?.remarks || "No remarks entered for this purchase."}
            </p>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setNotePurchase(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Bulk Purchase Entry (Multi-Date Recording) */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ListPlus className="h-5 w-5 text-saffron" /> Bulk Purchase Entry (Multi-Date)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select product and vendor once, then record entries across multiple dates in a single submission.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBulkPurchases} className="space-y-4 py-2">
            {/* Top Selection: Item & Vendor (Alphabetically Sorted A-Z) */}
            <div className="grid grid-cols-2 gap-4 p-3 border border-border rounded-lg bg-muted/20">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Item / Product *</Label>
                <Select value={bulkItemName} onValueChange={(val) => val && handleItemSelectInBulkForm(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedItems.map((item) => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.name} ({formatINR(item.currentPrice)}/{item.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Vendor / Supplier *</Label>
                <Select value={bulkVendorName} onValueChange={(val) => val && setBulkVendorName(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bulkAvailableVendors.map((v) => (
                      <SelectItem key={v.id} value={v.name}>
                        {v.name} ({v.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Entries Rows Builder */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Purchase Entries ({bulkRows.length} rows) • Standard Unit: <span className="text-saffron font-bold">{bulkUnit}</span>
                </Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddBulkRow} className="text-xs text-saffron font-semibold">
                  + Add Entry Row
                </Button>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {bulkRows.map((row, idx) => {
                  const rowTotal = (parseFloat(row.quantity) || 0) * (parseFloat(row.rate) || 0)

                  return (
                    <div key={row.id} className="grid grid-cols-12 gap-2 items-center bg-muted/30 p-2.5 rounded-lg border border-border">
                      {/* Date */}
                      <div className="col-span-3 space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Date *</Label>
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) => handleUpdateBulkRow(idx, "date", e.target.value)}
                          className="text-xs h-8"
                          required
                        />
                      </div>

                      {/* Quantity */}
                      <div className="col-span-2 space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Qty ({bulkUnit}) *</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Qty"
                          value={row.quantity}
                          onChange={(e) => handleUpdateBulkRow(idx, "quantity", e.target.value)}
                          className="text-xs h-8 font-semibold"
                          required
                        />
                      </div>

                      {/* Price Amount */}
                      <div className="col-span-2 space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Price ₹ *</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="Price ₹"
                          value={row.rate}
                          onChange={(e) => handleUpdateBulkRow(idx, "rate", e.target.value)}
                          className="text-xs h-8"
                          required
                        />
                      </div>

                      {/* Total Calculation & Remarks */}
                      <div className="col-span-4 space-y-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Row Total:</span>
                          <span className="font-bold text-saffron">{formatINR(rowTotal)}</span>
                        </div>
                        <Input
                          placeholder="Notes/Remarks (Optional)"
                          value={row.remarks}
                          onChange={(e) => handleUpdateBulkRow(idx, "remarks", e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>

                      {/* Delete Action */}
                      <div className="col-span-1 flex items-end justify-center pt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBulkRow(idx)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Total Summary Footer */}
            <div className="p-3 bg-saffron-container/20 border border-saffron/40 dark:border-saffron/60 rounded-lg flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Total Bulk Purchase Value ({bulkRows.length} entries):</span>
              <span className="text-xl font-bold text-saffron">{formatINR(bulkTotalValue)}</span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsBulkOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-saffron-dark text-white font-semibold">
                Save All Bulk Entries
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Add Single Purchase */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Raw Material Purchase</DialogTitle>
            <DialogDescription>Record raw material inventory receipt.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePurchase} className="space-y-4 py-2">
            {/* 1. Item Name First (Alphabetically Sorted A-Z) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Item Name *</Label>
              <Select value={selectedItemName} onValueChange={(val) => val && handleItemSelectInForm(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedItems.map((item) => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.name} ({formatINR(item.currentPrice)}/{item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Available Vendors Dropdown (Alphabetically Sorted A-Z) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Vendor / Supplier *</Label>
                <Select value={selectedVendorName} onValueChange={(val) => val && setSelectedVendorName(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVendorsForItem.map((v) => (
                      <SelectItem key={v.id} value={v.name}>
                        {v.name} ({v.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Purchase Date *</Label>
                <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quantity *</Label>
                <Input type="number" step="any" placeholder="e.g. 100" value={qty} onChange={(e) => setQty(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unit</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Price Amount (₹) *</Label>
                <Input type="number" step="any" placeholder="e.g. 850" value={rate} onChange={(e) => setRate(e.target.value)} required />
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Total Entry Amount:</span>
              <span className="text-lg font-bold text-saffron">{formatINR(calculatedTotal)}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Remarks / Quality Notes</Label>
              <Input placeholder="Optional quality inspection notes..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-saffron-dark text-white font-semibold">
                Save Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Edit Purchase Entry */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePurchase} className="space-y-4 py-2">
            {/* 1. Item Name First (Alphabetically Sorted A-Z) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Item Name *</Label>
              <Select value={selectedItemName} onValueChange={(val) => val && handleItemSelectInForm(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortedItems.map((item) => (
                    <SelectItem key={item.id} value={item.name}>
                      {item.name} ({formatINR(item.currentPrice)}/{item.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Vendor Dropdown (Alphabetically Sorted A-Z) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Vendor / Supplier *</Label>
                <Select value={selectedVendorName} onValueChange={(val) => val && setSelectedVendorName(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVendorsForItem.map((v) => (
                      <SelectItem key={v.id} value={v.name}>
                        {v.name} ({v.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Purchase Date *</Label>
                <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quantity *</Label>
                <Input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unit</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Price Amount (₹) *</Label>
                <Input type="number" step="any" value={rate} onChange={(e) => setRate(e.target.value)} required />
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-semibold">Total Entry Amount:</span>
              <span className="text-lg font-bold text-saffron">{formatINR(calculatedTotal)}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Remarks / Quality Notes</Label>
              <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-saffron-dark text-white font-semibold">
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Import Bulk Purchases (Excel / CSV) */}
      <ImportPurchasesModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportPurchases}
        availableItems={sortedItems}
        availableVendors={vendors}
      />
    </div>
  )
}
