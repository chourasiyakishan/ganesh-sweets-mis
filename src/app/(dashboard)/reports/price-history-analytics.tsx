"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Filter,
  BarChart3,
  ArrowRightLeft,
  Calendar,
  Sparkles,
  RotateCcw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatINR } from "@/lib/utils"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts"
import { PurchaseEntry } from "@/lib/mockData"

export type TimeframeOption = "CURRENT" | "3M" | "6M" | "ALL_FY"
export type ComparisonGranularity = "MONTH" | "QUARTER" | "BLOCK"

export interface MonthlyRateRecord {
  month: string // e.g. "Aug 2025"
  sortKey: string // "2025-08"
  fy: string
  quarter: string
  itemName: string
  category: string
  unit: string
  avgRate: number
  minRate: number
  maxRate: number
  totalQty: number
  totalSpend: number
  vendor: string
}

function getFinancialYear(dateStr: string): string {
  if (!dateStr) return "FY 2025-26"
  const y = parseInt(dateStr.slice(0, 4), 10)
  const m = parseInt(dateStr.slice(5, 7), 10)
  if (isNaN(y) || isNaN(m)) return "FY 2025-26"
  if (m <= 3) {
    return `FY ${y - 1}-${String(y).slice(-2)}`
  } else {
    return `FY ${y}-${String(y + 1).slice(-2)}`
  }
}

function getQuarter(monthNum: number, fy: string): string {
  if (monthNum >= 4 && monthNum <= 6) return `Q1 ${fy}`
  if (monthNum >= 7 && monthNum <= 9) return `Q2 ${fy}`
  if (monthNum >= 10 && monthNum <= 12) return `Q3 ${fy}`
  return `Q4 ${fy}`
}

