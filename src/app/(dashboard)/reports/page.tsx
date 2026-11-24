"use client"

import { useState, useEffect, useMemo } from "react"
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  PieChart as PieIcon,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatINR } from "@/lib/utils"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { ViewCustomizer, ViewElementOption } from "@/components/common/view-customizer"
import { ComparativeAnalytics } from "./comparative-analytics"
import { PriceHistoryAnalytics } from "./price-history-analytics"
import { toast } from "sonner"
import { PurchaseEntry, ExpenseEntry, Item } from "@/lib/mockData"
import { fetchPurchases, fetchExpenses, fetchItems } from "@/lib/supabase/data-service"

const REPORTS_VIEW_KEY = "ganesh_sweets_reports_view_prefs"

const REPORTS_ELEMENTS: ViewElementOption[] = [
  {
    id: "kpi_cards",
    label: "Summary Financial KPI Cards",
    description: "Monthly total purchases, top category expenditure & primary supplier summary",
    category: "Financial Overview",
  },
  {
    id: "comparative_analytics",
    label: "Comparative Analytics",
    description: "MoM, QoQ, YoY, custom intervals, quarterly & annual comparative trends with dimensional filters",
    category: "Comparative Insights",
  },
  {
    id: "price_history_analytics",
    label: "Raw Material Price History & Rate Trend Analytics",
    description: "Monthly average procurement rate graph with duration comparisons & inflation tracking",
    category: "Price & Rate Intelligence",
  },
  {
    id: "monthly_trend_chart",
    label: "Monthly Historical Expense Trend Chart",
    description: "Rolling raw material procurement expenditure bar chart",
    category: "Visual Charts",
  },
  {
    id: "category_distribution_chart",
    label: "Category Spend Distribution Pie Chart",
    description: "Budget share breakdown between Raw Materials, Dairy, Dry Fruits & Packaging",
    category: "Visual Charts",
  },
  {
    id: "vendor_ranking_table",
    label: "Vendor Expenditure Ranking Table",
    description: "Supplier ranking by purchase volume and percentage of total procurement budget",
    category: "Supplier Intelligence",
  },
]

