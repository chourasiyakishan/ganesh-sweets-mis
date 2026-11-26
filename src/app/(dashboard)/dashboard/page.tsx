"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  TrendingUp,
  Package,
  ShoppingCart,
  ChefHat,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  Clock,
  SlidersHorizontal,
  RotateCcw,
  Receipt,
  FileText,
  Download,
  Printer,
  AlertTriangle,
  Merge,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatINR, formatDate, formatRelativeDate } from "@/lib/utils"
import {
  PurchaseEntry,
  ExpenseEntry,
  Item,
  Vendor,
  Recipe,
  Order,
} from "@/lib/mockData"
import {
  fetchPurchases,
  fetchExpenses,
  fetchItems,
  fetchVendors,
  fetchRecipes,
  fetchOrders,
  savePurchaseToDb,
} from "@/lib/supabase/data-service"
import { ViewCustomizer, ViewElementOption } from "@/components/common/view-customizer"
import { toast } from "sonner"
import * as XLSX from "xlsx"

const DASHBOARD_VIEW_KEY = "ganesh_sweets_dashboard_view_prefs"

const DASHBOARD_ELEMENTS: ViewElementOption[] = [
  {
    id: "kpi_month_purchases",
    label: "This Month's Purchases KPI",
    description: "Monthly purchase total and entries count",
    category: "Key Metrics",
  },
  {
    id: "kpi_current_month_expenses",
    label: "This Month's Expenses KPI",
    description: "Total overhead expenditures (salaries, rent, utilities) for the active month",
    category: "Key Metrics",
  },
  {
    id: "kpi_master_items",
    label: "Master Raw Materials KPI",
    description: "Total active raw materials across categories",
    category: "Key Metrics",
  },
  {
    id: "kpi_pending_orders",
    label: "Upcoming Pre-Orders KPI",
    description: "Pending orders count and delivery status",
    category: "Key Metrics",
  },
  {
    id: "quick_purchase_entry",
    label: "Quick Purchase Entry Form",
    description: "Instant daily material receipt logging form",
    category: "Operations & Entry",
  },
  {
    id: "recent_purchases_table",
    label: "Recent Purchases Table",
    description: "Latest raw material ledger transactions",
    category: "Operations & Entry",
  },
  {
    id: "upcoming_deliveries",
    label: "Upcoming Deliveries Schedule",
    description: "Customer pre-orders timeline and bill totals",
    category: "Orders & Costing",
  },
  {
    id: "recipe_cost_card",
    label: "Featured Recipe Cost Card",
    description: "Live calculated cost card for Kaju Katli",
    category: "Orders & Costing",
  },
]