export function computeMonthlyRateRecords(purchases: PurchaseEntry[]): MonthlyRateRecord[] {
  if (!purchases || purchases.length === 0) return []

  const map: Record<
    string,
    {
      month: string
      sortKey: string
      fy: string
      quarter: string
      itemName: string
      unit: string
      rates: number[]
      totalQty: number
      totalSpend: number
      vendors: Record<string, number>
    }
  > = {}

  purchases.forEach((p) => {
    const rawDate = p.purchaseDate || p.date || ""
    if (!rawDate) return

    let y = 0
    let m = 0
    if (/^\d{4}-\d{2}/.test(rawDate)) {
      y = parseInt(rawDate.slice(0, 4), 10)
      m = parseInt(rawDate.slice(5, 7), 10)
    } else {
      const match = rawDate.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
      if (match) {
        m = parseInt(match[2], 10)
        y = parseInt(match[3], 10)
      } else {
        const d = new Date(rawDate)
        if (!isNaN(d.getTime())) {
          y = d.getFullYear()
          m = d.getMonth() + 1
        }
      }
    }
    if (!y || !m) return

    const sortKey = `${y}-${String(m).padStart(2, "0")}`
    const d = new Date(y, m - 1, 1)
    const month = d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    const fy = getFinancialYear(`${y}-${String(m).padStart(2, "0")}-01`)
    const quarter = getQuarter(m, fy)
    const itemName = p.itemName ? p.itemName.trim() : "Unknown Item"
    const key = `${itemName}____${sortKey}`

    if (!map[key]) {
      map[key] = {
        month,
        sortKey,
        fy,
        quarter,
        itemName,
        unit: p.unit || "Kg",
        rates: [],
        totalQty: 0,
        totalSpend: 0,
        vendors: {},
      }
    }

    const group = map[key]
    const q = p.quantity || 0
    const spend = p.total || 0
    const r = p.rate || (q > 0 ? spend / q : 0)

    group.totalQty += q
    group.totalSpend += spend
    if (r > 0) group.rates.push(r)
    if (p.vendorName) {
      group.vendors[p.vendorName] = (group.vendors[p.vendorName] || 0) + spend
    }
  })

  return Object.values(map)
    .map((g) => {
      let primaryVendor = "General Supplier"
      let maxVSpend = -1
      Object.entries(g.vendors).forEach(([v, s]) => {
        if (s > maxVSpend) {
          maxVSpend = s
          primaryVendor = v
        }
      })

      const avgRate = g.totalQty > 0 ? g.totalSpend / g.totalQty : g.rates[0] || 0
      const minRate = g.rates.length > 0 ? Math.min(...g.rates) : avgRate
      const maxRate = g.rates.length > 0 ? Math.max(...g.rates) : avgRate

      return {
        month: g.month,
        sortKey: g.sortKey,
        fy: g.fy,
        quarter: g.quarter,
        itemName: g.itemName,
        category: "Raw Materials",
        unit: g.unit,
        avgRate: Math.round(avgRate * 100) / 100,
        minRate: Math.round(minRate * 100) / 100,
        maxRate: Math.round(maxRate * 100) / 100,
        totalQty: Math.round(g.totalQty * 100) / 100,
        totalSpend: Math.round(g.totalSpend * 100) / 100,
        vendor: primaryVendor,
      }
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
}

export function PriceHistoryAnalytics({ purchases = [] }: { purchases?: PurchaseEntry[] }) {
  const allRecords = useMemo(() => computeMonthlyRateRecords(purchases), [purchases])

  const categoriesList = useMemo(() => {
    return Array.from(new Set(allRecords.map((r) => r.category))).sort()
  }, [allRecords])

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
  const [selectedMaterial, setSelectedMaterial] = useState<string>("")
  const [timeframe, setTimeframe] = useState<TimeframeOption>("6M")

  const availableMaterials = useMemo(() => {
    let items = allRecords
    if (selectedCategory !== "ALL") {
      items = items.filter((r) => r.category === selectedCategory)
    }
    return Array.from(new Set(items.map((r) => r.itemName))).sort()
  }, [allRecords, selectedCategory])

  useEffect(() => {
    if (availableMaterials.length > 0 && (!selectedMaterial || !availableMaterials.includes(selectedMaterial))) {
      setSelectedMaterial(availableMaterials[0])
    }
  }, [availableMaterials, selectedMaterial])

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    const categoryItems = Array.from(
      new Set(allRecords.filter((r) => cat === "ALL" || r.category === cat).map((r) => r.itemName))
    ).sort()

    if (categoryItems.length > 0) {
      setSelectedMaterial(categoryItems[0])
    }
  }

  // All distinct historical months available for comparison
  const allAvailableMonths = useMemo(() => {
    const monthKeyMap = new Map<string, string>()
    allRecords.forEach((r) => monthKeyMap.set(r.month, r.sortKey))
    return Array.from(monthKeyMap.keys()).sort((a, b) => {
      const keyA = monthKeyMap.get(a) || ""
      const keyB = monthKeyMap.get(b) || ""
      return keyB.localeCompare(keyA)
    })
  }, [allRecords])

  // All distinct historical quarters available for comparison
  const allAvailableQuarters = useMemo(() => {
    return Array.from(new Set(allRecords.map((r) => r.quarter))).sort().reverse()
  }, [allRecords])

  // Duration Comparison Mode State
  const [isCompareDurations, setIsCompareDurations] = useState(false)
  const [comparisonGranularity, setComparisonGranularity] = useState<ComparisonGranularity>("MONTH")
  const [compareMonthA, setCompareMonthA] = useState<string>("")
  const [compareMonthB, setCompareMonthB] = useState<string>("")
  const [compareQuarterA, setCompareQuarterA] = useState<string>("")
  const [compareQuarterB, setCompareQuarterB] = useState<string>("")
  const [blockDurationA, setBlockDurationA] = useState<"LAST_3M" | "LAST_4M">("LAST_3M")
  const [blockDurationB, setBlockDurationB] = useState<"PRIOR_3M" | "PRIOR_4M">("PRIOR_3M")

  useEffect(() => {
    if (allAvailableMonths.length > 0) {
      if (!compareMonthA || !allAvailableMonths.includes(compareMonthA)) {
        setCompareMonthA(allAvailableMonths[0])
      }
      if (!compareMonthB || !allAvailableMonths.includes(compareMonthB)) {
        setCompareMonthB(allAvailableMonths[1] || allAvailableMonths[0])
      }
    }
    if (allAvailableQuarters.length > 0) {
      if (!compareQuarterA || !allAvailableQuarters.includes(compareQuarterA)) {
        setCompareQuarterA(allAvailableQuarters[0])
      }
      if (!compareQuarterB || !allAvailableQuarters.includes(compareQuarterB)) {
        setCompareQuarterB(allAvailableQuarters[1] || allAvailableQuarters[0])
      }
    }
  }, [allAvailableMonths, allAvailableQuarters])

  // Filtered dataset for selected material and timeframe (Strictly bounded to latest available FY)
  const filteredRecords = useMemo(() => {
    const materialRecords = allRecords.filter((r) => r.itemName === selectedMaterial)
    if (materialRecords.length === 0) return []

    const availableFYs = Array.from(new Set(materialRecords.map((r) => r.fy))).sort().reverse()
    const latestFY = availableFYs[0]

    let items = materialRecords.filter((r) => r.fy === latestFY)
    if (items.length === 0) items = materialRecords

    if (timeframe === "CURRENT") {
      return items.slice(-1)
    }
    if (timeframe === "3M") {
      return items.slice(-3)
    }
    if (timeframe === "6M") {
      return items.slice(-6)
    }
    return items
  }, [allRecords, selectedMaterial, timeframe])

  // Summary Metrics for the active material & duration
  const { currentRate, minRate, maxRate, startRate, priceVariance, priceVariancePct, avgPeriodRate, unit } =
    useMemo(() => {
      if (filteredRecords.length === 0) {
        return {
          currentRate: 0,
          minRate: 0,
          maxRate: 0,
          startRate: 0,
          priceVariance: 0,
          priceVariancePct: 0,
          avgPeriodRate: 0,
          unit: "Unit",
        }
      }

      const rates = filteredRecords.map((r) => r.avgRate)
      const cRate = rates[rates.length - 1]
      const sRate = rates[0]
      const mn = Math.min(...rates)
      const mx = Math.max(...rates)
      const diff = cRate - sRate
      const pct = sRate > 0 ? (diff / sRate) * 100 : 0
      const totalSpend = filteredRecords.reduce((acc, curr) => acc + curr.totalSpend, 0)
      const totalQty = filteredRecords.reduce((acc, curr) => acc + curr.totalQty, 0)
      const weightedAvg = totalQty > 0 ? totalSpend / totalQty : cRate

      return {
        currentRate: cRate,
        minRate: mn,
        maxRate: mx,
        startRate: sRate,
        priceVariance: diff,
        priceVariancePct: pct,
        avgPeriodRate: weightedAvg,
        unit: filteredRecords[0].unit,
      }
    }, [filteredRecords])

  // Dynamic Duration Comparison Analytics
  const compareMetrics = useMemo(() => {
    const allForMaterial = allRecords.filter((r) => r.itemName === selectedMaterial)

    if (comparisonGranularity === "MONTH") {
      const recA = allForMaterial.find((r) => r.month === compareMonthA)
      const recB = allForMaterial.find((r) => r.month === compareMonthB)

      const rateA = recA ? recA.avgRate : 0
      const rateB = recB ? recB.avgRate : 0
      const diff = rateA - rateB
      const pct = rateB > 0 ? (diff / rateB) * 100 : 0

      return {
        labelA: compareMonthA || "Selected Month",
        labelB: compareMonthB || "Prior Month",
        rateA,
        rateB,
        diffRate: diff,
        pctChange: pct,
        qtyA: recA ? recA.totalQty : 0,
        qtyB: recB ? recB.totalQty : 0,
        spendA: recA ? recA.totalSpend : 0,
        spendB: recB ? recB.totalSpend : 0,
      }
    }

    if (comparisonGranularity === "QUARTER") {
      const recsA = allForMaterial.filter((r) => r.quarter === compareQuarterA)
      const recsB = allForMaterial.filter((r) => r.quarter === compareQuarterB)

      const qtyA = recsA.reduce((acc, c) => acc + c.totalQty, 0)
      const spendA = recsA.reduce((acc, c) => acc + c.totalSpend, 0)
      const rateA = qtyA > 0 ? spendA / qtyA : 0

      const qtyB = recsB.reduce((acc, c) => acc + c.totalQty, 0)
      const spendB = recsB.reduce((acc, c) => acc + c.totalSpend, 0)
      const rateB = qtyB > 0 ? spendB / qtyB : 0

      const diff = rateA - rateB
      const pct = rateB > 0 ? (diff / rateB) * 100 : 0

      return {
        labelA: compareQuarterA || "Selected Quarter",
        labelB: compareQuarterB || "Prior Quarter",
        rateA,
        rateB,
        diffRate: diff,
        pctChange: pct,
        qtyA,
        qtyB,
        spendA,
        spendB,
      }
    }

    // MULTI-MONTH BLOCK
    const numA = blockDurationA === "LAST_3M" ? 3 : 4
    const numB = blockDurationB === "PRIOR_3M" ? 3 : 4

    const reversed = [...allForMaterial]
    const sliceA = reversed.slice(-numA)
    const sliceB = reversed.slice(-(numA + numB), -numA)

    const qtyA = sliceA.reduce((acc, c) => acc + c.totalQty, 0)
    const spendA = sliceA.reduce((acc, c) => acc + c.totalSpend, 0)
    const rateA = qtyA > 0 ? spendA / qtyA : 0

    const qtyB = sliceB.reduce((acc, c) => acc + c.totalQty, 0)
    const spendB = sliceB.reduce((acc, c) => acc + c.totalSpend, 0)
    const rateB = qtyB > 0 ? spendB / qtyB : 0

    const diff = rateA - rateB
    const pct = rateB > 0 ? (diff / rateB) * 100 : 0

    return {
      labelA: `Recent ${numA} Months Block`,
      labelB: `Prior ${numB} Months Block`,
      rateA,
      rateB,
      diffRate: diff,
      pctChange: pct,
      qtyA,
      qtyB,
      spendA,
      spendB,
    }
  }, [
    allRecords,
    selectedMaterial,
    comparisonGranularity,
    compareMonthA,
    compareMonthB,
    compareQuarterA,
    compareQuarterB,
    blockDurationA,
    blockDurationB,
  ])

  if (!purchases || purchases.length === 0 || allRecords.length === 0) {
    return (
      <Card className="border border-border shadow-card p-10 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">No Price History Available</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Raw material price history and rate fluctuation graphs will automatically populate as purchases are logged for ingredients over time.
        </p>
      </Card>
    )
  }

  // Tooltip custom renderer
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    const record: MonthlyRateRecord = payload[0]?.payload

    return (
      <div className="bg-popover text-popover-foreground border border-border shadow-2xl rounded-xl p-3 min-w-44 text-xs backdrop-blur-md">
        <div className="font-bold text-foreground border-b border-border/80 pb-1.5 mb-2 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] text-muted-foreground font-normal">{record?.fy}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Average Rate:</span>
            <span className="font-bold text-saffron font-mono">{formatINR(record?.avgRate)}/{unit}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Min - Max:</span>
            <span className="font-mono text-[11px] text-foreground">
              {formatINR(record?.minRate)} - {formatINR(record?.maxRate)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Volume Procured:</span>
            <span className="font-semibold text-foreground">{record?.totalQty} {unit}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Total Spend:</span>
            <span className="font-semibold text-foreground font-mono">{formatINR(record?.totalSpend)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/60 text-[10px]">
            <span className="text-muted-foreground">Primary Supplier:</span>
            <span className="font-medium text-foreground truncate max-w-28">{record?.vendor}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="border border-border shadow-card">
      <CardHeader className="bg-muted/30 border-b border-border pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-title font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-saffron" />
              Raw Material Price History & Rate Trend Analytics
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Monthly weighted average procurement rates, price volatility, and interval benchmarking for sweet manufacturing ingredients
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={isCompareDurations ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCompareDurations(!isCompareDurations)}
              className={`text-xs font-semibold cursor-pointer ${
                isCompareDurations ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
              {isCompareDurations ? "Close Comparison" : "Compare Intervals"}
            </Button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="mt-4 pt-3 border-t border-border/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="text-[11px] font-bold text-muted-foreground">Category:</span>
              <Select value={selectedCategory} onValueChange={(val) => val && handleCategoryChange(val)}>
                <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-semibold text-foreground focus:ring-0 shadow-none w-28">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Categories</SelectItem>
                  {categoriesList.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Material / Item Selector */}
            <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1 shadow-2xs">
              <span className="text-[11px] font-bold text-muted-foreground">Ingredient:</span>
              <Select value={selectedMaterial} onValueChange={(val) => val && setSelectedMaterial(val)}>
                <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMaterials.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
            {(
              [
                { id: "CURRENT", label: "Current" },
                { id: "3M", label: "Last 3M" },
                { id: "6M", label: "Last 6M" },
                { id: "ALL_FY", label: "Financial Year" },
              ] as { id: TimeframeOption; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeframe(opt.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  timeframe === opt.id
                    ? "bg-card text-foreground shadow-xs border border-border/80"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* KPI CARDS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-muted/30 border border-border shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Current Procurement Rate
            </span>
            <div className="text-xl font-bold text-saffron mt-1 font-mono">
              {formatINR(currentRate)} <span className="text-xs font-normal text-muted-foreground">/{unit}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Latest purchase record rate</p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {timeframe} Rate Shift
            </span>
            <div className="text-xl font-bold text-foreground mt-1 flex items-center gap-1.5 font-mono">
              <span className={priceVariance > 0 ? "text-amber-600" : priceVariance < 0 ? "text-deep-green" : "text-muted-foreground"}>
                {priceVariance > 0 ? `+${formatINR(priceVariance)}` : formatINR(priceVariance)}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 font-bold ${
                  priceVariance > 0
                    ? "text-amber-600 border-amber-500/40 bg-amber-500/10"
                    : priceVariance < 0
                    ? "text-deep-green border-deep-green/40 bg-deep-green/10"
                    : "text-muted-foreground"
                }`}
              >
                {priceVariancePct > 0 ? `+${priceVariancePct.toFixed(1)}%` : `${priceVariancePct.toFixed(1)}%`}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              From baseline {formatINR(startRate)}/{unit}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Rate Range (Min - Max)
            </span>
            <div className="text-xl font-bold text-foreground mt-1 font-mono">
              {formatINR(minRate)} - {formatINR(maxRate)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Spread of ₹{Math.max(0, maxRate - minRate)} during period</p>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Weighted Average Rate
            </span>
            <div className="text-xl font-bold text-foreground mt-1 font-mono">
              {formatINR(Math.round(avgPeriodRate * 100) / 100)} <span className="text-xs font-normal text-muted-foreground">/{unit}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Vol-weighted procurement benchmark</p>
          </div>
        </div>

        {/* DURATION COMPARISON SECTION */}
        {isCompareDurations && (
          <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <ArrowRightLeft className="h-4 w-4 text-saffron" />
                  Procurement Rate Comparison Across Time Intervals
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Compare procurement rates across any two individual months, quarters, or historical intervals
                </p>
              </div>

              {/* Granularity Picker */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border self-start sm:self-auto shrink-0">
                {(
                  [
                    { id: "MONTH", label: "Month-wise" },
                    { id: "QUARTER", label: "Quarter-wise" },
                    { id: "BLOCK", label: "Multi-Month Block" },
                  ] as { id: ComparisonGranularity; label: string }[]
                ).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setComparisonGranularity(g.id)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      comparisonGranularity === g.id
                        ? "bg-card text-foreground shadow-xs border border-border/80"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/40"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selectors Bar */}
            <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Duration A Selector */}
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff9933] shrink-0" />
                  <span className="text-xs font-bold text-muted-foreground">Primary:</span>
                  {comparisonGranularity === "MONTH" && (
                    <Select value={compareMonthA} onValueChange={(val) => val && setCompareMonthA(val)}>
                      <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allAvailableMonths.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {comparisonGranularity === "QUARTER" && (
                    <Select value={compareQuarterA} onValueChange={(val) => val && setCompareQuarterA(val)}>
                      <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allAvailableQuarters.map((q) => (
                          <SelectItem key={q} value={q}>
                            {q}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {comparisonGranularity === "BLOCK" && (
                    <Select value={blockDurationA} onValueChange={(val) => val && setBlockDurationA(val as any)}>
                      <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LAST_3M">Recent 3 Months</SelectItem>
                        <SelectItem value="LAST_4M">Recent 4 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <span className="text-xs font-bold text-muted-foreground">vs</span>

                {/* Duration B Selector */}
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-1.5 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3f6653] shrink-0" />
                  <span className="text-xs font-bold text-muted-foreground">Benchmark:</span>
                  {comparisonGranularity === "MONTH" && (
                    <Select value={compareMonthB} onValueChange={(val) => val && setCompareMonthB(val)}>
                      <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allAvailableMonths.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {comparisonGranularity === "QUARTER" && (
                    <Select value={compareQuarterB} onValueChange={(val) => val && setCompareQuarterB(val)}>
                      <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allAvailableQuarters.map((q) => (
                          <SelectItem key={q} value={q}>
                            {q}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {comparisonGranularity === "BLOCK" && (
                    <Select value={blockDurationB} onValueChange={(val) => val && setBlockDurationB(val as any)}>
                      <SelectTrigger className="h-6 p-0 border-0 bg-transparent text-xs font-bold text-foreground focus:ring-0 shadow-none w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRIOR_3M">Prior 3 Months</SelectItem>
                        <SelectItem value="PRIOR_4M">Prior 4 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Status Note */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border/40">
                <Sparkles className="h-3.5 w-3.5 text-saffron" />
                <span>Historical benchmarks available for comparison</span>
              </div>
            </div>

            {/* Comparison Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-lg bg-card border border-border shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ff9933] shrink-0" />
                  <span className="text-[11px] font-semibold text-muted-foreground truncate">{compareMetrics.labelA}</span>
                </div>
                <div className="text-title font-bold text-foreground mt-1">
                  {formatINR(compareMetrics.rateA)} <span className="text-xs font-normal text-muted-foreground">/{unit}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {compareMetrics.qtyA > 0 ? `${compareMetrics.qtyA} ${unit} procured (${formatINR(compareMetrics.spendA)})` : "Primary period procurement rate"}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-card border border-border shadow-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3f6653] shrink-0" />
                  <span className="text-[11px] font-semibold text-muted-foreground truncate">{compareMetrics.labelB}</span>
                </div>
                <div className="text-title font-bold text-foreground mt-1">
                  {formatINR(compareMetrics.rateB)} <span className="text-xs font-normal text-muted-foreground">/{unit}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {compareMetrics.qtyB > 0 ? `${compareMetrics.qtyB} ${unit} procured (${formatINR(compareMetrics.spendB)})` : "Benchmark reference rate"}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-card border border-border shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground">Procurement Rate Difference</span>
                <div
                  className={`text-title font-bold mt-1 font-mono ${
                    compareMetrics.diffRate > 0
                      ? "text-amber-600"
                      : compareMetrics.diffRate < 0
                      ? "text-deep-green"
                      : "text-muted-foreground"
                  }`}
                >
                  {compareMetrics.diffRate > 0 ? `+${formatINR(compareMetrics.diffRate)}` : formatINR(compareMetrics.diffRate)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">/{unit}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {compareMetrics.diffRate > 0 ? "Rate elevated vs benchmark" : compareMetrics.diffRate < 0 ? "Rate reduced vs benchmark" : "Identical rates"}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-card border border-border shadow-xs">
                <span className="text-[11px] font-semibold text-muted-foreground">Percentage Fluctuation</span>
                <div className="text-title font-bold mt-1 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs px-2 py-0.5 font-bold ${
                      compareMetrics.pctChange > 0
                        ? "text-amber-600 border-amber-500/40 bg-amber-500/10"
                        : compareMetrics.pctChange < 0
                        ? "text-deep-green border-deep-green/40 bg-deep-green/10"
                        : "text-muted-foreground"
                    }`}
                  >
                    {compareMetrics.pctChange > 0 ? `+${compareMetrics.pctChange.toFixed(1)}%` : `${compareMetrics.pctChange.toFixed(1)}%`}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {compareMetrics.pctChange > 0 ? "Inflation impact on recipe cost" : "Procurement cost savings"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* RATE GRAPH CONTAINER */}
        <div className="p-4 rounded-xl border border-border bg-muted/10 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Monthly Average Procurement Rate: {selectedMaterial}
              </h4>
              <p className="text-xs text-muted-foreground">
                Showing historical weighted rate evolution in ₹ per {unit}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#ff9933] inline-block shadow-xs" />
              <span className="text-muted-foreground font-medium">Average Procurement Rate (₹/{unit})</span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredRecords} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="month" stroke="#887364" fontSize={12} />
                <YAxis
                  stroke="#887364"
                  fontSize={12}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip content={renderCustomTooltip} />
                <ReferenceLine
                  y={avgPeriodRate}
                  stroke="#3f6653"
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg ₹${Math.round(avgPeriodRate)}`,
                    fill: "#3f6653",
                    fontSize: 11,
                    position: "insideTopRight",
                  }}
                />
                <Bar
                  dataKey="avgRate"
                  name="Procurement Rate"
                  fill="#ff9933"
                  maxBarSize={38}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MONTHLY RATE BREAKDOWN TABLE */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="p-3.5 bg-muted/40 border-b border-border flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">
              Monthly Rate Ledger & Volume: {selectedMaterial}
            </span>
            <span className="text-[11px] text-muted-foreground">
              Showing {filteredRecords.length} recorded monthly intervals
            </span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-table-header">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-table-header-text font-semibold text-xs">Month</TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs">Primary Supplier</TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-right">
                    Avg Rate (₹/{unit})
                  </TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-right">
                    Min - Max Range
                  </TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-right">
                    Procured Qty
                  </TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-right">
                    Total Spend
                  </TableHead>
                  <TableHead className="text-table-header-text font-semibold text-xs text-right">
                    MoM Rate Shift
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((r, index) => {
                  const prevRecord = index > 0 ? filteredRecords[index - 1] : null
                  const rateDiff = prevRecord ? r.avgRate - prevRecord.avgRate : 0
                  const ratePct = prevRecord && prevRecord.avgRate > 0 ? (rateDiff / prevRecord.avgRate) * 100 : 0

                  return (
                    <TableRow key={r.month} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-bold text-xs text-foreground">{r.month}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.vendor}</TableCell>
                      <TableCell className="text-xs font-bold text-saffron text-right font-mono">
                        {formatINR(r.avgRate)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-right font-mono">
                        {formatINR(r.minRate)} - {formatINR(r.maxRate)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-foreground text-right">
                        {r.totalQty} {r.unit}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground text-right font-mono">
                        {formatINR(r.totalSpend)}
                      </TableCell>
                      <TableCell className="text-right">
                        {prevRecord ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-bold ${
                              rateDiff > 0
                                ? "text-amber-600 border-amber-500/40 bg-amber-500/10"
                                : rateDiff < 0
                                ? "text-deep-green border-deep-green/40 bg-deep-green/10"
                                : "text-muted-foreground"
                            }`}
                          >
                            {rateDiff > 0 ? `+${rateDiff} (${ratePct.toFixed(1)}%)` : rateDiff < 0 ? `${rateDiff} (${ratePct.toFixed(1)}%)` : "0.0%"}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Baseline</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