export default function ReportsPage() {
  const [purchases, setPurchases] = useState<PurchaseEntry[]>([])
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [items, setItems] = useState<Item[]>([])

  const [viewPrefs, setViewPrefs] = useState<Record<string, boolean>>({
    kpi_cards: true,
    comparative_analytics: true,
    price_history_analytics: true,
    monthly_trend_chart: true,
    category_distribution_chart: true,
    vendor_ranking_table: true,
  })

  const loadReportData = async () => {
    const [p, e, it] = await Promise.all([fetchPurchases(), fetchExpenses(), fetchItems()])
    setPurchases(p)
    setExpenses(e)
    setItems(it)
  }

  useEffect(() => {
    loadReportData()

    window.addEventListener("purchases-updated", loadReportData)
    window.addEventListener("expenses-updated", loadReportData)
    window.addEventListener("items-updated", loadReportData)
    window.addEventListener("data-cleared", loadReportData)
    return () => {
      window.removeEventListener("purchases-updated", loadReportData)
      window.removeEventListener("expenses-updated", loadReportData)
      window.removeEventListener("items-updated", loadReportData)
      window.removeEventListener("data-cleared", loadReportData)
    }
  }, [])

  // Load saved preferences
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REPORTS_VIEW_KEY)
      if (saved) {
        setViewPrefs(JSON.parse(saved))
      }
    } catch (e) {
      console.error("Failed to load reports view preferences:", e)
    }
  }, [])

  const handleToggleElement = (id: string, checked: boolean) => {
    const updated = { ...viewPrefs, [id]: checked }
    setViewPrefs(updated)
    try {
      localStorage.setItem(REPORTS_VIEW_KEY, JSON.stringify(updated))
    } catch (e) {
      console.error("Failed to save view preferences:", e)
    }
  }

  const handleSelectAll = () => {
    const allOn: Record<string, boolean> = {}
    REPORTS_ELEMENTS.forEach((el) => {
      allOn[el.id] = true
    })
    setViewPrefs(allOn)
    try {
      localStorage.setItem(REPORTS_VIEW_KEY, JSON.stringify(allOn))
    } catch (e) {
      console.error("Failed to save view preferences:", e)
    }
  }

  const handleResetView = () => {
    handleSelectAll()
    toast.success("Reports view reset to default")
  }

  const handleExportPDF = () => {
    toast.success("Generating Comprehensive PDF Analytics Report...")
  }

  const handleExportExcel = () => {
    toast.success("Exporting Financial Ledger & Comparative Excel Sheet...")
  }

  // Current active month
  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }, [])

  // 1. Monthly Trends from real purchases & expenses
  const monthlyExpenseData = useMemo(() => {
    if (purchases.length === 0 && expenses.length === 0) return []
    const monthTotals: Record<string, number> = {}

    purchases.forEach((p) => {
      const m = p.monthGroup || "Active"
      monthTotals[m] = (monthTotals[m] || 0) + (p.total || 0)
    })
    expenses.forEach((e) => {
      const m = e.monthGroup || "Active"
      monthTotals[m] = (monthTotals[m] || 0) + (e.amount || 0)
    })

    return Object.entries(monthTotals).map(([month, exp]) => ({
      month,
      expenses: exp,
    }))
  }, [purchases, expenses])

  // 2. Category Distribution from real purchases
  const categoryDistributionData = useMemo(() => {
    if (purchases.length === 0) return []
    const itemCatMap: Record<string, string> = {}
    items.forEach((it) => {
      if (it.name) {
        itemCatMap[it.name.toLowerCase().trim()] = it.category
      }
    })

    const catTotals: Record<string, number> = {}
    purchases.forEach((p) => {
      const cat = (p.itemName && itemCatMap[p.itemName.toLowerCase().trim()]) || "Raw Materials"
      catTotals[cat] = (catTotals[cat] || 0) + (p.total || 0)
    })

    const colors = ["#d9531e", "#0b7a4b", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"]
    return Object.entries(catTotals).map(([name, value], idx) => ({
      name,
      value,
      color: colors[idx % colors.length],
    }))
  }, [purchases, items])

  // 3. Vendor Ranking from real purchases
  const vendorSpendData = useMemo(() => {
    if (purchases.length === 0) return []
    const vTotals: Record<string, number> = {}
    purchases.forEach((p) => {
      const v = p.vendorName || "Unknown Vendor"
      vTotals[v] = (vTotals[v] || 0) + (p.total || 0)
    })

    return Object.entries(vTotals)
      .map(([vendor, spend]) => ({ vendor, spend }))
      .sort((a, b) => b.spend - a.spend)
  }, [purchases])

  const totalPurchasesSpend = useMemo(() => {
    return purchases.reduce((sum, p) => sum + (p.total || 0), 0)
  }, [purchases])

  const currentMonthPurchases = useMemo(() => {
    return purchases
      .filter((p) => p.monthGroup?.toLowerCase() === currentMonthName.toLowerCase())
      .reduce((sum, p) => sum + (p.total || 0), 0)
  }, [purchases, currentMonthName])

  const topCategory = useMemo(() => {
    if (categoryDistributionData.length === 0) return null
    return [...categoryDistributionData].sort((a, b) => b.value - a.value)[0]
  }, [categoryDistributionData])

  const primarySupplier = useMemo(() => {
    if (vendorSpendData.length === 0) return null
    return vendorSpendData[0]
  }, [vendorSpendData])

  const hasCharts = viewPrefs.monthly_trend_chart || viewPrefs.category_distribution_chart
  const hasAnyWidgets =
    viewPrefs.kpi_cards ||
    viewPrefs.comparative_analytics ||
    viewPrefs.price_history_analytics ||
    viewPrefs.monthly_trend_chart ||
    viewPrefs.category_distribution_chart ||
    viewPrefs.vendor_ranking_table

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-headline text-foreground font-bold tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-saffron" />
            Business Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Raw material expense analysis, vendor spending breakdown, comparative benchmarks & trends
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewCustomizer
            title="Customize Reports View"
            description="Select which analytics widgets, comparison modules and charts to display on this report."
            options={REPORTS_ELEMENTS}
            visibleState={viewPrefs}
            onToggle={handleToggleElement}
            onSelectAll={handleSelectAll}
            onReset={handleResetView}
          />
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="cursor-pointer font-medium">
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" /> Export Excel
          </Button>
          <Button size="sm" onClick={handleExportPDF} className="bg-primary hover:bg-saffron-dark text-white font-semibold cursor-pointer">
            <Download className="h-4 w-4 mr-1.5" /> Export PDF Summary
          </Button>
        </div>
      </div>

      {!hasAnyWidgets ? (
        <div className="py-16 text-center bg-card rounded-xl border border-dashed border-border p-8">
          <SlidersHorizontal className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">All Reports Elements Are Hidden</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            You have hidden all report charts, comparative engines and metric cards. You can customize which information you want visible anytime.
          </p>
          <Button onClick={handleResetView} size="sm" className="bg-primary hover:bg-saffron-dark text-primary-foreground font-semibold cursor-pointer">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset View To Default
          </Button>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          {viewPrefs.kpi_cards && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border border-border shadow-card">
                <CardContent className="p-5">
                  <span className="text-label text-muted-foreground">{currentMonthName} Purchases</span>
                  <div className="text-headline font-bold text-saffron mt-1">
                    {formatINR(currentMonthPurchases || totalPurchasesSpend)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {purchases.length} total procurement entries logged
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-card">
                <CardContent className="p-5">
                  <span className="text-label text-muted-foreground">Top Category Expense</span>
                  <div className="text-headline font-bold text-deep-green mt-1">
                    {topCategory ? `${topCategory.name} (${formatINR(topCategory.value)})` : "No Category Data"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {topCategory && totalPurchasesSpend > 0
                      ? `${((topCategory.value / totalPurchasesSpend) * 100).toFixed(1)}% of total purchase budget`
                      : "Add purchases to view category distribution"}
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-card">
                <CardContent className="p-5">
                  <span className="text-label text-muted-foreground">Primary Supplier</span>
                  <div className="text-headline font-bold text-foreground mt-1">
                    {primarySupplier ? primarySupplier.vendor : "No Supplier Data"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {primarySupplier ? `${formatINR(primarySupplier.spend)} total procurement volume` : "Add purchases to view supplier ranking"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Advanced Comparative & Trend Analytics Engine */}
          {viewPrefs.comparative_analytics && <ComparativeAnalytics purchases={purchases} />}

          {/* Raw Material Price History & Rate Trend Analytics */}
          {viewPrefs.price_history_analytics && <PriceHistoryAnalytics purchases={purchases} />}

          {/* Visual Charts Grid */}
          {hasCharts && (
            <div className={`grid grid-cols-1 ${viewPrefs.monthly_trend_chart && viewPrefs.category_distribution_chart ? "lg:grid-cols-2" : "lg:grid-cols-1"} gap-6`}>
              {/* Chart 1: Monthly Expense Trend */}
              {viewPrefs.monthly_trend_chart && (
                <Card className="border border-border shadow-card">
                  <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="text-title font-bold text-foreground">Monthly Expense Trend</CardTitle>
                    <CardDescription className="text-xs">Historical raw material purchases expenditure</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {monthlyExpenseData.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-muted/20 rounded-lg border border-dashed border-border">
                        <BarChart3 className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-xs font-semibold text-foreground">No Monthly Trends Recorded</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Purchases entered into the ledger will automatically plot monthly spend here.</p>
                      </div>
                    ) : (
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={monthlyExpenseData}>
                            <XAxis dataKey="month" stroke="#887364" fontSize={12} />
                            <YAxis stroke="#887364" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "var(--popover)",
                                borderColor: "var(--border)",
                                borderRadius: "8px",
                                color: "var(--popover-foreground)",
                              }}
                              itemStyle={{ color: "var(--popover-foreground)" }}
                              labelStyle={{ color: "var(--popover-foreground)", fontWeight: "bold" }}
                              formatter={(value: any) => [formatINR(Number(value)), "Purchases"]}
                            />
                            <Bar dataKey="expenses" fill="#d9531e" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Chart 2: Category Distribution Pie Chart */}
              {viewPrefs.category_distribution_chart && (
                <Card className="border border-border shadow-card">
                  <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="text-title font-bold text-foreground">Category Spend Distribution</CardTitle>
                    <CardDescription className="text-xs">Expense ratio across Dairy, Dry Fruits & Ingredients</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {categoryDistributionData.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-muted/20 rounded-lg border border-dashed border-border">
                        <PieIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-xs font-semibold text-foreground">No Category Spend Data Available</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Category allocations will appear once raw material purchases are recorded.</p>
                      </div>
                    ) : (
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categoryDistributionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {categoryDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "var(--popover)",
                                borderColor: "var(--border)",
                                borderRadius: "8px",
                                color: "var(--popover-foreground)",
                              }}
                              formatter={(value: any) => [formatINR(Number(value)), "Spend"]}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={36}
                              formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Vendor Spending Breakdown Table */}
          {viewPrefs.vendor_ranking_table && (
            <Card className="border border-border shadow-card">
              <CardHeader className="bg-muted/30 border-b border-border">
                <CardTitle className="text-title font-bold text-foreground">Vendor Expenditure Ranking</CardTitle>
                <CardDescription className="text-xs">Supplier ranking by procurement share</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {vendorSpendData.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No vendor expenditures logged yet. Add purchases in Purchases Ledger to see supplier ranking.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-table-header text-table-header-text">
                      <tr>
                        <th className="p-3">Vendor Name</th>
                        <th className="p-3 text-right">Total Spent (₹)</th>
                        <th className="p-3 text-right">% of Total Budget</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {vendorSpendData.map((v) => (
                        <tr key={v.vendor} className="hover:bg-muted/40">
                          <td className="p-3 font-bold text-foreground">{v.vendor}</td>
                          <td className="p-3 text-right font-bold text-saffron">{formatINR(v.spend)}</td>
                          <td className="p-3 text-right text-muted-foreground">
                            {totalPurchasesSpend > 0 ? ((v.spend / totalPurchasesSpend) * 100).toFixed(1) : "0.0"}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