export default function DashboardPage() {
  const STORAGE_KEY = "ganesh_sweets_purchases"
  const EXPENSES_STORAGE_KEY = "ganesh_sweets_expenses"

  // Quick Purchase Form State
  const [selectedItem, setSelectedItem] = useState("")
  const [selectedVendor, setSelectedVendor] = useState("")
  const [quantity, setQuantity] = useState("")
  const [unit, setUnit] = useState("Kg")
  const [rate, setRate] = useState("")
  const [lotNumber, setLotNumber] = useState("")
  const [purchasesList, setPurchasesList] = useState<PurchaseEntry[]>([])
  const [expensesList, setExpensesList] = useState<ExpenseEntry[]>([])
  const [itemsList, setItemsList] = useState<Item[]>([])
  const [vendorsList, setVendorsList] = useState<Vendor[]>([])
  const [recipesList, setRecipesList] = useState<Recipe[]>([])
  const [ordersList, setOrdersList] = useState<Order[]>([])

  // Load all dashboard ledgers from live data services
  const loadDashboardData = async () => {
    try {
      const [p, exp, it, v, r, ord] = await Promise.all([
        fetchPurchases(),
        fetchExpenses(),
        fetchItems(),
        fetchVendors(),
        fetchRecipes(),
        fetchOrders(),
      ])
      setPurchasesList(p)
      setExpensesList(exp)
      setItemsList(it)
      setVendorsList(v)
      setRecipesList(r)
      setOrdersList(ord)
    } catch (e) {
      console.error("Failed to load dashboard data:", e)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Sync listener across tabs / routes
  useEffect(() => {
    window.addEventListener("purchases-updated", loadDashboardData)
    window.addEventListener("expenses-updated", loadDashboardData)
    window.addEventListener("items-updated", loadDashboardData)
    window.addEventListener("vendors-updated", loadDashboardData)
    window.addEventListener("recipes-updated", loadDashboardData)
    window.addEventListener("orders-updated", loadDashboardData)
    window.addEventListener("data-cleared", loadDashboardData)
    return () => {
      window.removeEventListener("purchases-updated", loadDashboardData)
      window.removeEventListener("expenses-updated", loadDashboardData)
      window.removeEventListener("items-updated", loadDashboardData)
      window.removeEventListener("vendors-updated", loadDashboardData)
      window.removeEventListener("recipes-updated", loadDashboardData)
      window.removeEventListener("orders-updated", loadDashboardData)
      window.removeEventListener("data-cleared", loadDashboardData)
    }
  }, [])

  // Live total calculation
  const totalAmount = (parseFloat(quantity) || 0) * (parseFloat(rate) || 0)

  const handleItemSelect = (itemId: string) => {
    setSelectedItem(itemId)
    const item = itemsList.find((i) => i.id === itemId)
    if (item) {
      setUnit(item.unit)
      setRate(item.currentPrice.toString())
    }
  }

  // Duplicate detection for today's quick purchase
  const quickMatchingPurchase = useMemo(() => {
    if (!selectedItem || !selectedVendor) return null
    const item = itemsList.find((i) => i.id === selectedItem)
    const vendor = vendorsList.find((v) => v.id === selectedVendor)
    const itemName = item?.name || selectedItem
    const vendorName = vendor?.name || selectedVendor
    const todayStr = new Date().toISOString().split("T")[0]
    return purchasesList.find(
      (p) =>
        p.purchaseDate === todayStr &&
        p.itemName.trim().toLowerCase() === itemName.trim().toLowerCase() &&
        p.vendorName.trim().toLowerCase() === vendorName.trim().toLowerCase()
    )
  }, [selectedItem, selectedVendor, itemsList, vendorsList, purchasesList])

  const handleQuickPurchaseMerge = async (existingId: string) => {
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error("Please enter a valid quantity to merge")
      return
    }
    const additional = parseFloat(quantity)
    const updatedList = purchasesList.map((p) => {
      if (p.id === existingId) {
        const newQty = (p.quantity || 0) + additional
        const newTotal = newQty * (p.rate || 0)
        return {
          ...p,
          quantity: newQty,
          total: newTotal,
          remarks: p.remarks ? `${p.remarks} | Merged +${additional} ${p.unit}` : `Merged +${additional} ${p.unit}`,
        }
      }
      return p
    })
    setPurchasesList(updatedList)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList))
      window.dispatchEvent(new Event("purchases-updated"))
    } catch (e) {
      console.error(e)
    }
    const mergedItem = updatedList.find((p) => p.id === existingId)
    if (mergedItem) {
      await savePurchaseToDb(mergedItem)
    }
    toast.success(`Merged +${additional} ${unit} into today's existing purchase entry`)
    setSelectedItem("")
    setSelectedVendor("")
    setQuantity("")
    setLotNumber("")
  }

  const handleQuickPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedItem || !selectedVendor || !quantity || !rate) {
      toast.error("Please fill in all required fields")
      return
    }

    const item = itemsList.find((i) => i.id === selectedItem)
    const vendor = vendorsList.find((v) => v.id === selectedVendor)
    const now = new Date()
    const todayStr = now.toISOString().split("T")[0]
    const monthStr = now.toLocaleDateString("en-US", { month: "long", year: "numeric" })

    const newPurchase: PurchaseEntry = {
      id: `p-${Date.now()}`,
      date: "Just now",
      purchaseDate: todayStr,
      monthGroup: monthStr,
      itemName: item?.name || selectedItem,
      lotNumber: lotNumber ? `Lot #${lotNumber}` : undefined,
      vendorName: vendor?.name || selectedVendor,
      quantity: parseFloat(quantity),
      unit,
      rate: parseFloat(rate),
      total: totalAmount,
      remarks: "Quick Counter Entry",
    }

    const updatedList = [newPurchase, ...purchasesList]
    setPurchasesList(updatedList)

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList))
      window.dispatchEvent(new Event("purchases-updated"))
    } catch (e) {
      console.error("Failed to save quick purchase:", e)
    }
    await savePurchaseToDb(newPurchase)

    toast.success(`Purchase recorded: ${newPurchase.itemName} (${formatINR(totalAmount)})`)

    // Reset Form
    setSelectedItem("")
    setSelectedVendor("")
    setQuantity("")
    setLotNumber("")
  }

  // Summary Metrics — Dynamic This Month Purchases
  const { currentMonthPurchasesTotal, currentMonthPurchaseCount } = useMemo(() => {
    const activePrefix = new Date().toISOString().slice(0, 7)
    const activeMonthName = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase()
    const currentRecords = purchasesList.filter(
      (p) => p.purchaseDate?.startsWith(activePrefix) || p.monthGroup?.toLowerCase() === activeMonthName
    )
    return {
      currentMonthPurchasesTotal: currentRecords.reduce((sum, p) => sum + (p.total || 0), 0),
      currentMonthPurchaseCount: currentRecords.length,
    }
  }, [purchasesList])

  const pendingOrdersCount = ordersList.filter((o) => o.status === "Pending" || o.status === "Prep").length

  // Expenses summary metrics (calculated dynamically from live expensesList)
  const { currentMonthExpensesTotal, currentMonthVoucherCount } = useMemo(() => {
    const activePrefix = new Date().toISOString().slice(0, 7)
    const activeMonthName = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase()
    const currentRecords = expensesList.filter(
      (e) => e.expenseDate?.startsWith(activePrefix) || e.monthGroup?.toLowerCase() === activeMonthName
    )
    return {
      currentMonthExpensesTotal: currentRecords.reduce((sum, e) => sum + (e.amount || 0), 0),
      currentMonthVoucherCount: currentRecords.length,
    }
  }, [expensesList])

  // Daily Report State
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false)
  const [selectedReportDate, setSelectedReportDate] = useState(() => new Date().toISOString().split("T")[0])

  // Daily Report Data Derivation
  const dailyReportData = useMemo(() => {
    const dayPurchases = purchasesList.filter(
      (p) => p.purchaseDate === selectedReportDate
    )
    const dayExpenses = expensesList.filter(
      (e) => e.expenseDate === selectedReportDate
    )
    const dayOrders = ordersList.filter((o) => o.status === "Pending" || o.status === "Prep")

    const totalPurchasesAmt = dayPurchases.reduce((sum, p) => sum + (p.total || 0), 0)
    const totalExpensesAmt = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)

    return {
      purchases: dayPurchases,
      expenses: dayExpenses,
      orders: dayOrders,
      totalPurchasesAmt,
      totalExpensesAmt,
      totalOutflow: totalPurchasesAmt + totalExpensesAmt,
    }
  }, [purchasesList, expensesList, ordersList, selectedReportDate])

  const handleExportDailyExcel = () => {
    const dataToExport: any[] = []

    dailyReportData.purchases.forEach((p) => {
      dataToExport.push({
        Date: p.purchaseDate || "15-Mar-2026",
        Type: "Purchase",
        Category: "Raw Material",
        Particulars: p.itemName,
        Party: p.vendorName,
        Quantity: `${p.quantity} ${p.unit}`,
        Rate: p.rate,
        Amount: p.total,
        Notes: p.remarks || "",
      })
    })

    dailyReportData.expenses.forEach((e) => {
      dataToExport.push({
        Date: e.expenseDate,
        Type: "Expense",
        Category: e.category,
        Particulars: e.title,
        Party: e.payeeName,
        Quantity: "1 Unit",
        Rate: e.amount,
        Amount: e.amount,
        Notes: e.remarks || "",
      })
    })

    if (dataToExport.length === 0) {
      toast.info("No transaction records found for this date to export")
      return
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Daily Report")
    XLSX.writeFile(wb, `Ganesh_Sweets_Daily_Report_${selectedReportDate}.xlsx`)
    toast.success("Daily report exported to Excel successfully!")
  }

  // View Customization State (Loaded from localStorage)
  const [viewPrefs, setViewPrefs] = useState<Record<string, boolean>>({
    kpi_month_purchases: true,
    kpi_current_month_expenses: true,
    kpi_master_items: true,
    kpi_pending_orders: true,
    quick_purchase_entry: true,
    recent_purchases_table: true,
    upcoming_deliveries: true,
    recipe_cost_card: true,
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_VIEW_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setViewPrefs((prev) => ({
          ...prev,
          ...parsed,
          kpi_month_purchases: parsed.kpi_month_purchases !== undefined ? parsed.kpi_month_purchases : (parsed.kpi_today_purchases !== undefined ? parsed.kpi_today_purchases : true),
          kpi_current_month_expenses: parsed.kpi_current_month_expenses !== undefined ? parsed.kpi_current_month_expenses : true,
        }))
      }
    } catch (e) {
      console.error("Failed to load dashboard view preferences:", e)
    }
  }, [])

  const handleToggleElement = (id: string, checked: boolean) => {
    const updated = { ...viewPrefs, [id]: checked }
    setViewPrefs(updated)
    try {
      localStorage.setItem(DASHBOARD_VIEW_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error("Failed to save view preferences:", e)
    }
  }

  const handleSelectAll = () => {
    const allOn: Record<string, boolean> = {}
    DASHBOARD_ELEMENTS.forEach((el) => {
      allOn[el.id] = true
    })
    setViewPrefs(allOn)
    try {
      localStorage.setItem(DASHBOARD_VIEW_KEY, JSON.stringify(allOn))
    } catch (e) {
      console.error("Failed to save view preferences:", e)
    }
  }

  const handleResetView = () => {
    handleSelectAll()
    toast.success("Dashboard view reset to default")
  }

  const hasVisibleKPIs =
    viewPrefs.kpi_month_purchases ||
    viewPrefs.kpi_current_month_expenses ||
    viewPrefs.kpi_master_items ||
    viewPrefs.kpi_pending_orders

  const hasLeftWidgets = viewPrefs.quick_purchase_entry || viewPrefs.recent_purchases_table
  const hasRightWidgets = viewPrefs.upcoming_deliveries || viewPrefs.recipe_cost_card
  const hasAnyWidgets = hasVisibleKPIs || hasLeftWidgets || hasRightWidgets

  return (
    <div className="space-y-6">
      {/* Page Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-xs">
        <div>
          <h1 className="text-headline text-foreground font-bold tracking-tight">
            Ganesh Sweets Operations Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time operational metrics, raw material purchasing & pre-orders tracking
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewCustomizer
            title="Customize Dashboard View"
            description="Select which information cards and operational widgets to display on this screen."
            options={DASHBOARD_ELEMENTS}
            visibleState={viewPrefs}
            onToggle={handleToggleElement}
            onSelectAll={handleSelectAll}
            onReset={handleResetView}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDailyReportOpen(true)}
            className="h-9 gap-1.5 font-semibold text-xs border-border text-foreground hover:bg-muted cursor-pointer"
          >
            <FileText className="h-4 w-4 text-saffron" /> Daily Report
          </Button>
        </div>
      </div>

      {!hasAnyWidgets ? (
        <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border p-8">
          <SlidersHorizontal className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">All Dashboard Elements Are Hidden</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            You have hidden all dashboard metrics and operational widgets. You can customize which information you want visible anytime.
          </p>
          <Button onClick={handleResetView} size="sm" className="bg-primary hover:bg-saffron-dark text-primary-foreground font-semibold">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset View To Default
          </Button>
        </div>
      ) : (
        <>
          {/* KPI Stats Grid */}
          {hasVisibleKPIs && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KPI 1: This Month's Purchases */}
              {viewPrefs.kpi_month_purchases && (
                <Card className="border-l-4 border-l-saffron shadow-card transition-all hover:shadow-md flex flex-col justify-between h-full">
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                      <span className="text-label text-muted-foreground uppercase tracking-wider text-[11px] font-bold">
                        This Month's Purchases
                      </span>
                      <div className="p-2 rounded-lg bg-saffron-container text-saffron">
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-headline font-bold text-foreground">
                        {formatINR(currentMonthPurchasesTotal)}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          {currentMonthPurchaseCount} {currentMonthPurchaseCount === 1 ? "entry" : "entries"} (March 2026)
                        </p>
                        <Link
                          href="/purchases"
                          className="text-xs font-semibold text-saffron hover:underline inline-flex items-center"
                        >
                          View &rarr;
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* KPI 2: This Month's Expenses */}
              {viewPrefs.kpi_current_month_expenses && (
                <Card className="border-l-4 border-l-purple-600 shadow-card transition-all hover:shadow-md flex flex-col justify-between h-full">
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                      <span className="text-label text-muted-foreground uppercase tracking-wider text-[11px] font-bold">
                        This Month's Expenses
                      </span>
                      <div className="p-2 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        <Receipt className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-headline font-bold text-foreground">
                        {formatINR(currentMonthExpensesTotal)}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          {currentMonthVoucherCount} vouchers (March 2026)
                        </p>
                        <Link
                          href="/expenses"
                          className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center"
                        >
                          View &rarr;
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* KPI 3: Active Raw Materials */}
              {viewPrefs.kpi_master_items && (
                <Card className="border-l-4 border-l-deep-green shadow-card transition-all hover:shadow-md flex flex-col justify-between h-full">
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                      <span className="text-label text-muted-foreground uppercase tracking-wider text-[11px] font-bold">
                        Master Raw Materials
                      </span>
                      <div className="p-2 rounded-lg bg-deep-green-container text-deep-green">
                        <Package className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-headline font-bold text-foreground">
                        {itemsList.length} Items
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground">
                          In Master Raw Materials
                        </p>
                        <Link
                          href="/items"
                          className="text-xs font-semibold text-deep-green hover:underline inline-flex items-center"
                        >
                          View &rarr;
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* KPI 4: Pre-Orders Pending */}
              {viewPrefs.kpi_pending_orders && (
                <Card className="border-l-4 border-l-amber-500 shadow-card transition-all hover:shadow-md flex flex-col justify-between h-full">
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                      <span className="text-label text-muted-foreground uppercase tracking-wider text-[11px] font-bold">
                        Upcoming Pre-Orders
                      </span>
                      <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        <Clock className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="text-headline font-bold text-foreground">
                        {pendingOrdersCount} Active
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Delivery scheduled soon
                        </p>
                        <Link
                          href="/orders"
                          className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center"
                        >
                          View &rarr;
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Main Content Grid: Quick Purchase Form + Upcoming Orders */}
          {(hasLeftWidgets || hasRightWidgets) && (
            <div className={`grid grid-cols-1 ${hasLeftWidgets && hasRightWidgets ? "lg:grid-cols-3" : "lg:grid-cols-1"} gap-6`}>
              {/* Left Column: Quick Purchase Form & Recent Purchases */}
              {hasLeftWidgets && (
                <div className={`${hasRightWidgets ? "lg:col-span-2" : "lg:col-span-1"} space-y-6`}>
                  {/* Quick Purchase Entry Form */}
                  {viewPrefs.quick_purchase_entry && (
                    <Card className="border border-border shadow-card overflow-hidden">
                      <CardHeader className="bg-muted/40 pb-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-title font-bold text-foreground flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-saffron" />
                              Quick Purchase Entry
                            </CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              Log new daily raw material receipt with live total calculation
                            </CardDescription>
                          </div>
                          <Badge variant="outline" className="bg-saffron-container text-saffron text-xs font-medium border-none">
                            Live Rate Calculation
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <form onSubmit={handleQuickPurchaseSubmit} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Select Item */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-foreground">
                                Raw Material Item *
                              </Label>
                              <Select value={selectedItem} onValueChange={(val) => val && handleItemSelect(val)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select raw material..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {itemsList.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.name} ({formatINR(item.currentPrice)}/{item.unit})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Select Vendor */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold text-foreground">
                                Vendor / Supplier *
                              </Label>
                              <Select value={selectedVendor} onValueChange={(val) => val && setSelectedVendor(val)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select vendor..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {vendorsList.map((vendor) => (
                                    <SelectItem key={vendor.id} value={vendor.id}>
                                      {vendor.name} ({vendor.code || "Vendor"})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            {/* Lot Number */}
                            <div className="space-y-1.5 sm:col-span-1">
                              <Label className="text-xs font-semibold text-foreground">Lot / Batch #</Label>
                              <Input
                                placeholder="e.g. 4421"
                                value={lotNumber}
                                onChange={(e) => setLotNumber(e.target.value)}
                              />
                            </div>

                            {/* Quantity */}
                            <div className="space-y-1.5 sm:col-span-1">
                              <Label className="text-xs font-semibold text-foreground">Quantity *</Label>
                              <Input
                                type="number"
                                step="any"
                                placeholder="e.g. 50"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                required
                              />
                            </div>

                            {/* Unit */}
                            <div className="space-y-1.5 sm:col-span-1">
                              <Label className="text-xs font-semibold text-foreground">Unit</Label>
                              <Select value={unit} onValueChange={(val) => val && setUnit(val)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Kg">Kg</SelectItem>
                                  <SelectItem value="Litre">Litre</SelectItem>
                                  <SelectItem value="Gram">Gram</SelectItem>
                                  <SelectItem value="Piece">Piece</SelectItem>
                                  <SelectItem value="Bag">Bag</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Rate */}
                            <div className="space-y-1.5 sm:col-span-1">
                              <Label className="text-xs font-semibold text-foreground">Rate (₹/{unit}) *</Label>
                              <Input
                                type="number"
                                step="any"
                                placeholder="e.g. 850"
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          {/* Quick Conflict Warning */}
                          {quickMatchingPurchase && (
                            <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700/80 bg-amber-50/80 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 text-xs space-y-2 mt-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                  <p className="font-bold text-amber-900 dark:text-amber-100">Notice: Aaj is vendor se entry pehle se darj hai</p>
                                  <p className="text-[11px] opacity-90 mt-0.5">
                                    Aaj <strong>{quickMatchingPurchase.vendorName}</strong> se <strong>{quickMatchingPurchase.itemName}</strong> ({quickMatchingPurchase.quantity} {quickMatchingPurchase.unit} @ {formatINR(quickMatchingPurchase.rate)}) ka record pehle se maujood hai.
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/80 dark:border-amber-800/60">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuickPurchaseMerge(quickMatchingPurchase.id)}
                                  className="text-[11px] h-7 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-900 text-amber-950 dark:text-amber-100 border-amber-300 font-semibold cursor-pointer"
                                >
                                  <Merge className="h-3 w-3 mr-1 text-amber-700 dark:text-amber-300" />
                                  Merge: Add +{quantity || 0} {unit} into Today's Entry
                                </Button>
                                <span className="text-[10px] text-muted-foreground">ya neeche click karke alag nayi row save karein</span>
                              </div>
                            </div>
                          )}

                          {/* Form Footer with Total Display */}
                          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border mt-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Total Entry Amount:</span>
                              <span className="text-headline font-bold text-saffron">
                                {formatINR(totalAmount)}
                              </span>
                            </div>

                            <Button type="submit" className="bg-primary hover:bg-saffron-dark text-primary-foreground font-semibold">
                              <Plus className="h-4 w-4 mr-1.5" /> {quickMatchingPurchase ? "Save as New Row" : "Save Purchase Record"}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Purchases Table */}
                  {viewPrefs.recent_purchases_table && (
                    <Card className="border border-border shadow-card overflow-hidden">
                      <CardHeader className="bg-muted/40 p-4 border-b border-border flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-title font-bold text-foreground">Recent Raw Material Purchases</CardTitle>
                          <CardDescription className="text-xs">Latest recorded transactions</CardDescription>
                        </div>
                        <Link href="/purchases">
                          <Button variant="ghost" size="sm" className="text-xs text-saffron hover:text-saffron-dark font-semibold">
                            View All Ledger →
                          </Button>
                        </Link>
                      </CardHeader>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-table-header">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-table-header-text font-semibold text-xs">Date</TableHead>
                              <TableHead className="text-table-header-text font-semibold text-xs">Item Name</TableHead>
                              <TableHead className="text-table-header-text font-semibold text-xs">Vendor</TableHead>
                              <TableHead className="text-table-header-text font-semibold text-xs text-right">Quantity</TableHead>
                              <TableHead className="text-table-header-text font-semibold text-xs text-right">Rate</TableHead>
                              <TableHead className="text-table-header-text font-semibold text-xs text-right">Total (₹)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {purchasesList.slice(0, 5).map((p) => (
                              <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="text-xs text-muted-foreground font-medium">{p.date}</TableCell>
                                <TableCell className="font-bold text-foreground text-sm">
                                  {p.itemName}
                                  {p.lotNumber && (
                                    <span className="ml-2 text-[10px] text-muted-foreground font-normal bg-muted px-1.5 py-0.5 rounded">
                                      {p.lotNumber}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{p.vendorName}</TableCell>
                                <TableCell className="text-xs font-medium text-right">
                                  {p.quantity} {p.unit}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground text-right">{formatINR(p.rate)}</TableCell>
                                <TableCell className="text-sm font-bold text-saffron text-right">
                                  {formatINR(p.total)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {/* Right Column: Upcoming Customer Orders & Quick Links */}
              {hasRightWidgets && (
                <div className={`${hasLeftWidgets ? "space-y-6" : "lg:col-span-1 space-y-6"}`}>
                  {/* Upcoming Orders Book */}
                  {viewPrefs.upcoming_deliveries && (
                    <Card className="border border-border shadow-card">
                      <CardHeader className="bg-muted/40 p-4 border-b border-border flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-title font-bold text-foreground">Upcoming Deliveries</CardTitle>
                          <CardDescription className="text-xs">Pre-orders schedule</CardDescription>
                        </div>
                        <Link href="/orders">
                          <Button variant="ghost" size="sm" className="text-xs text-saffron hover:text-saffron-dark font-semibold">
                            Orders Book →
                          </Button>
                        </Link>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {ordersList.length === 0 ? (
                          <div className="py-6 text-center text-xs text-muted-foreground">
                            <p className="font-semibold text-foreground">No upcoming deliveries</p>
                            <p className="text-[11px] mt-1">Book customer orders to track deliveries and schedules here.</p>
                          </div>
                        ) : (
                          ordersList.slice(0, 3).map((order) => (
                            <div key={order.id} className="p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-all space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-foreground">{order.customerName}</span>
                                <Badge
                                  className={
                                    order.status === "Packed"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : order.status === "Prep"
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  }
                                >
                                  {order.status}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <p className="line-clamp-1">
                                  {order.items.map((i) => `${i.itemName} (${i.quantity}${i.unit})`).join(", ")}
                                </p>
                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[11px] font-semibold text-deep-green flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Due {formatDate(order.deliveryDate)} ({formatRelativeDate(order.deliveryDate)})
                                  </span>
                                  <span className="font-bold text-saffron">{formatINR(order.totalAmount)}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Recipe Live Cost Quick Card */}
                  {viewPrefs.recipe_cost_card && (
                    <Card className="border border-saffron/40 dark:border-saffron/60 bg-saffron-container/20 shadow-card">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-label text-saffron">Featured Recipe Cost</span>
                          <ChefHat className="h-5 w-5 text-saffron" />
                        </div>
                        {recipesList.length > 0 ? (
                          <>
                            <div>
                              <h3 className="text-title font-bold text-foreground">{recipesList[0].name}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">Live batch cost based on current ingredient purchase rates</p>
                            </div>
                            <div className="flex items-baseline justify-between pt-2 border-t border-saffron/20 dark:border-saffron/40">
                              <span className="text-xs font-medium text-muted-foreground">Current Cost per {recipesList[0].outputUnit || "kg"}:</span>
                              <span className="text-headline font-bold text-saffron">
                                {formatINR(Math.round(recipesList[0].calculatedCostPerKg || 0))}
                              </span>
                            </div>
                            <Link href="/recipes">
                              <Button className="w-full mt-2 bg-primary hover:bg-saffron-dark text-primary-foreground text-xs font-semibold">
                                Open Recipe Costing Calculator
                              </Button>
                            </Link>
                          </>
                        ) : (
                          <div className="py-2 space-y-3 text-center">
                            <div>
                              <h3 className="text-sm font-semibold text-foreground">No Recipes Added Yet</h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                Create your first sweet recipe to calculate live production cost from ingredient rates.
                              </p>
                            </div>
                            <Link href="/recipes" className="block">
                              <Button className="w-full bg-primary hover:bg-saffron-dark text-primary-foreground text-xs font-semibold">
                                Create Recipe
                              </Button>
                            </Link>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* DAILY OPERATIONAL REPORT MODAL */}
      <Dialog open={isDailyReportOpen} onOpenChange={setIsDailyReportOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-saffron" /> Daily Operational Report
            </DialogTitle>
            <DialogDescription className="text-xs">
              Consolidated daily procurement, overhead expenditure & scheduled pre-orders summary
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Date Selection Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-saffron" />
                <span className="text-xs font-semibold text-foreground">Report Date:</span>
                <Input
                  type="date"
                  value={selectedReportDate}
                  onChange={(e) => setSelectedReportDate(e.target.value)}
                  className="h-8 text-xs w-36 bg-background"
                />
              </div>
              <div className="text-xs font-medium text-muted-foreground">
                Active Operational Period: <span className="font-bold text-foreground">March 2026</span>
              </div>
            </div>

            {/* Quick Summary Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg border border-saffron/30 bg-saffron-container/20">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Purchases Logged
                </span>
                <span className="text-lg font-extrabold text-saffron block mt-1">
                  {formatINR(dailyReportData.totalPurchasesAmt)}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  {dailyReportData.purchases.length} {dailyReportData.purchases.length === 1 ? "transaction" : "transactions"}
                </span>
              </div>

              <div className="p-3.5 rounded-lg border border-purple-500/30 bg-purple-500/10">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Expenses Recorded
                </span>
                <span className="text-lg font-extrabold text-purple-600 dark:text-purple-400 block mt-1">
                  {formatINR(dailyReportData.totalExpensesAmt)}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  {dailyReportData.expenses.length} {dailyReportData.expenses.length === 1 ? "voucher" : "vouchers"}
                </span>
              </div>

              <div className="p-3.5 rounded-lg border border-border bg-card">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Total Day Cash Outflow
                </span>
                <span className="text-lg font-extrabold text-foreground block mt-1">
                  {formatINR(dailyReportData.totalOutflow)}
                </span>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Purchases + Overheads
                </span>
              </div>
            </div>

            {/* Itemized Transactions Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted/60 border-b border-border font-bold text-xs flex items-center justify-between">
                <span>Transactions & Vouchers Ledger</span>
                <span className="text-muted-foreground font-normal">
                  {dailyReportData.purchases.length + dailyReportData.expenses.length} total items
                </span>
              </div>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="text-xs font-bold w-24">Type</TableHead>
                    <TableHead className="text-xs font-bold">Particulars / Item</TableHead>
                    <TableHead className="text-xs font-bold">Party / Supplier</TableHead>
                    <TableHead className="text-xs font-bold text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyReportData.purchases.length === 0 && dailyReportData.expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-xs">
                        No transactions recorded for this date.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {dailyReportData.purchases.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="p-2.5">
                            <Badge variant="outline" className="bg-saffron-container/50 text-saffron border-saffron/30 text-[10px] font-bold">
                              Purchase
                            </Badge>
                          </TableCell>
                          <TableCell className="p-2.5">
                            <div className="font-bold text-xs text-foreground">{p.itemName}</div>
                            <div className="text-[10px] text-muted-foreground">Qty: {p.quantity} {p.unit} @ {formatINR(p.rate)}/{p.unit}</div>
                          </TableCell>
                          <TableCell className="p-2.5 text-xs text-foreground">{p.vendorName}</TableCell>
                          <TableCell className="p-2.5 text-xs font-bold text-saffron text-right">{formatINR(p.total)}</TableCell>
                        </TableRow>
                      ))}

                      {dailyReportData.expenses.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="p-2.5">
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[10px] font-bold">
                              Expense
                            </Badge>
                          </TableCell>
                          <TableCell className="p-2.5">
                            <div className="font-bold text-xs text-foreground">{e.title}</div>
                            <div className="text-[10px] text-muted-foreground">{e.category}</div>
                          </TableCell>
                          <TableCell className="p-2.5 text-xs text-foreground">{e.payeeName || "—"}</TableCell>
                          <TableCell className="p-2.5 text-xs font-bold text-purple-600 dark:text-purple-400 text-right">{formatINR(e.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between pt-3 border-t border-border mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDailyExcel}
                className="text-xs gap-1.5 font-semibold text-foreground cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-saffron" /> Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs gap-1.5 font-semibold text-foreground cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsDailyReportOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
