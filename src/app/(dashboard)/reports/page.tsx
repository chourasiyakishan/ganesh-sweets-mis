"use client"

import { useState, useEffect } from "react"
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
    description: "5-month rolling raw material procurement expenditure bar chart",
    category: "Visual Charts",
  },
  {
    id: "category_distribution_chart",
    label: "Category Spend Distribution Pie Chart",
    description: "Budget share breakdown between Dairy, Dry Fruits, Raw Materials & Spices",
    category: "Visual Charts",
  },
  {
    id: "vendor_ranking_table",
    label: "Vendor Expenditure Ranking Table",
    description: "Supplier ranking by purchase volume and percentage of total procurement budget",
    category: "Supplier Intelligence",
  },
]

const monthlyExpenseData = [
  { month: "Nov 2025", expenses: 145000 },
  { month: "Dec 2025", expenses: 182000 },
  { month: "Jan 2026", expenses: 168000 },
  { month: "Feb 2026", expenses: 195000 },
  { month: "Mar 2026", expenses: 210750 },
]

const categoryDistributionData = [
  { name: "Dairy (Ghee, Milk, Mawa)", value: 127500, color: "#3f6653" },
  { name: "Dry Fruits (Kaju, Pista)", value: 45000, color: "#8f4e00" },
  { name: "Raw Materials (Sugar, Besan)", value: 28000, color: "#ff9933" },
  { name: "Spices & Packaging", value: 10250, color: "#a83729" },
]

const vendorSpendData = [
  { vendor: "Mahi Dairy Farms", spend: 127500 },
  { vendor: "Shreeji Dry Fruits", spend: 45000 },
  { vendor: "Gujarat Sugar Mills", spend: 28000 },
  { vendor: "Kerala Spices Co.", spend: 10250 },
]

export default function ReportsPage() {
  const [viewPrefs, setViewPrefs] = useState<Record<string, boolean>>({
    kpi_cards: true,
    comparative_analytics: true,
    price_history_analytics: true,
    monthly_trend_chart: true,
    category_distribution_chart: true,
    vendor_ranking_table: true,
  })

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

  const hasCharts = viewPrefs.monthly_trend_chart || viewPrefs.category_distribution_chart
  const hasAnyWidgets =
    viewPrefs.kpi_cards ||
    viewPrefs.comparative_analytics ||
    viewPrefs.price_history_analytics ||
    hasCharts ||
    viewPrefs.vendor_ranking_table

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-xl border border-border shadow-xs">
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
                  <span className="text-label text-muted-foreground">March Total Purchases</span>
                  <div className="text-headline font-bold text-saffron mt-1">₹2,10,750</div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" /> +8.1% vs Feb 2026
                  </p>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-card">
                <CardContent className="p-5">
                  <span className="text-label text-muted-foreground">Top Category Expense</span>
                  <div className="text-headline font-bold text-deep-green mt-1">Dairy (₹1.27L)</div>
                  <p className="text-xs text-muted-foreground mt-1">60.5% of total raw material budget</p>
                </CardContent>
              </Card>

              <Card className="border border-border shadow-card">
                <CardContent className="p-5">
                  <span className="text-label text-muted-foreground">Primary Supplier</span>
                  <div className="text-headline font-bold text-foreground mt-1">Mahi Dairy Farms</div>
                  <p className="text-xs text-muted-foreground mt-1">5 bulk ledger entries logged in March</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Advanced Comparative & Trend Analytics Engine */}
          {viewPrefs.comparative_analytics && <ComparativeAnalytics />}

          {/* Raw Material Price History & Rate Trend Analytics */}
          {viewPrefs.price_history_analytics && <PriceHistoryAnalytics />}

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
                          <Bar dataKey="expenses" fill="#8f4e00" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
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
                            itemStyle={{ color: "var(--popover-foreground)" }}
                            labelStyle={{ color: "var(--popover-foreground)", fontWeight: "bold" }}
                            formatter={(value: any) => [formatINR(Number(value)), "Amount"]}
                          />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
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
                          {((v.spend / 210750) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
